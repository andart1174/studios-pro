window.DXFTo3D = (function() {
  let container, iframe, toggleBtn;
  
  function init(wrapElement, buttonElement) {
    if (!buttonElement || !wrapElement) return;
    
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
      toggleBtn.style.background = isViz ? '' : 'rgba(239, 68, 68, 0.2)';
      if(!isViz) updateIframe();
    });
  }

  function getIframeHTML() {
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></${'script'}>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></${'script'}>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/TransformControls.js"></${'script'}>
<script src="https://cdn.jsdelivr.net/npm/dxf-parser@1.1.2/dist/dxf-parser.js"></${'script'}>
<style>
  body{margin:0;overflow:hidden;background:#1a1a1a;font-family:sans-serif;}
  #tools {position:absolute;top:10px;left:10px;background:rgba(20,20,25,0.95);border:1px solid rgba(255,255,255,0.1);padding:15px;border-radius:8px;color:white;width:240px;z-index:100;max-height:90vh;overflow-y:auto;scrollbar-width:thin;}
  #tools::-webkit-scrollbar { width: 6px; } #tools::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
  button {width:100%;padding:8px;margin-top:10px;background:#ef4444;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;}
  button:hover {background:#dc2626;}
  .btn-half { width: 48%; display: inline-block; margin-top: 5px; }
  label {font-size:11px;color:#aaa;display:block;margin-top:10px;margin-bottom:4px;}
  input[type=range], input[type=file], select {width:100%; cursor:pointer;}
  input[type=file], select { padding: 4px; border: 1px solid rgba(255,255,255,0.3); border-radius: 4px; background: rgba(0,0,0,0.2); color:white; }
  .val-display { float:right; color:#ef4444; font-weight:bold; }
  .section { border-top: 1px solid rgba(255,255,255,0.1); margin-top: 15px; padding-top: 5px; }
  .mode-btn { background: #333; }
  .mode-btn.active { background: #ef4444; }
</style>
</head><body>
<div id="tools">
  <div style="font-size:13px;font-weight:bold;margin-bottom:10px;color:#ef4444;">📐 DXF Composer</div>
  
  <label id="lbl-upload">Upload DXF File</label>
  <input type="file" id="dxf-upload" accept=".dxf" style="font-size:10px;color:#ccc;cursor:pointer;"/>
  
  <div class="section" id="model-list-sec" style="display:none;">
      <label id="lbl-active">Active Model</label>
      <select id="model-select"></select>
      <button id="btn-delete" style="background:#888; padding:4px; font-size:10px;">🗑️ Delete Selected</button>
  </div>

  <div class="section" id="transform-sec" style="display:none;">
      <label id="lbl-transform">Transform Mode</label>
      <button class="btn-half mode-btn active" id="mode-translate">Move</button>
      <button class="btn-half mode-btn" id="mode-rotate">Rotate</button>
      <button class="btn-half mode-btn" id="mode-scale" style="width:100%">Scale</button>
  </div>

  <div class="section" id="props-sec" style="display:none;">
      <label id="lbl-depth">Thickness <span class="val-display" id="val-depth">10</span></label>
      <input type="range" id="param-depth" min="1" max="100" value="10">
      
      <label id="lbl-scale">Base Scale <span class="val-display" id="val-scale">1.0</span></label>
      <input type="range" id="param-scale" min="0.1" max="10" step="0.1" value="1.0">

      <label id="lbl-bevel">Roundness <span class="val-display" id="val-bevel">0</span></label>
      <input type="range" id="param-bevel" min="0" max="10" value="0">
      
      <label id="lbl-metal">Metalness <span class="val-display" id="val-metal">0.2</span></label>
      <input type="range" id="param-metal" min="0" max="1" step="0.1" value="0.2">

      <label id="lbl-rough">Roughness <span class="val-display" id="val-rough">0.3</span></label>
      <input type="range" id="param-rough" min="0" max="1" step="0.1" value="0.3">

      <label id="lbl-opacity">Opacity <span class="val-display" id="val-opacity">1.0</span></label>
      <input type="range" id="param-opacity" min="0.1" max="1.0" step="0.1" value="1.0">

      <label id="lbl-color">Model Color</label>
      <input type="color" id="param-hex" value="#ef4444" style="width:100%;height:30px;border:none;cursor:pointer;">
      
      <label id="lbl-emissive">Glow Color</label>
      <input type="color" id="param-emissive" value="#000000" style="width:100%;height:30px;border:none;cursor:pointer;">
      
      <label style="display:flex;align-items:center;cursor:pointer;margin-top:10px;font-size:11px;color:#aaa;">
        <input type="checkbox" id="param-wireframe" style="width:auto;margin-right:8px;"> <span id="lbl-wire">Wireframe Mode</span>
      </label>
  </div>

  <div class="section">
      <label id="lbl-speed">Global Auto-Rotate <span class="val-display" id="val-speed">0</span></label>
      <input type="range" id="param-speed" min="0" max="100" value="0">
  </div>

  <button id="btn-export" style="background:linear-gradient(135deg,#ef4444,#b91c1c);box-shadow:0 4px 12px rgba(239,68,68,0.3);margin-top:20px;">⚡ Export Code</button>
</div>

<script>
  // Translations
  const isEN = window.parent.currentLang !== 'fr';
  if(!isEN) {
      document.getElementById('lbl-upload').innerText = 'Uploader Fichier DXF';
      document.getElementById('lbl-active').innerText = 'Modèle Actif';
      document.getElementById('btn-delete').innerText = '🗑️ Supprimer la sélection';
      document.getElementById('lbl-transform').innerText = 'Mode de Transformation';
      document.getElementById('mode-translate').innerText = 'Déplacer';
      document.getElementById('mode-rotate').innerText = 'Pivoter';
      document.getElementById('mode-scale').innerText = 'Échelle';
      document.getElementById('lbl-depth').innerHTML = 'Épaisseur <span class="val-display" id="val-depth">10</span>';
      document.getElementById('lbl-scale').innerHTML = 'Échelle de base <span class="val-display" id="val-scale">1.0</span>';
      document.getElementById('lbl-bevel').innerHTML = 'Arrondi (Bevel) <span class="val-display" id="val-bevel">0</span>';
      document.getElementById('lbl-metal').innerHTML = 'Métallique <span class="val-display" id="val-metal">0.2</span>';
      document.getElementById('lbl-rough').innerHTML = 'Rugosité <span class="val-display" id="val-rough">0.3</span>';
      document.getElementById('lbl-opacity').innerHTML = 'Opacité <span class="val-display" id="val-opacity">1.0</span>';
      document.getElementById('lbl-color').innerText = 'Couleur du Modèle';
      document.getElementById('lbl-emissive').innerText = 'Couleur de Lueur (Glow)';
      document.getElementById('lbl-wire').innerText = 'Mode Filaire (Wireframe)';
      document.getElementById('lbl-speed').innerHTML = 'Rotation Auto Globale <span class="val-display" id="val-speed">0</span>';
      document.getElementById('btn-export').innerText = '⚡ Exporter le Code';
  }

  // Scene setup
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 5000);
  camera.position.set(0, 50, 200);
  const renderer = new THREE.WebGLRenderer({antialias:true, alpha: false});
  renderer.setSize(innerWidth, innerHeight);
  renderer.setClearColor(0x1a1a1a, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);
  
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  
  // Transform Controls
  const transformControl = new THREE.TransformControls(camera, renderer.domElement);
  transformControl.addEventListener('dragging-changed', function (event) {
      controls.enabled = !event.value;
  });
  scene.add(transformControl);

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
  scene.add(hemiLight);
  
  const lightFront = new THREE.DirectionalLight(0xffffff, 1.0);
  lightFront.position.set(100, 200, 200);
  lightFront.castShadow = true;
  lightFront.shadow.camera.top = 200;
  lightFront.shadow.camera.bottom = -200;
  lightFront.shadow.camera.left = -200;
  lightFront.shadow.camera.right = 200;
  lightFront.shadow.mapSize.width = 2048;
  lightFront.shadow.mapSize.height = 2048;
  scene.add(lightFront);
  
  // Floor & Grid
  const grid = new THREE.GridHelper(1000, 100, 0x444444, 0x222222);
  grid.position.y = -50;
  scene.add(grid);

  const floorGeo = new THREE.PlaneGeometry(1000, 1000);
  const floorMat = new THREE.ShadowMaterial({ opacity: 0.5 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -50;
  floor.receiveShadow = true;
  scene.add(floor);

  // App State
  let models = [];
  let activeModelId = null;
  let modelCount = 0;
  let globalSceneGroup = new THREE.Group();
  scene.add(globalSceneGroup);

  function getActiveModel() {
      return models.find(m => m.id === activeModelId);
  }

  function createModelGeometry(rawDXF, props) {
      const allSegments = [];
      function parseEntities(entities, offsetX = 0, offsetY = 0, scaleX = 1, scaleY = 1) {
         entities.forEach(e => {
           if(e.type === 'INSERT') {
              const block = rawDXF.blocks[e.name];
              if(block && block.entities) {
                 const bx = (e.position ? e.position.x : 0) + offsetX;
                 const by = (e.position ? e.position.y : 0) + offsetY;
                 const sx = (e.scale ? e.scale.x : 1) * scaleX;
                 const sy = (e.scale ? e.scale.y : 1) * scaleY;
                 parseEntities(block.entities, bx, by, sx, sy);
              }
           } else if(e.type === 'CIRCLE') {
              const cx = e.center.x * scaleX + offsetX, cy = e.center.y * scaleY + offsetY, r = e.radius * scaleX;
              const pts = [];
              for(let i=0; i<=32; i++) pts.push({x: cx + Math.cos(i/32*Math.PI*2)*r, y: cy + Math.sin(i/32*Math.PI*2)*r});
              for(let i=0; i<32; i++) allSegments.push({p1: pts[i], p2: pts[i+1]});
           } else if(e.type === 'ARC') {
              const cx = e.center.x * scaleX + offsetX, cy = e.center.y * scaleY + offsetY, r = e.radius * scaleX;
              let sa = e.startAngle, ea = e.endAngle;
              if(ea < sa) ea += Math.PI * 2;
              const pts = [];
              const steps = Math.max(8, Math.ceil((ea-sa)/0.1));
              for(let i=0; i<=steps; i++) {
                 const a = sa + (ea-sa)*(i/steps);
                 pts.push({x: cx + Math.cos(a)*r, y: cy + Math.sin(a)*r});
              }
              for(let i=0; i<steps; i++) allSegments.push({p1: pts[i], p2: pts[i+1]});
           } else if(e.type === 'SPLINE' && e.controlPoints && e.controlPoints.length > 0) {
              for(let i=0; i<e.controlPoints.length-1; i++) {
                 allSegments.push({
                     p1: {x: e.controlPoints[i].x * scaleX + offsetX, y: e.controlPoints[i].y * scaleY + offsetY},
                     p2: {x: e.controlPoints[i+1].x * scaleX + offsetX, y: e.controlPoints[i+1].y * scaleY + offsetY}
                 });
              }
              if((e.shape || e.closed) && e.controlPoints.length > 2) {
                 allSegments.push({
                     p1: {x: e.controlPoints[e.controlPoints.length-1].x * scaleX + offsetX, y: e.controlPoints[e.controlPoints.length-1].y * scaleY + offsetY},
                     p2: {x: e.controlPoints[0].x * scaleX + offsetX, y: e.controlPoints[0].y * scaleY + offsetY}
                 });
              }
           } else if(e.vertices && e.vertices.length > 0) {
              for(let i=0; i<e.vertices.length-1; i++) {
                 allSegments.push({
                     p1: {x: e.vertices[i].x * scaleX + offsetX, y: e.vertices[i].y * scaleY + offsetY},
                     p2: {x: e.vertices[i+1].x * scaleX + offsetX, y: e.vertices[i+1].y * scaleY + offsetY}
                 });
              }
              if((e.shape || e.closed) && e.vertices.length > 2) {
                 allSegments.push({
                     p1: {x: e.vertices[e.vertices.length-1].x * scaleX + offsetX, y: e.vertices[e.vertices.length-1].y * scaleY + offsetY},
                     p2: {x: e.vertices[0].x * scaleX + offsetX, y: e.vertices[0].y * scaleY + offsetY}
                 });
              }
           } else if(e.type === 'LINE') {
              allSegments.push({
                 p1: {x: e.vertices[0].x * scaleX + offsetX, y: e.vertices[0].y * scaleY + offsetY},
                 p2: {x: e.vertices[1].x * scaleX + offsetX, y: e.vertices[1].y * scaleY + offsetY}
              });
           }
         });
      }
      if(rawDXF && rawDXF.entities) {
          parseEntities(rawDXF.entities);
      }
      
      const paths = [];
      let rawMax = 100;
      if(allSegments.length > 0) {
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          allSegments.forEach(s => {
              [s.p1, s.p2].forEach(p => {
                  if(p.x < minX) minX = p.x; if(p.x > maxX) maxX = p.x;
                  if(p.y < minY) minY = p.y; if(p.y > maxY) maxY = p.y;
              });
          });
          rawMax = Math.max(maxX - minX, maxY - minY);
          if(rawMax === -Infinity || rawMax === 0 || isNaN(rawMax)) rawMax = 100;
          
          const tol = rawMax * 0.0001;
          while(allSegments.length > 0) {
              let path = [allSegments[0].p1, allSegments[0].p2];
              allSegments.splice(0, 1);
              let added = true;
              while(added) {
                  added = false;
                  let sP = path[0], eP = path[path.length - 1];
                  for(let i=0; i<allSegments.length; i++) {
                      let seg = allSegments[i];
                      if(Math.abs(seg.p1.x - eP.x) < tol && Math.abs(seg.p1.y - eP.y) < tol) { path.push(seg.p2); allSegments.splice(i,1); added = true; break; }
                      else if(Math.abs(seg.p2.x - eP.x) < tol && Math.abs(seg.p2.y - eP.y) < tol) { path.push(seg.p1); allSegments.splice(i,1); added = true; break; }
                      else if(Math.abs(seg.p1.x - sP.x) < tol && Math.abs(seg.p1.y - sP.y) < tol) { path.unshift(seg.p2); allSegments.splice(i,1); added = true; break; }
                      else if(Math.abs(seg.p2.x - sP.x) < tol && Math.abs(seg.p2.y - sP.y) < tol) { path.unshift(seg.p1); allSegments.splice(i,1); added = true; break; }
                  }
              }
              paths.push(path);
          }
      }

      const polygons = [];
      const openLines = [];
      paths.forEach(path => {
          if(path.length < 2) return;
          const isClosed = Math.hypot(path[0].x - path[path.length-1].x, path[0].y - path[path.length-1].y) < rawMax * 0.0001;
          if(isClosed) {
              let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
              path.forEach(p => {
                 if(p.x < minX) minX = p.x; if(p.x > maxX) maxX = p.x;
                 if(p.y < minY) minY = p.y; if(p.y > maxY) maxY = p.y;
              });
              const area = (maxX - minX) * (maxY - minY);
              polygons.push({ path, area, isHole: false, minX, maxX, minY, maxY });
          } else {
              openLines.push(path);
          }
      });
      polygons.sort((a, b) => b.area - a.area);
      
      function pointInPoly(pt, poly) {
          let x = pt.x, y = pt.y, inside = false;
          for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
              let xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
              let intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
              if (intersect) inside = !inside;
          }
          return inside;
      }
      for(let i=0; i<polygons.length; i++) {
          if(polygons[i].isHole) continue;
          for(let j=0; j<i; j++) {
              let parent = polygons[j];
              if(!parent.isHole) {
                 if(polygons[i].minX >= parent.minX && polygons[i].maxX <= parent.maxX && polygons[i].minY >= parent.minY && polygons[i].maxY <= parent.maxY) {
                     if(pointInPoly(polygons[i].path[0], parent.path)) {
                         if(!parent.holes) parent.holes = [];
                         parent.holes.push(polygons[i].path);
                         polygons[i].isHole = true;
                         break;
                     }
                 }
              }
          }
      }

      const shapes = [];
      polygons.filter(p => !p.isHole).forEach(poly => {
          const shape = new THREE.Shape();
          shape.moveTo(poly.path[0].x, poly.path[0].y);
          for(let i=1; i<poly.path.length; i++) shape.lineTo(poly.path[i].x, poly.path[i].y);
          if(poly.holes) {
              poly.holes.forEach(holePath => {
                  const h = new THREE.Path();
                  h.moveTo(holePath[0].x, holePath[0].y);
                  for(let i=1; i<holePath.length; i++) h.lineTo(holePath[i].x, holePath[i].y);
                  shape.holes.push(h);
              });
          }
          shapes.push(shape);
      });
      
      const lines = [];
      openLines.forEach(path => {
          const shape = new THREE.Shape();
          shape.moveTo(path[0].x, path[0].y);
          for(let i=1; i<path.length; i++) shape.lineTo(path[i].x, path[i].y);
          lines.push(shape);
      });

      const bevel = props.bevelVal > 0;
      const wallThickness = rawMax * (bevel ? (0.005 + props.bevelVal * 0.001) : 0.002); 
      const wallDepth = (props.depth / 100) * rawMax * 0.5;

      const extrudeSettings = {
          depth: wallDepth,
          bevelEnabled: bevel,
          bevelThickness: rawMax * (props.bevelVal * 0.001),
          bevelSize: rawMax * (props.bevelVal * 0.0005),
          bevelSegments: 4,
          curveSegments: 16
      };

      const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(props.colorHex),
          emissive: new THREE.Color(props.emissiveHex),
          roughness: props.roughness,
          metalness: props.metalness,
          transparent: props.opacity < 1.0,
          opacity: props.opacity,
          wireframe: props.wireframe,
          side: THREE.DoubleSide
      });

      const meshGroup = new THREE.Group();

      shapes.forEach(shape => {
          try {
             const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
             const mesh = new THREE.Mesh(geo, material);
             mesh.castShadow = true;
             mesh.receiveShadow = true;
             meshGroup.add(mesh);
          } catch(e) {
             lines.push(shape);
          }
      });
      
      const positions = [];
      const normals = [];
      const indices = [];
      let vIdx = 0;

      function addQuad(pA, pB, pC, pD, nX, nY, nZ) {
          positions.push(pA.x, pA.y, pA.z, pB.x, pB.y, pB.z, pC.x, pC.y, pC.z, pD.x, pD.y, pD.z);
          for(let i=0; i<4; i++) normals.push(nX, nY, nZ);
          indices.push(vIdx, vIdx+1, vIdx+2, vIdx, vIdx+2, vIdx+3);
          vIdx += 4;
      }

      lines.forEach(shape => {
          try {
             const pts = shape.getPoints();
             if(pts.length < 2) return;
             for(let i=0; i<pts.length-1; i++) {
                const p1 = pts[i];
                const p2 = pts[i+1];
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const len = Math.hypot(dx, dy);
                if(len < rawMax * 0.0001) continue;

                const nx = (-dy / len) * (wallThickness / 2);
                const ny = (dx / len) * (wallThickness / 2);

                const c1 = {x: p1.x + nx, y: p1.y + ny, z: 0};
                const c2 = {x: p1.x - nx, y: p1.y - ny, z: 0};
                const c3 = {x: p2.x + nx, y: p2.y + ny, z: 0};
                const c4 = {x: p2.x - nx, y: p2.y - ny, z: 0};

                const t1 = {x: c1.x, y: c1.y, z: wallDepth};
                const t2 = {x: c2.x, y: c2.y, z: wallDepth};
                const t3 = {x: c3.x, y: c3.y, z: wallDepth};
                const t4 = {x: c4.x, y: c4.y, z: wallDepth};

                addQuad(t1, t2, t4, t3, 0, 0, 1);
                addQuad(c2, c1, c3, c4, 0, 0, -1);
                addQuad(c1, t1, t3, c3, nx, ny, 0);
                addQuad(c4, t4, t2, c2, -nx, -ny, 0);
                addQuad(c2, t2, t1, c1, -dx, -dy, 0);
                addQuad(c3, t3, t4, c4, dx, dy, 0);
             }
          } catch(err){}
      });

      if(positions.length > 0) {
          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
          geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
          geo.setIndex(indices);
          const mesh = new THREE.Mesh(geo, material);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          meshGroup.add(mesh);
      }

      // Base scaling and centering
      const box = new THREE.Box3().setFromObject(meshGroup);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      if(maxDim > 0 && maxDim !== Infinity) {
          const normalizeScale = 100 / maxDim;
          meshGroup.scale.set(normalizeScale * props.scale, normalizeScale * props.scale, normalizeScale * props.scale);
      }
      const box2 = new THREE.Box3().setFromObject(meshGroup);
      const center = box2.getCenter(new THREE.Vector3());
      meshGroup.position.sub(center);

      return meshGroup;
  }

  function renderModels() {
      models.forEach(m => {
          if(!m.group) {
              m.group = new THREE.Group();
              globalSceneGroup.add(m.group);
              m.group.position.copy(m.position);
              m.group.rotation.copy(m.rotation);
              m.group.scale.copy(m.groupScale);
          }
          
          while(m.group.children.length > 0){ 
              m.group.remove(m.group.children[0]); 
          }
          
          const meshGroup = createModelGeometry(m.rawDXF, m);
          m.group.add(meshGroup);
      });
  }

  function syncUI() {
      const select = document.getElementById('model-select');
      select.innerHTML = '';
      models.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m.id;
          opt.innerText = m.name;
          if(m.id === activeModelId) opt.selected = true;
          select.appendChild(opt);
      });

      if(models.length > 0) {
          document.getElementById('model-list-sec').style.display = 'block';
          document.getElementById('transform-sec').style.display = 'block';
          document.getElementById('props-sec').style.display = 'block';

          const act = getActiveModel();
          if(act) {
              document.getElementById('param-depth').value = act.depth;
              document.getElementById('val-depth').innerText = act.depth;
              document.getElementById('param-scale').value = act.scale;
              document.getElementById('val-scale').innerText = act.scale.toFixed(1);
              document.getElementById('param-bevel').value = act.bevelVal;
              document.getElementById('val-bevel').innerText = act.bevelVal;
              document.getElementById('param-metal').value = act.metalness;
              document.getElementById('val-metal').innerText = act.metalness.toFixed(1);
              document.getElementById('param-rough').value = act.roughness;
              document.getElementById('val-rough').innerText = act.roughness.toFixed(1);
              document.getElementById('param-opacity').value = act.opacity;
              document.getElementById('val-opacity').innerText = act.opacity.toFixed(1);
              document.getElementById('param-hex').value = act.colorHex;
              document.getElementById('param-emissive').value = act.emissiveHex;
              document.getElementById('param-wireframe').checked = act.wireframe;
              
              transformControl.attach(act.group);
          }
      } else {
          document.getElementById('model-list-sec').style.display = 'none';
          document.getElementById('transform-sec').style.display = 'none';
          document.getElementById('props-sec').style.display = 'none';
          transformControl.detach();
      }
  }

  document.getElementById('dxf-upload').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
          const fileText = ev.target.result;
          const parser = new window.DxfParser();
          try {
              const dxf = parser.parseSync(fileText);
              modelCount++;
              const newModel = {
                  id: Date.now(),
                  name: file.name || (\`Model \${modelCount}\`),
                  rawDXF: dxf,
                  rawDXFText: fileText,
                  depth: 10,
                  scale: 1.0,
                  bevelVal: 0,
                  metalness: 0.2,
                  roughness: 0.3,
                  colorHex: '#ef4444',
                  emissiveHex: '#000000',
                  opacity: 1.0,
                  wireframe: false,
                  position: new THREE.Vector3(0,0,0),
                  rotation: new THREE.Euler(0,0,0),
                  groupScale: new THREE.Vector3(1,1,1),
                  group: null
              };
              models.push(newModel);
              activeModelId = newModel.id;
              renderModels();
              syncUI();
          } catch(err) {
              alert("Error parsing DXF: " + err.message);
          }
      };
      reader.readAsText(file);
      e.target.value = ''; // reset so we can load same file again
  });

  document.getElementById('model-select').addEventListener('change', (e) => {
      activeModelId = parseInt(e.target.value);
      syncUI();
  });

  document.getElementById('btn-delete').addEventListener('click', () => {
      const act = getActiveModel();
      if(act && act.group) {
          globalSceneGroup.remove(act.group);
      }
      models = models.filter(m => m.id !== activeModelId);
      if(models.length > 0) activeModelId = models[0].id;
      else activeModelId = null;
      syncUI();
  });

  ['translate', 'rotate', 'scale'].forEach(mode => {
      document.getElementById(\`mode-\${mode}\`).addEventListener('click', () => {
          transformControl.setMode(mode);
          document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
          document.getElementById(\`mode-\${mode}\`).classList.add('active');
      });
  });

  transformControl.addEventListener('change', () => {
      const act = getActiveModel();
      if(act && act.group) {
          act.position.copy(act.group.position);
          act.rotation.copy(act.group.rotation);
          act.groupScale.copy(act.group.scale);
      }
  });

  ['param-depth', 'param-scale', 'param-bevel', 'param-metal', 'param-rough', 'param-opacity'].forEach(id => {
      document.getElementById(id).addEventListener('input', (e) => {
          const act = getActiveModel();
          if(!act) return;
          const val = parseFloat(e.target.value);
          if(id === 'param-depth') act.depth = val;
          if(id === 'param-scale') act.scale = val;
          if(id === 'param-bevel') act.bevelVal = val;
          if(id === 'param-metal') act.metalness = val;
          if(id === 'param-rough') act.roughness = val;
          if(id === 'param-opacity') act.opacity = val;
          document.getElementById(id.replace('param', 'val')).innerText = (id==='param-depth'||id==='param-bevel') ? val : val.toFixed(1);
          renderModels();
      });
  });

  ['param-hex', 'param-emissive'].forEach(id => {
      document.getElementById(id).addEventListener('input', (e) => {
          const act = getActiveModel();
          if(!act) return;
          if(id === 'param-hex') act.colorHex = e.target.value;
          if(id === 'param-emissive') act.emissiveHex = e.target.value;
          renderModels();
      });
  });

  document.getElementById('param-wireframe').addEventListener('change', (e) => {
      const act = getActiveModel();
      if(act) {
          act.wireframe = e.target.checked;
          renderModels();
      }
  });

  let animSpeed = 0;
  document.getElementById('param-speed').addEventListener('input', (e) => {
      animSpeed = parseFloat(e.target.value) * 0.0005;
      document.getElementById('val-speed').innerText = e.target.value;
  });

  function animate() {
      requestAnimationFrame(animate);
      controls.update();
      if(globalSceneGroup && animSpeed > 0) {
          globalSceneGroup.rotation.y += animSpeed;
      }
      renderer.render(scene, camera);
  }
  animate();
  
  window.addEventListener('resize', () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
  });

  // EXPORT
  document.getElementById('btn-export').addEventListener('click', () => {
      if(models.length === 0) {
          alert(isEN ? "Please load at least one DXF file." : "Veuillez charger au moins un fichier DXF.");
          return;
      }
      document.getElementById('btn-export').innerHTML = '✅ ' + (isEN ? 'Exporting...' : 'Exportation...');
      
      const exportedModelsData = models.map(m => {
          return {
              name: m.name,
              dxfText: btoa(unescape(encodeURIComponent(m.rawDXFText))),
              depth: m.depth,
              scale: m.scale,
              bevelVal: m.bevelVal,
              metalness: m.metalness,
              roughness: m.roughness,
              colorHex: m.colorHex,
              emissiveHex: m.emissiveHex,
              opacity: m.opacity,
              wireframe: m.wireframe,
              pos: {x: m.position.x, y: m.position.y, z: m.position.z},
              rot: {x: m.rotation.x, y: m.rotation.y, z: m.rotation.z},
              scl: {x: m.groupScale.x, y: m.groupScale.y, z: m.groupScale.z}
          };
      });

      const configJSON = JSON.stringify(exportedModelsData);

      const code = \`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>3D DXF Composer Scene</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></${'script'}>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></${'script'}>
<script src="https://cdn.jsdelivr.net/npm/dxf-parser@1.1.2/dist/dxf-parser.js"></${'script'}>
<style>body{margin:0;overflow:hidden;background:#1a1a1a;}</style>
</head>
<body>
<script>
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 5000);
  camera.position.set(0, 50, 200);
  const renderer = new THREE.WebGLRenderer({antialias:true, alpha:false});
  renderer.setSize(innerWidth, innerHeight);
  renderer.setClearColor(0x1a1a1a, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);
  
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const hLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
  scene.add(hLight);
  
  const l1 = new THREE.DirectionalLight(0xffffff, 1.0);
  l1.position.set(100,200,200);
  l1.castShadow = true;
  l1.shadow.camera.top = 200; l1.shadow.camera.bottom = -200; l1.shadow.camera.left = -200; l1.shadow.camera.right = 200;
  l1.shadow.mapSize.width = 2048; l1.shadow.mapSize.height = 2048;
  scene.add(l1);

  const grid = new THREE.GridHelper(1000, 100, 0x444444, 0x222222);
  grid.position.y = -50;
  scene.add(grid);

  const floorGeo = new THREE.PlaneGeometry(1000, 1000);
  const floorMat = new THREE.ShadowMaterial({ opacity: 0.5 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -50;
  floor.receiveShadow = true;
  scene.add(floor);

  const globalGroup = new THREE.Group();
  scene.add(globalGroup);

  const config = \${configJSON};
  const parser = new window.DxfParser();

  function createModelGeometry(rawDXF, props) {
      const allSegments = [];
      function parseEntities(entities, offsetX = 0, offsetY = 0, scaleX = 1, scaleY = 1) {
         entities.forEach(e => {
           if(e.type === 'INSERT') {
              const block = rawDXF.blocks[e.name];
              if(block && block.entities) {
                 const bx = (e.position ? e.position.x : 0) + offsetX;
                 const by = (e.position ? e.position.y : 0) + offsetY;
                 const sx = (e.scale ? e.scale.x : 1) * scaleX;
                 const sy = (e.scale ? e.scale.y : 1) * scaleY;
                 parseEntities(block.entities, bx, by, sx, sy);
              }
           } else if(e.type === 'CIRCLE') {
              const cx = e.center.x * scaleX + offsetX, cy = e.center.y * scaleY + offsetY, r = e.radius * scaleX;
              const pts = [];
              for(let i=0; i<=32; i++) pts.push({x: cx + Math.cos(i/32*Math.PI*2)*r, y: cy + Math.sin(i/32*Math.PI*2)*r});
              for(let i=0; i<32; i++) allSegments.push({p1: pts[i], p2: pts[i+1]});
           } else if(e.type === 'ARC') {
              const cx = e.center.x * scaleX + offsetX, cy = e.center.y * scaleY + offsetY, r = e.radius * scaleX;
              let sa = e.startAngle, ea = e.endAngle;
              if(ea < sa) ea += Math.PI * 2;
              const pts = [];
              const steps = Math.max(8, Math.ceil((ea-sa)/0.1));
              for(let i=0; i<=steps; i++) {
                 const a = sa + (ea-sa)*(i/steps);
                 pts.push({x: cx + Math.cos(a)*r, y: cy + Math.sin(a)*r});
              }
              for(let i=0; i<steps; i++) allSegments.push({p1: pts[i], p2: pts[i+1]});
           } else if(e.type === 'SPLINE' && e.controlPoints && e.controlPoints.length > 0) {
              for(let i=0; i<e.controlPoints.length-1; i++) {
                 allSegments.push({p1: {x: e.controlPoints[i].x * scaleX + offsetX, y: e.controlPoints[i].y * scaleY + offsetY}, p2: {x: e.controlPoints[i+1].x * scaleX + offsetX, y: e.controlPoints[i+1].y * scaleY + offsetY}});
              }
              if((e.shape || e.closed) && e.controlPoints.length > 2) {
                 allSegments.push({p1: {x: e.controlPoints[e.controlPoints.length-1].x * scaleX + offsetX, y: e.controlPoints[e.controlPoints.length-1].y * scaleY + offsetY}, p2: {x: e.controlPoints[0].x * scaleX + offsetX, y: e.controlPoints[0].y * scaleY + offsetY}});
              }
           } else if(e.vertices && e.vertices.length > 0) {
              for(let i=0; i<e.vertices.length-1; i++) {
                 allSegments.push({p1: {x: e.vertices[i].x * scaleX + offsetX, y: e.vertices[i].y * scaleY + offsetY}, p2: {x: e.vertices[i+1].x * scaleX + offsetX, y: e.vertices[i+1].y * scaleY + offsetY}});
              }
              if((e.shape || e.closed) && e.vertices.length > 2) {
                 allSegments.push({p1: {x: e.vertices[e.vertices.length-1].x * scaleX + offsetX, y: e.vertices[e.vertices.length-1].y * scaleY + offsetY}, p2: {x: e.vertices[0].x * scaleX + offsetX, y: e.vertices[0].y * scaleY + offsetY}});
              }
           } else if(e.type === 'LINE') {
              allSegments.push({p1: {x: e.vertices[0].x * scaleX + offsetX, y: e.vertices[0].y * scaleY + offsetY}, p2: {x: e.vertices[1].x * scaleX + offsetX, y: e.vertices[1].y * scaleY + offsetY}});
           }
         });
      }
      if(rawDXF && rawDXF.entities) parseEntities(rawDXF.entities);
      
      const paths = [];
      let rawMax = 100;
      if(allSegments.length > 0) {
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          allSegments.forEach(s => { [s.p1, s.p2].forEach(p => { if(p.x < minX) minX = p.x; if(p.x > maxX) maxX = p.x; if(p.y < minY) minY = p.y; if(p.y > maxY) maxY = p.y; }); });
          rawMax = Math.max(maxX - minX, maxY - minY);
          if(rawMax === -Infinity || rawMax === 0 || isNaN(rawMax)) rawMax = 100;
          
          const tol = rawMax * 0.0001;
          while(allSegments.length > 0) {
              let path = [allSegments[0].p1, allSegments[0].p2];
              allSegments.splice(0, 1);
              let added = true;
              while(added) {
                  added = false;
                  let sP = path[0], eP = path[path.length - 1];
                  for(let i=0; i<allSegments.length; i++) {
                      let seg = allSegments[i];
                      if(Math.abs(seg.p1.x - eP.x) < tol && Math.abs(seg.p1.y - eP.y) < tol) { path.push(seg.p2); allSegments.splice(i,1); added = true; break; }
                      else if(Math.abs(seg.p2.x - eP.x) < tol && Math.abs(seg.p2.y - eP.y) < tol) { path.push(seg.p1); allSegments.splice(i,1); added = true; break; }
                      else if(Math.abs(seg.p1.x - sP.x) < tol && Math.abs(seg.p1.y - sP.y) < tol) { path.unshift(seg.p2); allSegments.splice(i,1); added = true; break; }
                      else if(Math.abs(seg.p2.x - sP.x) < tol && Math.abs(seg.p2.y - sP.y) < tol) { path.unshift(seg.p1); allSegments.splice(i,1); added = true; break; }
                  }
              }
              paths.push(path);
          }
      }

      const polygons = [];
      const openLines = [];
      paths.forEach(path => {
          if(path.length < 2) return;
          const isClosed = Math.hypot(path[0].x - path[path.length-1].x, path[0].y - path[path.length-1].y) < rawMax * 0.0001;
          if(isClosed) {
              let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
              path.forEach(p => { if(p.x < minX) minX = p.x; if(p.x > maxX) maxX = p.x; if(p.y < minY) minY = p.y; if(p.y > maxY) maxY = p.y; });
              const area = (maxX - minX) * (maxY - minY);
              polygons.push({ path, area, isHole: false, minX, maxX, minY, maxY });
          } else { openLines.push(path); }
      });
      polygons.sort((a, b) => b.area - a.area);
      
      function pointInPoly(pt, poly) {
          let x = pt.x, y = pt.y, inside = false;
          for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
              let xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
              let intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
              if (intersect) inside = !inside;
          }
          return inside;
      }
      for(let i=0; i<polygons.length; i++) {
          if(polygons[i].isHole) continue;
          for(let j=0; j<i; j++) {
              let parent = polygons[j];
              if(!parent.isHole) {
                 if(polygons[i].minX >= parent.minX && polygons[i].maxX <= parent.maxX && polygons[i].minY >= parent.minY && polygons[i].maxY <= parent.maxY) {
                     if(pointInPoly(polygons[i].path[0], parent.path)) {
                         if(!parent.holes) parent.holes = [];
                         parent.holes.push(polygons[i].path); polygons[i].isHole = true; break;
                     }
                 }
              }
          }
      }

      const shapes = [];
      polygons.filter(p => !p.isHole).forEach(poly => {
          const shape = new THREE.Shape();
          shape.moveTo(poly.path[0].x, poly.path[0].y);
          for(let i=1; i<poly.path.length; i++) shape.lineTo(poly.path[i].x, poly.path[i].y);
          if(poly.holes) {
              poly.holes.forEach(holePath => {
                  const h = new THREE.Path();
                  h.moveTo(holePath[0].x, holePath[0].y);
                  for(let i=1; i<holePath.length; i++) h.lineTo(holePath[i].x, holePath[i].y);
                  shape.holes.push(h);
              });
          }
          shapes.push(shape);
      });
      
      const lines = [];
      openLines.forEach(path => {
          const shape = new THREE.Shape();
          shape.moveTo(path[0].x, path[0].y);
          for(let i=1; i<path.length; i++) shape.lineTo(path[i].x, path[i].y);
          lines.push(shape);
      });

      const bevel = props.bevelVal > 0;
      const wallThickness = rawMax * (bevel ? (0.005 + props.bevelVal * 0.001) : 0.002); 
      const wallDepth = (props.depth / 100) * rawMax * 0.5;

      const extrudeSettings = { depth: wallDepth, bevelEnabled: bevel, bevelThickness: rawMax * (props.bevelVal * 0.001), bevelSize: rawMax * (props.bevelVal * 0.0005), bevelSegments: 4, curveSegments: 16 };

      const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(props.colorHex),
          emissive: new THREE.Color(props.emissiveHex),
          roughness: props.roughness,
          metalness: props.metalness,
          transparent: props.opacity < 1.0,
          opacity: props.opacity,
          wireframe: props.wireframe,
          side: THREE.DoubleSide
      });

      const meshGroup = new THREE.Group();

      shapes.forEach(shape => {
          try {
             const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
             const mesh = new THREE.Mesh(geo, material);
             mesh.castShadow = true; mesh.receiveShadow = true;
             meshGroup.add(mesh);
          } catch(e) { lines.push(shape); }
      });
      
      const positions = []; const normals = []; const indices = []; let vIdx = 0;
      function addQuad(pA, pB, pC, pD, nX, nY, nZ) {
          positions.push(pA.x, pA.y, pA.z, pB.x, pB.y, pB.z, pC.x, pC.y, pC.z, pD.x, pD.y, pD.z);
          for(let i=0; i<4; i++) normals.push(nX, nY, nZ);
          indices.push(vIdx, vIdx+1, vIdx+2, vIdx, vIdx+2, vIdx+3);
          vIdx += 4;
      }

      lines.forEach(shape => {
          try {
             const pts = shape.getPoints();
             if(pts.length < 2) return;
             for(let i=0; i<pts.length-1; i++) {
                const p1 = pts[i]; const p2 = pts[i+1];
                const dx = p2.x - p1.x; const dy = p2.y - p1.y;
                const len = Math.hypot(dx, dy);
                if(len < rawMax * 0.0001) continue;
                const nx = (-dy / len) * (wallThickness / 2); const ny = (dx / len) * (wallThickness / 2);
                const c1 = {x: p1.x + nx, y: p1.y + ny, z: 0}; const c2 = {x: p1.x - nx, y: p1.y - ny, z: 0};
                const c3 = {x: p2.x + nx, y: p2.y + ny, z: 0}; const c4 = {x: p2.x - nx, y: p2.y - ny, z: 0};
                const t1 = {x: c1.x, y: c1.y, z: wallDepth}; const t2 = {x: c2.x, y: c2.y, z: wallDepth};
                const t3 = {x: c3.x, y: c3.y, z: wallDepth}; const t4 = {x: c4.x, y: c4.y, z: wallDepth};
                addQuad(t1, t2, t4, t3, 0, 0, 1); addQuad(c2, c1, c3, c4, 0, 0, -1);
                addQuad(c1, t1, t3, c3, nx, ny, 0); addQuad(c4, t4, t2, c2, -nx, -ny, 0);
                addQuad(c2, t2, t1, c1, -dx, -dy, 0); addQuad(c3, t3, t4, c4, dx, dy, 0);
             }
          } catch(err){}
      });

      if(positions.length > 0) {
          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
          geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
          geo.setIndex(indices);
          const mesh = new THREE.Mesh(geo, material);
          mesh.castShadow = true; mesh.receiveShadow = true;
          meshGroup.add(mesh);
      }

      const box = new THREE.Box3().setFromObject(meshGroup);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      if(maxDim > 0 && maxDim !== Infinity) {
          const normalizeScale = 100 / maxDim;
          meshGroup.scale.set(normalizeScale * props.scale, normalizeScale * props.scale, normalizeScale * props.scale);
      }
      const box2 = new THREE.Box3().setFromObject(meshGroup);
      const center = box2.getCenter(new THREE.Vector3());
      meshGroup.position.sub(center);

      return meshGroup;
  }

  config.forEach(m => {
      try {
          const fileText = decodeURIComponent(escape(atob(m.dxfText)));
          const dxf = parser.parseSync(fileText);
          const group = new THREE.Group();
          group.position.set(m.pos.x, m.pos.y, m.pos.z);
          group.rotation.set(m.rot.x, m.rot.y, m.rot.z);
          group.scale.set(m.scl.x, m.scl.y, m.scl.z);
          const meshGroup = createModelGeometry(dxf, m);
          group.add(meshGroup);
          globalGroup.add(group);
      } catch(e) {
          console.error("Error generating model: " + m.name, e);
      }
  });

  const animSpeed = \${animSpeed};
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    if(animSpeed > 0) globalGroup.rotation.y += animSpeed;
    renderer.render(scene, camera);
  }
  animate();
  window.addEventListener('resize', () => {
    camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight);
  });
</${'script'}>
</body></html>\`;

      const editor = window.parent.document.getElementById('code-editor');
      if (editor) {
        if (window.parent.pushUndo) window.parent.pushUndo();
        editor.value = code.trim();
        editor.dispatchEvent(new window.parent.Event('input', { bubbles: true }));
        setTimeout(() => { document.getElementById('btn-export').innerHTML = isEN ? '⚡ Export Code' : '⚡ Exporter le Code'; }, 1000);
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
