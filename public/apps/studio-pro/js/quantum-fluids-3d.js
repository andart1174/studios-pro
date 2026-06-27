// Quantum Fluids 3D Generator
window.QuantumFluids3D = (() => {
  'use strict';
  
  function makeHTML(particleCount, speed, colorMode, doWire) {
    // Generate shader codes
    let vert = `
      uniform float time;
      uniform float uSpeed;
      varying vec3 vColor;
      
      // Simplex noise function
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
      float snoise(vec3 v) { 
        const vec2 C = vec2(1.0/6.0, 1.0/3.0) ;
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy) );
        vec3 x0 = v - i + dot(i, C.xxx) ;
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i); 
        vec4 p = permute( permute( permute( 
                   i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                 + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
                 + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
        float n_ = 0.142857142857;
        vec3  ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m; return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
      }

      void main() {
        vec3 pos = position;
        float t = time * uSpeed;
        
        // Quantum distortion
        float noise = snoise(vec3(pos.x * 0.02, pos.y * 0.02 + t, pos.z * 0.02));
        float noise2 = snoise(vec3(pos.x * 0.01 - t, pos.y * 0.01, pos.z * 0.01 + t));
        
        pos.x += noise * 30.0;
        pos.y += noise2 * 30.0;
        pos.z += snoise(vec3(pos.x*0.03, pos.y*0.03, t)) * 30.0;
        
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = (150.0 / -mvPosition.z);
        
        // Color mapping
        float intensity = (noise + noise2 + 2.0) / 4.0;
    `;

    if (colorMode === 'plasma') {
      vert += `vColor = vec3(intensity * 1.5, 0.2, 1.0 - intensity);`;
    } else if (colorMode === 'fire') {
      vert += `vColor = vec3(1.0, intensity * 0.8, 0.0);`;
    } else if (colorMode === 'toxic') {
      vert += `vColor = vec3(intensity * 0.5, 1.0, intensity * 0.2);`;
    } else { // quantum (cyan/blue)
      vert += `vColor = vec3(0.0, intensity * 0.8 + 0.2, 1.0);`;
    }
    
    vert += `\n}`;

    const frag = `
      varying vec3 vColor;
      void main() {
        // Round particle
        vec2 xy = gl_PointCoord.xy - vec2(0.5);
        float ll = length(xy);
        if(ll > 0.5) discard;
        
        // Glow effect
        float a = (0.5 - ll) * 2.0;
        gl_FragColor = vec4(vColor, a * 0.8);
      }
    `;

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Quantum Fluids 3D</title>
<style>*{margin:0;padding:0;}body{background:#000;overflow:hidden;font-family:sans-serif;}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/controls/OrbitControls.js"><\/script>
</head><body>
<div style="position:fixed;top:10px;left:50%;transform:translateX(-50%);background:rgba(10,14,30,0.8);border:1px solid rgba(16,185,129,0.3);padding:6px 14px;border-radius:20px;font-size:11px;color:#94a3b8;z-index:9;">✨ Quantum Particle Simulation &nbsp;|&nbsp; Rotate & Zoom</div>
<script>(function(){
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 2000);
camera.position.set(0, 100, 300);

const renderer = new THREE.WebGLRenderer({antialias:true, preserveDrawingBuffer:true});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 2.0;

// Particles
const pCount = ${particleCount};
const geo = new THREE.BufferGeometry();
const pos = new Float32Array(pCount * 3);

// Create a sphere volume
for(let i=0; i<pCount; i++) {
    const r = Math.random() * 150;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);
    pos[i*3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i*3+2] = r * Math.cos(phi);
}
geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

const mat = new THREE.ShaderMaterial({
    uniforms: {
        time: { value: 0.0 },
        uSpeed: { value: ${speed} }
    },
    vertexShader: \`${vert}\`,
    fragmentShader: \`${frag}\`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
});

const particles = new THREE.Points(geo, mat);
scene.add(particles);

// Optional Grid
${doWire ? `
const wire = new THREE.Mesh(new THREE.IcosahedronGeometry(180, 2), new THREE.MeshBasicMaterial({color:0x334455, wireframe:true, transparent:true, opacity:0.2}));
scene.add(wire);
` : ''}

window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

function anim(){
    requestAnimationFrame(anim);
    mat.uniforms.time.value += 0.01;
    controls.update();
    renderer.render(scene, camera);
}
anim();
}());<\/script></body></html>`;
  }

  function init(container, btn) {
    const panel = document.createElement('div');
    panel.id = 'fluids-panel';
    panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;overflow-y:auto;padding:14px;font-family:Inter,sans-serif;flex-direction:column;border-radius:8px;';

    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#0ea5e9,#6366f1);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;">🌊</div>
        <div><div style="font-size:13px;font-weight:700;color:#f1f5f9;">Quantum Fluids</div><div style="font-size:10px;color:#64748b;">Shader Particle Dynamics</div></div>
      </div>
      
      <div style="display:flex;align-items:center;gap:6px;margin-top:10px;">
        <span style="font-size:10px;color:#94a3b8;min-width:80px;">Particles <b id="qf-pv">50000</b></span>
        <input type="range" id="qf-count" min="10000" max="200000" step="10000" value="50000" style="flex:1;accent-color:#0ea5e9;">
      </div>
      
      <div style="display:flex;align-items:center;gap:6px;margin-top:10px;">
        <span style="font-size:10px;color:#94a3b8;min-width:80px;">Speed <b id="qf-sv">1.0</b></span>
        <input type="range" id="qf-speed" min="0.1" max="5.0" step="0.1" value="1.0" style="flex:1;accent-color:#0ea5e9;">
      </div>

      <div style="margin-top:12px;">
        <label style="font-size:10px;color:#94a3b8;">Color Profile</label>
        <select id="qf-color" style="width:100%;padding:6px;background:#1e293b;border:1px solid #334155;border-radius:4px;color:#f1f5f9;font-size:11px;margin-top:4px;">
          <option value="quantum">Quantum Cyan/Blue</option>
          <option value="plasma">Plasma Violet/Pink</option>
          <option value="fire">Hellfire Orange/Yellow</option>
          <option value="toxic">Toxic Green/Acid</option>
        </select>
      </div>

      <div style="display:flex;gap:15px;margin-top:12px;">
        <label style="font-size:10px;display:flex;align-items:center;gap:4px;color:#cbd5e1;cursor:pointer;"><input type="checkbox" id="qf-wf" checked style="accent-color:#0ea5e9;"> Show Containment Sphere</label>
      </div>

      <button id="qf-add" style="width:100%;margin-top:10px;padding:9px;background:linear-gradient(135deg,#10b981,#0ea5e9);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px rgba(16,185,129,0.4);">🌊 ADD TO SCENE</button>
      <button id="qf-gen" style="width:100%;margin-top:6px;padding:7px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:8px;color:#34d399;font-size:11px;font-weight:600;cursor:pointer;">📄 Generate HTML</button>
    `;
    container.appendChild(panel);

    document.getElementById('qf-count').addEventListener('input', e => document.getElementById('qf-pv').textContent = e.target.value);
    document.getElementById('qf-speed').addEventListener('input', e => document.getElementById('qf-sv').textContent = e.target.value);

    document.getElementById('qf-add').addEventListener('click', () => {
      const pc = +document.getElementById('qf-count').value;
      const sp = +document.getElementById('qf-speed').value;
      const col = document.getElementById('qf-color').value;
      const wf = document.getElementById('qf-wf').checked;
      if(window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('quantum-fluids', { pc, sp, col, wf });
        panel.style.display = 'none';
      }
    });

    document.getElementById('qf-gen').addEventListener('click', () => {
      const pc = +document.getElementById('qf-count').value;
      const sp = +document.getElementById('qf-speed').value;
      const col = document.getElementById('qf-color').value;
      const wf = document.getElementById('qf-wf').checked;
      
      const html = makeHTML(pc, sp, col, wf);
      const ed = document.getElementById('code-editor');
      if (ed) { 
          if(window.pushUndo) window.pushUndo(); 
          ed.value = html; 
          ed.dispatchEvent(new Event('input', {bubbles: true})); 
      }
      if (window.toast) window.toast('🌊 Quantum Fluids generated!');
    });

    if (btn) btn.addEventListener('click', () => {
      const vis = panel.style.display === 'flex';
      document.querySelectorAll('[id$="-panel"]').forEach(p => p.style.display = 'none');
      panel.style.display = vis ? 'none' : 'flex';
    });
  }

  return { init };
})();
