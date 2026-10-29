/**
 * PolyMorph 3D Studio - Model Converters & File I/O Engine
 * Supports STL, GLB, GLTF, OBJ, PLY, DXF bidirectional conversions.
 */
class ModelConverters {
  /**
   * Parses a File or ArrayBuffer into a Three.js Object3D
   * @param {File|Blob} file 
   * @param {string} formatHint 
   * @returns {Promise<THREE.Object3D>}
   */
  static async loadFile(file, formatHint = null) {
    const ext = formatHint || file.name.split('.').pop().toLowerCase();
    const buffer = await file.arrayBuffer();

    switch (ext) {
      case 'stl': {
        const loader = new THREE.STLLoader();
        const geometry = loader.parse(buffer);
        geometry.computeVertexNormals();
        const material = new THREE.MeshStandardMaterial({
          color: 0xd4d8df,
          roughness: 0.35,
          metalness: 0.25,
          side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = file.name.replace(/\.[^/.]+$/, "");
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
      }

      case 'glb':
      case 'gltf': {
        const loader = new THREE.GLTFLoader();
        return new Promise((resolve, reject) => {
          loader.parse(
            buffer,
            '',
            (gltf) => {
              const group = gltf.scene || (gltf.scenes && gltf.scenes[0]) || new THREE.Group();
              group.name = file.name.replace(/\.[^/.]+$/, "");
              group.traverse((child) => {
                if (child.isMesh) {
                  child.castShadow = true;
                  child.receiveShadow = true;
                  if (!child.material) {
                    child.material = new THREE.MeshStandardMaterial({
                      color: 0xcccccc,
                      roughness: 0.4,
                      metalness: 0.2,
                      side: THREE.DoubleSide
                    });
                  }
                }
              });
              resolve(group);
            },
            (err) => {
              console.error("GLTFLoader parse error:", err);
              reject(new Error(err.message || "Invalid GLTF/GLB file"));
            }
          );
        });
      }

      case 'obj': {
        const decoder = new TextDecoder('utf-8');
        const text = decoder.decode(buffer);
        const loader = new THREE.OBJLoader();
        const group = loader.parse(text);
        group.name = file.name.replace(/\.[^/.]+$/, "");
        
        group.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (!child.material || child.material.isMeshBasicMaterial) {
              child.material = new THREE.MeshStandardMaterial({
                color: 0xd4d8df,
                roughness: 0.4,
                metalness: 0.2,
                side: THREE.DoubleSide
              });
            }
            if (child.geometry && !child.geometry.attributes.normal) {
              child.geometry.computeVertexNormals();
            }
          }
        });
        return group;
      }

      case 'ply': {
        const loader = new THREE.PLYLoader();
        const geometry = loader.parse(buffer);
        geometry.computeVertexNormals();
        const material = new THREE.MeshStandardMaterial({
          color: 0xd4d8df,
          roughness: 0.4,
          metalness: 0.2,
          side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = file.name.replace(/\.[^/.]+$/, "");
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
      }

      case 'dxf': {
        const decoder = new TextDecoder('utf-8');
        const text = decoder.decode(buffer);
        const group = DXFEngine.parse(text);
        group.name = file.name.replace(/\.[^/.]+$/, "");
        return group;
      }

      default:
        throw new Error(`Unsupported format: .${ext}`);
    }
  }

  /**
   * Exports a Three.js Object3D into the target format
   * @param {THREE.Object3D} object 
   * @param {string} targetFormat 
   * @param {string} baseName 
   * @returns {Promise<{blob: Blob, filename: string}>}
   */
  static async exportModel(object, targetFormat, baseName = "model") {
    const fmt = targetFormat.toLowerCase();
    const cleanName = baseName.replace(/\.[^/.]+$/, "");

    // Clone and prepare clean scene for export
    const exportScene = new THREE.Scene();
    let clone;
    try {
      clone = object.clone(true);
    } catch (e) {
      clone = object;
    }

    // Sanitize materials on clone for 100% export reliability and double-sided AR visibility
    clone.traverse((child) => {
      if (child.isMesh) {
        const prepareMaterial = (mat) => {
          if (!mat) {
            return new THREE.MeshStandardMaterial({
              color: new THREE.Color(0xd4d8df),
              roughness: 0.4,
              metalness: 0.2,
              side: THREE.DoubleSide
            });
          }

          // Extract color
          const matColor = (mat.color && mat.color.isColor) ? mat.color.clone() : new THREE.Color(0xd4d8df);
          const matRoughness = (mat.roughness !== undefined) ? mat.roughness : 0.4;
          const matMetalness = (mat.metalness !== undefined) ? mat.metalness : 0.2;

          const matSide = (mat.side !== undefined) ? mat.side : THREE.DoubleSide;

          const hasVertColors = Boolean(
            mat.vertexColors ||
            (child.geometry && child.geometry.attributes && child.geometry.attributes.color)
          );

          // Find texture map on material or fallback userData
          const targetMap = (mat && mat.map && mat.map.image) ? mat.map :
            (child.userData && child.userData.originalMaterial && child.userData.originalMaterial.map && child.userData.originalMaterial.map.image) ? child.userData.originalMaterial.map :
            (child.userData && child.userData.map && child.userData.map.image) ? child.userData.map : null;

          // If material has an image texture map (Photo AR, Image to 3D, Voxel 3D, textured CAD)
          if (targetMap) {
            const texturedMat = new THREE.MeshStandardMaterial({
              color: new THREE.Color(0xffffff),
              map: targetMap,
              vertexColors: hasVertColors,
              roughness: matRoughness,
              metalness: matMetalness,
              side: matSide,
              transparent: Boolean(mat.transparent),
              opacity: mat.opacity !== undefined ? mat.opacity : 1.0
            });
            return texturedMat;
          }

          // If material has bumpMap / canvas texture (Bas-Relief, Medallions)
          if (mat.bumpMap && mat.bumpMap.image) {
            const texturedMat = new THREE.MeshStandardMaterial({
              color: matColor,
              map: mat.bumpMap,
              vertexColors: hasVertColors,
              roughness: matRoughness,
              metalness: matMetalness,
              side: matSide,
              transparent: Boolean(mat.transparent),
              opacity: mat.opacity !== undefined ? mat.opacity : 1.0
            });
            return texturedMat;
          }

          const cleanMat = new THREE.MeshStandardMaterial({
            color: matColor,
            vertexColors: hasVertColors,
            roughness: matRoughness,
            metalness: matMetalness,
            side: matSide,
            transparent: Boolean(mat.transparent),
            opacity: mat.opacity !== undefined ? mat.opacity : 1.0
          });
          if (mat.emissive && mat.emissive.isColor && mat.emissive.getHex() > 0) {
            cleanMat.emissive = mat.emissive.clone();
            cleanMat.emissiveIntensity = mat.emissiveIntensity || 0.5;
          }
          return cleanMat;
        };

        const orig = child.material || child.userData.originalMaterial;
        if (Array.isArray(orig)) {
          child.material = orig.map(m => prepareMaterial(m));
        } else {
          child.material = prepareMaterial(orig);
        }
      }
    });

    if (clone.isScene) {
      while (clone.children.length > 0) {
        exportScene.add(clone.children[0]);
      }
    } else {
      exportScene.add(clone);
    }
    exportScene.updateMatrixWorld(true);

    // Remove only non-mesh visual helpers/lines that can corrupt binary exporters
    const toRemove = [];
    exportScene.traverse((c) => {
      if (c.isLine || c.isLineSegments || c.isCamera || c.isLight || c.userData?.isHelper) {
        toRemove.push(c);
      } else if (c.isMesh && (!c.geometry || !c.geometry.attributes || !c.geometry.attributes.position || c.geometry.attributes.position.count === 0)) {
        toRemove.push(c);
      }
    });
    toRemove.forEach(c => {
      if (c.parent) c.parent.remove(c);
    });

    switch (fmt) {
      case 'glb': {
        const exporter = new THREE.GLTFExporter();
        const options = { binary: true, embedImages: true };

        return new Promise((resolve, reject) => {
          try {
            exporter.parse(
              exportScene,
              function (result) {
                try {
                  let blob;
                  const isRawBuf = (result instanceof ArrayBuffer) || (result && typeof result.byteLength === 'number' && typeof result.slice === 'function' && !ArrayBuffer.isView(result));
                  const isTypedArr = result && (ArrayBuffer.isView(result) || (result.buffer && typeof result.buffer.byteLength === 'number'));

                  if (isRawBuf) {
                    blob = new Blob([result], { type: 'model/gltf-binary' });
                  } else if (isTypedArr) {
                    const buf = result.buffer || result;
                    const byteOffset = result.byteOffset || 0;
                    const byteLength = result.byteLength !== undefined ? result.byteLength : buf.byteLength;
                    const slice = buf.slice(byteOffset, byteOffset + byteLength);
                    blob = new Blob([slice], { type: 'model/gltf-binary' });
                  } else if (typeof result === 'object' && result !== null && result.asset) {
                    // Fallback to GLTF JSON if exporter didn't make binary (glTF JSON object contains .asset)
                    const jsonStr = JSON.stringify(result, null, 2);
                    blob = new Blob([jsonStr], { type: 'model/gltf+json' });
                    return resolve({ blob, filename: `${cleanName}.gltf` });
                  } else {
                    blob = new Blob([result], { type: 'model/gltf-binary' });
                  }
                  resolve({ blob, filename: `${cleanName}.glb` });
                } catch (err) {
                  reject(err);
                }
              },
              options
            );
          } catch (e) {
            reject(e);
          }
        });
      }

      case 'gltf': {
        const exporter = new THREE.GLTFExporter();
        const options = { binary: false, embedImages: true };

        return new Promise((resolve, reject) => {
          try {
            exporter.parse(
              exportScene,
              function (result) {
                try {
                  const output = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
                  const blob = new Blob([output], { type: 'model/gltf+json' });
                  resolve({ blob, filename: `${cleanName}.gltf` });
                } catch (err) {
                  reject(err);
                }
              },
              options
            );
          } catch (e) {
            reject(e);
          }
        });
      }

      case 'stl':
      case 'stl_binary': {
        // Ensure Points (Particle Clouds) have mesh representation for STL
        let hasMesh = false;
        exportScene.traverse((c) => { if (c.isMesh) hasMesh = true; });
        if (!hasMesh) {
          exportScene.traverse((c) => {
            if (c.isPoints && c.geometry && c.geometry.attributes.position) {
              const pos = c.geometry.attributes.position;
              const boxGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
              const boxMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff });
              for (let i = 0; i < Math.min(pos.count, 2500); i += 2) {
                const m = new THREE.Mesh(boxGeo, boxMat);
                m.position.set(pos.getX(i), pos.getY(i), pos.getZ(i));
                exportScene.add(m);
              }
            }
          });
        }

        const exporter = new THREE.STLExporter();
        const result = exporter.parse(exportScene, { binary: true });
        let rawBuffer;
        if (result instanceof DataView) {
          rawBuffer = result.buffer.slice(result.byteOffset, result.byteOffset + result.byteLength);
        } else if (result instanceof ArrayBuffer) {
          rawBuffer = result;
        } else {
          rawBuffer = result;
        }

        // VisCAM / Magics 16-bit RGB Color STL Enhancement
        try {
          if (rawBuffer && rawBuffer.byteLength >= 84) {
            const dv = new DataView(rawBuffer instanceof ArrayBuffer ? rawBuffer : rawBuffer.buffer, rawBuffer.byteOffset || 0, rawBuffer.byteLength);
            const totalTris = dv.getUint32(80, true);
            let triOffset = 0;
            let wroteColors = false;

            exportScene.traverse((child) => {
              if (child.isMesh && child.geometry && child.geometry.attributes && child.geometry.attributes.position) {
                let geo = child.geometry;
                if (geo.index) geo = geo.toNonIndexed();
                const pos = geo.attributes.position;
                const colAttr = geo.attributes.color;
                const matColor = child.material && child.material.color && child.material.color.isColor ? child.material.color : null;
                const meshTris = Math.floor(pos.count / 3);

                for (let i = 0; i < meshTris && (triOffset + i) < totalTris; i++) {
                  let r = 0.8, g = 0.8, b = 0.8;
                  if (colAttr) {
                    const i0 = i * 3, i1 = i * 3 + 1, i2 = i * 3 + 2;
                    r = (colAttr.getX(i0) + colAttr.getX(i1) + colAttr.getX(i2)) / 3;
                    g = (colAttr.getY(i0) + colAttr.getY(i1) + colAttr.getY(i2)) / 3;
                    b = (colAttr.getZ(i0) + colAttr.getZ(i1) + colAttr.getZ(i2)) / 3;
                  } else if (matColor) {
                    r = matColor.r; g = matColor.g; b = matColor.b;
                  }

                  const r5 = Math.min(31, Math.max(0, Math.round(r * 31)));
                  const g5 = Math.min(31, Math.max(0, Math.round(g * 31)));
                  const b5 = Math.min(31, Math.max(0, Math.round(b * 31)));
                  // VisCAM / Magics 16-bit color attribute
                  const color16 = (1 << 15) | r5 | (g5 << 5) | (b5 << 10);
                  const attrOffset = 84 + (triOffset + i) * 50 + 48;
                  if (attrOffset + 2 <= rawBuffer.byteLength) {
                    dv.setUint16(attrOffset, color16, true);
                    wroteColors = true;
                  }
                }
                triOffset += meshTris;
              }
            });

            if (wroteColors) {
              const tag = "COLOR=RGBA ";
              for (let k = 0; k < tag.length; k++) {
                dv.setUint8(k, tag.charCodeAt(k));
              }
              dv.setUint8(tag.length, 0xFF);
              dv.setUint8(tag.length + 1, 0xFF);
              dv.setUint8(tag.length + 2, 0xFF);
              dv.setUint8(tag.length + 3, 0xFF);
            }
          }
        } catch (colorErr) {
          console.warn("[converters.js] VisCAM color injection skipped:", colorErr);
        }

        const blob = new Blob([rawBuffer], { type: 'application/octet-stream' });
        return { blob, filename: `${cleanName}.stl` };
      }

      case 'stl_ascii': {
        const exporter = new THREE.STLExporter();
        const result = exporter.parse(exportScene, { binary: false });
        const blob = new Blob([result], { type: 'text/plain;charset=utf-8' });
        return { blob, filename: `${cleanName}.stl` };
      }

      case 'obj': {
        const exporter = new THREE.OBJExporter();
        const result = exporter.parse(exportScene);
        const blob = new Blob([result], { type: 'text/plain;charset=utf-8' });
        return { blob, filename: `${cleanName}.obj` };
      }

      case 'ply': {
        const exporter = new THREE.PLYExporter();
        const result = exporter.parse(exportScene, ['position', 'normal', 'color'], { binary: true });
        const blob = new Blob([result], { type: 'application/octet-stream' });
        return { blob, filename: `${cleanName}.ply` };
      }

      case 'usdz': {
        if (typeof THREE.USDZExporter === 'function' && typeof window.fflate !== 'undefined') {
          try {
            const exporter = new THREE.USDZExporter();
            const result = await exporter.parse(exportScene);
            const blob = new Blob([result], { type: 'model/vnd.usdz+zip' });
            return { blob, filename: `${cleanName}.usdz` };
          } catch (usdzErr) {
            console.warn("USDZ export failed, falling back to GLB:", usdzErr);
          }
        }
        
        // Universal fallback to binary GLB
        const exporter = new THREE.GLTFExporter();
        return new Promise((resolve, reject) => {
          exporter.parse(exportScene, (res) => {
            const blob = new Blob([res], { type: 'model/gltf-binary' });
            resolve({ blob, filename: `${cleanName}.glb` });
          }, { binary: true });
        });
      }

      case '3mf': {
        const blob = await ModelConverters.generate3MF(exportScene, cleanName);
        return { blob, filename: `${cleanName}.3mf` };
      }

      case 'svg': {
        const svgStr = ModelConverters.generateSVGContour(exportScene);
        const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
        return { blob, filename: `${cleanName}_slice.svg` };
      }

      case 'depthmap': {
        const blob = await ModelConverters.generateDepthmapPNG(object);
        return { blob, filename: `${cleanName}_heightmap.png` };
      }

      case 'dxf': {
        const result = DXFEngine.export(exportScene);
        const blob = new Blob([result], { type: 'application/dxf;charset=utf-8' });
        return { blob, filename: `${cleanName}.dxf` };
      }

      case 'html': {
        const htmlBlob = await ModelConverters.generateStandaloneHTML(object, cleanName);
        return { blob: htmlBlob, filename: `${cleanName}_3D_viewer.html` };
      }

      default:
        throw new Error(`Unsupported export format: ${targetFormat}`);
    }
  }

  /**
   * Generates a self-contained offline Standalone 3D HTML Viewer file
   * Embeds the full 3D model as Base64 GLB inside a modern WebGL page.
   * @param {THREE.Object3D} object
   * @param {string} baseName
   * @returns {Promise<Blob>}
   */
  static async generateStandaloneHTML(object, baseName = 'model') {
    // Step 1: Reuse the proven working GLB exporter, then blob â†’ Base64
    let glbBase64 = '';
    try {
      const { blob: glbBlob } = await ModelConverters.exportModel(object, 'glb', baseName);
      const arrayBuffer = await glbBlob.arrayBuffer();
      // Safe chunked Base64 encoding (avoids stack overflow on large models)
      const bytes = new Uint8Array(arrayBuffer);
      const chunkSize = 8192;
      let binaryStr = '';
      for (let i = 0; i < bytes.byteLength; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.byteLength));
        binaryStr += String.fromCharCode.apply(null, chunk);
      }
      glbBase64 = btoa(binaryStr);
    } catch (e) {
      console.warn('[PolyMorph] GLB export for HTML failed:', e);
      glbBase64 = '';
    }

    // Step 2: Compute basic model stats
    let triCount = 0, vertCount = 0;
    const box3 = new THREE.Box3().setFromObject(object);
    const sz = new THREE.Vector3();
    box3.getSize(sz);
    object.traverse((c) => {
      if (c.isMesh && c.geometry) {
        const pos = c.geometry.attributes.position;
        if (pos) {
          vertCount += pos.count;
          triCount += c.geometry.index ? c.geometry.index.count / 3 : pos.count / 3;
        }
      }
    });
    triCount = Math.round(triCount);
    vertCount = Math.round(vertCount);
    const dimStr = `${sz.x.toFixed(1)} x ${sz.y.toFixed(1)} x ${sz.z.toFixed(1)} mm`;
    const modelSizeKB = Math.round(glbBase64.length * 0.75 / 1024);

    // Step 3: Build the standalone HTML using r128 (matching app's Three.js version)
    // The GLB_BASE64 payload is split to a <script type="text/plain"> to avoid any
    // template-literal / escape issues in the embedded JS.
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${baseName} - 3D Interactive Viewer</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{--bg:#0b0f19;--surface:#161c2e;--border:rgba(0,240,255,0.12);--accent:#00f0ff;--accent2:#8b5cf6;--text:#e2e8f0;--muted:#64748b}
    body{background:var(--bg);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif;height:100vh;display:flex;flex-direction:column;overflow:hidden}
    header{background:var(--surface);border-bottom:1px solid var(--border);padding:10px 18px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;flex-shrink:0}
    .brand{display:flex;align-items:center;gap:10px}
    .brand-logo{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;font-weight:800;font-size:0.8rem;padding:4px 8px;border-radius:6px}
    .brand-name{font-weight:700;font-size:0.95rem}
    .brand-sub{font-size:0.68rem;color:var(--muted)}
    .hbtns{display:flex;gap:6px;flex-wrap:wrap}
    .btn{display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:7px;border:1px solid var(--border);cursor:pointer;font-size:0.75rem;font-weight:600;background:rgba(255,255,255,0.05);color:var(--text);transition:all 0.15s}
    .btn:hover{background:rgba(255,255,255,0.12)}
    .btn.active{background:rgba(0,240,255,0.12);border-color:var(--accent);color:var(--accent)}
    .btn-ar{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;border:none}
    .btn-ar:hover{opacity:0.85}
    main{flex:1;position:relative;overflow:hidden}
    #cv{display:block;width:100%;height:100%}
    #loading{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:var(--bg);z-index:5}
    .spin{width:44px;height:44px;border:3px solid rgba(0,240,255,0.2);border-top-color:var(--accent);border-radius:50%;animation:sp 0.75s linear infinite}
    @keyframes sp{to{transform:rotate(360deg)}}
    .ltxt{font-size:0.82rem;color:var(--muted)}
    .ov-tl{position:absolute;top:10px;left:10px;display:flex;gap:6px;flex-wrap:wrap;pointer-events:all;z-index:3}
    .ov-tr{position:absolute;top:10px;right:10px;pointer-events:all;z-index:3}
    .ov-bl{position:absolute;bottom:10px;left:10px;pointer-events:all;z-index:3}
    .ov-br{position:absolute;bottom:10px;right:10px;pointer-events:all;z-index:3}
    .stat{background:rgba(11,15,25,0.85);border:1px solid var(--border);border-radius:8px;padding:6px 12px;font-size:0.68rem;color:var(--muted);display:flex;gap:12px;backdrop-filter:blur(6px);flex-wrap:wrap}
    .stat b{color:var(--accent)}
    .pbtn{padding:5px 9px;font-size:0.68rem}
    footer{background:var(--surface);border-top:1px solid var(--border);padding:8px 18px;font-size:0.68rem;color:var(--muted);display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;flex-shrink:0}
  </style>
</head>
<body>
<header>
  <div class="brand">
    <div class="brand-logo">3D</div>
    <div>
      <div class="brand-name">${baseName}</div>
      <div class="brand-sub">PolyMorph 3D Studio - Standalone Viewer</div>
    </div>
  </div>
  <div class="hbtns">
    <button class="btn" id="bWire">&#128210; Wireframe</button>
    <button class="btn" id="bRot">&#128260; Auto-Rotate</button>
    <button class="btn" id="bSnap">&#128247; Snapshot</button>
    <button class="btn btn-ar" id="bAR">&#128241; AR View</button>
  </div>
</header>
<main>
  <div id="loading">
    <div class="spin"></div>
    <div class="ltxt" id="ltxt">Loading 3D model...</div>
  </div>
  <canvas id="cv"></canvas>
  <div class="ov-tl">
    <button class="btn pbtn active" data-env="studio">&#128161; Studio</button>
    <button class="btn pbtn" data-env="warm">&#127749; Warm</button>
    <button class="btn pbtn" data-env="cyber">&#127756; Cyber</button>
    <button class="btn pbtn" data-env="day">&#9728;&#65039; Day</button>
  </div>
  <div class="ov-tr">
    <div class="stat">
      <span>&#9650; <b>${triCount.toLocaleString()}</b> tri</span>
      <span>&#11044; <b>${vertCount.toLocaleString()}</b> vtx</span>
      <span>&#128208; <b>${dimStr}</b></span>
      <span>&#128230; <b>${modelSizeKB} KB</b></span>
    </div>
  </div>
  <div class="ov-bl">
    <div class="stat" style="color:rgba(100,116,139,0.75)">
      <span>&#128433;&#65039; Drag: Orbit &nbsp; Scroll: Zoom &nbsp; Right-click: Pan</span>
    </div>
  </div>
  <div class="ov-br">
    <div style="display:flex;gap:6px">
      <button class="btn pbtn" id="bReset">&#127919; Reset</button>
      <button class="btn pbtn" id="bFit">&#11035; Fit</button>
    </div>
  </div>
</main>
<footer>
  <span>Generated with PolyMorph 3D Studio - Universal HTML Export</span>
  <span>WebGL viewer - Works offline</span>
</footer>

<!-- Model payload stored safely outside JS to avoid escaping issues -->
<script id="glb-data" type="text/plain">${glbBase64}</script>

<!-- Three.js r128 (same version as PolyMorph app) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
<script>
(function(){
  // Read Base64 payload safely from <script type="text/plain">
  var GLB_B64 = document.getElementById('glb-data').textContent.trim();

  var canvas = document.getElementById('cv');
  var main = canvas.parentElement;

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  var W = main.clientWidth || 800, H = main.clientHeight || 600;
  renderer.setSize(W, H);

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0f19);

  var camera = new THREE.PerspectiveCamera(45, W/H, 0.01, 50000);
  camera.position.set(0, 2, 5);

  var controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.autoRotate = false;
  controls.autoRotateSpeed = 1.5;

  // Lighting
  var lights = [];
  function setLights(preset) {
    lights.forEach(function(l){ scene.remove(l); });
    lights = [];
    var amb = new THREE.AmbientLight(0xffffff, preset==='cyber'?0.12:0.35);
    scene.add(amb); lights.push(amb);
    var cfg = {
      studio: [[0xffffff,1.4,[80,150,100]],[0xffffff,0.7,[-80,100,-50]],[0xffffff,0.35,[0,-40,80]]],
      warm:   [[0xffb347,1.6,[80,130,80]],[0xffd580,0.7,[-80,80,-50]],[0xff6b35,0.3,[0,-30,80]]],
      cyber:  [[0x00f0ff,1.8,[80,150,100]],[0x8b5cf6,1.2,[-80,100,-50]],[0xff007f,0.5,[0,-40,80]]],
      day:    [[0xfff8e7,1.2,[80,150,100]],[0xe8f4fd,0.6,[-80,100,-50]],[0xffffff,0.25,[0,-40,80]]]
    };
    var c = cfg[preset] || cfg.studio;
    c.forEach(function(item){
      var dl = new THREE.DirectionalLight(item[0], item[1]);
      dl.position.set(item[2][0], item[2][1], item[2][2]);
      dl.castShadow = true;
      scene.add(dl); lights.push(dl);
    });
  }
  setLights('studio');

  // Fit camera to bounding box
  var loadedModel = null;
  function fitCam(obj) {
    var box = new THREE.Box3().setFromObject(obj);
    var size = box.getSize(new THREE.Vector3());
    var center = box.getCenter(new THREE.Vector3());
    var maxDim = Math.max(size.x, size.y, size.z) || 1;
    var fovRad = camera.fov * Math.PI / 180;
    var dist = (maxDim / 2 / Math.tan(fovRad / 2)) * 1.8;
    camera.position.set(center.x, center.y + maxDim*0.3, center.z + dist);
    camera.lookAt(center);
    controls.target.copy(center);
    controls.minDistance = dist * 0.02;
    controls.maxDistance = dist * 20;
    controls.update();
  }

  // Load model
  var ld = document.getElementById('loading');
  var ltxt = document.getElementById('ltxt');

  if (GLB_B64 && GLB_B64.length > 20) {
    try {
      // Decode Base64 â†’ ArrayBuffer
      var b64 = GLB_B64;
      var binStr = atob(b64);
      var buf = new ArrayBuffer(binStr.length);
      var view = new Uint8Array(buf);
      for (var i = 0; i < binStr.length; i++) { view[i] = binStr.charCodeAt(i); }

      var loader = new THREE.GLTFLoader();
      loader.parse(buf, '', function(gltf) {
        loadedModel = gltf.scene || new THREE.Group();
        loadedModel.traverse(function(c) {
          if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
        });
        scene.add(loadedModel);
        fitCam(loadedModel);
        ld.style.display = 'none';
      }, function(err) {
        console.error('[Viewer] GLB parse error:', err);
        ltxt.textContent = 'Error loading model. Open browser console for details.';
        ltxt.style.color = '#ef4444';
      });
    } catch(e) {
      console.error('[Viewer] Decode error:', e);
      ltxt.textContent = 'Base64 decode error: ' + e.message;
      ltxt.style.color = '#f59e0b';
    }
  } else {
    ltxt.textContent = 'No 3D model embedded in this file.';
    ltxt.style.color = '#64748b';
  }

  // Wireframe
  var wireOn = false;
  document.getElementById('bWire').addEventListener('click', function() {
    wireOn = !wireOn;
    this.classList.toggle('active', wireOn);
    if (loadedModel) {
      loadedModel.traverse(function(c) {
        if (c.isMesh && c.material) {
          var mats = Array.isArray(c.material) ? c.material : [c.material];
          mats.forEach(function(m){ if(m) m.wireframe = wireOn; });
        }
      });
    }
  });

  // Auto-rotate
  document.getElementById('bRot').addEventListener('click', function() {
    controls.autoRotate = !controls.autoRotate;
    this.classList.toggle('active', controls.autoRotate);
  });

  // Snapshot
  document.getElementById('bSnap').addEventListener('click', function() {
    renderer.render(scene, camera);
    var a = document.createElement('a');
    a.download = '${baseName}_snapshot.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  });

  // Reset / Fit
  document.getElementById('bReset').addEventListener('click', function() { if(loadedModel) fitCam(loadedModel); });
  document.getElementById('bFit').addEventListener('click', function() { if(loadedModel) fitCam(loadedModel); });

  // AR
  document.getElementById('bAR').addEventListener('click', function() {
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      alert('iOS AR Quick Look:\\n\\n1. Download the .USDZ file from PolyMorph 3D Studio\\n2. Send via AirDrop or iCloud\\n3. Tap to open in native AR camera!');
    } else {
      window.open('https://modelviewer.dev/editor/', '_blank');
    }
  });

  // Lighting presets
  document.querySelectorAll('[data-env]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('[data-env]').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      setLights(btn.getAttribute('data-env'));
    });
  });

  // Resize
  new ResizeObserver(function() {
    var w = main.clientWidth || 800, h = main.clientHeight || 600;
    camera.aspect = w/h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }).observe(main);

  // Render loop
  (function loop() {
    requestAnimationFrame(loop);
    controls.update();
    renderer.render(scene, camera);
  })();
})();
</script>
</body>
</html>`;

    return new Blob([html], { type: 'text/html;charset=utf-8' });
  }


  /**
   * Generates standard 3MF package (.3mf zip archive) for 3D Slicers
   * @param {THREE.Scene} scene 
   * @param {string} name 
   * @returns {Promise<Blob>}
  /**
   * Generates standard Multi-Color 3MF package (.3mf zip archive) for 3D Slicers (Bambu Lab, Prusa, Orca, Cura)
   * @param {THREE.Object3D} scene 
   * @param {string} name 
   * @returns {Promise<Blob>}
   */
  static async generate3MF(scene, name = "model") {
    const meshes = [];
    scene.traverse((child) => {
      if (child.isMesh && child.geometry && child.geometry.attributes && child.geometry.attributes.position) {
        meshes.push(child);
      }
    });

    if (meshes.length === 0) {
      throw new Error("No 3D meshes found in scene to export as 3MF.");
    }

    // Collect distinct colors
    const colorMap = new Map();
    const colorsList = [];
    function getColorId(mesh) {
      let hex = '#D4D8DF';
      const mat = mesh.material;
      if (mat) {
        const mColor = Array.isArray(mat) ? (mat[0]?.color) : mat.color;
        if (mColor && mColor.isColor) {
          hex = '#' + mColor.getHexString().toUpperCase();
        }
      }
      if (!colorMap.has(hex)) {
        colorsList.push(hex);
        colorMap.set(hex, colorsList.length - 1);
      }
      return colorMap.get(hex);
    }

    const objectsXml = [];
    const buildItemsXml = [];

    meshes.forEach((mesh, mIdx) => {
      const objId = mIdx + 1;
      const colIdx = getColorId(mesh);
      let geo = mesh.geometry;
      if (geo.index) geo = geo.toNonIndexed();
      const pos = geo.attributes.position;
      if (!pos || pos.count < 3) return;

      mesh.updateWorldMatrix(true, false);
      const worldMat = mesh.matrixWorld;

      const vertices = [];
      const triangles = [];
      const vTemp = new THREE.Vector3();

      for (let i = 0; i < pos.count; i += 3) {
        for (let k = 0; k < 3; k++) {
          vTemp.set(pos.getX(i + k), pos.getY(i + k), pos.getZ(i + k)).applyMatrix4(worldMat);
          vertices.push(`        <vertex x="${vTemp.x.toFixed(4)}" y="${vTemp.y.toFixed(4)}" z="${vTemp.z.toFixed(4)}" />`);
        }
        triangles.push(`        <triangle v1="${i}" v2="${i + 1}" v3="${i + 2}" pid="1" p1="${colIdx}" />`);
      }

      objectsXml.push(`    <object id="${objId}" name="${mesh.name || 'Part_' + objId}" type="model">
      <mesh>
        <vertices>
