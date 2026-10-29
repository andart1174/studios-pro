/**
 * PolyMorph 3D Studio - Voxel & Retro Pixel 3D Engine
 * Converts 2D pixel art sprites, images, and voxel maps into 3D LEGO-compatible
 * interlocking stud models, arcade light boxes, and multi-color AMS 3MFs.
 */
(function () {
  'use strict';
  var currentVoxelMesh = null, voxelImgEl = null;

  function el(id) { return document.getElementById(id); }
  function showMsg(msg, type) {
    if (typeof showToast === 'function') showToast(msg, type || 'info');
    else console.log('[Voxel]', msg);
  }
  function setLoading(on, txt) {
    var ov = el('loading-overlay'), lb = el('loading-text');
    if (!ov) return;
    if (on) { if (lb) lb.textContent = txt || 'Voxelizing 3D Matrix...'; ov.classList.add('visible'); }
    else { ov.classList.remove('visible'); }
  }

  function pushModel(mesh, name) {
    currentVoxelMesh = mesh;
    if (typeof window.__polymorphSetModel === 'function') {
      window.__polymorphSetModel(mesh, name);
      return;
    }
    document.dispatchEvent(new CustomEvent('voxel3dReady', { detail: { mesh: mesh, name: name } }));
  }

  function wireSlider(sid, vid) {
    var s = el(sid), v = el(vid);
    if (!s || !v) return;
    function upd() {
      var step = parseFloat(s.step || 1);
      var decimals = step < 1 ? 1 : 0;
      v.textContent = parseFloat(s.value).toFixed(decimals) + (s.dataset.unit || '');
    }
    s.addEventListener('input', upd);
    upd();
  }

  function handleVoxelImage(file) {
    if (!file || !file.type.startsWith('image/')) return;
    var reader = new FileReader();
    reader.onload = function (ev) {
      var img = new Image();
      img.onload = function () {
        voxelImgEl = img;
        var p = el('voxel-preview-img'), c = el('voxel-preview-container'), dz = el('voxel-dropzone');
        if (p) p.src = ev.target.result;
        if (c) c.style.display = 'block';
        if (dz) dz.style.display = 'none';
        generateVoxel();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  function buildVoxelMatrix(img, p) {
    var T = (typeof window !== 'undefined' && window.THREE) ? window.THREE : (typeof THREE !== 'undefined' ? THREE : null);
    var type = p.type || 'sprite';
    var depth = parseFloat(p.depth || 8.0);
    var relief = (p.relief !== undefined) ? parseFloat(p.relief) : (type === 'sprite' ? 3.0 : 0.0);
    var textureMode = p.textureMode || 'mosaic';
    var addStuds = (p.addStuds !== undefined) ? !!p.addStuds : (type === 'lego');
    var res = parseInt(p.res || 28, 10);

    var grp = new T.Group();
    grp.name = 'Voxel_3D_Model';

    // 1. Sample pixel colors from image onto grid
    var canvas = document.createElement('canvas');
    canvas.width = res;
    canvas.height = res;
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    if (img) {
      ctx.drawImage(img, 0, 0, res, res);
    } else {
      // High-definition iconic 8-bit / 16-bit Pixel Sword & Heart Sprite
      ctx.fillStyle = '#00000000';
      ctx.clearRect(0, 0, res, res);

      // Outer gold/black contour
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(res * 0.35, res * 0.35, res * 0.28, 0, Math.PI * 2);
      ctx.arc(res * 0.65, res * 0.35, res * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(res * 0.1, res * 0.4);
      ctx.lineTo(res * 0.9, res * 0.4);
      ctx.lineTo(res * 0.5, res * 0.92);
      ctx.closePath();
      ctx.fill();

      // Main ruby red heart fill
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(res * 0.35, res * 0.35, res * 0.22, 0, Math.PI * 2);
      ctx.arc(res * 0.65, res * 0.35, res * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(res * 0.16, res * 0.42);
      ctx.lineTo(res * 0.84, res * 0.42);
      ctx.lineTo(res * 0.5, res * 0.84);
      ctx.closePath();
      ctx.fill();

      // Shiny pixel highlight (top-left white glint)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.floor(res * 0.25), Math.floor(res * 0.25), Math.ceil(res * 0.12), Math.ceil(res * 0.12));
    }

    var imgData = ctx.getImageData(0, 0, res, res).data;

    // 2. High-resolution texture canvas for GLB export and interactive rendering
    var texCanvas = document.createElement('canvas');
    texCanvas.width = 512;
    texCanvas.height = 512;
    var tCtx = texCanvas.getContext('2d');
    if (textureMode === 'photo' && img) {
      tCtx.drawImage(img, 0, 0, 512, 512);
    } else {
      tCtx.imageSmoothingEnabled = false;
      tCtx.drawImage(canvas, 0, 0, 512, 512);
    }

    var voxelTexture = new T.CanvasTexture(texCanvas);
    voxelTexture.magFilter = (textureMode === 'photo') ? T.LinearFilter : T.NearestFilter;
    voxelTexture.minFilter = (textureMode === 'photo') ? T.LinearMipmapLinearFilter : T.NearestFilter;
    if ('colorSpace' in voxelTexture && T.SRGBColorSpace) voxelTexture.colorSpace = T.SRGBColorSpace;
    else if (T.sRGBEncoding) voxelTexture.encoding = T.sRGBEncoding;

    // 3. Physical scale setup
    var voxelSize = 64 / res;
    var studR = voxelSize * 0.32;
    var studH = voxelSize * 0.35;
    var studSegs = 14;

    var cosTable = [], sinTable = [];
    for (var s = 0; s < studSegs; s++) {
      var angle = (s / studSegs) * Math.PI * 2;
      cosTable.push(Math.cos(angle));
      sinTable.push(Math.sin(angle));
    }

    var positions = [];
    var normals = [];
    var uvs = [];
    var colors = [];

    // Map for multi-color 3MF grouping
    var colorGroups = {};

    var hw = (voxelSize * 0.98) / 2;
    var hh = (voxelSize * 0.98) / 2;

    for (var y = 0; y < res; y++) {
      for (var x = 0; x < res; x++) {
        var idx = (y * res + x) * 4;
        var r = imgData[idx], g = imgData[idx + 1], b = imgData[idx + 2], a = imgData[idx + 3];

        if (a > 35) {
          var rN = r / 255, gN = g / 255, bN = b / 255;
          var lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

          // Multi-layer physical stepped 3D relief depth
          var vDepth = depth;
          if (relief > 0) {
            var baseD = Math.max(1.8, depth - relief);
            var stepLum = Math.round(lum * 6) / 6; // 6 physical sculptural levels
            vDepth = baseD + stepLum * relief;
          }

          var vx = (x - res / 2 + 0.5) * voxelSize;
          var vy = (res / 2 - y - 0.5) * voxelSize;

          // Texture UV coordinates corresponding to pixel cell (x, y)
          var u0 = x / res;
          var u1 = (x + 1) / res;
          var v0 = 1.0 - (y + 1) / res;
          var v1 = 1.0 - y / res;
          var uc = (x + 0.5) / res;
          var vc = 1.0 - (y + 0.5) / res;

          function pushV(px, py, pz, nx, ny, nz, u, v) {
            positions.push(px, py, pz);
            normals.push(nx, ny, nz);
            uvs.push(u, v);
            colors.push(rN, gN, bN);
          }

          function pushQuad(p1, p2, p3, p4, nx, ny, nz, uv1, uv2, uv3, uv4) {
            pushV(p1[0], p1[1], p1[2], nx, ny, nz, uv1[0], uv1[1]);
            pushV(p2[0], p2[1], p2[2], nx, ny, nz, uv2[0], uv2[1]);
            pushV(p3[0], p3[1], p3[2], nx, ny, nz, uv3[0], uv3[1]);

            pushV(p1[0], p1[1], p1[2], nx, ny, nz, uv1[0], uv1[1]);
            pushV(p3[0], p3[1], p3[2], nx, ny, nz, uv3[0], uv3[1]);
            pushV(p4[0], p4[1], p4[2], nx, ny, nz, uv4[0], uv4[1]);
          }

          // 1. Front face (+Z at Z = vDepth) - mapped to exact cell UVs
          pushQuad(
            [vx - hw, vy - hh, vDepth],
            [vx + hw, vy - hh, vDepth],
            [vx + hw, vy + hh, vDepth],
            [vx - hw, vy + hh, vDepth],
            0, 0, 1,
            [u0, v0], [u1, v0], [u1, v1], [u0, v1]
          );

          // 2. Back face (-Z at Z = 0) - flat base for perfect print bed adhesion
          pushQuad(
            [vx + hw, vy - hh, 0],
            [vx - hw, vy - hh, 0],
            [vx - hw, vy + hh, 0],
            [vx + hw, vy + hh, 0],
            0, 0, -1,
            [u1, v0], [u0, v0], [u0, v1], [u1, v1]
          );

          // 3. Top face (+Y)
          pushQuad(
            [vx - hw, vy + hh, 0],
            [vx + hw, vy + hh, 0],
            [vx + hw, vy + hh, vDepth],
            [vx - hw, vy + hh, vDepth],
            0, 1, 0,
            [u0, v1], [u1, v1], [u1, v1], [u0, v1]
          );

          // 4. Bottom face (-Y)
          pushQuad(
            [vx - hw, vy - hh, vDepth],
            [vx + hw, vy - hh, vDepth],
            [vx + hw, vy - hh, 0],
            [vx - hw, vy - hh, 0],
            0, -1, 0,
            [u0, v0], [u1, v0], [u1, v0], [u0, v0]
          );

          // 5. Right face (+X)
          pushQuad(
            [vx + hw, vy - hh, 0],
            [vx + hw, vy + hh, 0],
            [vx + hw, vy + hh, vDepth],
            [vx + hw, vy - hh, vDepth],
            1, 0, 0,
            [u1, v0], [u1, v1], [u1, v1], [u1, v0]
          );

          // 6. Left face (-X)
          pushQuad(
            [vx - hw, vy - hh, vDepth],
            [vx - hw, vy + hh, vDepth],
            [vx - hw, vy + hh, 0],
            [vx - hw, vy - hh, 0],
            -1, 0, 0,
            [u0, v0], [u0, v1], [u0, v1], [u0, v0]
          );

          // 7. LEGO Stud on top (if enabled)
          if (addStuds || type === 'lego') {
            var zStudBase = vDepth;
            var zStudTop = vDepth + studH;

            // Stud top cap (circle fan)
            for (var s = 0; s < studSegs; s++) {
              var sNext = (s + 1) % studSegs;
              var x1 = vx + studR * cosTable[s];
              var y1 = vy + studR * sinTable[s];
              var x2 = vx + studR * cosTable[sNext];
              var y2 = vy + studR * sinTable[sNext];

              var uvRad = 0.25 / res;
              pushV(vx, vy, zStudTop, 0, 0, 1, uc, vc);
              pushV(x1, y1, zStudTop, 0, 0, 1, uc + uvRad * cosTable[s], vc + uvRad * sinTable[s]);
              pushV(x2, y2, zStudTop, 0, 0, 1, uc + uvRad * cosTable[sNext], vc + uvRad * sinTable[sNext]);
            }

            // Stud side cylinder wall
            for (var s = 0; s < studSegs; s++) {
              var sNext = (s + 1) % studSegs;
              var c1 = cosTable[s], s1 = sinTable[s];
              var c2 = cosTable[sNext], s2 = sinTable[sNext];

              var p1 = [vx + studR * c1, vy + studR * s1, zStudBase];
              var p2 = [vx + studR * c2, vy + studR * s2, zStudBase];
              var p3 = [vx + studR * c2, vy + studR * s2, zStudTop];
              var p4 = [vx + studR * c1, vy + studR * s1, zStudTop];

              var midCos = (c1 + c2) / 2;
              var midSin = (s1 + s2) / 2;
              pushQuad(p1, p2, p3, p4, midCos, midSin, 0, [uc, vc], [uc, vc], [uc, vc], [uc, vc]);
            }
          }

          // Quantize color into hex key for multi-color AMS grouping
          var qR = Math.round(r / 24) * 24;
          var qG = Math.round(g / 24) * 24;
          var qB = Math.round(b / 24) * 24;
          var hexKey = (qR << 16) | (qG << 8) | qB;
          if (!colorGroups[hexKey]) colorGroups[hexKey] = { color: hexKey, count: 0 };
          colorGroups[hexKey].count++;
        }
      }
    }

    // Build unified BufferGeometry
    var geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new T.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
    geo.setAttribute('color', new T.Float32BufferAttribute(colors, 3));

    var mat = new T.MeshStandardMaterial({
      color: 0xffffff,
      map: voxelTexture,
      vertexColors: true,
      roughness: 0.35,
      metalness: 0.1,
      side: T.DoubleSide
    });

    var mesh = new T.Mesh(geo, mat);
    mesh.name = 'Voxel_Pixel_Model';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.sourceImage = texCanvas;
    mesh.userData.originalMaterial = mat;
    grp.add(mesh);

    // Build multi-color group for 3MF AMS slicers (Bambu Lab / Prusa)
    var amsGroup = new T.Group();
    amsGroup.name = 'Voxel_AMS_MultiColor';
    var groupKeys = Object.keys(colorGroups);
    if (groupKeys.length <= 24) {
      groupKeys.forEach(function(k) {
        var gInfo = colorGroups[k];
        var cMat = new T.MeshStandardMaterial({
          color: parseInt(k, 10),
          roughness: 0.35,
          metalness: 0.1
        });
        var cMesh = new T.Mesh(geo.clone(), cMat);
        cMesh.name = 'Color_' + gInfo.color.toString(16);
        amsGroup.add(cMesh);
      });
    } else {
      amsGroup.add(new T.Mesh(geo.clone(), mat));
    }
    Object.defineProperty(grp, 'multiColorGroup', { value: amsGroup, writable: true, configurable: true, enumerable: false });
    Object.defineProperty(grp, 'sourceImage', { value: texCanvas, writable: true, configurable: true, enumerable: false });
    grp.userData.isVoxelModel = true;

    // Auto-center and ground at Y=0
    grp.updateMatrixWorld(true);
    var box = new T.Box3().setFromObject(grp);
    var cen = new T.Vector3();
    box.getCenter(cen);
    grp.position.x = -cen.x;
    grp.position.z = -cen.z;
    grp.position.y = -box.min.y;
    grp.updateMatrixWorld(true);

    return grp;
  }

  function generateVoxel() {
    setLoading(true, 'Extruding 3D Voxel Blocks...');
    setTimeout(function () {
      try {
        var type = (el('voxel-type-select') || {}).value || 'sprite';
        var depth = parseFloat((el('voxel-depth-slider') || {}).value || 8.0);
        var relief = parseFloat((el('voxel-relief-slider') || {}).value || 3.0);
        var textureMode = (el('voxel-texture-select') || {}).value || 'mosaic';
        var addStuds = !!(el('voxel-stud-toggle') || {}).checked;
        var res = parseInt((el('voxel-res-select') || {}).value || 28, 10);

        var p = { type: type, depth: depth, relief: relief, textureMode: textureMode, addStuds: addStuds, res: res };
        var model = buildVoxelMatrix(voxelImgEl, p);

        pushModel(model, 'voxel_' + type);
        showMsg((window.I18N && I18N.t) ? I18N.t('toastVoxelGenerated') : '3D Voxel Model generated with multi-color palette!', 'success');
      } catch (err) {
        console.error(err);
        showMsg('Error: ' + err.message, 'error');
      } finally {
        setLoading(false);
      }
    }, 40);
  }

  async function doExport(fmt) {
    if (!currentVoxelMesh) { showMsg('Please generate a Voxel model first!', 'warning'); return; }
    setLoading(true, 'Exporting ' + fmt.toUpperCase() + '...');
    try {
      if (fmt === '3mf' && window.ModelConverters && ModelConverters.export3MF) {
        var meshFor3MF = currentVoxelMesh.multiColorGroup || (currentVoxelMesh.userData && currentVoxelMesh.userData.multiColorGroup) || currentVoxelMesh;
        var r3 = await ModelConverters.export3MF(meshFor3MF, 'Voxel_Retro_MultiColor');
        ModelConverters.triggerDownload(r3.blob, r3.filename);
        showMsg('Multi-Color 3MF exported!', 'success');
        return;
      }
      var r = await ModelConverters.exportModel(currentVoxelMesh, fmt, 'voxel_model');
      ModelConverters.triggerDownload(r.blob, r.filename);
      showMsg('Exported ' + fmt.toUpperCase() + ' successfully!', 'success');
    } catch (e) {
      showMsg('Export error: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function init() {
    var dz = el('voxel-dropzone'), fi = el('voxel-file-input');
    if (dz && fi) {
      dz.addEventListener('click', function () { fi.click(); });
      ['dragenter', 'dragover'].forEach(function (ev) {
        dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('dragover'); });
      });
      ['dragleave', 'drop'].forEach(function (ev) {
        dz.addEventListener(ev, function (e) {
          e.preventDefault();
          dz.classList.remove('dragover');
          if (ev === 'drop' && e.dataTransfer.files[0]) handleVoxelImage(e.dataTransfer.files[0]);
        });
      });
      fi.addEventListener('change', function () { if (fi.files[0]) handleVoxelImage(fi.files[0]); });
    }

    var clr = el('voxel-preview-clear');
    if (clr) {
      clr.addEventListener('click', function () {
        voxelImgEl = null;
        var c = el('voxel-preview-container'), dz = el('voxel-dropzone');
        if (c) c.style.display = 'none';
        if (dz) dz.style.display = 'flex';
        generateVoxel();
      });
    }

    wireSlider('voxel-depth-slider', 'voxel-depth-val');
    wireSlider('voxel-relief-slider', 'voxel-relief-val');

    var typeSel = el('voxel-type-select');
    if (typeSel) typeSel.addEventListener('change', generateVoxel);
    var resSel = el('voxel-res-select');
    if (resSel) resSel.addEventListener('change', generateVoxel);
    var studTog = el('voxel-stud-toggle');
    if (studTog) studTog.addEventListener('change', generateVoxel);
    var texSel = el('voxel-texture-select');
    if (texSel) texSel.addEventListener('change', generateVoxel);
    var relSlider = el('voxel-relief-slider');
    if (relSlider) relSlider.addEventListener('input', generateVoxel);

    var gb = el('btn-generate-voxel');
    if (gb) gb.addEventListener('click', generateVoxel);

    var estl = el('btn-export-voxel-stl');
    if (estl) estl.addEventListener('click', function () { doExport('stl'); });
    var eglb = el('btn-export-voxel-glb');
    if (eglb) eglb.addEventListener('click', function () { doExport('glb'); });
    var e3mf = el('btn-export-voxel-3mf');
    if (e3mf) e3mf.addEventListener('click', function () { doExport('3mf'); });
    var ehtml = el('btn-export-voxel-html');
    if (ehtml) ehtml.addEventListener('click', function () { doExport('html'); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  window.__voxelEngine = { generate: generateVoxel, buildVoxelMatrix: buildVoxelMatrix };
})();
