// Math → 3D Surface Generator
window.MathSurface3D = (() => {
  'use strict';
  const PRESETS = [
    {n:'Sinc',     f:'sin(sqrt(x*x+y*y)+0.001)/(sqrt(x*x+y*y)+0.001)*8'},
    {n:'Ripple',   f:'sin(x*2+t)*cos(y*2+t)*4'},
    {n:'Saddle',   f:'x*x/4-y*y/4'},
    {n:'Wave',     f:'sin(x+t)*2+cos(y*1.5+t)*2'},
    {n:'Torus',    f:'cos(sqrt(x*x+y*y)-4)*2.5'},
    {n:'Rose',     f:'sin(4*atan2(y,x+0.001)+t)*sqrt(x*x+y*y)/3'},
    {n:'Peaks',    f:'(3-2*exp(-((x-1)*(x-1)+(y)*(y))))*exp(-0.1*(x*x+y*y))'},
    {n:'Volcano',  f:'(3-sqrt(x*x+y*y))*exp(-0.2*sqrt(x*x+y*y))*3'}
  ];

  const COLOR_JS = {
    height:  `var gc=function(n){return new THREE.Color().setHSL(0.67-n*0.67,1,0.45+n*0.1);};`,
    neon:    `var gc=function(n){return n<0.5?new THREE.Color(0,n*2,1):new THREE.Color((n-0.5)*2,1,0);};`,
    thermal: `var gc=function(n){if(n<0.33)return new THREE.Color(0,0,n*3);if(n<0.66)return new THREE.Color(0,(n-0.33)*3,1);return new THREE.Color((n-0.66)*3,1,0);};`,
    gold:    `var gc=function(n){return new THREE.Color(n,n*0.75,0.1);};`,
    ice:     `var gc=function(n){return new THREE.Color(0.2+n*0.3,0.5+n*0.3,1);};`
  };

  function makeHTML(formula, res, range, colorMode, doAnimate, doWire) {
    const colorCode = COLOR_JS[colorMode] || COLOR_JS.height;
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Math Surface 3D</title>
<style>*{margin:0;padding:0;}body{background:#050815;overflow:hidden;font-family:Inter,sans-serif;}
#ui{position:fixed;top:10px;left:10px;background:rgba(5,8,30,0.92);border:1px solid rgba(99,102,241,0.35);border-radius:12px;padding:12px;width:240px;z-index:9;}
#ui input[type=text],#ui textarea{width:100%;padding:5px;background:#111827;border:1px solid #334155;border-radius:6px;color:#10b981;font-family:monospace;font-size:11px;box-sizing:border-box;}
.ui-lbl{font-size:10px;color:#94a3b8;font-weight:600;margin-top:5px;display:block;}
.ui-row{display:flex;align-items:center;gap:6px;margin-top:4px;}
#apply-btn{width:100%;margin-top:8px;padding:7px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:7px;color:#fff;font-size:11px;font-weight:700;cursor:pointer;}
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script></head><body>
<div id="ui">
  <div style="font-size:12px;font-weight:700;color:#a5b4fc;margin-bottom:8px;">📐 Math Surface f(x,y,t)</div>
  <span class="ui-lbl">Formula</span>
  <textarea id="fn" rows="2">${formula.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</textarea>
  <div class="ui-row"><span class="ui-lbl" style="min-width:80px;">Range ±<b id="rv">${range}</b></span><input type="range" id="rng" min="2" max="20" value="${range}" style="flex:1;accent-color:#6366f1;" oninput="document.getElementById('rv').textContent=this.value;doRebuild()"></div>
  <div class="ui-row"><span class="ui-lbl" style="min-width:80px;">Res <b id="resv">${res}</b></span><input type="range" id="ress" min="10" max="80" value="${res}" style="flex:1;accent-color:#6366f1;" oninput="document.getElementById('resv').textContent=this.value;doRebuild()"></div>
  <button id="apply-btn" onclick="doRebuild()">⚡ Apply</button>
  <div style="font-size:9px;color:#475569;margin-top:6px;">Variables: x, y, t (time), sin, cos, sqrt, abs, pow, PI, atan2</div>
</div>
<script>(function(){
var scene=new THREE.Scene();scene.background=new THREE.Color(0x050815);
var camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,0.1,2000);
var renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(innerWidth,innerHeight);document.body.appendChild(renderer.domElement);
scene.add(new THREE.AmbientLight(0xffffff,0.4));
var dl=new THREE.DirectionalLight(0x6366f1,2);dl.position.set(50,100,50);scene.add(dl);
var dl2=new THREE.DirectionalLight(0x10b981,1.5);dl2.position.set(-50,-50,-50);scene.add(dl2);
var grid=new THREE.GridHelper(40,20,0x1e2a45,0x0d1225);grid.position.y=-0.05;scene.add(grid);
${colorCode}
function ef(f,x,y,t){try{return new Function('x','y','t','sin','cos','tan','sqrt','abs','pow','exp','log','PI','atan2','floor','ceil','return ('+f+')')(x,y,t,Math.sin,Math.cos,Math.tan,Math.sqrt,Math.abs,Math.pow,Math.exp,Math.log,Math.PI,Math.atan2,Math.floor,Math.ceil)||0;}catch(e){return 0;}}
var mesh=null,t=0;
function doRebuild(){
  if(mesh){scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();}
  var F=document.getElementById('fn').value,R=+document.getElementById('rng').value,N=+document.getElementById('ress').value;
  var geo=new THREE.PlaneGeometry(R*2,R*2,N,N);geo.rotateX(-Math.PI/2);
  var pos=geo.attributes.position,mn=1e9,mx=-1e9;
  var hs=new Float32Array(pos.count);
  for(var i=0;i<pos.count;i++){var v=ef(F,pos.getX(i),pos.getZ(i),t);hs[i]=isFinite(v)?Math.max(-50,Math.min(50,v)):0;if(hs[i]<mn)mn=hs[i];if(hs[i]>mx)mx=hs[i];}
  var rng=mx-mn||1,cols=[];
  for(var i=0;i<pos.count;i++){pos.setY(i,hs[i]);var n=(hs[i]-mn)/rng;var c=gc(n);cols.push(c.r,c.g,c.b);}
  geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));
  pos.needsUpdate=true;geo.computeVertexNormals();
  var mat=new THREE.MeshPhongMaterial({vertexColors:true,wireframe:${doWire},shininess:80,side:THREE.DoubleSide});
  mesh=new THREE.Mesh(geo,mat);scene.add(mesh);
  camera.position.set(0,(mx-mn)*0.8+10,R*2);camera.lookAt(0,0,0);
}
window.doRebuild=doRebuild;doRebuild();
var drag=false,ox=0,oy=0,rotY=0.5,rotX=0.4,dist=null;
function setC(){var R=+document.getElementById('rng').value;if(!dist)dist=R*2.5;camera.position.set(Math.sin(rotY)*Math.cos(rotX)*dist,Math.sin(rotX)*dist+5,Math.cos(rotY)*Math.cos(rotX)*dist);camera.lookAt(0,0,0);}
document.addEventListener('mousedown',function(e){drag=true;ox=e.clientX;oy=e.clientY;});
document.addEventListener('mouseup',function(){drag=false;});
document.addEventListener('mousemove',function(e){if(!drag)return;rotY+=(e.clientX-ox)*0.005;rotX-=(e.clientY-oy)*0.005;rotX=Math.max(-1.4,Math.min(1.4,rotX));ox=e.clientX;oy=e.clientY;setC();});
document.addEventListener('wheel',function(e){if(!dist)dist=20;dist=Math.max(3,Math.min(200,dist+e.deltaY*0.05));setC();},{passive:true});
window.addEventListener('resize',function(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
setC();
function anim(){requestAnimationFrame(anim);t+=0.02;${doAnimate?'doRebuild();':''}renderer.render(scene,camera);}anim();
}());<\/script></body></html>`;
  }

  function init(container, btn) {
    const panel = document.createElement('div');
    panel.id = 'ms3d-panel';
    panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;overflow-y:auto;padding:14px;font-family:Inter,sans-serif;flex-direction:column;border-radius:8px;';

    const presetsHTML = PRESETS.map(p =>
      `<button onclick="document.getElementById('ms3d-formula').value=\`${p.f}\`" style="padding:3px 8px;background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.25);border-radius:10px;color:#a5b4fc;font-size:10px;cursor:pointer;">${p.n}</button>`
    ).join('');

    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#6366f1,#a855f7);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;">📐</div>
        <div><div style="font-size:13px;font-weight:700;color:#f1f5f9;">Math → 3D Surface</div><div style="font-size:10px;color:#64748b;">f(x, y, t) interactive surface</div></div>
      </div>
      <div style="font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Presets</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px;">${presetsHTML}</div>
      <label style="font-size:10px;color:#94a3b8;font-weight:600;">Formula (x, y, t, sin, cos, sqrt, PI...)</label>
      <textarea id="ms3d-formula" rows="2" style="width:100%;padding:7px;background:#111827;border:1px solid rgba(99,102,241,0.3);border-radius:6px;color:#10b981;font-size:11px;font-family:monospace;resize:none;margin-top:4px;box-sizing:border-box;">sin(x*2+t)*cos(y*2+t)*4</textarea>
      <div style="display:flex;align-items:center;gap:6px;margin-top:8px;"><span style="font-size:10px;color:#94a3b8;min-width:90px;">Resolution <b id="ms3d-rv">40</b></span><input type="range" id="ms3d-res" min="10" max="80" value="40" style="flex:1;accent-color:#6366f1;"></div>
      <div style="display:flex;align-items:center;gap:6px;margin-top:5px;"><span style="font-size:10px;color:#94a3b8;min-width:90px;">Range ± <b id="ms3d-rangev">8</b></span><input type="range" id="ms3d-range" min="2" max="20" value="8" style="flex:1;accent-color:#6366f1;"></div>
      <div style="display:flex;gap:8px;margin-top:8px;align-items:center;">
        <select id="ms3d-color" style="flex:1;padding:5px;background:#111827;border:1px solid #334155;border-radius:6px;color:#f1f5f9;font-size:10px;">
          <option value="height">Height Gradient</option><option value="neon">Neon</option><option value="thermal">Thermal</option><option value="gold">Gold</option><option value="ice">Ice</option>
        </select>
        <label style="font-size:10px;color:#94a3b8;display:flex;align-items:center;gap:4px;white-space:nowrap;"><input type="checkbox" id="ms3d-anim" checked style="accent-color:#6366f1;"> Animate</label>
        <label style="font-size:10px;color:#94a3b8;display:flex;align-items:center;gap:4px;"><input type="checkbox" id="ms3d-wf" style="accent-color:#6366f1;"> Wire</label>
      </div>
      <button id="ms3d-add" style="width:100%;margin-top:10px;padding:9px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(99,102,241,0.4);">📐 ADD TO SCENE</button>
      <button id="ms3d-gen" style="width:100%;margin-top:6px;padding:7px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);border-radius:8px;color:#a5b4fc;font-size:11px;font-weight:600;cursor:pointer;">📄 Generate Standalone HTML</button>
    `;
    container.appendChild(panel);

    document.getElementById('ms3d-res').addEventListener('input', e => document.getElementById('ms3d-rv').textContent = e.target.value);
    document.getElementById('ms3d-range').addEventListener('input', e => document.getElementById('ms3d-rangev').textContent = e.target.value);
    
    document.getElementById('ms3d-add').addEventListener('click', () => {
      const formula = document.getElementById('ms3d-formula').value.trim() || 'sin(x)*cos(y)*3';
      const res = +document.getElementById('ms3d-res').value;
      const range = +document.getElementById('ms3d-range').value;
      const colorMode = document.getElementById('ms3d-color').value;
      const doAnimate = document.getElementById('ms3d-anim').checked;
      const doWire = document.getElementById('ms3d-wf').checked;
      
      // Call parent to add model
      if(window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('math-surface', { formula, res, range, colorMode, doAnimate, doWire });
        panel.style.display = 'none';
      }
    });

    document.getElementById('ms3d-gen').addEventListener('click', () => {
      const formula = document.getElementById('ms3d-formula').value.trim() || 'sin(x)*cos(y)*3';
      const res = +document.getElementById('ms3d-res').value;
      const range = +document.getElementById('ms3d-range').value;
      const colorMode = document.getElementById('ms3d-color').value;
      const doAnimate = document.getElementById('ms3d-anim').checked;
      const doWire = document.getElementById('ms3d-wf').checked;
      const html = makeHTML(formula, res, range, colorMode, doAnimate, doWire);
      const ed = document.getElementById('code-editor');
      if (ed) { if (window.pushUndo) window.pushUndo(); ed.value = html; ed.dispatchEvent(new Event('input', {bubbles: true})); }
      if (window.toast) window.toast('📐 Math Surface generated!');
    });

    if (btn) btn.addEventListener('click', () => {
      const vis = panel.style.display === 'flex';
      document.querySelectorAll('[id$="-panel"]').forEach(p => p.style.display = 'none');
      panel.style.display = vis ? 'none' : 'flex';
    });
  }
  return { init };
})();
