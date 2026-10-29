/**
 * PolyMorph 3D Studio - Astro & Moon Studio Photorealistic Engine
 * Generates photorealistic celestial bodies with ultra-HD NASA lunar & planetary
 * procedural surface maps, high-density 3D crater displacement, lithophane moon lamps
 * with internal lighting glow, and Scandinavian hardwood tripod stands.
 */
(function () {
  'use strict';
  var currentAstroMesh = null;

  function el(id) { return document.getElementById(id); }
  function showMsg(msg, type) {
    if (typeof showToast === 'function') showToast(msg, type || 'info');
    else console.log('[Astro]', msg);
  }
  function setLoading(on, txt) {
    var ov = el('loading-overlay'), lb = el('loading-text');
    if (!ov) return;
    if (on) { if (lb) lb.textContent = txt || 'Rendering Ultra-HD Planetary Topography...'; ov.classList.add('visible'); }
    else { ov.classList.remove('visible'); }
  }

  function pushModel(mesh, name) {
    currentAstroMesh = mesh;
    if (typeof window.__polymorphSetModel === 'function') {
      window.__polymorphSetModel(mesh, name);
      return;
    }
    document.dispatchEvent(new CustomEvent('astro3dReady', { detail: { mesh: mesh, name: name } }));
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
      generateAstro();
    });
    upd();
  }

  // ── PROCEDURAL ULTRA-HD PLANETARY TEXTURE GENERATOR ───────────────────────
  function generatePlanetaryTexture(body, isMono) {
    var canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    var imgData = ctx.createImageData(w, h);
    var d = imgData.data;

    // Fast Pseudo-Random Noise Helper
    function fbm(x, y, octaves) {
      var val = 0, amp = 0.5, freq = 1.0;
      for (var o = 0; o < octaves; o++) {
        val += (Math.sin(x * freq * 3.14 + Math.cos(y * freq * 2.71)) * 0.5 + 0.5) * amp;
        freq *= 2.0;
        amp *= 0.5;
      }
      return val;
    }

    for (var y = 0; y < h; y++) {
      var v = y / h;
      var lat = (v - 0.5) * Math.PI; // -PI/2 to PI/2
      var cosLat = Math.cos(lat);

      for (var x = 0; x < w; x++) {
        var u = x / w;
        var lon = u * Math.PI * 2; // 0 to 2PI

        var px = cosLat * Math.cos(lon);
        var py = Math.sin(lat);
        var pz = cosLat * Math.sin(lon);

        var idx = (y * w + x) * 4;
        var r = 200, g = 200, b = 200;

        if (body === 'moon') {
          // 🌕 LUNAR SURFACE: Titanium Highlands vs Basalt Maria Lowlands
          var mare = fbm(px * 1.8, py * 1.8 + pz * 1.5, 4);
          var highlandNoise = fbm(px * 8.0, py * 8.0 + pz * 7.0, 5);

          var lum = 210 + highlandNoise * 35;
          if (mare < 0.42) {
            lum = 90 + mare * 80; // Dark basalt maria (Mare Tranquillitatis, Oceanus Procellarum)
          }

          // Tycho Crater & Bright Ejecta Ray Systems
          var dTycho = Math.sqrt((px - 0.25) * (px - 0.25) + (py + 0.5) * (py + 0.5) + (pz + 0.5) * (pz + 0.5));
          if (dTycho < 0.08) {
            lum = 255; // Brilliant central peak
          } else if (dTycho < 0.8) {
            var angleT = Math.atan2(py + 0.5, px - 0.25);
            var rays = Math.abs(Math.sin(angleT * 8.0));
            if (rays > 0.6) lum += (1.0 - dTycho / 0.8) * 55;
          }

          // Copernicus Crater
          var dCop = Math.sqrt((px + 0.35) * (px + 0.35) + (py - 0.2) * (py - 0.2) + (pz - 0.3) * (pz - 0.3));
          if (dCop < 0.06) lum = 250;

          lum = Math.max(40, Math.min(255, lum));
          r = isMono ? lum : lum * 0.98;
          g = isMono ? lum : lum * 0.96;
          b = isMono ? lum : lum * 0.92;

        } else if (body === 'mars') {
          // 🪐 MARTIAN SURFACE: Rusty Iron Oxide, Olympus Mons, Polar Caps
          var mNoise = fbm(px * 2.2, py * 2.2 + pz * 2.0, 4);
          var mFine = fbm(px * 12.0, py * 12.0, 3);

          r = 185 + mNoise * 50;
          g = 75 + mNoise * 35;
          b = 35 + mNoise * 20;

          // Dark Basalt Lowlands (Syrtis Major)
          if (mNoise < 0.38) {
            r *= 0.6; g *= 0.6; b *= 0.65;
          }

          // Olympus Mons Caldera
          var dOly = Math.sqrt((px + 0.4) * (px + 0.4) + (py - 0.3) * (py - 0.3) + (pz - 0.2) * (pz - 0.2));
          if (dOly < 0.12) {
            r = 230; g = 110; b = 60;
          }

          // Brilliant White Polar Ice Caps
          if (Math.abs(py) > 0.85) {
            var polarRatio = (Math.abs(py) - 0.85) / 0.15;
            r = 240 * polarRatio + r * (1 - polarRatio);
            g = 245 * polarRatio + g * (1 - polarRatio);
            b = 255 * polarRatio + b * (1 - polarRatio);
          }

        } else if (body === 'earth') {
          // 🌍 EARTH BLUE MARBLE: Continents & Oceans
          var oceanNoise = fbm(px * 2.0, py * 2.0 + pz * 2.0, 4);
          if (oceanNoise > 0.46) {
            // Continental Green / Brown Landmass
            var landNoise = fbm(px * 8.0, py * 8.0, 3);
            r = 45 + landNoise * 65;
            g = 115 + landNoise * 60;
            b = 40 + landNoise * 25;
          } else {
            // Deep Azure Ocean
            r = 15; g = 65; b = 160;
          }
          // Polar Ice
          if (Math.abs(py) > 0.82) { r = 245; g = 250; b = 255; }

        } else { // Jupiter
          // 🪐 JUPITER: Turbulent Cloud Belts & Great Red Spot
          var band = Math.sin(py * 24.0 + fbm(px * 6.0, py * 4.0, 3) * 2.0) * 0.5 + 0.5;
          r = 210 + band * 35;
          g = 140 + band * 45;
          b = 85 + band * 35;

          // Great Red Spot Oval Storm
          var dSpot = Math.sqrt((px - 0.3) * (px - 0.3) * 2.5 + (py + 0.38) * (py + 0.38) * 4.0 + (pz + 0.35) * (pz + 0.35));
          if (dSpot < 0.14) {
            r = 220; g = 50; b = 30;
          }
        }

        d[idx] = Math.round(r);
        d[idx + 1] = Math.round(g);
        d[idx + 2] = Math.round(b);
        d[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    var tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  // ── MULTI-OCTAVE NASA TOPOGRAPHY ELEVATION PROFILE ────────────────────────
  function getPlanetaryElevation(theta, phi, body, exag) {
    var sinT = Math.sin(theta), cosT = Math.cos(theta);
    var sinP = Math.sin(phi), cosP = Math.cos(phi);

    var x = sinT * cosP, y = sinT * sinP, z = cosT;
    var elev = 0;

    if (body === 'moon') {
      // 1. Lunar Mare Basalt Lowlands vs Highlands
      var mare = Math.sin(x * 2.2 + y * 1.8) * Math.cos(z * 2.0);
      elev += (mare < -0.2 ? -1.4 : 0.5) * 0.8;

      // 2. Tycho Impact Crater with Central Peak Rebound
      var dTycho = Math.sqrt((x - 0.25) * (x - 0.25) + (y + 0.5) * (y + 0.5) + (z + 0.5) * (z + 0.5));
      if (dTycho < 0.35) {
        var tRatio = dTycho / 0.35;
        if (tRatio < 0.22) elev += 1.8 * (1 - tRatio / 0.22); // Rebound central mountain
        else if (tRatio < 0.72) elev -= 2.2; // Depressed crater floor
        else elev += 1.8 * Math.sin((tRatio - 0.72) * Math.PI * 3.5); // Elevated ridge rim
      }

      // 3. Copernicus Crater
      var dCop = Math.sqrt((x + 0.35) * (x + 0.35) + (y - 0.2) * (y - 0.2) + (z - 0.3) * (z - 0.3));
      if (dCop < 0.28) {
        var cRatio = dCop / 0.28;
        elev += (cRatio < 0.65 ? -1.6 : 1.4 * (1 - cRatio));
      }

      // 4. Micro-Crater & Regolith Roughness
      elev += Math.sin(x * 16.0 + y * 14.0) * Math.cos(z * 15.0) * 0.4;
      elev += Math.sin(x * 32.0 - z * 28.0) * Math.cos(y * 30.0) * 0.22;
      elev += Math.sin(x * 64.0 + y * 58.0) * 0.1;

    } else if (body === 'mars') {
      // Olympus Mons Supervolcano
      var dOly = Math.sqrt((x + 0.4) * (x + 0.4) + (y - 0.3) * (y - 0.3) + (z - 0.2) * (z - 0.2));
      if (dOly < 0.38) {
        var oRatio = dOly / 0.38;
        elev += (oRatio < 0.15 ? 3.2 : 4.0 * Math.pow(1 - oRatio, 1.4));
      }

      // Valles Marineris Canyon Rift
      var dCanyon = Math.abs(y + 0.1 * Math.sin(x * 5.0) - 0.1);
      if (dCanyon < 0.14 && x > -0.45 && x < 0.5) {
        elev -= 2.4 * (1 - dCanyon / 0.14);
      }

      elev += Math.sin(x * 7.0 - y * 6.0) * Math.cos(z * 8.0) * 0.7;

    } else if (body === 'earth') {
      var cont = Math.sin(x * 2.5 + y * 1.5) * Math.cos(z * 2.2) + Math.sin(y * 4.0) * 0.4;
      elev += (cont > 0.1 ? 1.0 + Math.sin(x * 14.0 + y * 14.0) * 0.5 : -1.2);

    } else { // Jupiter
      elev += Math.sin(z * 18.0) * 0.45 + Math.cos(z * 36.0) * 0.15;
    }

    return elev * exag * 0.75;
  }

  // ── BUILD COMPLETE HIGH-DETAIL CELESTIAL GLOBE ───────────────────────────
  function buildCelestialGlobe(p) {
    var T = window.THREE;
    var radius = (p.diam || 80) / 2.0;
    var mode = p.mode || 'lamp';
    var body = p.body || 'moon';
    var exag = p.exag || 2.5;
    var wallThick = p.wallThick || 2.4;
    var thread = p.thread || 'e27';
    var standStyle = p.standStyle || 'wood';
    var texStyle = p.texStyle || 'hd';
    var hasGlow = p.hasGlow !== false;

    var grp = new T.Group();
    grp.name = 'Astro_Celestial_Model';

    var resSegs = 128;
    var isMono = (texStyle === 'mono');
    var surfaceTex = generatePlanetaryTexture(body, isMono);

    // Photorealistic Surface PBR Material
    var surfaceMat = new T.MeshStandardMaterial({
      map: surfaceTex,
      roughness: (body === 'earth' ? 0.45 : (body === 'moon' ? 0.88 : 0.75)),
      metalness: (body === 'earth' ? 0.15 : 0.04),
      side: T.DoubleSide
    });

    if (mode === 'lamp') {
      // 💡 HOLLOW LITHOPHANE MOON LAMP (High-Definition 3D Lithophane)
      var sphereGeo = new T.SphereGeometry(radius, resSegs, resSegs);
      var pos = sphereGeo.attributes.position;

      for (var i = 0; i < pos.count; i++) {
        var vx = pos.getX(i), vy = pos.getY(i), vz = pos.getZ(i);
        var dist = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1;
        var theta = Math.acos(Math.max(-1, Math.min(1, vy / dist)));
        var phi = Math.atan2(vz, vx) + Math.PI;

        if (vy < -radius * 0.85) {
          pos.setY(i, -radius * 0.85); // Flat cut hole for socket
        } else {
          var elev = getPlanetaryElevation(theta, phi, body, exag);
          var newR = Math.max(radius * 0.75, radius + elev);
          pos.setXYZ(i, (vx / dist) * newR, (vy / dist) * newR, (vz / dist) * newR);
        }
      }
      pos.needsUpdate = true;
      sphereGeo.computeVertexNormals();

      var outerMesh = new T.Mesh(sphereGeo, surfaceMat);
      outerMesh.castShadow = true;
      grp.add(outerMesh);

      // Inner Translucent Glow Shell
      var innerR = Math.max(radius * 0.5, radius - wallThick);
      var innerGeo = new T.SphereGeometry(innerR, 64, 64);
      var innerMat = new T.MeshStandardMaterial({
        color: (hasGlow ? 0xfffae0 : 0xffffff),
        roughness: 0.3,
        emissive: (hasGlow ? 0xffb703 : 0x000000),
        emissiveIntensity: (hasGlow ? 0.35 : 0.0),
        side: T.BackSide
      });
      var innerMesh = new T.Mesh(innerGeo, innerMat);
      innerMesh.position.y = (radius - innerR) * 0.15;
      grp.add(innerMesh);

      // Internal LED Bulb Simulation Point Light
      if (hasGlow) {
        var lampBulb = new T.Mesh(new T.SphereGeometry(radius * 0.2, 16, 16), new T.MeshBasicMaterial({ color: 0xffedd5 }));
        lampBulb.position.set(0, 0, 0);
        grp.add(lampBulb);
      }

      // Threaded base socket ring
      if (thread !== 'none') {
        var sockR = (thread === 'e27' ? 14 : (thread === 'e14' ? 8.5 : 16));
        var sockGeo = new T.CylinderGeometry(sockR, sockR + 1.5, 12, 36, 1, true);
        var sockMat = new T.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.25, side: T.DoubleSide });
        var sockMesh = new T.Mesh(sockGeo, sockMat);
        sockMesh.position.y = -radius * 0.85 - 6;
        grp.add(sockMesh);
      }

    } else if (mode === 'projector') {
      // ✨ CONSTELLATION STAR PROJECTOR GLOBE
      var projGeo = new T.SphereGeometry(radius, 64, 64);
      var projMat = new T.MeshStandardMaterial({ color: 0x090d16, metalness: 0.92, roughness: 0.15, side: T.DoubleSide });
      var projMesh = new T.Mesh(projGeo, projMat);
      grp.add(projMesh);

      // Constellation Star Perforations with Golden Light Punchouts
      var starCount = 85;
      var punchMat = new T.MeshBasicMaterial({ color: 0xfef08a, side: T.DoubleSide });
      for (var s = 0; s < starCount; s++) {
        var sTheta = Math.acos(2 * Math.random() - 1);
        var sPhi = 2 * Math.PI * Math.random();
        var sR = (Math.random() > 0.7 ? 2.2 : 1.3);

        var sx = radius * Math.sin(sTheta) * Math.cos(sPhi);
        var sy = radius * Math.cos(sTheta);
        var sz = radius * Math.sin(sTheta) * Math.sin(sPhi);

        var starGeo = new T.CylinderGeometry(sR, sR, 4.5, 12);
        var starMesh = new T.Mesh(starGeo, punchMat);
        starMesh.position.set(sx, sy, sz);
        starMesh.lookAt(0, 0, 0);
        grp.add(starMesh);
      }

    } else if (mode === 'hemisphere') {
      // 🌓 RELIEF HEMISPHERE DESK MEDALLION
      var hemiGeo = new T.SphereGeometry(radius, resSegs, resSegs, 0, Math.PI * 2, 0, Math.PI / 2);
      var hPos = hemiGeo.attributes.position;
      for (var hi = 0; hi < hPos.count; hi++) {
        var hx = hPos.getX(hi), hy = hPos.getY(hi), hz = hPos.getZ(hi);
        var hDist = Math.sqrt(hx * hx + hy * hy + hz * hz) || 1;
        var hTheta = Math.acos(Math.max(-1, Math.min(1, hy / hDist)));
        var hPhi = Math.atan2(hz, hx) + Math.PI;
        var hElev = getPlanetaryElevation(hTheta, hPhi, body, exag);
        var hNewR = radius + hElev;
        hPos.setXYZ(hi, (hx / hDist) * hNewR, (hy / hDist) * hNewR, (hz / hDist) * hNewR);
      }
      hPos.needsUpdate = true;
      hemiGeo.computeVertexNormals();
      var hemiMesh = new T.Mesh(hemiGeo, surfaceMat);
      grp.add(hemiMesh);

      // Ornate Brass Mounting Base Ring
      var backPlate = new T.Mesh(new T.CylinderGeometry(radius * 1.06, radius * 1.06, 5, 48), new T.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.25 }));
      backPlate.position.y = -2.5;
      grp.add(backPlate);

    } else {
      // 🌑 SOLID TOPOGRAPHIC DESK SPHERE (NASA Topographic Model)
      var solidGeo = new T.SphereGeometry(radius, resSegs, resSegs);
      var sPos = solidGeo.attributes.position;
      for (var si = 0; si < sPos.count; si++) {
        var sx = sPos.getX(si), sy = sPos.getY(si), sz = sPos.getZ(si);
        var sDist = Math.sqrt(sx * sx + sy * sy + sz * sz) || 1;
        var sTheta = Math.acos(Math.max(-1, Math.min(1, sy / sDist)));
        var sPhi = Math.atan2(sz, sx) + Math.PI;
        var sElev = getPlanetaryElevation(sTheta, sPhi, body, exag);
        var sNewR = radius + sElev;
        sPos.setXYZ(si, (sx / sDist) * sNewR, (sy / sDist) * sNewR, (sz / sDist) * sNewR);
      }
      sPos.needsUpdate = true;
      solidGeo.computeVertexNormals();
      var solidMesh = new T.Mesh(solidGeo, surfaceMat);
      solidMesh.castShadow = true;
      grp.add(solidMesh);
    }

    // ── TRIPOD STAND / CRADLE STYLING ──────────────────────────────────────
    if (standStyle === 'wood') {
      // 🪵 Scandinavian Interlocking Beech Hardwood Tripod
      var woodMat = new T.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.65, metalness: 0.05, side: T.DoubleSide });
      for (var leg = 0; leg < 3; leg++) {
        var angle = (leg * Math.PI * 2) / 3;
        var legGeo = new T.CylinderGeometry(3.0, 4.5, radius * 1.2, 16);
        var legMesh = new T.Mesh(legGeo, woodMat);
        legMesh.position.set(Math.cos(angle) * radius * 0.48, -radius * 0.88, Math.sin(angle) * radius * 0.48);
        legMesh.rotation.z = Math.cos(angle) * 0.38;
        legMesh.rotation.x = Math.sin(angle) * 0.38;
        legMesh.castShadow = true;
        grp.add(legMesh);
      }
      // Central Interlocking Hub Ring
      var hubMesh = new T.Mesh(new T.TorusGeometry(radius * 0.46, 2.5, 8, 24), woodMat);
      hubMesh.rotation.x = Math.PI / 2;
      hubMesh.position.y = -radius * 0.95;
      grp.add(hubMesh);

    } else if (standStyle === 'brass') {
      // ✨ Brushed Steampunk Brass Triad Stand
      var brassMat = new T.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.88, roughness: 0.22, side: T.DoubleSide });
      for (var bLeg = 0; bLeg < 3; bLeg++) {
        var bAngle = (bLeg * Math.PI * 2) / 3;
        var bLegMesh = new T.Mesh(new T.CylinderGeometry(2.2, 3.2, radius * 1.15, 16), brassMat);
        bLegMesh.position.set(Math.cos(bAngle) * radius * 0.45, -radius * 0.85, Math.sin(bAngle) * radius * 0.45);
        bLegMesh.rotation.z = Math.cos(bAngle) * 0.35;
        bLegMesh.rotation.x = Math.sin(bAngle) * 0.35;
        grp.add(bLegMesh);
      }

    } else if (standStyle === 'ring') {
      // 🔘 Minimalist Modern Ring Stand
      var ringStandMat = new T.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3, side: T.DoubleSide });
      var ringStand = new T.Mesh(new T.TorusGeometry(radius * 0.55, 3.5, 12, 48), ringStandMat);
      ringStand.rotation.x = Math.PI / 2;
      ringStand.position.y = -radius * 0.88;
      grp.add(ringStand);
    }

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

  function generateAstro() {
    setLoading(true, 'Rendering Ultra-HD Planetary Topography...');
    setTimeout(function () {
      try {
        var body = (el('astro-body-select') || {}).value || 'moon';
        var mode = (el('astro-mode-select') || {}).value || 'lamp';
        var diam = parseFloat((el('astro-diam-slider') || {}).value || 80);
        var exag = parseFloat((el('astro-exag-slider') || {}).value || 2.5);
        var wallThick = parseFloat((el('astro-wall-slider') || {}).value || 2.4);
        var thread = (el('astro-thread-select') || {}).value || 'e27';
        var standStyle = (el('astro-stand-select') || {}).value || 'wood';
        var texStyle = (el('astro-tex-select') || {}).value || 'hd';
        var hasGlow = !!(el('astro-glow-toggle') || {}).checked;

        var p = {
          body: body,
          mode: mode,
          diam: diam,
          exag: exag,
          wallThick: wallThick,
          thread: thread,
          standStyle: standStyle,
          texStyle: texStyle,
          hasGlow: hasGlow
        };
        var model = buildCelestialGlobe(p);

        pushModel(model, 'astro_' + body + '_' + mode);
        showMsg((window.I18N && I18N.t) ? I18N.t('toastAstroGenerated') : 'Celestial 3D model generated with NASA topography!', 'success');
      } catch (err) {
        console.error(err);
        showMsg('Error: ' + err.message, 'error');
      } finally {
        setLoading(false);
      }
    }, 40);
  }

  async function doExport(fmt) {
    if (!currentAstroMesh) { showMsg('Please generate an Astro model first!', 'warning'); return; }
    setLoading(true, 'Exporting ' + fmt.toUpperCase() + '...');
    try {
      if (fmt === '3mf' && window.ModelConverters && ModelConverters.export3MF) {
        var r3 = await ModelConverters.export3MF(currentAstroMesh, 'Astro_Celestial_Model');
        ModelConverters.triggerDownload(r3.blob, r3.filename);
        showMsg('Multi-Color 3MF exported!', 'success');
        return;
      }
      var r = await ModelConverters.exportModel(currentAstroMesh, fmt, 'astro_model');
      ModelConverters.triggerDownload(r.blob, r.filename);
      showMsg('Exported ' + fmt.toUpperCase() + ' successfully!', 'success');
    } catch (e) {
      showMsg('Export error: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function init() {
    wireSlider('astro-diam-slider', 'astro-diam-val');
    wireSlider('astro-exag-slider', 'astro-exag-val');
    wireSlider('astro-wall-slider', 'astro-wall-val');

    var bodySel = el('astro-body-select');
    if (bodySel) bodySel.addEventListener('change', generateAstro);
    var modeSel = el('astro-mode-select');
    if (modeSel) modeSel.addEventListener('change', generateAstro);
    var sockSel = el('astro-thread-select');
    if (sockSel) sockSel.addEventListener('change', generateAstro);
    var standSel = el('astro-stand-select');
    if (standSel) standSel.addEventListener('change', generateAstro);
    var texSel = el('astro-tex-select');
    if (texSel) texSel.addEventListener('change', generateAstro);
    var glowTog = el('astro-glow-toggle');
    if (glowTog) glowTog.addEventListener('change', generateAstro);

    var gb = el('btn-generate-astro');
    if (gb) gb.addEventListener('click', generateAstro);

    var estl = el('btn-export-astro-stl');
    if (estl) estl.addEventListener('click', function () { doExport('stl'); });
    var eglb = el('btn-export-astro-glb');
    if (eglb) eglb.addEventListener('click', function () { doExport('glb'); });
    var e3mf = el('btn-export-astro-3mf');
    if (e3mf) e3mf.addEventListener('click', function () { doExport('3mf'); });
    var ehtml = el('btn-export-astro-html');
    if (ehtml) ehtml.addEventListener('click', function () { doExport('html'); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  window.__astroEngine = { generate: generateAstro };
})();
