/**
 * PolyMorph 3D Studio - Handwriting -> 3D Sculptor Engine (Pro Studio Quality)
 * High-definition typography, jewelry pendants with proper bail loops, wax seals, plaques,
 * multi-material finishes, image inversion, paper background cleaning & smoothing filters.
 */
(function () {
  'use strict';
  var currentHandwritingMesh = null, hwImgEl = null;
  var currentMaterialKey = 'gold', currentCustomHex = '#d4af37';

  function el(id) { return document.getElementById(id); }
  function showMsg(msg, type) {
    if (typeof showToast === 'function') showToast(msg, type || 'info');
    else console.log('[HW]', msg);
  }
  function setLoading(on, txt) {
    var ov = el('loading-overlay'), lb = el('loading-text');
    if (!ov) return;
    if (on) { if (lb) lb.textContent = txt || 'Processing...'; ov.classList.add('visible'); }
    else { ov.classList.remove('visible'); }
  }

  function pushModel(mesh, name) {
    currentHandwritingMesh = mesh;
    if (typeof window.__polymorphSetModel === 'function') {
      window.__polymorphSetModel(mesh, name);
      return;
    }
    document.dispatchEvent(new CustomEvent('handwriting3dReady', { detail: { mesh: mesh, name: name } }));
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

  var fontMap = {
    script: "italic bold 46px 'Georgia', 'Brush Script MT', cursive, serif",
    bold: "900 46px 'Impact', 'Arial Black', sans-serif",
    mono: "bold 40px 'Courier New', monospace",
    serif: "bold 46px 'Times New Roman', Times, serif"
  };

  function grayscale(r, g, b) {
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. 🎨 LUXURY JEWELRY & OBJECT MATERIALS
  // ═══════════════════════════════════════════════════════════════════════════
  function getJewelryMaterial(matKey, customHex) {
    var T = window.THREE;
    var matProps = {
      gold: { color: 0xd4af37, roughness: 0.16, metalness: 0.95 },
      silver: { color: 0xe2e8f0, roughness: 0.18, metalness: 0.95 },
      rosegold: { color: 0xb76e79, roughness: 0.20, metalness: 0.90 },
      gunmetal: { color: 0x1e293b, roughness: 0.25, metalness: 0.85 },
      wood: { color: 0x5c3a21, roughness: 0.75, metalness: 0.05 },
      bronze: { color: 0x8c6239, roughness: 0.40, metalness: 0.80 },
      waxred: { color: 0x991b1b, roughness: 0.30, metalness: 0.10 },
      marble: { color: 0xf8fafc, roughness: 0.55, metalness: 0.05 }
    };

    if (matKey === 'custom' && customHex) {
      var cInt = parseInt(customHex.replace('#', ''), 16);
      return new T.MeshStandardMaterial({ color: isNaN(cInt) ? 0xd4af37 : cInt, roughness: 0.25, metalness: 0.75 });
    }

    var cfg = matProps[matKey] || matProps['gold'];
    return new T.MeshStandardMaterial({
      color: cfg.color,
      roughness: cfg.roughness,
      metalness: cfg.metalness
    });
  }

  function getBaseMaterial(matKey) {
    var T = window.THREE;
    if (matKey === 'wood') {
      return new T.MeshStandardMaterial({ color: 0x3d2716, roughness: 0.85, metalness: 0.02 });
    }
    if (matKey === 'waxred') {
      return new T.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.35, metalness: 0.08 });
    }
    if (matKey === 'marble') {
      return new T.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.60, metalness: 0.04 });
    }
    return new T.MeshStandardMaterial({ color: 0x181a20, roughness: 0.5, metalness: 0.3 });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. 🎛️ ADVANCED IMAGE FILTER PIPELINE (Invert, Contrast, Smooth, BG Cleanup)
  // ═══════════════════════════════════════════════════════════════════════════
  function renderCompositeCanvas(text, imgEl, fontKey, mirror, res, mode, invert, contrast, smoothPasses, bgThreshold) {
    var c = document.createElement('canvas');
    c.width = res;
    c.height = res;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, res, res);

    var hasText = !!(text && text.trim().length > 0);
    var hasImg = !!imgEl;

    if (hasImg && hasText) {
      // Both: Central circular/heart photo + embossed text ribbon
      ctx.save();
      var photoRadius = res * 0.35;
      ctx.beginPath();
      ctx.arc(res / 2, res * 0.40, photoRadius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(imgEl, res / 2 - photoRadius, res * 0.40 - photoRadius, photoRadius * 2, photoRadius * 2);
      ctx.restore();

      // Text ribbon on bottom
      ctx.fillStyle = '#ffffff';
      ctx.font = fontMap[fontKey] || fontMap['script'];
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (mirror) {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.fillText(text.trim(), -res / 2, res * 0.84, res * 0.85);
        ctx.restore();
      } else {
        ctx.fillText(text.trim(), res / 2, res * 0.84, res * 0.85);
      }
    } else if (hasImg) {
      // Photo only
      ctx.drawImage(imgEl, 0, 0, res, res);
    } else {
      // Text only: Centered bold 3D typography
      ctx.fillStyle = '#ffffff';
      ctx.font = fontMap[fontKey] || fontMap['script'];
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      var lines = (text || '').trim().split('\n');
      var lineHeight = 54;
      var startY = res / 2 - ((lines.length - 1) * lineHeight) / 2;

      lines.forEach(function (line, idx) {
        var y = startY + idx * lineHeight;
        if (mirror) {
          ctx.save();
          ctx.scale(-1, 1);
          ctx.fillText(line, -res / 2, y, res * 0.88);
          ctx.restore();
        } else {
          ctx.fillText(line, res / 2, y, res * 0.88);
        }
      });
    }

    var imgData = ctx.getImageData(0, 0, res, res);
    var px = imgData.data;
    var rawGrays = new Float32Array(res * res);

    // Step 1: Grayscale & Inversion
    var bgCutoff = bgThreshold / 100.0;
    for (var i = 0; i < rawGrays.length; i++) {
      var pi = i * 4;
      var gVal = grayscale(px[pi], px[pi + 1], px[pi + 2]);

      // If inverting (e.g. black ink on white paper -> white ink for 3D extrusion)
      if (invert) {
        gVal = 1.0 - gVal;
      }

      // Paper background cleanup: clamp values below threshold to pure 0
      if (gVal < bgCutoff) {
        gVal = 0.0;
      } else if (bgCutoff < 0.99) {
        gVal = (gVal - bgCutoff) / (1.0 - bgCutoff);
      }

      // Contrast enhancement: (g - 0.5) * contrast + 0.5
      gVal = (gVal - 0.5) * contrast + 0.5;
      rawGrays[i] = Math.max(0.0, Math.min(1.0, gVal));
    }

    // Step 2: Multi-Pass Surface Smoothing (Gaussian / Box Blur filter)
    var smoothed = new Float32Array(rawGrays);
    var tempBuf = new Float32Array(res * res);

    for (var pass = 0; pass < smoothPasses; pass++) {
      for (var y = 0; y < res; y++) {
        for (var x = 0; x < res; x++) {
          var sum = 0, count = 0;
          for (var dy = -1; dy <= 1; dy++) {
            var ny = y + dy;
            if (ny < 0 || ny >= res) continue;
            for (var dx = -1; dx <= 1; dx++) {
              var nx = x + dx;
              if (nx < 0 || nx >= res) continue;
              var weight = (dx === 0 && dy === 0) ? 2.0 : 1.0;
              sum += smoothed[ny * res + nx] * weight;
              count += weight;
            }
          }
          tempBuf[y * res + x] = sum / count;
        }
      }
      smoothed.set(tempBuf);
    }

    return { width: res, height: res, grays: smoothed };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. 💍 JEWELRY & SCULPTOR 3D GEOMETRY BUILDER
  // ═══════════════════════════════════════════════════════════════════════════
  function buildJewelryObject(heightData, p) {
    var T = window.THREE;
    var res = heightData.width;
    var grays = heightData.grays;
    var objW = p.width;
    var radius = objW / 2;
    var baseThick = p.base;
    var depthMm = p.depth;
    var mode = p.mode;
    var isEngrave = !!p.engrave;
    var isCutout = (mode === 'cutout');

    var grp = new T.Group();
    grp.name = 'Handwriting_Sculptor_Object';

    var goldMat = getJewelryMaterial(p.matKey, p.customHex);
    var baseMat = getBaseMaterial(p.matKey);

    // ── SHAPE 1: HEART PENDANT ──────────────────────────────────────────────
    if (mode === 'heart') {
      var heartShape = new T.Shape();
      var hs = radius * 0.95;
      heartShape.moveTo(0, hs * 0.35);
      heartShape.bezierCurveTo(hs * 0.5, hs * 0.85, hs, hs * 0.45, hs, 0);
      heartShape.bezierCurveTo(hs, -hs * 0.5, 0, -hs * 0.9, 0, -hs);
      heartShape.bezierCurveTo(0, -hs * 0.9, -hs, -hs * 0.5, -hs, 0);
      heartShape.bezierCurveTo(-hs, hs * 0.45, -hs * 0.5, hs * 0.85, 0, hs * 0.35);

      var heartGeo = new T.ExtrudeGeometry(heartShape, { depth: baseThick, bevelEnabled: true, bevelSegments: 4, steps: 1, bevelSize: 0.8, bevelThickness: 0.8 });
      heartGeo.center();
      var heartBaseMesh = new T.Mesh(heartGeo, goldMat);
      grp.add(heartBaseMesh);

      // Relief Plane inside Heart
      var gridGeoHeart = new T.PlaneGeometry(radius * 1.8, radius * 1.8, res - 1, res - 1);
      var posH = gridGeoHeart.attributes.position;

      for (var hi = 0; hi < posH.count; hi++) {
        var hx = posH.getX(hi), hy = posH.getY(hi);
        // Normalized cardioid check for heart bounds
        var nx = hx / (radius * 0.85);
        var ny = (hy + radius * 0.15) / (radius * 0.85);
        var heartEq = Math.pow(nx * nx + ny * ny - 1, 3) - nx * nx * Math.pow(ny, 3);
        var inside = (heartEq <= 0.05);

        if (inside) {
          var uH = (hx / radius + 1) / 2;
          var vH = (hy / radius + 1) / 2;
          var xiH = Math.min(res - 1, Math.max(0, Math.floor(uH * (res - 1))));
          var yiH = Math.min(res - 1, Math.max(0, Math.floor((1 - vH) * (res - 1))));
          var gH = grays[yiH * res + xiH];

          var zH = isEngrave
            ? (baseThick / 2 - gH * depthMm * 0.85)
            : (baseThick / 2 + 0.05 + gH * depthMm);
          posH.setZ(hi, zH);
        } else {
          posH.setZ(hi, baseThick / 2 - 0.2);
        }
      }
      posH.needsUpdate = true;
      gridGeoHeart.computeVertexNormals();
      grp.add(new T.Mesh(gridGeoHeart, goldMat));

      if (p.addRing) {
        var hRing = new T.Mesh(new T.TorusGeometry(3.6, 1.3, 16, 32), goldMat);
        hRing.position.set(0, radius * 0.95 + 3.0, 0);
        grp.add(hRing);
      }

    // ── SHAPE 2: VINTAGE SHIELD / CREST ─────────────────────────────────────
    } else if (mode === 'shield') {
      var shieldShape = new T.Shape();
      var ssW = radius * 0.88, ssH = radius * 1.05;
      shieldShape.moveTo(-ssW, ssH);
      shieldShape.lineTo(ssW, ssH);
      shieldShape.lineTo(ssW, -ssH * 0.2);
      shieldShape.quadraticCurveTo(ssW * 0.7, -ssH * 0.8, 0, -ssH);
      shieldShape.quadraticCurveTo(-ssW * 0.7, -ssH * 0.8, -ssW, -ssH * 0.2);
      shieldShape.closePath();

      var shieldGeo = new T.ExtrudeGeometry(shieldShape, { depth: baseThick, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.8, bevelThickness: 0.8 });
      shieldGeo.center();
      grp.add(new T.Mesh(shieldGeo, goldMat));

      var gridShield = new T.PlaneGeometry(radius * 1.8, radius * 2.1, res - 1, res - 1);
      var posS = gridShield.attributes.position;
      for (var si = 0; si < posS.count; si++) {
        var sx = posS.getX(si), sy = posS.getY(si);
        var inShield = (Math.abs(sx) <= ssW * 0.88 && sy <= ssH * 0.88 && sy >= (-ssH * 0.88 + (Math.abs(sx) / ssW) * ssH * 0.6));
        if (inShield) {
          var uS = (sx / radius + 1) / 2, vS = (sy / (radius * 1.15) + 1) / 2;
          var xiS = Math.min(res - 1, Math.max(0, Math.floor(uS * (res - 1))));
          var yiS = Math.min(res - 1, Math.max(0, Math.floor((1 - vS) * (res - 1))));
          var gS = grays[yiS * res + xiS];
          posS.setZ(si, isEngrave ? (baseThick / 2 - gS * depthMm * 0.85) : (baseThick / 2 + 0.05 + gS * depthMm));
        } else {
          posS.setZ(si, baseThick / 2 - 0.2);
        }
      }
      posS.needsUpdate = true;
      gridShield.computeVertexNormals();
      grp.add(new T.Mesh(gridShield, goldMat));

      if (p.addRing) {
        var sRing = new T.Mesh(new T.TorusGeometry(3.6, 1.3, 16, 32), goldMat);
        sRing.position.set(0, ssH + 3.0, 0);
        grp.add(sRing);
      }

    // ── SHAPE 3: FREEFORM SILHOUETTE CUTOUT (NO SOLID BASE) ────────────────
    } else if (isCutout) {
      var gridCutout = new T.PlaneGeometry(objW, objW, res - 1, res - 1);
      var posC = gridCutout.attributes.position;
      for (var ci = 0; ci < posC.count; ci++) {
        var cx = posC.getX(ci), cy = posC.getY(ci);
        var uC = (cx / radius + 1) / 2, vC = (cy / radius + 1) / 2;
        var xiC = Math.min(res - 1, Math.max(0, Math.floor(uC * (res - 1))));
        var yiC = Math.min(res - 1, Math.max(0, Math.floor((1 - vC) * (res - 1))));
        var gC = grays[yiC * res + xiC];

        if (gC > 0.08) {
          posC.setZ(ci, baseThick + gC * depthMm);
        } else {
          posC.setZ(ci, -100); // Discard non-ink geometry
        }
      }
      posC.needsUpdate = true;
      gridCutout.computeVertexNormals();
      var cutoutMesh = new T.Mesh(gridCutout, goldMat);
      grp.add(cutoutMesh);

    // ── SHAPE 4: ROUND MEDALLION / PENDANT / COIN / STAMP / OCTAGON ─────────
    } else if (mode === 'pendant' || mode === 'coin' || mode === 'stamp' || mode === 'octagon') {
      var isOctagon = (mode === 'octagon');
      var baseGeo = isOctagon
        ? new T.CylinderGeometry(radius, radius, baseThick, 8, 1, false)
        : new T.CylinderGeometry(radius, radius, baseThick, 64, 1, false);

      var baseMesh = new T.Mesh(baseGeo, goldMat);
      baseMesh.rotation.x = Math.PI / 2;
      grp.add(baseMesh);

      // Raised Outer Beveled Rim
      var rimThick = p.addBorder ? 1.8 : 0.8;
      var rim = new T.Mesh(new T.TorusGeometry(radius - rimThick / 2, rimThick / 2, 16, isOctagon ? 8 : 64), goldMat);
      rim.position.z = baseThick / 2 + 0.1;
      grp.add(rim);

      // Dense Circular Relief Grid
      var innerR = radius - rimThick;
      var gridGeo = new T.PlaneGeometry(radius * 2, radius * 2, res - 1, res - 1);
      var pos = gridGeo.attributes.position;

      for (var j = 0; j < pos.count; j++) {
        var vx = pos.getX(j);
        var vy = pos.getY(j);
        var dist = Math.sqrt(vx * vx + vy * vy);

        if (dist <= innerR) {
          var u = (vx / radius + 1) / 2;
          var v = (vy / radius + 1) / 2;
          var xi = Math.min(res - 1, Math.max(0, Math.floor(u * (res - 1))));
          var yi = Math.min(res - 1, Math.max(0, Math.floor((1 - v) * (res - 1))));

          var gray = grays[yi * res + xi];
          var edgeFeather = Math.min(1.0, (innerR - dist) / 2.0);

          var zVal = isEngrave
            ? (baseThick / 2 - gray * depthMm * 0.85 * edgeFeather)
            : (baseThick / 2 + 0.05 + gray * depthMm * edgeFeather);
          pos.setZ(j, zVal);
        } else {
          pos.setZ(j, baseThick / 2 + 0.02);
        }
      }
      pos.needsUpdate = true;
      gridGeo.computeVertexNormals();

      var reliefMesh = new T.Mesh(gridGeo, goldMat);
      grp.add(reliefMesh);

      // BAIL RING (Positioned neatly at the top rim)
      if (p.addRing) {
        var ringRadius = 4.0;
        var ringTube = 1.4;
        var ringY = radius + ringRadius - ringTube / 2;

        var ring = new T.Mesh(new T.TorusGeometry(ringRadius, ringTube, 16, 32), goldMat);
        ring.position.set(0, ringY, 0);
        grp.add(ring);

        var bridgeGeo = new T.CylinderGeometry(ringTube * 1.5, ringTube * 1.5, ringRadius * 1.2, 16);
        var bridge = new T.Mesh(bridgeGeo, goldMat);
        bridge.position.set(0, radius + ringRadius * 0.4, 0);
        grp.add(bridge);
      }

      // Stamp mode: add wooden turned handle on the back
      if (mode === 'stamp') {
        var handleGeo = new T.CylinderGeometry(5.5, 11, 46, 24);
        var handleMat = new T.MeshStandardMaterial({ color: 0x3d2716, roughness: 0.65 });
        var handle = new T.Mesh(handleGeo, handleMat);
        handle.rotation.x = Math.PI / 2;
        handle.position.z = -baseThick / 2 - 23;
        grp.add(handle);
      }

    // ── SHAPE 5: RECTANGULAR PLAQUE / DOG TAG / MAGNET ──────────────────────
    } else {
      var rectW = objW;
      var rectH = objW * 0.62;

      var boxBase = new T.Mesh(new T.BoxGeometry(rectW, rectH, baseThick), baseMat);
      boxBase.position.z = -baseThick / 2;
      grp.add(boxBase);

      var gridGeoRect = new T.PlaneGeometry(rectW * 0.94, rectH * 0.94, res - 1, Math.round(res * 0.62) - 1);
      var posRect = gridGeoRect.attributes.position;
      var gridH = Math.round(res * 0.62);

      for (var k = 0; k < posRect.count; k++) {
        var rx = posRect.getX(k);
        var ry = posRect.getY(k);
        var ru = (rx / (rectW * 0.94 / 2) + 1) / 2;
        var rv = (ry / (rectH * 0.94 / 2) + 1) / 2;
        var rxi = Math.min(res - 1, Math.max(0, Math.floor(ru * (res - 1))));
        var ryi = Math.min(res - 1, Math.max(0, Math.floor((1 - rv) * (res - 1))));

        var rgray = grays[ryi * res + rxi];
        var rzVal = isEngrave
          ? (0.1 - rgray * depthMm * 0.85)
          : (0.1 + rgray * depthMm);
        posRect.setZ(k, rzVal);
      }
      posRect.needsUpdate = true;
      gridGeoRect.computeVertexNormals();

      var rectRelief = new T.Mesh(gridGeoRect, goldMat);
      grp.add(rectRelief);

      if (p.addBorder) {
        var fThick = 2.4;
        var bTop = new T.Mesh(new T.BoxGeometry(rectW + 4, fThick, baseThick + 1.8), goldMat);
        bTop.position.set(0, rectH / 2 + fThick / 2, 0);
        var bBot = new T.Mesh(new T.BoxGeometry(rectW + 4, fThick, baseThick + 1.8), goldMat);
        bBot.position.set(0, -rectH / 2 - fThick / 2, 0);
        var bLeft = new T.Mesh(new T.BoxGeometry(fThick, rectH + 4, baseThick + 1.8), goldMat);
        bLeft.position.set(-rectW / 2 - fThick / 2, 0, 0);
        var bRight = new T.Mesh(new T.BoxGeometry(fThick, rectH + 4, baseThick + 1.8), goldMat);
        bRight.position.set(rectW / 2 + fThick / 2, 0, 0);
        grp.add(bTop); grp.add(bBot); grp.add(bLeft); grp.add(bRight);
      }

      if (p.addRing) {
        var pRing = new T.Mesh(new T.TorusGeometry(3.6, 1.3, 16, 32), goldMat);
        pRing.position.set(0, rectH / 2 + 5, 0);
        grp.add(pRing);
      }
    }

    return grp;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. 🖼️ IMAGE DROP & PREVIEW HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════
  function handleHwImage(file) {
    if (!file || !file.type.startsWith('image/')) return;
    var reader = new FileReader();
    reader.onload = function (ev) {
      var img = new Image();
      img.onload = function () {
        hwImgEl = img;
        var p = el('handwriting-preview-img'), c = el('handwriting-preview-container'), dz = el('handwriting-dropzone');
        if (p) p.src = ev.target.result;
        if (c) c.style.display = 'block';
        if (dz) dz.style.display = 'none';
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. 🚀 GENERATE 3D SCULPTOR OBJECT
  // ═══════════════════════════════════════════════════════════════════════════
  function generateHandwriting() {
    var text = (el('handwriting-text-input') || {}).value || '';
    if (!text.trim() && !hwImgEl) {
      showMsg((window.I18N && I18N.t) ? I18N.t('toastHandwritingEmpty') : 'Please enter text or upload a handwriting photo.', 'warning');
      return;
    }
    setLoading(true, 'Sculpting 3D Object...');
    setTimeout(function () {
      try {
        var mode = (el('handwriting-mode-select') || {}).value || 'pendant';
        var fontKey = (el('handwriting-font-select') || {}).value || 'script';
        var depth = parseFloat((el('handwriting-depth-slider') || {}).value || 4.0);
        var base = parseFloat((el('handwriting-base-slider') || {}).value || 3.0);
        var width = parseFloat((el('handwriting-width-slider') || {}).value || 60);

        var contrast = parseFloat((el('handwriting-contrast-slider') || {}).value || 1.4);
        var smoothPasses = parseInt((el('handwriting-smooth-slider') || {}).value || 2, 10);
        var bgThreshold = parseFloat((el('handwriting-bg-slider') || {}).value || 20);
        var res = parseInt((el('handwriting-res-select') || {}).value || 180, 10);

        var matKey = (el('handwriting-material-select') || {}).value || 'gold';
        var customHex = (el('handwriting-custom-color') || {}).value || '#d4af37';
        currentMaterialKey = matKey;
        currentCustomHex = customHex;

        var invert = !!(el('handwriting-invert-toggle') || {}).checked;
        var engrave = !!(el('handwriting-engrave-toggle') || {}).checked;
        var addRing = !!(el('handwriting-ring-toggle') || {}).checked;
        var addBorder = !!(el('handwriting-border-toggle') || {}).checked;
        var mirror = !!(el('handwriting-mirror-toggle') || {}).checked;

        var p = {
          depth: depth, base: base, width: width,
          addRing: addRing, addBorder: addBorder, mode: mode,
          engrave: engrave, matKey: matKey, customHex: customHex
        };

        var heightData = renderCompositeCanvas(text, hwImgEl, fontKey, mirror, res, mode, invert, contrast, smoothPasses, bgThreshold);
        var model = buildJewelryObject(heightData, p);

        var box = new THREE.Box3().setFromObject(model);
        var cen = new THREE.Vector3();
        box.getCenter(cen);
        model.position.sub(cen);

        pushModel(model, 'handwriting_3d');
        showMsg((window.I18N && I18N.t) ? I18N.t('toastHandwritingGenerated') : '3D text object generated successfully!', 'success');
      } catch (err) {
        console.error(err);
        showMsg('Error: ' + err.message, 'error');
      } finally {
        setLoading(false);
      }
    }, 60);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. 📦 EXPORT SUITE (.STL, .GLB, .3MF, .HTML)
  // ═══════════════════════════════════════════════════════════════════════════
  async function doExport(fmt) {
    if (!currentHandwritingMesh) { showMsg('Please generate a 3D text object first!', 'warning'); return; }
    setLoading(true, 'Exporting ' + fmt.toUpperCase() + '...');
    try {
      if (fmt === '3mf' && window.ModelConverters && ModelConverters.export3MF) {
        var r3 = await ModelConverters.export3MF(currentHandwritingMesh, 'Handwriting_DualColor');
        ModelConverters.triggerDownload(r3.blob, r3.filename);
        showMsg((window.I18N && I18N.t) ? I18N.t('toastHandwriting3MFExported') : 'Dual-Color 3MF exported!', 'success');
        return;
      }
      var r = await ModelConverters.exportModel(currentHandwritingMesh, fmt, 'handwriting_3d');
      ModelConverters.triggerDownload(r.blob, r.filename);
      showMsg('Exported ' + fmt.toUpperCase() + ' successfully!', 'success');
    } catch (e) {
      showMsg('Export error: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. 🔌 INITIALIZATION & EVENT WIRING
  // ═══════════════════════════════════════════════════════════════════════════
  function init() {
    var dz = el('handwriting-dropzone'), fi = el('handwriting-file-input');
    if (dz && fi) {
      dz.addEventListener('click', function () { fi.click(); });
      ['dragenter', 'dragover'].forEach(function (ev) {
        dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('dragover'); });
      });
      ['dragleave', 'drop'].forEach(function (ev) {
        dz.addEventListener(ev, function (e) {
          e.preventDefault();
          dz.classList.remove('dragover');
          if (ev === 'drop' && e.dataTransfer.files[0]) handleHwImage(e.dataTransfer.files[0]);
        });
      });
      fi.addEventListener('change', function () { if (fi.files[0]) handleHwImage(fi.files[0]); });
    }

    var clr = el('handwriting-preview-clear');
    if (clr) {
      clr.addEventListener('click', function () {
        hwImgEl = null;
        var c = el('handwriting-preview-container'), dz = el('handwriting-dropzone');
        if (c) c.style.display = 'none';
        if (dz) dz.style.display = 'flex';
      });
    }

    // Material Dropdown & Custom Color Picker handler
    var matSel = el('handwriting-material-select');
    var colorRow = el('handwriting-custom-color-row');
    var colorPicker = el('handwriting-custom-color');

    if (matSel) {
      matSel.addEventListener('change', function () {
        if (colorRow) colorRow.style.display = (matSel.value === 'custom') ? 'flex' : 'none';
        // Live update model material if mesh exists
        if (currentHandwritingMesh) {
          var newMat = getJewelryMaterial(matSel.value, colorPicker ? colorPicker.value : '#d4af37');
          currentHandwritingMesh.traverse(function (child) {
            if (child.isMesh && child.material) child.material = newMat;
          });
        }
      });
    }
    if (colorPicker) {
      colorPicker.addEventListener('input', function () {
        if (currentHandwritingMesh && matSel && matSel.value === 'custom') {
          var newMat = getJewelryMaterial('custom', colorPicker.value);
          currentHandwritingMesh.traverse(function (child) {
            if (child.isMesh && child.material) child.material = newMat;
          });
        }
      });
    }

    // Wire Sliders
    wireSlider('handwriting-depth-slider', 'handwriting-depth-val');
    wireSlider('handwriting-base-slider', 'handwriting-base-val');
    wireSlider('handwriting-width-slider', 'handwriting-width-val');
    wireSlider('handwriting-contrast-slider', 'handwriting-contrast-val');
    wireSlider('handwriting-smooth-slider', 'handwriting-smooth-val');
    wireSlider('handwriting-bg-slider', 'handwriting-bg-val');

    var gb = el('btn-generate-handwriting');
    if (gb) gb.addEventListener('click', generateHandwriting);

    var estl = el('btn-export-handwriting-stl');
    if (estl) estl.addEventListener('click', function () { doExport('stl'); });
    var eglb = el('btn-export-handwriting-glb');
    if (eglb) eglb.addEventListener('click', function () { doExport('glb'); });
    var e3mf = el('btn-export-handwriting-3mf');
    if (e3mf) e3mf.addEventListener('click', function () { doExport('3mf'); });
    var ehtml = el('btn-export-handwriting-html');
    if (ehtml) ehtml.addEventListener('click', function () { doExport('html'); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  window.__handwritingEngine = { generate: generateHandwriting };
})();

