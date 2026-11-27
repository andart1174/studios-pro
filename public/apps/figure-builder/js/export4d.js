/**
 * export4d.js — Unified 3D, AR, Video, PNG, HTML & Project Export Suite (v5.0)
 * ============================================================================
 * Converts ANY active 4D Figure, Photo-4D Sculpture, Solid PBR Robot, or
 * Hyper-Sketch (including InstancedMesh struts/gems/voxels!) into clean
 * watertight standard THREE.Mesh triangles for:
 *   - Binary .GLB (Three.js r128 3-arg GLTFExporter.parse + PBR textures/colors)
 *   - Binary .STL (Zero-CDN pure-JS binary STL encoder, 3D-print ready!)
 *   - Wavefront .OBJ (v / vt / vn / f triangles)
 *   - Direct 1-Click AR Viewer 3D GLB Handoff (StudiosProAR bridge)
 *   - 60fps Video Recorder (MP4/WebM + Web Audio) + 1-Click 360° 4D Turntable Reel
 *   - Studio PNG Export (HD / 2K / 4K + Transparent Background)
 *   - Standalone Interactive 4D HTML Viewer (embedded Base64 GLB)
 *   - FREE Local Project Save / Load (.sp4dfig JSON)
 */

const Export4D = (() => {

    // ─── Helper: Convert InstancedMesh into a real baked standard Mesh ───────
    function bakeInstancedMesh(instMesh) {
        const count = instMesh.count || 0;
        if (count === 0 || !instMesh.geometry) return null;

        const baseGeo = instMesh.geometry.index ? instMesh.geometry.toNonIndexed() : instMesh.geometry.clone();
        const posAttr = baseGeo.attributes.position;
        if (!posAttr) return null;
        const normAttr = baseGeo.attributes.normal;
        const vPerInst = posAttr.count;

        const outPos = new Float32Array(count * vPerInst * 3);
        const outNorm = new Float32Array(count * vPerInst * 3);
        const hasInstColor = !!instMesh.instanceColor;
        const outCol = hasInstColor ? new Float32Array(count * vPerInst * 3) : null;

        const instMat = new THREE.Matrix4();
        const worldMat = new THREE.Matrix4();
        const normMat = new THREE.Matrix3();
        const v = new THREE.Vector3();
        const n = new THREE.Vector3();
        const c = new THREE.Color();

        instMesh.updateMatrixWorld(true);
        let pOff = 0, cOff = 0;
        let validCount = 0;

        for (let i = 0; i < count; i++) {
            instMesh.getMatrixAt(i, instMat);
            // Skip zero-scaled degenerate instances
            const sx = Math.hypot(instMat.elements[0], instMat.elements[1], instMat.elements[2]);
            const sy = Math.hypot(instMat.elements[4], instMat.elements[5], instMat.elements[6]);
            const sz = Math.hypot(instMat.elements[8], instMat.elements[9], instMat.elements[10]);
            if (sx < 1e-5 || sy < 1e-5 || sz < 1e-5) continue;

            worldMat.multiplyMatrices(instMesh.matrixWorld, instMat);
            normMat.getNormalMatrix(worldMat);
            if (hasInstColor) instMesh.getColorAt(i, c);

            for (let k = 0; k < vPerInst; k++) {
                v.fromBufferAttribute(posAttr, k).applyMatrix4(worldMat);
                outPos[pOff]     = v.x;
                outPos[pOff + 1] = v.y;
                outPos[pOff + 2] = v.z;

                if (normAttr) {
                    n.fromBufferAttribute(normAttr, k).applyMatrix3(normMat).normalize();
                    outNorm[pOff]     = n.x;
                    outNorm[pOff + 1] = n.y;
                    outNorm[pOff + 2] = n.z;
                }
                pOff += 3;

                if (outCol) {
                    outCol[cOff]     = c.r;
                    outCol[cOff + 1] = c.g;
                    outCol[cOff + 2] = c.b;
                    cOff += 3;
                }
            }
            validCount++;
        }

        baseGeo.dispose();
        if (validCount === 0) return null;

        const mergedGeo = new THREE.BufferGeometry();
        mergedGeo.setAttribute('position', new THREE.BufferAttribute(outPos.subarray(0, pOff), 3));
        if (normAttr) {
            mergedGeo.setAttribute('normal', new THREE.BufferAttribute(outNorm.subarray(0, pOff), 3));
        } else {
            mergedGeo.computeVertexNormals();
        }
        if (outCol) {
            mergedGeo.setAttribute('color', new THREE.BufferAttribute(outCol.subarray(0, cOff), 3));
        }

        const srcMat = Array.isArray(instMesh.material) ? instMesh.material[0] : instMesh.material;
        const mat = new THREE.MeshStandardMaterial({
            color: hasInstColor ? 0xffffff : (srcMat && srcMat.color ? srcMat.color.clone() : new THREE.Color(0x00f3ff)),
            emissive: srcMat && srcMat.emissive ? srcMat.emissive.clone() : new THREE.Color(0x000000),
            emissiveIntensity: srcMat && srcMat.emissiveIntensity !== undefined ? Math.min(0.8, srcMat.emissiveIntensity) : 0.15,
            roughness: srcMat && srcMat.roughness !== undefined ? srcMat.roughness : 0.3,
            metalness: srcMat && srcMat.metalness !== undefined ? srcMat.metalness : 0.45,
            vertexColors: hasInstColor,
            transparent: !!(srcMat && srcMat.transparent && srcMat.opacity < 0.98),
            opacity: srcMat && srcMat.opacity !== undefined ? srcMat.opacity : 1.0,
            side: THREE.DoubleSide,
        });
        return new THREE.Mesh(mergedGeo, mat);
    }

    /**
     * Collect and bake ANY active scene group(s) into clean standard THREE.Meshes.
     * Supports standard Mesh, InstancedMesh (struts/gems/voxels), and photo textures.
     */
    function bakeExportableGroup(sourceGroups) {
        const list = Array.isArray(sourceGroups) ? sourceGroups : [sourceGroups];
        const baked = new THREE.Group();
        baked.name = 'StudiosPro_4D_Figure';
        let triangleCount = 0;

        list.forEach(root => {
            if (!root || !root.visible) return;
            root.updateMatrixWorld(true);
            root.traverse(obj => {
                if (!obj.visible) return;
                if (obj.userData && (obj.userData.isHelper || obj.userData.isOverlay || obj.userData.isTrim)) return;

                if (obj.isInstancedMesh) {
                    const bakedMesh = bakeInstancedMesh(obj);
                    if (bakedMesh) {
                        baked.add(bakedMesh);
                        const pa = bakedMesh.geometry.attributes.position;
                        if (pa) triangleCount += Math.floor(pa.count / 3);
                    }
                    return;
                }

                if (obj.isMesh && obj.geometry && obj.geometry.attributes && obj.geometry.attributes.position) {
                    const srcMat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
                    // Skip pure wireframe overlay clones when solid base exists
                    if (srcMat && srcMat.wireframe && obj.userData && obj.userData.isOverlay) return;

                    const geo = obj.geometry.clone();
                    geo.applyMatrix4(obj.matrixWorld);
                    if (!geo.attributes.normal) geo.computeVertexNormals();

                    const hasVCol = !!geo.attributes.color && !(srcMat && srcMat.map);
                    const mat = new THREE.MeshStandardMaterial({
                        color: srcMat && srcMat.color ? srcMat.color.clone() : new THREE.Color(0x00f3ff),
                        map: srcMat && srcMat.map ? srcMat.map : null,
                        emissive: srcMat && srcMat.emissive ? srcMat.emissive.clone() : new THREE.Color(0x000000),
                        emissiveIntensity: srcMat && srcMat.emissiveIntensity !== undefined ? Math.min(0.6, srcMat.emissiveIntensity) : 0.1,
                        roughness: srcMat && srcMat.roughness !== undefined ? srcMat.roughness : 0.32,
                        metalness: srcMat && srcMat.metalness !== undefined ? srcMat.metalness : 0.35,
                        vertexColors: hasVCol && !!(srcMat && srcMat.vertexColors),
                        transparent: !!(srcMat && srcMat.transparent && srcMat.opacity < 0.98),
                        opacity: srcMat && srcMat.opacity !== undefined ? srcMat.opacity : 1.0,
                        side: THREE.DoubleSide,
                    });

                    const mesh = new THREE.Mesh(geo, mat);
                    baked.add(mesh);
                    const idx = geo.index;
                    triangleCount += idx ? Math.floor(idx.count / 3) : Math.floor(geo.attributes.position.count / 3);
                }
            });
        });

        return { group: baked, triangles: triangleCount };
    }

    function disposeBaked(group) {
        if (!group) return;
        group.traverse(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                // Do NOT dispose shared photo canvas textures (owned by Photo4DEngine)
                if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                else obj.material.dispose();
            }
        });
    }

    function triggerDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.dataset.bypassed = 'true';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1500);
    }

    // ─── 1. PURE-JS BINARY STL ENCODER (Zero-CDN, Watertight 3D Print!) ──────
    function buildBinarySTLBuffer(bakedGroup) {
        let totalTris = 0;
        const meshes = [];
        bakedGroup.traverse(obj => {
            if (!obj.isMesh || !obj.geometry || !obj.geometry.attributes.position) return;
            const g = obj.geometry;
            const tris = g.index ? Math.floor(g.index.count / 3) : Math.floor(g.attributes.position.count / 3);
            if (tris > 0) {
                totalTris += tris;
                meshes.push(obj);
            }
        });
        if (totalTris === 0) return { buffer: null, triangles: 0 };

        // Scale nicely so 1.0 scene unit -> 55 mm physical print size!
        const SCALE_MM = 55.0;
        const buf = new ArrayBuffer(84 + totalTris * 50);
        const dv = new DataView(buf);
        const header = 'Studios-Pro 4D Figure Builder v5.0 Binary STL';
        for (let i = 0; i < Math.min(80, header.length); i++) dv.setUint8(i, header.charCodeAt(i));
        dv.setUint32(80, totalTris, true);

        const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();
        const cb = new THREE.Vector3(), ab = new THREE.Vector3();
        let offset = 84;

        meshes.forEach(mesh => {
            const g = mesh.geometry;
            const pos = g.attributes.position;
            const idx = g.index;
            const writeTri = (ia, ib, ic) => {
                vA.fromBufferAttribute(pos, ia).multiplyScalar(SCALE_MM);
                vB.fromBufferAttribute(pos, ib).multiplyScalar(SCALE_MM);
                vC.fromBufferAttribute(pos, ic).multiplyScalar(SCALE_MM);
                cb.subVectors(vC, vB);
                ab.subVectors(vA, vB);
                cb.cross(ab).normalize();
                dv.setFloat32(offset, cb.x, true); offset += 4;
                dv.setFloat32(offset, cb.y, true); offset += 4;
                dv.setFloat32(offset, cb.z, true); offset += 4;
                dv.setFloat32(offset, vA.x, true); offset += 4;
                dv.setFloat32(offset, vA.y, true); offset += 4;
                dv.setFloat32(offset, vA.z, true); offset += 4;
                dv.setFloat32(offset, vB.x, true); offset += 4;
                dv.setFloat32(offset, vB.y, true); offset += 4;
                dv.setFloat32(offset, vB.z, true); offset += 4;
                dv.setFloat32(offset, vC.x, true); offset += 4;
                dv.setFloat32(offset, vC.y, true); offset += 4;
                dv.setFloat32(offset, vC.z, true); offset += 4;
                dv.setUint16(offset, 0, true); offset += 2;
            };
            if (idx) {
                for (let j = 0; j + 2 < idx.count; j += 3) writeTri(idx.getX(j), idx.getX(j + 1), idx.getX(j + 2));
            } else {
                for (let j = 0; j + 2 < pos.count; j += 3) writeTri(j, j + 1, j + 2);
            }
        });

        return { buffer: buf, triangles: totalTris };
    }

    function exportSTL(sourceGroups, baseName = 'figure-4d') {
        const { group, triangles } = bakeExportableGroup(sourceGroups);
        if (triangles === 0) { disposeBaked(group); return { ok: false, error: 'No solid geometry to export' }; }
        const { buffer, triangles: written } = buildBinarySTLBuffer(group);
        disposeBaked(group);
        if (!buffer || written === 0) return { ok: false, error: 'STL buffer empty' };
        const blob = new Blob([buffer], { type: 'application/octet-stream' });
        triggerDownload(blob, `${baseName}.stl`);
        return { ok: true, bytes: buffer.byteLength, triangles: written };
    }

    // ─── 2. BINARY .GLB EXPORTER (Three.js r128 3-arg GLTFExporter.parse!) ───
    function generateGLBBuffer(sourceGroups) {
        return new Promise((resolve, reject) => {
            if (typeof THREE === 'undefined' || typeof THREE.GLTFExporter === 'undefined') {
                reject(new Error('GLTFExporter unavailable'));
                return;
            }
            const { group, triangles } = bakeExportableGroup(sourceGroups);
            if (triangles === 0) {
                disposeBaked(group);
                reject(new Error('No 3D geometry to export'));
                return;
            }

            // Compute physical bounding dimensions in mm (target max ~180mm)
            const box = new THREE.Box3().setFromObject(group);
            const size = new THREE.Vector3();
            box.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z, 0.01);
            const mmScale = 180 / maxDim;
            const dimensionsMm = {
                width:  Math.round(size.x * mmScale * 10) / 10,
                height: Math.round(size.y * mmScale * 10) / 10,
                depth:  Math.round(size.z * mmScale * 10) / 10,
            };

            const exporter = new THREE.GLTFExporter();
            const onDone = (result) => {
                disposeBaked(group);
                if (result instanceof ArrayBuffer && result.byteLength > 100) {
                    resolve({ buffer: result, triangles, dimensionsMm });
                } else {
                    reject(new Error('GLB binary empty'));
                }
            };
            try {
                // CRITICAL: Three.js r128 GLTFExporter.parse takes EXACTLY 3 args (input, onCompleted, options)!
                const rev = parseInt(THREE.REVISION || '128', 10);
                if (rev >= 135 && exporter.parse.length >= 4) {
                    exporter.parse(group, onDone, (err) => { disposeBaked(group); reject(err); }, { binary: true });
                } else {
                    exporter.parse(group, onDone, { binary: true });
                }
            } catch (err) {
                disposeBaked(group);
                reject(err);
            }
        });
    }

    async function exportGLB(sourceGroups, baseName = 'figure-4d') {
        const res = await generateGLBBuffer(sourceGroups);
        const blob = new Blob([res.buffer], { type: 'model/gltf-binary' });
        triggerDownload(blob, `${baseName}.glb`);
        return { ok: true, bytes: res.buffer.byteLength, triangles: res.triangles };
    }

    // ─── 3. FULL WAVEFRONT .OBJ EXPORTER (v, vt, vn, f Triangles!) ───────────
    function exportOBJ(sourceGroups, baseName = 'figure-4d') {
        const { group, triangles } = bakeExportableGroup(sourceGroups);
        if (triangles === 0) { disposeBaked(group); return { ok: false, error: 'No geometry' }; }

        let out = `# Studios-Pro 4D Figure Builder PRO v5.0\n# Triangles: ${triangles}\no ${baseName}\n`;
        let vOffset = 1, vtOffset = 1, vnOffset = 1;

        group.traverse(obj => {
            if (!obj.isMesh || !obj.geometry || !obj.geometry.attributes.position) return;
            const g = obj.geometry;
            const pos = g.attributes.position;
            const uv = g.attributes.uv;
            const norm = g.attributes.normal;
            const idx = g.index;

            for (let i = 0; i < pos.count; i++) {
                out += `v ${pos.getX(i).toFixed(5)} ${pos.getY(i).toFixed(5)} ${pos.getZ(i).toFixed(5)}\n`;
            }
            if (uv) {
                for (let i = 0; i < uv.count; i++) out += `vt ${uv.getX(i).toFixed(5)} ${uv.getY(i).toFixed(5)}\n`;
            }
            if (norm) {
                for (let i = 0; i < norm.count; i++) out += `vn ${norm.getX(i).toFixed(5)} ${norm.getY(i).toFixed(5)} ${norm.getZ(i).toFixed(5)}\n`;
            }

            const fmt = (vi) => {
                const a = vi + vOffset;
                if (uv && norm) return `${a}/${vi + vtOffset}/${vi + vnOffset}`;
                if (norm) return `${a}//${vi + vnOffset}`;
                return `${a}`;
            };

            if (idx) {
                for (let j = 0; j + 2 < idx.count; j += 3) {
                    out += `f ${fmt(idx.getX(j))} ${fmt(idx.getX(j + 1))} ${fmt(idx.getX(j + 2))}\n`;
                }
            } else {
                for (let j = 0; j + 2 < pos.count; j += 3) {
                    out += `f ${fmt(j)} ${fmt(j + 1)} ${fmt(j + 2)}\n`;
                }
            }

            vOffset += pos.count;
            if (uv) vtOffset += uv.count;
            if (norm) vnOffset += norm.count;
        });

        disposeBaked(group);
        const blob = new Blob([out], { type: 'text/plain' });
        triggerDownload(blob, `${baseName}.obj`);
        return { ok: true, bytes: blob.size, triangles };
    }

    // ─── 4. DIRECT 1-CLICK AR VIEWER 3D (.GLB HANDOFF via StudiosProAR!) ────
    async function openInARViewer(sourceGroups, baseName = 'figure_4d_model', placement = 'floor') {
        if (!window.StudiosProAR) throw new Error('AR Bridge not loaded');
        const res = await generateGLBBuffer(sourceGroups);
        const fileName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_') + '.glb';
        const ok = window.StudiosProAR.sendModel({
            modelData: res.buffer,
            name: fileName,
            extension: 'glb',
            isBinary: true,
            placement,
            dimensionsMm: res.dimensionsMm,
            sourceStudio: 'figure-builder',
        });
        return { ok, bytes: res.buffer.byteLength, triangles: res.triangles, name: fileName };
    }

    // ─── 5. STANDALONE INTERACTIVE 4D HTML VIEWER ────────────────────────────
    function arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        const chunk = 0x8000;
        let bin = '';
        for (let i = 0; i < bytes.length; i += chunk) {
            bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
        }
        return btoa(bin);
    }

    async function exportInteractiveHTML(sourceGroups, baseName = 'figure-4d', title = '4D Sculpture') {
        const res = await generateGLBBuffer(sourceGroups);
        const b64 = arrayBufferToBase64(res.buffer);
        const safeTitle = String(title).replace(/[<>&"]/g, '');

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${safeTitle} — Interactive 4D Viewer | Studios-Pro</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif}
  body{background:radial-gradient(ellipse at center,#0d1229,#040610);color:#f1f5f9;overflow:hidden;height:100vh}
  #view{width:100vw;height:100vh;display:block}
  .hud{position:fixed;bottom:20px;left:20px;background:rgba(10,14,32,.84);backdrop-filter:blur(14px);border:1px solid rgba(0,243,255,.25);border-radius:16px;padding:14px 18px;display:flex;flex-direction:column;gap:8px;min-width:230px;box-shadow:0 10px 40px rgba(0,0,0,.5)}
  .hud h2{font-size:14px;letter-spacing:1.2px;text-transform:uppercase;color:#00f3ff}
  .row{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#cbd5e1;gap:12px}
  .badge{font-size:10px;color:#94a3b8}
  input[type=color]{border:none;background:none;width:32px;height:22px;cursor:pointer}
  button{background:linear-gradient(135deg,#06b6d4,#8b5cf6);border:none;color:#fff;padding:6px 12px;border-radius:8px;font-weight:700;font-size:11px;cursor:pointer}
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"><\/script>
</head>
<body>
<div id="view"></div>
<div class="hud">
  <h2>${safeTitle}</h2>
  <div class="badge">Studios-Pro 4D Figure Builder • ${res.triangles.toLocaleString()} tris</div>
  <div class="row"><span>Auto-Rotate</span><input type="checkbox" id="rot" checked></div>
  <div class="row"><span>Wireframe</span><input type="checkbox" id="wire"></div>
  <div class="row"><span>Background</span><input type="color" id="bg" value="#070a1c"></div>
  <button id="reset">Reset Camera</button>
</div>
<script>
  const b64 = "${b64}";
  const bin = atob(b64), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#070a1c');
  const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.05, 500);
  camera.position.set(0, 0.6, 4.2);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  document.getElementById('view').appendChild(renderer.domElement);
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.autoRotate = true; controls.autoRotateSpeed = 1.8;
  scene.add(new THREE.HemisphereLight(0xdbeafe, 0x1e1b4b, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(4, 6, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0x00f3ff, 0.9); rim.position.set(-5, 2, -4); scene.add(rim);
  const warm = new THREE.PointLight(0xff00ea, 0.7, 20); warm.position.set(3, -3, 3); scene.add(warm);
  let root = null;
  new THREE.GLTFLoader().parse(bytes.buffer, '', (gltf) => {
    root = gltf.scene;
    const box = new THREE.Box3().setFromObject(root);
    const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
    const maxD = Math.max(s.x, s.y, s.z, 0.01);
    root.position.sub(c);
    root.scale.setScalar(2.4 / maxD);
    scene.add(root);
  });
  document.getElementById('rot').onchange = e => controls.autoRotate = e.target.checked;
  document.getElementById('bg').oninput = e => scene.background.set(e.target.value);
  document.getElementById('wire').onchange = e => {
    if (!root) return;
    root.traverse(o => { if (o.isMesh && o.material) o.material.wireframe = e.target.checked; });
  };
  document.getElementById('reset').onclick = () => { camera.position.set(0, 0.6, 4.2); controls.target.set(0,0,0); controls.update(); };
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
  (function loop(){ requestAnimationFrame(loop); controls.update(); renderer.render(scene, camera); })();
<\/script>
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        triggerDownload(blob, `${baseName}_interactive.html`);
        return { ok: true, bytes: blob.size, triangles: res.triangles };
    }

    // ─── 6. STUDIO PNG EXPORT (HD / 2K / 4K + TRANSPARENT OPTION) ────────────
    function exportPNG(renderer, scene, camera, composer, options = {}) {
        const scale = options.scale || 1;
        const transparent = !!options.transparent;
        const baseName = options.baseName || 'figure-4d';
        const hideGrid = options.gridHelper || null;

        const prevW = renderer.domElement.clientWidth || 1280;
        const prevH = renderer.domElement.clientHeight || 720;
        const prevPR = renderer.getPixelRatio();
        const prevAlpha = renderer.getClearAlpha();
        const prevGridVis = hideGrid ? hideGrid.visible : false;

        try {
            if (transparent) {
                renderer.setClearAlpha(0);
                if (hideGrid) hideGrid.visible = false;
            }
            const targetPR = Math.min(4, Math.max(1, scale));
            renderer.setPixelRatio(targetPR);
            renderer.setSize(prevW, prevH, false);
            if (!transparent && composer) {
                composer.setSize(prevW * targetPR, prevH * targetPR);
                composer.render();
            } else {
                renderer.render(scene, camera);
            }

            const dataURL = renderer.domElement.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = dataURL;
            a.download = `${baseName}${scale > 1 ? `_${scale}x` : ''}${transparent ? '_alpha' : ''}.png`;
            a.dataset.bypassed = 'true';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            return { ok: true, dataURL, width: renderer.domElement.width, height: renderer.domElement.height };
        } finally {
            renderer.setPixelRatio(prevPR);
            renderer.setSize(prevW, prevH, false);
            renderer.setClearAlpha(prevAlpha);
            if (composer) composer.setSize(prevW, prevH);
            if (hideGrid) hideGrid.visible = prevGridVis;
            renderer.render(scene, camera);
        }
    }

    // ─── 7. VIDEO RECORDER (60fps + Audio + 1-Click 360° 4D Reel) ────────────
    const rec = { recording: false, recorder: null, chunks: [], startTime: 0, ext: 'webm', reelTimer: null };

    function startRecording(renderer, musicEngine, baseName = 'figure-4d', onDone) {
        if (rec.recording) return false;
        const canvasStream = renderer.domElement.captureStream(60);
        let combined = canvasStream;
        try {
            const audioStream = musicEngine && musicEngine.getAudioStream ? musicEngine.getAudioStream() : null;
            if (audioStream && audioStream.getAudioTracks().length > 0) {
                combined = new MediaStream([...canvasStream.getVideoTracks(), ...audioStream.getAudioTracks()]);
            }
        } catch (_) {}

        const candidates = [
            { mime: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', ext: 'mp4' },
            { mime: 'video/mp4', ext: 'mp4' },
            { mime: 'video/webm;codecs=vp9,opus', ext: 'webm' },
            { mime: 'video/webm;codecs=vp8,opus', ext: 'webm' },
            { mime: 'video/webm', ext: 'webm' },
        ];
        let chosen = { mime: '', ext: 'webm' };
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
            for (const c of candidates) {
                if (MediaRecorder.isTypeSupported(c.mime)) { chosen = c; break; }
            }
        }

        rec.chunks = [];
        rec.ext = chosen.ext;
        const opts = chosen.mime ? { mimeType: chosen.mime, videoBitsPerSecond: 8000000 } : { videoBitsPerSecond: 8000000 };
        try { rec.recorder = new MediaRecorder(combined, opts); }
        catch (_) { rec.recorder = new MediaRecorder(combined); }

        rec.recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) rec.chunks.push(e.data); };
        rec.recorder.onstop = () => {
            const blob = new Blob(rec.chunks, { type: chosen.mime || 'video/webm' });
            triggerDownload(blob, `${baseName}-${Date.now()}.${rec.ext}`);
            if (onDone) onDone({ bytes: blob.size, ext: rec.ext });
        };
        rec.recorder.start(100);
        rec.recording = true;
        rec.startTime = Date.now();
        return true;
    }

    function stopRecording() {
        if (rec.reelTimer) { clearTimeout(rec.reelTimer); rec.reelTimer = null; }
        if (rec.recorder && rec.recording) {
            rec.recording = false;
            rec.startTime = 0;
            try { rec.recorder.stop(); } catch (_) {}
            return true;
        }
        return false;
    }

    // ─── 8. FREE PROJECT SAVE / LOAD (.sp4dfig JSON) ─────────────────────────
    function saveProject(payload, baseName = 'project') {
        const json = JSON.stringify({ version: '5.0', app: '4D Figure Builder PRO', savedAt: new Date().toISOString(), ...payload }, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        triggerDownload(blob, `${baseName}.sp4dfig`);
        return { ok: true, bytes: blob.size };
    }

    function loadProject(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const data = JSON.parse(reader.result);
                    resolve(data);
                } catch (e) { reject(new Error('Invalid .sp4dfig file')); }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    return {
        bakeExportableGroup,
        buildBinarySTLBuffer,
        exportSTL,
        exportGLB,
        exportOBJ,
        openInARViewer,
        exportInteractiveHTML,
        exportPNG,
        startRecording,
        stopRecording,
        isRecording: () => rec.recording,
        getRecStartTime: () => rec.startTime,
        saveProject,
        loadProject,
    };
})();

if (typeof window !== 'undefined') window.Export4D = Export4D;
if (typeof module !== 'undefined' && module.exports) module.exports = Export4D;
