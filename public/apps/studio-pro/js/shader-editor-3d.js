// Shader Material Editor 3D
window.ShaderEditor3D = (() => {
  'use strict';

  const PRESETS = [
    { name: 'Plasma', code: `
      uniform float time;
      varying vec2 vUv;
      void main() {
        vec2 p = -1.0 + 2.0 * vUv;
        float a = atan(p.y, p.x);
        float r = length(p);
        float v = sin(r * 10.0 - time * 2.0) + sin(a * 5.0 + time);
        gl_FragColor = vec4(v * 0.5 + 0.5, abs(sin(time)), 1.0 - v, 1.0);
      }
    `},
    { name: 'Fire', code: `
      uniform float time;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float d = length(p);
        float v = sin(10.0 * d - 5.0 * time) * exp(-2.0 * d);
        gl_FragColor = vec4(1.0, 0.5 + 0.5 * v, 0.0, 1.0);
      }
    `},
    { name: 'Matrix', code: `
      uniform float time;
      varying vec2 vUv;
      void main() {
        float v = fract(vUv.y * 10.0 + time);
        gl_FragColor = vec4(0.0, v, 0.0, 1.0);
      }
    `}
  ];

  function makeHTML(shaderCode) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>3D Shader Preview</title>
<style>*{margin:0;padding:0;}body{background:#050815;overflow:hidden;}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script></head><body>
<script>(function(){
var s=new THREE.Scene();
var c=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,0.1,1000);
c.position.z=5;
var r=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
r.setSize(innerWidth,innerHeight);document.body.appendChild(r.domElement);

var uniforms={time:{value:0}};
var mat=new THREE.ShaderMaterial({
  uniforms:uniforms,
  vertexShader:"varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
  fragmentShader:\`${shaderCode}\`
});
var mesh=new THREE.Mesh(new THREE.SphereGeometry(2,64,64),mat);
s.add(mesh);

function anim(t){
  requestAnimationFrame(anim);
  uniforms.time.value=t/1000;
  mesh.rotation.y+=0.01;
  r.render(s,c);
}
anim(0);
window.addEventListener('resize',()=>{c.aspect=innerWidth/innerHeight;c.updateProjectionMatrix();r.setSize(innerWidth,innerHeight);});
}());<\/script></body></html>`;
  }

  function init(container, btn) {
    const panel = document.createElement('div');
    panel.id = 'se3d-panel';
    panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:14px;font-family:Inter,sans-serif;flex-direction:column;border-radius:8px;';
    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#ff00ff,#00ffff);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;">🎨</div>
        <div><div style="font-size:13px;font-weight:700;color:#f1f5f9;">Shader Editor 3D</div><div style="font-size:10px;color:#64748b;">Live GLSL shader editor</div></div>
      </div>
      <div style="display:flex;gap:4px;margin-bottom:10px;">
        ${PRESETS.map(p=>`<button onclick="document.getElementById('se3d-code').value=\`${p.code.trim()}\`" style="padding:3px 8px;background:rgba(255,0,255,0.1);border:1px solid rgba(255,0,255,0.3);border-radius:10px;color:#ff00ff;font-size:10px;cursor:pointer;">${p.name}</button>`).join('')}
      </div>
      <textarea id="se3d-code" rows="10" style="width:100%;padding:7px;background:#111827;border:1px solid #ff00ff;border-radius:6px;color:#00ffff;font-size:11px;font-family:monospace;resize:none;">${PRESETS[0].code.trim()}</textarea>
      <button id="se3d-add" style="width:100%;margin-top:10px;padding:9px;background:linear-gradient(135deg,#ff00ff,#00ffff);border:none;border-radius:8px;color:#000;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(255,0,255,0.4);">🎨 ADD TO SCENE</button>
      <button id="se3d-gen" style="width:100%;margin-top:6px;padding:7px;background:rgba(255,0,255,0.1);border:1px solid rgba(255,0,255,0.3);border-radius:8px;color:#ff00ff;font-size:11px;font-weight:600;cursor:pointer;">📄 Generate Standalone HTML</button>
    `;
    container.appendChild(panel);

    document.getElementById('se3d-add').addEventListener('click', () => {
      const shaderCode = document.getElementById('se3d-code').value;
      if(window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('shader-mesh', { shaderCode });
        panel.style.display = 'none';
      }
    });

    document.getElementById('se3d-gen').addEventListener('click', () => {
      const code = document.getElementById('se3d-code').value;
      const html = makeHTML(code);
      const ed = document.getElementById('code-editor');
      if (ed) { ed.value = html; ed.dispatchEvent(new Event('input', {bubbles:true})); }
      if (window.toast) window.toast('🎨 Shader scene generated!');
    });

    if (btn) btn.addEventListener('click', () => {
      const vis = panel.style.display === 'flex';
      document.querySelectorAll('[id$="-panel"]').forEach(p => p.style.display = 'none');
      panel.style.display = vis ? 'none' : 'flex';
    });
  }
  return { init };
})();
