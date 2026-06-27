// Video → 3D Hologram Generator
window.VideoTo3D = (() => {
    'use strict';
    let _container, _panel;
    let selectedVideo = null;
    let lastGeneratedCode = '';

    const CONFIG = {
        resolution: 'high',
        shape: 'plane',
        environment: 'none',
        chromaKey: false,
        chromaColor: '#00ff00',
        chromaSimilarity: 0.1,
        chromaSmoothness: 0.05,
        autoRotate: true,
        ambientIntensity: 0.8,
        glowIntensity: 2.0
    };

    function init(container, btn) {
        _container = container;
        buildUI();
        if (btn) btn.addEventListener('click', togglePanel);
    }

    function togglePanel() {
        const visible = _panel.style.display === 'flex';
        document.querySelectorAll('[id$="-panel"]').forEach(p => p.style.display = 'none');
        _panel.style.display = visible ? 'none' : 'flex';
    }

    function buildUI() {
        const isFR = (window.currentLang || 'en') === 'fr';
        _panel = document.createElement('div');
        _panel.id = 'v3d-panel';
        _panel.style.cssText = 'display:none;position:absolute;inset:0;background:#0d1225;z-index:40;padding:20px;flex-direction:column;font-family:Inter,sans-serif;color:#f1f5f9;overflow-y:auto;';
        
        _panel.innerHTML = `
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;border-bottom:1px solid #1e293b;padding-bottom:15px;">
                <div style="width:40px;height:40px;background:linear-gradient(135deg,#f43f5e,#fb7185);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;">🎬</div>
                <div>
                    <div style="font-size:16px;font-weight:700;">${isFR ? 'Hologramme Vidéo 3D' : 'Video 3D Hologram'}</div>
                    <div style="font-size:11px;color:#64748b;">${isFR ? 'Convertir des vidéos en objets 3D' : 'Convert videos into 3D objects'}</div>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:20px;">
                <div style="grid-column: span 2; border:2px dashed rgba(244,63,94,0.3); border-radius:12px; padding:20px; text-align:center; cursor:pointer; background:rgba(244,63,94,0.02);" id="v3d-drop">
                    <span style="font-size:28px;display:block;margin-bottom:10px;">📤</span>
                    <span style="font-size:12px;color:#94a3b8;">${isFR ? 'Déposez la vidéo ou cliquez ici' : 'Drop video or click here'}</span>
                    <input type="file" id="v3d-input" accept="video/*" style="display:none;">
                    <div id="v3d-filename" style="margin-top:10px;font-size:11px;color:#fb7185;font-weight:600;"></div>
                </div>

                <div>
                    <label style="font-size:10px;color:#94a3b8;font-weight:600;display:block;margin-bottom:5px;">${isFR ? 'Forme 3D' : '3D Shape'}</label>
                    <select id="v3d-shape" style="width:100%;padding:8px;background:#1e293b;border:1px solid #334155;border-radius:8px;color:#fff;font-size:11px;">
                        <option value="plane">Plane</option>
                        <option value="curved">Curved Screen</option>
                        <option value="sphere">Sphere</option>
                        <option value="cube">Cube</option>
                        <option value="cylinder">Cylinder</option>
                        <option value="torus">Torus</option>
                        <option value="tunnel">Tunnel</option>
                        <option value="pyramid">Pyramid</option>
                    </select>
                </div>

                <div>
                    <label style="font-size:10px;color:#94a3b8;font-weight:600;display:block;margin-bottom:5px;">${isFR ? 'Environnement' : 'Environment'}</label>
                    <select id="v3d-env" style="width:100%;padding:8px;background:#1e293b;border:1px solid #334155;border-radius:8px;color:#fff;font-size:11px;">
                        <option value="none">None</option>
                        <option value="cosmos">Cosmos</option>
                        <option value="cyberpunk">Cyberpunk Grid</option>
                        <option value="ocean">Underwater</option>
                        <option value="storm">Techno Storm</option>
                        <option value="snow">Cold Void</option>
                    </select>
                </div>

                <div style="grid-column: span 2; background:rgba(30,41,59,0.5); padding:15px; border-radius:12px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                        <span style="font-size:11px;font-weight:700;">Chroma Key (Green Screen)</span>
                        <input type="checkbox" id="v3d-chroma" style="accent-color:#f43f5e;">
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
                        <div>
                            <label style="font-size:9px;color:#64748b;">${isFR ? 'Couleur' : 'Color'}</label>
                            <input type="color" id="v3d-chroma-color" value="#00ff00" style="width:100%;height:25px;border:none;background:none;cursor:pointer;">
                        </div>
                        <div>
                            <label style="font-size:9px;color:#64748b;">Simil.</label>
                            <input type="range" id="v3d-chroma-sim" min="0" max="1" step="0.01" value="0.1" style="width:100%;accent-color:#f43f5e;">
                        </div>
                        <div>
                            <label style="font-size:9px;color:#64748b;">Smooth</label>
                            <input type="range" id="v3d-chroma-smooth" min="0" max="0.5" step="0.01" value="0.05" style="width:100%;accent-color:#f43f5e;">
                        </div>
                    </div>
                </div>

                <div style="grid-column: span 2; display:flex; gap:15px;">
                    <label style="font-size:11px;display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="v3d-rotate" checked style="accent-color:#f43f5e;"> ${isFR ? 'Rotation Auto' : 'Auto Rotate'}</label>
                </div>
            </div>

            <button id="v3d-generate" style="width:100%;padding:14px;background:linear-gradient(135deg,#f43f5e,#fb7185);border:none;border-radius:12px;color:#fff;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 20px rgba(244,63,94,0.4);transition:0.3s;">🚀 ${isFR ? 'GÉNÉRER L\'HOLOGRAMME' : 'GENERATE HOLOGRAM'}</button>
            <button id="v3d-btn-download" style="display:none;width:100%;margin-top:10px;padding:10px;background:rgba(244,63,94,0.1);border:1px solid rgba(244,63,94,0.3);border-radius:12px;color:#fb7185;font-size:11px;font-weight:600;cursor:pointer;">⬇️ ${isFR ? 'Télécharger le code' : 'Download Code'}</button>
        `;

        _container.appendChild(_panel);
        bindEvents();
    }

    function bindEvents() {
        const drop = _panel.querySelector('#v3d-drop');
        const input = _panel.querySelector('#v3d-input');
        
        drop.onclick = () => input.click();
        input.onchange = e => handleFile(e.target.files[0]);
        
        drop.addEventListener('dragover', e => { e.preventDefault(); drop.style.background = 'rgba(244,63,94,0.05)'; });
        drop.addEventListener('dragleave', () => { drop.style.background = 'transparent'; });
        drop.addEventListener('drop', e => { e.preventDefault(); drop.style.background = 'transparent'; handleFile(e.dataTransfer.files[0]); });

        _panel.querySelector('#v3d-generate').onclick = generateHologram;
        _panel.querySelector('#v3d-btn-download').onclick = downloadHologram;
    }

    function handleFile(file) {
        if (!file || !file.type.startsWith('video/')) return;
        selectedVideo = file;
        _panel.querySelector('#v3d-filename').textContent = '✅ ' + file.name;
    }

    function downloadHologram() {
        if (!lastGeneratedCode) return;
        const blob = new Blob([lastGeneratedCode], { type: 'text/html' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'hologram.html';
        a.click();
    }

    async function generateHologram() {
        if (!selectedVideo) { alert("Please select a video file."); return; }
        const isFR = (window.currentLang || 'en') === 'fr';
        const btn = _panel.querySelector('#v3d-generate');
        btn.innerHTML = '⚡ ' + (isFR ? 'TRAITEMENT...' : 'PROCESSING...');
        
        const reader = new FileReader();
        reader.readAsDataURL(selectedVideo);
        reader.onload = () => {
            const videoBase64 = reader.result;
            const currentConfig = {
                shape: _panel.querySelector('#v3d-shape').value,
                environment: _panel.querySelector('#v3d-env').value,
                chromaKey: _panel.querySelector('#v3d-chroma').checked,
                chromaColor: _panel.querySelector('#v3d-chroma-color').value,
                chromaSimilarity: _panel.querySelector('#v3d-chroma-sim').value,
                chromaSmoothness: _panel.querySelector('#v3d-chroma-smooth').value,
                autoRotate: _panel.querySelector('#v3d-rotate').checked,
                ambientIntensity: 0.8,
                glowIntensity: 2.0
            };

            const code = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>3D Video Hologram</title>
<style>*{margin:0;padding:0;}body{background:#000;overflow:hidden;font-family:sans-serif;}#overlay{position:fixed;inset:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;color:#fff;z-index:100;cursor:pointer;font-weight:700;letter-spacing:1px;}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script></head><body>
<div id="overlay" onclick="startApp()">${isFR ? 'CLIQUEZ POUR LANCER' : 'CLICK TO START'}</div>
<script>(function(){
let scene,camera,renderer,video,texture,mesh,light,canvas,ctx;
function init(){
scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,0.1,2000);camera.position.z=300;
renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);document.body.appendChild(renderer.domElement);
video=document.createElement('video');video.src='${videoBase64}';video.loop=true;video.crossOrigin='anonymous';
texture=new THREE.VideoTexture(video);
let geo;const shp='${currentConfig.shape}';
if(shp==='curved')geo=new THREE.CylinderGeometry(400,400,220,64,1,true,-Math.PI/4,Math.PI/2);
else if(shp==='sphere')geo=new THREE.SphereGeometry(120,64,64);
else if(shp==='cube')geo=new THREE.BoxGeometry(150,150,150);
else if(shp==='cylinder')geo=new THREE.CylinderGeometry(80,80,200,32);
else if(shp==='torus')geo=new THREE.TorusGeometry(100,30,16,100);
else if(shp==='tunnel'){geo=new THREE.CylinderGeometry(200,200,1000,32,1,true);geo.rotateX(Math.PI/2);}
else geo=new THREE.PlaneGeometry(320,180);
let mat;const uc=${currentConfig.chromaKey};
if(uc){mat=new THREE.ShaderMaterial({transparent:true,uniforms:{tex:{value:texture},keyColor:{value:new THREE.Color('${currentConfig.chromaColor}')},similarity:{value:${currentConfig.chromaSimilarity}},smoothness:{value:${currentConfig.chromaSmoothness}}},vertexShader:\`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}\`,fragmentShader:\`uniform sampler2D tex;uniform vec3 keyColor;uniform float similarity;uniform float smoothness;varying vec2 vUv;void main(){vec4 rgba=texture2D(tex,vUv);float d=distance(rgba.rgb,keyColor);float alpha=smoothstep(similarity,similarity+smoothness,d);gl_FragColor=vec4(rgba.rgb,alpha);}\`,side:THREE.DoubleSide});}
else{mat=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});}
mesh=new THREE.Mesh(geo,mat);scene.add(mesh);
scene.add(new THREE.AmbientLight(0xffffff,${currentConfig.ambientIntensity}));
light=new THREE.PointLight(0x6366f1,2,600);light.position.set(0,0,150);scene.add(light);
canvas=document.createElement('canvas');canvas.width=8;canvas.height=8;ctx=canvas.getContext('2d');
const env='${currentConfig.environment}';
if(env!=='none'){
const eg=new THREE.Group();scene.add(eg);const c=2000;const pg=new THREE.BufferGeometry();const pp=new Float32Array(c*3);
if(env==='cosmos'){for(let i=0;i<c*3;i++)pp[i]=(Math.random()-0.5)*2000;pg.setAttribute('position',new THREE.BufferAttribute(pp,3));eg.add(new THREE.Points(pg,new THREE.PointsMaterial({color:0xffffff,size:2})));}
else if(env==='cyberpunk')eg.add(new THREE.GridHelper(2000,50,0x6366f1,0x1e1b4b));
window.eg=eg;
}
animate();}
window.startApp=()=>{document.getElementById('overlay').style.display='none';video.play();};
function animate(){requestAnimationFrame(animate);if('${currentConfig.autoRotate}'==='true')mesh.rotation.y+=0.005;if(video.readyState>=2){ctx.drawImage(video,0,0,8,8);const d=ctx.getImageData(4,4,1,1).data;light.color.setRGB(d[0]/255,d[1]/255,d[2]/255);}renderer.render(scene,camera);}
init();
}());<\/script></body></html>`;

            const editor = document.getElementById('code-editor');
            if (editor) {
                lastGeneratedCode = code;
                editor.value = code;
                editor.dispatchEvent(new Event('input', { bubbles: true }));
                const dl = document.getElementById('v3d-btn-download'); if(dl) dl.style.display='block';
                if (window.toggleMode) window.toggleMode('code');
                if (window.toast) window.toast(isFR ? '✨ Hologramme Généré !' : '✨ Hologram Generated!');
            }
            btn.innerHTML = isFR ? '🚀 GÉNÉRER L\'HOLOGRAMME' : '🚀 GENERATE HOLOGRAM';
        };
        reader.onerror = () => { alert("Error reading video file."); btn.innerHTML = isFR ? '🚀 GÉNÉRER L\'HOLOGRAMME' : '🚀 GENERATE HOLOGRAM'; };
    }

    return { init };
})();