${vertices.join('\n')}
        </vertices>
        <triangles>
${triangles.join('\n')}
        </triangles>
      </mesh>
    </object>`);

      buildItemsXml.push(`    <item objectid="${objId}" />`);
    });

    const colorsXml = colorsList.map(c => `      <m:color color="${c}" />`).join('\n');

    const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02">
  <metadata name="Title">${name}</metadata>
  <metadata name="Application">PolyMorph 3D Studio Pro</metadata>
  <resources>
    <m:colorgroup id="1">
${colorsXml}
    </m:colorgroup>
${objectsXml.join('\n')}
  </resources>
  <build>
${buildItemsXml.join('\n')}
  </build>
</model>`;

    const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml" />
</Types>`;

    const rels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" />
</Relationships>`;

    if (window.JSZip) {
      const zip = new window.JSZip();
      zip.file('[Content_Types].xml', contentTypes);
      zip.folder('_rels').file('.rels', rels);
      zip.folder('3D').file('3dmodel.model', modelXml);
      return await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml' });
    } else {
      return new Blob([modelXml], { type: 'application/xml' });
    }
  }

  /**
   * Direct Exporter Helpers
   */
  static async export3MF(object, baseName = "model") {
    const cleanName = baseName.replace(/\.[^/.]+$/, "");
    const blob = await ModelConverters.generate3MF(object, cleanName);
    return { blob, filename: `${cleanName}.3mf` };
  }

  static async exportGLB(object, baseName = "model") {
    return await ModelConverters.exportModel(object, 'glb', baseName);
  }

  static async exportSTL(object, baseName = "model") {
    return await ModelConverters.exportModel(object, 'stl', baseName);
  }

  /**
   * Extracts 2D vector silhouette/cross-section in SVG format
   * Prioritizes high-definition 2D vector tracing directly from source image if available
   * @param {THREE.Scene} scene 
   * @returns {string}
   */
  static generateSVGContour(scene) {
    // 1. Check if source image is attached or active
    let sourceImg = scene.userData?.sourceImage || window.__polymorph_active_image;
    if (!sourceImg) {
      scene.traverse((child) => {
        if (child.material && child.material.map && child.material.map.image) {
          sourceImg = child.material.map.image;
        }
      });
    }

    if (sourceImg && typeof ModelGenerators !== 'undefined' && ModelGenerators.generateImageSVGContours) {
      return ModelGenerators.generateImageSVGContours(sourceImg, { levels: 5, resolution: 300 });
    }

    // 2. Fallback to 3D mesh contour projection
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);

    let getU, getV, uSize, vSize, uMin, vMin;
    if (size.z <= size.x && size.z <= size.y) {
      getU = (pos, i) => pos.getX(i);
      getV = (pos, i) => pos.getY(i);
      uSize = size.x || 1;
      vSize = size.y || 1;
      uMin = box.min.x;
      vMin = box.min.y;
    } else if (size.y <= size.x && size.y <= size.z) {
      getU = (pos, i) => pos.getX(i);
      getV = (pos, i) => pos.getZ(i);
      uSize = size.x || 1;
      vSize = size.z || 1;
      uMin = box.min.x;
      vMin = box.min.z;
    } else {
      getU = (pos, i) => pos.getZ(i);
      getV = (pos, i) => pos.getY(i);
      uSize = size.z || 1;
      vSize = size.y || 1;
      uMin = box.min.z;
      vMin = box.min.y;
    }

    const canvasW = 800;
    const canvasH = Math.max(200, Math.round((vSize / (uSize || 1)) * canvasW));
    const padding = 40;
    const drawW = canvasW - padding * 2;
    const drawH = canvasH - padding * 2;

    const paths = [];
    scene.traverse((child) => {
      if (child.isMesh && child.geometry) {
        let geo = child.geometry;
        if (geo.index) geo = geo.toNonIndexed();
        const pos = geo.attributes.position;
        if (!pos) return;

        for (let i = 0; i < pos.count; i += 3) {
          const u0 = padding + ((getU(pos, i) - uMin) / uSize) * drawW;
          const v0 = canvasH - (padding + ((getV(pos, i) - vMin) / vSize) * drawH);
          const u1 = padding + ((getU(pos, i + 1) - uMin) / uSize) * drawW;
          const v1 = canvasH - (padding + ((getV(pos, i + 1) - vMin) / vSize) * drawH);
          const u2 = padding + ((getU(pos, i + 2) - uMin) / uSize) * drawW;
          const v2 = canvasH - (padding + ((getV(pos, i + 2) - vMin) / vSize) * drawH);

          paths.push(`M ${u0.toFixed(2)} ${v0.toFixed(2)} L ${u1.toFixed(2)} ${v1.toFixed(2)} L ${u2.toFixed(2)} ${v2.toFixed(2)} Z`);
        }
      }
    });

    return `<?xml version="1.0" standalone="no"?>
<svg width="${canvasW}px" height="${canvasH}px" viewBox="0 0 ${canvasW} ${canvasH}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#0b0f19" rx="8" />
  <path d="${paths.join(' ')}" fill="none" stroke="#00f0ff" stroke-width="0.85" stroke-opacity="0.85" stroke-linejoin="round" />
</svg>`;
  }

  /**
   * Generates high-contrast Grayscale Depthmap PNG
   * Prioritizes high-dynamic-range CLAHE depthmap directly from source photo if available
   * @param {THREE.Object3D} object 
   * @param {number} res 
   * @returns {Promise<Blob>}
   */
  static async generateDepthmapPNG(object, res = 512) {
    // 1. Check if source image is attached or active
    let sourceImg = object.userData?.sourceImage || window.__polymorph_active_image;
    if (!sourceImg) {
      object.traverse((child) => {
        if (child.material && child.material.map && child.material.map.image) {
          sourceImg = child.material.map.image;
        }
      });
    }

    if (sourceImg && typeof ModelGenerators !== 'undefined' && ModelGenerators.processImageDepth) {
      const { depthCanvas } = ModelGenerators.processImageDepth(sourceImg, {
        resolution: Math.max(512, res),
        detailBoost: 0.65,
        contrastLimit: 3.0
      });
      return new Promise((resolve) => {
        depthCanvas.toBlob((blob) => resolve(blob), 'image/png');
      });
    }

    // 2. Fallback to 3D geometry adaptive rasterizer
    const canvas = document.createElement('canvas');
    canvas.width = res;
    canvas.height = res;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, res, res);

    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    box.getSize(size);

    let getU, getV, getDepth, uSize, vSize, depthRange, uMin, vMin, depthMin;
    if (size.z <= size.x && size.z <= size.y) {
      getU = (pos, i) => pos.getX(i);
      getV = (pos, i) => pos.getY(i);
      getDepth = (pos, i) => pos.getZ(i);
      uSize = size.x || 1;
      vSize = size.y || 1;
      depthRange = size.z || 1;
      uMin = box.min.x;
      vMin = box.min.y;
      depthMin = box.min.z;
    } else if (size.y <= size.x && size.y <= size.z) {
      getU = (pos, i) => pos.getX(i);
      getV = (pos, i) => pos.getZ(i);
      getDepth = (pos, i) => pos.getY(i);
      uSize = size.x || 1;
      vSize = size.z || 1;
      depthRange = size.y || 1;
      uMin = box.min.x;
      vMin = box.min.z;
      depthMin = box.min.y;
    } else {
      getU = (pos, i) => pos.getZ(i);
      getV = (pos, i) => pos.getY(i);
      getDepth = (pos, i) => pos.getX(i);
      uSize = size.z || 1;
      vSize = size.y || 1;
      depthRange = size.x || 1;
      uMin = box.min.z;
      vMin = box.min.y;
      depthMin = box.min.x;
    }

    const pad = 24;
    const drawDim = res - pad * 2;
    const maxDim = Math.max(uSize, vSize) || 1;

    const offsetX = pad + ((maxDim - uSize) / 2 / maxDim) * drawDim;
    const offsetY = pad + ((maxDim - vSize) / 2 / maxDim) * drawDim;

    object.traverse((child) => {
      if (child.isMesh && child.geometry) {
        let geo = child.geometry;
        if (geo.index) geo = geo.toNonIndexed();
        const pos = geo.attributes.position;
        if (!pos) return;

        for (let i = 0; i < pos.count; i += 3) {
          const p = (idx) => ({
            u: Math.floor(offsetX + ((getU(pos, idx) - uMin) / maxDim) * drawDim),
            v: Math.floor(res - (offsetY + ((getV(pos, idx) - vMin) / maxDim) * drawDim)),
            h: Math.min(255, Math.max(0, Math.floor(((getDepth(pos, idx) - depthMin) / depthRange) * 255)))
          });

          const p0 = p(i);
          const p1 = p(i + 1);
          const p2 = p(i + 2);
          const avgH = Math.round((p0.h + p1.h + p2.h) / 3);

          ctx.fillStyle = `rgb(${avgH},${avgH},${avgH})`;
          ctx.beginPath();
          ctx.moveTo(p0.u, p0.v);
          ctx.lineTo(p1.u, p1.v);
          ctx.lineTo(p2.u, p2.v);
          ctx.closePath();
          ctx.fill();
        }
      }
    });

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  }

  /**
   * Triggers automatic browser file download
   * @param {Blob} blob 
   * @param {string} filename 
   */
  static triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2500);
  }
}

window.ModelConverters = ModelConverters;
