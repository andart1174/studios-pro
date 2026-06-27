// CSV / JSON → 3D Chart Generator
window.DataChart3D = (() => {
  'use strict';

  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return null;
    const headers = lines[0].split(/[,;\t]/).map(h => h.trim().replace(/^"|"$/g,''));
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(/[,;\t]/).map(c => c.trim().replace(/^"|"$/g,''));
      const row = {};
      headers.forEach((h, j) => { row[h] = isNaN(+cells[j]) ? cells[j] : +cells[j]; });
      rows.push(row);
    }
    return { headers, rows };
  }

  function parseJSON(text) {
    try {
      const data = JSON.parse(text);
      if (Array.isArray(data) && data.length > 0) {
        const headers = Object.keys(data[0]);
        return { headers, rows: data };
      }
    } catch(e) {}
    return null;
  }

  function makeBarHTML(data, labelKey, valueKey, colorTheme) {
    const bars = data.rows.map(r => ({ label: String(r[labelKey] || ''), value: +r[valueKey] || 0 }));
    const maxV = Math.max(...bars.map(b => b.value)) || 1;
    const N = bars.length;
    const barsJSON = JSON.stringify(bars);
    const themes = {
      spectrum: `function gc(i,n){return new THREE.Color().setHSL(i/${N}*0.78,1,0.55);}`,
      fire:     `function gc(i,n){return new THREE.Color().setHSL(n*0.12,1,0.5);}`,
      ocean:    `function gc(i,n){return new THREE.Color().setHSL(0.55+n*0.08,0.9,0.55);}`,
      neon:     `function gc(i,n){return i%2===0?new THREE.Color(0,1,0.5):new THREE.Color(1,0,0.8);}`,
      mono:     `function gc(i,n){return new THREE.Color(0.4+n*0.6,0.4+n*0.6,0.4+n*0.6);}`
    };
    const colorCode = themes[colorTheme] || themes.spectrum;

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>3D Bar Chart</title>
<style>*{margin:0;padding:0;}body{background:#050815;overflow:hidden;font-family:Inter,sans-serif;}
#tooltip{position:fixed;top:10px;right:10px;background:rgba(6,12,36,0.92);border:1px solid rgba(99,102,241,0.4);border-radius:10px;padding:10px 14px;font-size:12px;color:#f1f5f9;z-index:9;min-width:140px;}
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script></head><body>
<div id="tooltip"><b style="color:#a5b4fc;">📊 3D Bar Chart</b><br><span id="tt-info" style="color:#64748b;font-size:10px;">Hover bars for info</span></div>
<script>(function(){
var BARS=${barsJSON},MAXV=${maxV};
${colorCode}
var scene=new THREE.Scene();scene.background=new THREE.Color(0x050815);scene.fog=new THREE.FogExp2(0x050815,0.005);
var camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,0.1,2000);
var renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;document.body.appendChild(renderer.domElement);
scene.add(new THREE.AmbientLight(0x1a1a3e,1));
var dl=new THREE.DirectionalLight(0x6366f1,2);dl.position.set(50,100,30);dl.castShadow=true;scene.add(dl);
var pl=new THREE.PointLight(0x10b981,3,500);pl.position.set(0,60,0);scene.add(pl);
var grid=new THREE.GridHelper(BARS.length*8+20,20,0x1e2a45,0x0d1225);scene.add(grid);
var ground=new THREE.Mesh(new THREE.PlaneGeometry(BARS.length*8+30,BARS.length*8+30),new THREE.MeshStandardMaterial({color:0x0a0f20,roughness:1}));
ground.rotation.x=-Math.PI/2;ground.position.y=-0.1;ground.receiveShadow=true;scene.add(ground);
var meshes=[];
BARS.forEach(function(b,i){
  var h=Math.max(0.5,(b.value/MAXV)*30);
  var col=gc(i,b.value/MAXV);
  var geo=new THREE.BoxGeometry(4,h,4);
  var mat=new THREE.MeshPhongMaterial({color:col,emissive:col,emissiveIntensity:0.2,shininess:60});
  var mesh=new THREE.Mesh(geo,mat);
  mesh.position.set((i-BARS.length/2+0.5)*5.5,h/2,0);
  mesh.castShadow=true;mesh.userData={label:b.label,value:b.value};
  scene.add(mesh);meshes.push(mesh);
  // Label pillar base
  var pillar=new THREE.Mesh(new THREE.BoxGeometry(4,0.3,4),new THREE.MeshPhongMaterial({color:0x1e3a5f}));
  pillar.position.set((i-BARS.length/2+0.5)*5.5,0.15,0);scene.add(pillar);
});
// Light glow under bars
meshes.forEach(function(m,i){
  var pl2=new THREE.PointLight(m.material.emissive,2,15);
  pl2.position.set(m.position.x,0,0);scene.add(pl2);
});
camera.position.set(0,30,BARS.length*3+20);camera.lookAt(0,10,0);
var drag=false,ox=0,oy=0,rotY=0,rotX=0.35,dist=BARS.length*3+20;
function setC(){camera.position.set(Math.sin(rotY)*Math.cos(rotX)*dist,Math.sin(rotX)*dist+5,Math.cos(rotY)*Math.cos(rotX)*dist);camera.lookAt(0,8,0);}
setC();
document.addEventListener('mousedown',function(e){drag=true;ox=e.clientX;oy=e.clientY;});
document.addEventListener('mouseup',function(){drag=false;});
document.addEventListener('mousemove',function(e){
  if(drag){rotY+=(e.clientX-ox)*0.005;rotX-=(e.clientY-oy)*0.005;rotX=Math.max(0.05,Math.min(1.4,rotX));ox=e.clientX;oy=e.clientY;setC();}
  // Hover
  var rect=renderer.domElement.getBoundingClientRect();
  var mouse=new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-((e.clientY-rect.top)/rect.height)*2+1);
  var ray=new THREE.Raycaster();ray.setFromCamera(mouse,camera);
  var hits=ray.intersectObjects(meshes);
  if(hits.length>0){var d=hits[0].object.userData;document.getElementById('tt-info').innerHTML='<b>'+d.label+'</b><br>Value: <span style="color:#10b981">'+d.value+'</span>';}
  else document.getElementById('tt-info').textContent='Hover bars for info';
});
document.addEventListener('wheel',function(e){dist=Math.max(10,Math.min(300,dist+e.deltaY*0.1));setC();},{passive:true});
window.addEventListener('resize',function(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
var t=0;function anim(){requestAnimationFrame(anim);t+=0.005;pl.position.set(Math.sin(t)*30,60,Math.cos(t)*30);renderer.render(scene,camera);}anim();
}());<\/script></body></html>`;
  }

  function init(container, btn) {
    const panel = document.createElement('div');
    panel.id = 'dc3d-panel';
    panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;overflow-y:auto;padding:14px;font-family:Inter,sans-serif;flex-direction:column;border-radius:8px;';

    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#f59e0b,#ef4444);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;">📊</div>
        <div><div style="font-size:13px;font-weight:700;color:#f1f5f9;">CSV / JSON → 3D Chart</div><div style="font-size:10px;color:#64748b;">Data → interactive 3D bar chart</div></div>
      </div>
      <div id="dc3d-drop" style="border:2px dashed rgba(245,158,11,0.4);border-radius:10px;padding:16px;text-align:center;cursor:pointer;background:rgba(245,158,11,0.04);position:relative;margin-bottom:10px;">
        <div style="font-size:22px;margin-bottom:4px;">📁</div>
        <div style="font-size:11px;color:#94a3b8;font-weight:600;">Click or drag CSV / JSON</div>
        <div style="font-size:9px;color:#64748b;margin-top:2px;">Columns auto-detected</div>
        <input type="file" id="dc3d-file" accept=".csv,.json,.txt" style="position:absolute;inset:0;opacity:0;cursor:pointer;">
      </div>
      <div id="dc3d-or" style="text-align:center;font-size:10px;color:#475569;margin-bottom:6px;">— or paste data —</div>
      <textarea id="dc3d-paste" rows="4" placeholder="label,value&#10;Alpha,42&#10;Beta,78&#10;Gamma,55" style="width:100%;padding:7px;background:#111827;border:1px solid #334155;border-radius:6px;color:#94a3b8;font-size:10px;font-family:monospace;resize:none;box-sizing:border-box;margin-bottom:8px;"></textarea>
      <div style="display:flex;gap:6px;margin-bottom:8px;">
        <div style="flex:1;"><label style="font-size:10px;color:#94a3b8;font-weight:600;">Label column</label><select id="dc3d-lbl" style="width:100%;margin-top:3px;padding:5px;background:#111827;border:1px solid #334155;border-radius:6px;color:#f1f5f9;font-size:10px;"><option>—</option></select></div>
        <div style="flex:1;"><label style="font-size:10px;color:#94a3b8;font-weight:600;">Value column</label><select id="dc3d-val" style="width:100%;margin-top:3px;padding:5px;background:#111827;border:1px solid #334155;border-radius:6px;color:#f1f5f9;font-size:10px;"><option>—</option></select></div>
      </div>
      <div style="display:flex;gap:6px;margin-bottom:10px;">
        <div style="flex:1;"><label style="font-size:10px;color:#94a3b8;font-weight:600;">Color Theme</label><select id="dc3d-color" style="width:100%;margin-top:3px;padding:5px;background:#111827;border:1px solid #334155;border-radius:6px;color:#f1f5f9;font-size:10px;"><option value="spectrum">Spectrum</option><option value="fire">Fire</option><option value="ocean">Ocean</option><option value="neon">Neon</option><option value="mono">Mono</option></select></div>
      </div>
      <button id="dc3d-add" style="width:100%;margin-top:10px;padding:9px;background:linear-gradient(135deg,#f59e0b,#ef4444);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(245,158,11,0.35);" disabled>📊 ADD TO SCENE</button>
      <button id="dc3d-gen" style="width:100%;margin-top:6px;padding:7px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:8px;color:#fbbf24;font-size:11px;font-weight:600;cursor:pointer;" disabled>📄 Generate Standalone HTML</button>
      <div id="dc3d-status" style="font-size:10px;color:#64748b;text-align:center;margin-top:6px;">Load data to continue</div>`;

    container.appendChild(panel);

    let parsedData = null;

    function updateColumns(data) {
      parsedData = data;
      const lblSel = document.getElementById('dc3d-lbl');
      const valSel = document.getElementById('dc3d-val');
      lblSel.innerHTML = data.headers.map(h => `<option value="${h}">${h}</option>`).join('');
      valSel.innerHTML = data.headers.map(h => `<option value="${h}">${h}</option>`).join('');
      // Auto-select: first string col as label, first number col as value
      const strCols = data.headers.filter(h => typeof data.rows[0][h] === 'string');
      const numCols = data.headers.filter(h => typeof data.rows[0][h] === 'number');
      if (strCols[0]) lblSel.value = strCols[0];
      if (numCols[0]) valSel.value = numCols[0];
      document.getElementById('dc3d-gen').disabled = false;
      document.getElementById('dc3d-add').disabled = false;
      document.getElementById('dc3d-status').textContent = `✅ ${data.rows.length} rows, ${data.headers.length} columns`;
      document.getElementById('dc3d-status').style.color = '#10b981';
    }

    function loadText(text) {
      const d = parseCSV(text) || parseJSON(text);
      if (d) updateColumns(d);
      else { document.getElementById('dc3d-status').textContent = '❌ Cannot parse data'; document.getElementById('dc3d-status').style.color = '#ef4444'; }
    }

    document.getElementById('dc3d-file').addEventListener('change', e => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader(); r.onload = ev => loadText(ev.target.result); r.readAsText(f);
    });

    document.getElementById('dc3d-paste').addEventListener('input', e => {
      if (e.target.value.trim().length > 5) loadText(e.target.value);
    });

    document.getElementById('dc3d-add').addEventListener('click', () => {
      if (!parsedData) return;
      const labelKey = document.getElementById('dc3d-lbl').value;
      const valueKey = document.getElementById('dc3d-val').value;
      const colorTheme = document.getElementById('dc3d-color').value;
      
      if(window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('data-chart', { data: parsedData, labelKey, valueKey, colorTheme });
        panel.style.display = 'none';
      }
    });

    document.getElementById('dc3d-gen').addEventListener('click', () => {
      if (!parsedData) return;
      const lbl = document.getElementById('dc3d-lbl').value;
      const val = document.getElementById('dc3d-val').value;
      const color = document.getElementById('dc3d-color').value;
      const html = makeBarHTML(parsedData, lbl, val, color);
      const ed = document.getElementById('code-editor');
      if (ed) { if (window.pushUndo) window.pushUndo(); ed.value = html; ed.dispatchEvent(new Event('input', {bubbles:true})); }
      if (window.toast) window.toast('📊 3D Chart generated!');
    });

    if (btn) btn.addEventListener('click', () => {
      const vis = panel.style.display === 'flex';
      document.querySelectorAll('[id$="-panel"]').forEach(p => p.style.display = 'none');
      panel.style.display = vis ? 'none' : 'flex';
    });
  }
  return { init };
})();
