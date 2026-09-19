/**
 * PolyMorph 3D Studio - Bas-Relief & Coin Medallion Studio (Tab: 🪙 Bas-Relief & Coins)
 * Generates Ultra-HD Numismatic Coins, Commemorative Medallions,
 * Heraldic Shields, and Minted Jewelry Pendants with TRUE 3D PHYSICAL VERTEX DISPLACEMENT.
 * Both the 3D geometry (STL/GLB/3MF) and PBR materials contain full photographic relief.
 */
(function () {
  'use strict';
  var currentBasReliefMesh = null;
  var customUploadedImg = null;

  function el(id) { return document.getElementById(id); }
  function showMsg(msg, type) {
    if (typeof showToast === 'function') showToast(msg, type || 'info');
    else console.log('[BasRelief]', msg);
  }
  function setLoading(on, txt) {
    var ov = el('loading-overlay'), lb = el('loading-text');
    if (!ov) return;
    if (on) { if (lb) lb.textContent = txt || 'Minting 3D Medallion...'; ov.classList.add('visible'); }
    else { ov.classList.remove('visible'); }
  }

  function pushModel(mesh, name) {
    currentBasReliefMesh = mesh;
    if (typeof window.__polymorphSetModel === 'function') {
      window.__polymorphSetModel(mesh, name);
      return;
    }
    document.dispatchEvent(new CustomEvent('basRelief3dReady', { detail: { mesh: mesh, name: name } }));
  }

  function wireSlider(sid, vid) {
    var s = el(sid), v = el(vid);
    if (!s || !v) return;
    function upd() {
      var step = parseFloat(s.step || 1);
      var decimals = step < 1 ? 1 : 0;
      v.textContent = parseFloat(s.value).toFixed(decimals) + (s.dataset.unit || '');
    }
    s.addEventListener('input', function () {
      upd();
      generateBasRelief();
    });
    upd();
  }

  // ── 2048x2048 ULTRA-HD MINTED PROOF CANVAS (DIFFUSE + HEIGHTMAP) ──────────
  function generateMedallionTextures(p) {
    var size = 2048;
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    var center = size / 2;
    var radius = size * 0.45;

    // Patina Base Colors
    var patina = p.patina || 'gold';
    var cBase = '#d4af37', cDark = '#8f681a', cLight = '#fff2a3', cHighlight = '#ffffff';
    if (patina === 'silver') { cBase = '#d8e0e8'; cDark = '#64748b'; cLight = '#f8fafc'; cHighlight = '#ffffff'; }
    else if (patina === 'bronze') { cBase = '#92400e'; cDark = '#451a03'; cLight = '#d97706'; cHighlight = '#fde68a'; }
    else if (patina === 'verdigris') { cBase = '#0d9488'; cDark = '#115e59'; cLight = '#5eead4'; cHighlight = '#ccfbf1'; }
    else if (patina === 'titanium') { cBase = '#475569'; cDark = '#1e293b'; cLight = '#94a3b8'; cHighlight = '#f1f5f9'; }

    // 1. Radial Coin Surface Gradient
    var grad = ctx.createRadialGradient(center, center, radius * 0.05, center, center, radius);
    grad.addColorStop(0, cLight);
    grad.addColorStop(0.5, cBase);
    grad.addColorStop(0.95, cDark);
    grad.addColorStop(1, cBase);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // 2. Outer Raised Beveled Rim
    ctx.lineWidth = size * 0.035;
    ctx.strokeStyle = cHighlight;
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(center, center, radius - size * 0.02, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 3. Recessed Inner Groove
    var innerR = radius * 0.88;
    ctx.lineWidth = size * 0.014;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.arc(center, center, innerR, 0, Math.PI * 2);
    ctx.stroke();

    // 4. Secondary Frosted Inner Field Table
    var fieldGrad = ctx.createRadialGradient(center, center, 0, center, center, innerR);
    fieldGrad.addColorStop(0, 'rgba(255,255,255,0.22)');
    fieldGrad.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = fieldGrad;
    ctx.beginPath();
    ctx.arc(center, center, innerR, 0, Math.PI * 2);
    ctx.fill();

    // ── GREEK MEANDER / LAUREL WREATH BORDER ────────────────────────────────
    if (p.border === 'meander' || p.border === 'wreath') {
      var midR = (radius + innerR) / 2;
      ctx.lineWidth = 12;
      ctx.strokeStyle = cLight;
      ctx.beginPath();
      ctx.arc(center, center, midR, 0, Math.PI * 2);
      ctx.stroke();

      var beads = 48;
      for (var b = 0; b < beads; b++) {
        var bAng = (b * Math.PI * 2) / beads;
        var bx = center + Math.cos(bAng) * midR;
        var by = center + Math.sin(bAng) * midR;
        ctx.fillStyle = cHighlight;
        ctx.beginPath();
        ctx.arc(bx, by, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── CENTER PORTRAIT PHOTO OR NUMISMATIC PRESET (UPRIGHT) ────────────────
    if (customUploadedImg) {
      ctx.save();
      ctx.beginPath();
      var targetR = innerR * 0.80;
      ctx.arc(center, center, targetR, 0, Math.PI * 2);
      ctx.clip();

      var imgW = customUploadedImg.naturalWidth || customUploadedImg.width || 1;
      var imgH = customUploadedImg.naturalHeight || customUploadedImg.height || 1;
      var maxDim = Math.max(imgW, imgH);
      var drawW = (imgW / maxDim) * (targetR * 2.0);
      var drawH = (imgH / maxDim) * (targetR * 2.0);

      // Draw portrait upright and centered
      ctx.drawImage(customUploadedImg, center - drawW / 2, center - drawH / 2, drawW, drawH);
      ctx.restore();

      // High-definition numismatic relief tonal processing
      var imgData = ctx.getImageData(0, 0, size, size);
      var data = imgData.data;
      for (var i = 0; i < data.length; i += 4) {
        var r = data[i], g = data[i+1], b = data[i+2];
        var lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
        // Non-linear S-curve for crisp minted portrait highlights and shadows
        var tone = Math.pow(lum, 0.82);
        if (patina === 'silver') {
          data[i]   = Math.min(255, Math.round(data[i] * 0.2 + tone * 220));
          data[i+1] = Math.min(255, Math.round(data[i+1] * 0.2 + tone * 230));
          data[i+2] = Math.min(255, Math.round(data[i+2] * 0.2 + tone * 240));
        } else if (patina === 'bronze') {
          data[i]   = Math.min(255, Math.round(data[i] * 0.2 + tone * 230));
          data[i+1] = Math.min(255, Math.round(data[i+1] * 0.2 + tone * 140));
          data[i+2] = Math.min(255, Math.round(data[i+2] * 0.2 + tone * 50));
        } else {
          // Gold / Titanium / Verdigris
          data[i]   = Math.min(255, Math.round(data[i] * 0.2 + tone * 245));
          data[i+1] = Math.min(255, Math.round(data[i+1] * 0.2 + tone * 205));
          data[i+2] = Math.min(255, Math.round(data[i+2] * 0.2 + tone * 75));
        }
      }
      ctx.putImageData(imgData, 0, 0);

    } else {
      ctx.save();
      ctx.fillStyle = cHighlight;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 380px "Segoe UI", serif';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 8;
      ctx.shadowOffsetY = 8;

      var emblem = '🦅';
      if (p.preset === 'caesar') emblem = '🏛️';
      else if (p.preset === 'lion') emblem = '🦁';
      else if (p.preset === 'dragon') emblem = '🐉';
      else if (p.preset === 'zodiac') emblem = '🌌';
      else if (p.preset === 'crown') emblem = '👑';

      ctx.fillText(emblem, center, center - 20);
      ctx.restore();
    }

    // ── CURVED ARC TEXT (TOP & BOTTOM) ──────────────────────────────────────
    function drawCurvedText(text, r, isTop) {
      if (!text || !text.trim()) return;
      ctx.save();
      ctx.font = 'bold 76px "Cinzel", "Times New Roman", Georgia, serif';
      ctx.fillStyle = cHighlight;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#1f1300';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetX = 5;
      ctx.shadowOffsetY = 5;

      var len = text.length;
      var arcAngle = Math.min(Math.PI * 0.82, len * 0.084);
      var startAng = isTop ? (-Math.PI / 2 - arcAngle / 2) : (Math.PI / 2 + arcAngle / 2);
      var step = arcAngle / (len - 1 || 1);

      for (var i = 0; i < len; i++) {
        var charAng = isTop ? (startAng + i * step) : (startAng - i * step);
        var cx = center + Math.cos(charAng) * r;
        var cy = center + Math.sin(charAng) * r;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(charAng + (isTop ? Math.PI / 2 : -Math.PI / 2));
        ctx.fillText(text[i], 0, 0);
        ctx.restore();
      }
      ctx.restore();
    }

    drawCurvedText(p.topText || 'LIBERTAS • INVICTA', innerR * 0.84, true);
    drawCurvedText(p.bottomText || 'MMXXVI • POLYMORPH', innerR * 0.84, false);

    // Extract Heightmap Array from Canvas Pixels for True 3D Physical Vertex Displacement
    var fullImgData = ctx.getImageData(0, 0, size, size);
    var rawPixels = fullImgData.data;

    var tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;

    return { texture: tex, canvas: canvas, rawPixels: rawPixels, size: size };
  }

  // ── BUILD TRUE 3D PHYSICAL DISPLACEMENT MESH FOR COINS / MEDALLIONS ────────
  function createDisplacedMedallionMesh(p, texData, coinMat) {
    var T = window.THREE;
    var shape = p.shape || 'circle';
    var diam = p.diam || 60;
    var thickness = p.thickness || 4.5;
    var reliefDepth = p.reliefDepth || 3.0;
    var radius = diam / 2.0;

    var size = texData.size;
    var rawPixels = texData.rawPixels;

    // Helper: Sample heightmap normalized [0.0, 1.0] from canvas UV
    function sampleHeight(u, v) {
      var px = Math.min(size - 1, Math.max(0, Math.floor(u * (size - 1))));
      var py = Math.min(size - 1, Math.max(0, Math.floor((1.0 - v) * (size - 1))));
      var idx = (py * size + px) * 4;
      var r = rawPixels[idx];
      var g = rawPixels[idx + 1];
      var b = rawPixels[idx + 2];
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
    }

    var N = 200; // High-density grid for crisp physical 3D relief
    var positions = [];
    var uvs = [];
    var indices = [];
    var grid = [];
    var vertCount = 0;

    // Shape inside test
    function isInside(x, y) {
      if (shape === 'circle') {
        return (x * x + y * y) <= (radius * radius);
      } else if (shape === 'octagon') {
        var d = Math.sqrt(x * x + y * y);
        if (d > radius) return false;
        var ang = Math.atan2(y, x);
        var octR = radius * (Math.cos(Math.PI / 8) / Math.cos(((ang % (Math.PI / 4)) + (Math.PI / 4)) % (Math.PI / 4) - Math.PI / 8));
        return d <= octR;
      } else if (shape === 'shield') {
        if (y > radius * 0.85 || y < -radius * 1.05) return false;
        if (Math.abs(x) > radius * 0.88) return false;
        if (y < 0) {
          var normX = Math.abs(x) / (radius * 0.88);
          var normY = -y / (radius * 1.05);
          if (normX * normX + normY * normY > 1.05) return false;
        }
        return true;
      } else {
        // Plaque
        return Math.abs(x) <= (radius * 1.3) && Math.abs(y) <= (radius * 0.95);
      }
    }

    var boundW = (shape === 'plaque' ? radius * 1.3 : radius);
    var boundH = (shape === 'plaque' ? radius * 0.95 : (shape === 'shield' ? radius * 1.05 : radius));

    // 1. FRONT DISPLACED 3D SURFACE VERTICES
    for (var j = 0; j < N; j++) {
      grid[j] = [];
      var v = j / (N - 1);
      var y = (v - 0.5) * 2 * boundH;

      for (var i = 0; i < N; i++) {
        var u = i / (N - 1);
        var x = (u - 0.5) * 2 * boundW;

        if (isInside(x, y)) {
          var hNorm = sampleHeight(u, v);
          var z = thickness + hNorm * reliefDepth;

          positions.push(x, y, z);
          uvs.push(u, v);
          grid[j][i] = vertCount++;
        } else {
          grid[j][i] = -1;
        }
      }
    }

    // Front Triangulation
    for (var j = 0; j < N - 1; j++) {
      for (var i = 0; i < N - 1; i++) {
        var p00 = grid[j][i];
        var p10 = grid[j][i + 1];
        var p01 = grid[j + 1][i];
        var p11 = grid[j + 1][i + 1];

        if (p00 !== -1 && p10 !== -1 && p01 !== -1) {
          indices.push(p00, p10, p01);
        }
        if (p10 !== -1 && p11 !== -1 && p01 !== -1) {
          indices.push(p10, p11, p01);
        }
      }
    }

    // 2. FLAT BACK FACE & WATERTIGHT SIDE BORDER WALLS
    var perimSegs = 128;
    var frontRimIdx = [];
    var backRimIdx = [];

    var backCenterIdx = positions.length / 3;
    positions.push(0, 0, 0);
    uvs.push(0.5, 0.5);

    for (var s = 0; s < perimSegs; s++) {
      var ang = (s * Math.PI * 2) / perimSegs;
      var px, py;

      if (shape === 'circle') {
        px = Math.cos(ang) * radius;
        py = Math.sin(ang) * radius;
      } else if (shape === 'octagon') {
        var octR = radius * (Math.cos(Math.PI / 8) / Math.cos(((ang % (Math.PI / 4)) + (Math.PI / 4)) % (Math.PI / 4) - Math.PI / 8));
        px = Math.cos(ang) * octR;
        py = Math.sin(ang) * octR;
      } else if (shape === 'shield') {
        px = Math.cos(ang) * radius * 0.88;
        py = Math.sin(ang) * (Math.sin(ang) < 0 ? radius * 1.05 : radius * 0.85);
      } else {
        px = Math.cos(ang) * boundW;
        py = Math.sin(ang) * boundH;
      }

      var uRim = (px / (2 * boundW)) + 0.5;
      var vRim = (py / (2 * boundH)) + 0.5;
      var hRim = sampleHeight(uRim, vRim);

      var fIdx = positions.length / 3;
      positions.push(px, py, thickness + hRim * reliefDepth);
      uvs.push(uRim, vRim);
      frontRimIdx.push(fIdx);

      var bIdx = positions.length / 3;
      positions.push(px, py, 0);
      uvs.push(uRim, vRim);
      backRimIdx.push(bIdx);
    }

    // Side Wall Quads & Back Face Fan Triangles
    for (var s = 0; s < perimSegs; s++) {
      var nextS = (s + 1) % perimSegs;
      var f0 = frontRimIdx[s];
      var f1 = frontRimIdx[nextS];
      var b0 = backRimIdx[s];
      var b1 = backRimIdx[nextS];

      // Side wall quad
      indices.push(f0, b0, f1);
      indices.push(f1, b0, b1);

      // Back face fan
      indices.push(backCenterIdx, b1, b0);
    }

    var geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    var mesh = new T.Mesh(geo, coinMat);
    mesh.name = 'Sculpted_Medallion_Body';
    return mesh;
  }

  // ── BUILD 3D COIN OBJECT ─────────────────────────────────────────────────
  function buildBasReliefObject(p) {
    var T = window.THREE;
    var shape = p.shape || 'circle';
    var diam = p.diam || 60;
    var thickness = p.thickness || 4.5;
    var hasBail = p.hasBail !== false;
    var patina = p.patina || 'gold';

    var grp = new T.Group();
    grp.name = 'BasRelief_Coin_' + shape;

    var texData = generateMedallionTextures(p);

    var rough = 0.22, metal = 0.94;
    if (patina === 'silver') { rough = 0.18; metal = 0.95; }
    else if (patina === 'bronze') { rough = 0.45; metal = 0.85; }
    else if (patina === 'verdigris') { rough = 0.65; metal = 0.35; }
    else if (patina === 'titanium') { rough = 0.25; metal = 0.9; }

    var coinMat = new T.MeshStandardMaterial({
      color: 0xffffff, // Pure white diffuse multiplier so canvas gold colors shine with full clarity
      roughness: rough,
      metalness: metal,
      map: texData.texture,
      side: T.DoubleSide
    });

    var radius = diam / 2.0;

    // 1. TRUE 3D PHYSICAL DISPLACEMENT MESH (DISPLACED VERTICES IN 3D GEOMETRY)
    var coinMesh = createDisplacedMedallionMesh(p, texData, coinMat);
    grp.add(coinMesh);

    // 2. REEDED MILLED FLUTING (IF CIRCLE & REEDED)
    if (shape === 'circle' && p.border === 'reeded') {
      var reedMat = new T.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.15, metalness: metal });
      for (var re = 0; re < 72; re++) {
        var rAng = (re * Math.PI * 2) / 72;
        var rMesh = new T.Mesh(new T.BoxGeometry(0.8, 1.2, thickness * 0.95), reedMat);
        rMesh.position.set(Math.cos(rAng) * (radius + 0.3), Math.sin(rAng) * (radius + 0.3), thickness / 2);
        rMesh.rotation.z = rAng;
        grp.add(rMesh);
      }
    }

    // 3. PENDANT RING / BAIL (FUSED SOLID WITH MOUNTING LUG)
    if (hasBail) {
      var bailGrp = new T.Group();
      bailGrp.name = 'Pendant_Bail_Attachment';

      var topY = (shape === 'shield' ? radius * 0.85 : (shape === 'plaque' ? radius * 0.95 : radius));

      // Solid Mounting Lug / Bridge
      var lugW = radius * 0.28;
      var lugH = 5.5;
      var lugThick = thickness * 0.95;
      var lugGeo = new T.BoxGeometry(lugW, lugH, lugThick);
      var lug = new T.Mesh(lugGeo, coinMat);
      lug.position.set(0, topY + lugH * 0.4, thickness / 2);
      bailGrp.add(lug);

      // Torus Ring
      var bailR = Math.max(4.0, radius * 0.13);
      var bailPipe = Math.max(1.4, bailR * 0.28);
      var bailGeo = new T.TorusGeometry(bailR, bailPipe, 16, 28);
      var bail = new T.Mesh(bailGeo, coinMat);
      bail.position.set(0, topY + lugH + bailR * 0.8, thickness / 2);
      bailGrp.add(bail);

      grp.add(bailGrp);
    }

    // Grounding and Auto-centering
    grp.updateMatrixWorld(true);
    var box = new T.Box3().setFromObject(grp);
    var cen = new T.Vector3();
    box.getCenter(cen);
    grp.position.x = -cen.x;
    grp.position.y = -cen.y;
    grp.position.z = -cen.z;
    grp.updateMatrixWorld(true);

    return grp;
  }

  function generateBasRelief() {
    setLoading(true, 'Minting 3D Medallion...');
    setTimeout(function () {
      try {
        var shape = (el('relief-shape-select') || {}).value || 'circle';
        var preset = (el('relief-preset-select') || {}).value || 'eagle';
        var border = (el('relief-border-select') || {}).value || 'beveled';
        var patina = (el('relief-patina-select') || {}).value || 'gold';
        var diam = parseFloat((el('relief-diam-slider') || {}).value || 60);
        var thickness = parseFloat((el('relief-thick-slider') || {}).value || 4.5);
        var reliefDepth = parseFloat((el('relief-depth-slider') || {}).value || 3.0);
        var hasBail = !!(el('relief-bail-toggle') || {}).checked;
        var topText = (el('relief-top-text') || {}).value || 'LIBERTAS • INVICTA';
        var bottomText = (el('relief-bottom-text') || {}).value || 'MMXXVI • POLYMORPH';

        var p = {
          shape: shape,
          preset: preset,
          border: border,
          patina: patina,
          diam: diam,
          thickness: thickness,
          reliefDepth: reliefDepth,
          hasBail: hasBail,
          topText: topText,
          bottomText: bottomText
        };

        var model = buildBasReliefObject(p);
        pushModel(model, 'medallion_' + shape + '_' + (customUploadedImg ? 'custom' : preset));
        showMsg((window.I18N && I18N.t) ? I18N.t('toastReliefGenerated') : 'Numismatic 3D Medallion minted with true physical relief!', 'success');
      } catch (err) {
        console.error(err);
        showMsg('Error: ' + err.message, 'error');
      } finally {
        setLoading(false);
      }
    }, 40);
  }

  async function doExport(fmt) {
    if (!currentBasReliefMesh) { showMsg('Please generate a medallion first!', 'warning'); return; }
    setLoading(true, 'Exporting ' + fmt.toUpperCase() + '...');
    try {
      if (fmt === '3mf') {
        var r3 = await ModelConverters.export3MF(currentBasReliefMesh, 'BasRelief_Medallion');
        ModelConverters.triggerDownload(r3.blob, r3.filename);
        showMsg('Multi-Color 3MF exported!', 'success');
        return;
      }
      var r = await ModelConverters.exportModel(currentBasReliefMesh, fmt, 'bas_relief_medallion');
      ModelConverters.triggerDownload(r.blob, r.filename);
      showMsg('Exported ' + fmt.toUpperCase() + ' successfully!', 'success');
    } catch (e) {
      console.error(e);
      showMsg('Export error: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function handleFile(file) {
    if (!file || !file.type.match(/^image\//)) return;
    var reader = new FileReader();
    reader.onload = function (evt) {
      var img = new Image();
      img.onload = function () {
        customUploadedImg = img;
        var pvC = el('relief-preview-container'), pvI = el('relief-preview-img');
        if (pvC && pvI) { pvI.src = img.src; pvC.style.display = 'block'; }
        generateBasRelief();
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  }

  function init() {
    wireSlider('relief-diam-slider', 'relief-diam-val');
    wireSlider('relief-thick-slider', 'relief-thick-val');
    wireSlider('relief-depth-slider', 'relief-depth-val');

    var shpSel = el('relief-shape-select');
    if (shpSel) shpSel.addEventListener('change', generateBasRelief);
    var preSel = el('relief-preset-select');
    if (preSel) preSel.addEventListener('change', generateBasRelief);
    var borSel = el('relief-border-select');
    if (borSel) borSel.addEventListener('change', generateBasRelief);
    var patSel = el('relief-patina-select');
    if (patSel) patSel.addEventListener('change', generateBasRelief);
    
    var bailTog = el('relief-bail-toggle');
    if (bailTog) bailTog.addEventListener('change', generateBasRelief);

    var tt = el('relief-top-text');
    if (tt) tt.addEventListener('input', generateBasRelief);
    var bt = el('relief-bottom-text');
    if (bt) bt.addEventListener('input', generateBasRelief);

    // Image Upload & Drag-and-Drop Handling
    var dropz = el('relief-dropzone');
    var finput = el('relief-file-input');
    if (dropz && finput) {
      dropz.addEventListener('click', function () { finput.click(); });
      finput.addEventListener('change', function (e) {
        if (e.target.files && e.target.files[0]) {
          handleFile(e.target.files[0]);
        }
      });
      dropz.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.stopPropagation();
        dropz.classList.add('drag-active');
      });
      dropz.addEventListener('dragleave', function (e) {
        e.preventDefault();
        e.stopPropagation();
        dropz.classList.remove('drag-active');
      });
      dropz.addEventListener('drop', function (e) {
        e.preventDefault();
        e.stopPropagation();
        dropz.classList.remove('drag-active');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFile(e.dataTransfer.files[0]);
        }
      });
    }

    var clr = el('relief-preview-clear');
    if (clr) {
      clr.addEventListener('click', function (e) {
        e.stopPropagation();
        customUploadedImg = null;
        if (finput) finput.value = '';
        var pvC = el('relief-preview-container');
        if (pvC) pvC.style.display = 'none';
        generateBasRelief();
      });
    }

    var gb = el('btn-generate-relief');
    if (gb) gb.addEventListener('click', generateBasRelief);

    var estl = el('btn-export-relief-stl');
    if (estl) estl.addEventListener('click', function () { doExport('stl'); });
    var eglb = el('btn-export-relief-glb');
    if (eglb) eglb.addEventListener('click', function () { doExport('glb'); });
    var e3mf = el('btn-export-relief-3mf');
    if (e3mf) e3mf.addEventListener('click', function () { doExport('3mf'); });
    var ehtml = el('btn-export-relief-html');
    if (ehtml) ehtml.addEventListener('click', function () { doExport('html'); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  window.__basReliefEngine = { generate: generateBasRelief };
})();
