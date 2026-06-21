document.addEventListener("DOMContentLoaded", () => {

  const SIM_WIDTH = 800; const SIM_HEIGHT = 600;

  // Stare aplicație globala
  let currentLanguage = 'en';
  let currentTool = MAT_SAND;
  let isSprayBrush = false; 
  let isSymBrush = false;
  let brushSize = 10;
  let currentColor = '#f59e0b';
  let isDrawing = false;
  let isRecording = false;

  let mediaRecorder = null; let recordedChunks = [];

  const canvasEl = document.getElementById("sand-canvas");
  const engine = new window.SandBoxEngine(canvasEl, SIM_WIDTH, SIM_HEIGHT);
  window.engine = engine;

  /* ------ GRAVITY & WIND ------ */
  const gravSlider = document.getElementById("grav-slider");
  const windSlider = document.getElementById("wind-slider");
  gravSlider.addEventListener("input", e => engine.gravY = parseInt(e.target.value));
  windSlider.addEventListener("input", e => engine.windX = parseInt(e.target.value));

  /* ------ AUDIO ASMR ------ */
  let audioCtx = null; let audioGain = null; let isAudioOn = false; let noiseSrc = null;
  function initAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const bSize = 2 * audioCtx.sampleRate;
      const noise = audioCtx.createBuffer(1, bSize, audioCtx.sampleRate);
      const out = noise.getChannelData(0);
      for (let i = 0; i < bSize; i++) out[i] = Math.random() * 2 - 1;
      noiseSrc = audioCtx.createBufferSource(); noiseSrc.buffer = noise; noiseSrc.loop = true;
      const f = audioCtx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500;
      audioGain = audioCtx.createGain(); audioGain.gain.value = 0;
      noiseSrc.connect(f); f.connect(audioGain); audioGain.connect(audioCtx.destination);
      noiseSrc.start();
    }
  }
  const btnAudio = document.getElementById("btn-asmr");
  btnAudio.onclick = () => {
    isAudioOn = !isAudioOn;
    if (isAudioOn) {
      if (!audioCtx) initAudio();
      audioCtx.resume();
      audioGain.gain.setTargetAtTime(0.05, audioCtx.currentTime, 0.5); 
      btnAudio.innerHTML = `🎵 <span data-i18n="audio_on">${window.I18N[currentLanguage]["audio_on"]}</span>`;
      btnAudio.style.color = "#a3e635"; btnAudio.style.borderColor = "#a3e635";
    } else {
      if (audioGain) audioGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.5); 
      btnAudio.innerHTML = `🎵 <span data-i18n="audio_off">${window.I18N[currentLanguage]["audio_off"]}</span>`;
      btnAudio.style.color = "#facc15"; btnAudio.style.borderColor = "rgba(250, 204, 21, 0.3)";
    }
  };

  /* ------ COLORS ------ */
  const PRESET_COLORS = ['#f3f4f6', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#0ea5e9', '#84cc16', '#ef4444', '#d97706', '#475569'];
  const colorGrid = document.getElementById("color-grid"); const colorPicker = document.getElementById("color-picker");
  function renderColorGrid() {
    colorGrid.innerHTML = '';
    PRESET_COLORS.forEach(c => {
      const sw = document.createElement('div'); sw.className = `color-swatch ${(c === currentColor && currentTool !== MAT_ERASER) ? 'active' : ''}`;
      sw.style.backgroundColor = c;
      sw.onclick = () => { currentColor = c; if (currentTool === MAT_ERASER) setTool(MAT_SAND); colorPicker.value = c; renderColorGrid(); };
      colorGrid.appendChild(sw);
    });
  }
  colorPicker.addEventListener("input", e => { currentColor = e.target.value; if (currentTool === MAT_ERASER) setTool(MAT_SAND); renderColorGrid(); });
  renderColorGrid();

  /* ------ MATERIALS ------ */
  const tools = { sand: document.getElementById("btn-tool-sand"), water: document.getElementById("btn-tool-water"), fire: document.getElementById("btn-tool-fire"), acid: document.getElementById("btn-tool-acid"), seed: document.getElementById("btn-tool-seed"), wire: document.getElementById("btn-tool-wire"), spark: document.getElementById("btn-tool-spark"), wall: document.getElementById("btn-tool-wall"), eraser: document.getElementById("btn-tool-eraser"), ant: document.getElementById("btn-tool-ant"), c4: document.getElementById("btn-tool-c4"), lava: document.getElementById("btn-tool-lava"), portalin: document.getElementById("btn-tool-portalin"), portalout: document.getElementById("btn-tool-portalout"), cloud: document.getElementById("btn-tool-cloud"), emitter: document.getElementById("btn-tool-emitter"), vortex: document.getElementById("btn-tool-vortex") || document.createElement("div"), virus: document.getElementById("btn-tool-virus"), repulsor: document.getElementById("btn-tool-repulsor"), piano: document.getElementById("btn-tool-piano"), snow: document.getElementById("btn-tool-snow"), ice: document.getElementById("btn-tool-ice"), sensor: document.getElementById("btn-tool-sensor"), switch: document.getElementById("btn-tool-switch"), laser: document.getElementById("btn-tool-laser"), mirror: document.getElementById("btn-tool-mirror"), fish: document.getElementById("btn-tool-fish"), bee: document.getElementById("btn-tool-bee"), conveyor: document.getElementById("btn-tool-conveyor"), fan: document.getElementById("btn-tool-fan") };
  function setTool(t) {
    currentTool = t; Object.values(tools).forEach(b => b.classList.remove("active"));
    if (t===MAT_SAND) tools.sand.classList.add("active");
    if (t===MAT_WATER) tools.water.classList.add("active");
    if (t===MAT_FIRE) tools.fire.classList.add("active");
    if (t===MAT_ACID) tools.acid.classList.add("active");
    if (t===MAT_SEED) tools.seed.classList.add("active");
    if (t===MAT_WIRE) tools.wire.classList.add("active");
    if (t===MAT_SPARK) tools.spark.classList.add("active");
    if (t===MAT_ANT) tools.ant.classList.add("active");
    if (t===MAT_C4) tools.c4.classList.add("active");
    if (t===MAT_LAVA) tools.lava.classList.add("active");
    if (t===MAT_PORTAL_IN) tools.portalin.classList.add("active");
    if (t===MAT_PORTAL_OUT) tools.portalout.classList.add("active");
    if (t===MAT_CLOUD) tools.cloud.classList.add("active");
    if (t===MAT_EMITTER) tools.emitter.classList.add("active");
    if (t===MAT_VORTEX) tools.vortex.classList.add("active");
    if (t===MAT_VIRUS) tools.virus.classList.add("active");
    if (t===MAT_REPULSOR) tools.repulsor.classList.add("active");
    if (t===MAT_PIANO) tools.piano.classList.add("active");
    if (t===MAT_SNOW) tools.snow.classList.add("active");
    if (t===MAT_ICE) tools.ice.classList.add("active");
    if (t===MAT_SENSOR) tools.sensor.classList.add("active");
    if (t===MAT_SWITCH) tools.switch.classList.add("active");
    if (t===MAT_LASER) tools.laser.classList.add("active");
    if (t===MAT_MIRROR) tools.mirror.classList.add("active");
    if (t===MAT_FISH) tools.fish.classList.add("active");
    if (t===MAT_BEE) tools.bee.classList.add("active");
    if (t===MAT_CONVEYOR) tools.conveyor.classList.add("active");
    if (t===MAT_FAN) tools.fan.classList.add("active");
    if (t===MAT_WALL) tools.wall.classList.add("active");
    if (t===MAT_ERASER) { tools.eraser.classList.add("active"); renderColorGrid(); }
  }
  Object.keys(tools).forEach(k => {
    let mat = MAT_SAND; 
    if(k==='water') mat=MAT_WATER; if(k==='fire') mat=MAT_FIRE; if(k==='acid') mat=MAT_ACID; 
    if(k==='seed') mat=MAT_SEED; if(k==='wire') mat=MAT_WIRE; if(k==='spark') mat=MAT_SPARK; 
    if(k==='ant') mat=MAT_ANT; if(k==='c4') mat=MAT_C4; if(k==='lava') mat=MAT_LAVA; 
    if(k==='portalin') mat=MAT_PORTAL_IN; if(k==='portalout') mat=MAT_PORTAL_OUT;
    if(k==='cloud') mat=MAT_CLOUD; if(k==='emitter') mat=MAT_EMITTER; if(k==='vortex') mat=MAT_VORTEX; 
    if(k==='virus') mat=MAT_VIRUS; if(k==='repulsor') mat=MAT_REPULSOR;
    if(k==='piano') mat=MAT_PIANO; if(k==='snow') mat=MAT_SNOW; if(k==='ice') mat=MAT_ICE;
    if(k==='sensor') mat=MAT_SENSOR; if(k==='switch') mat=MAT_SWITCH;
    if(k==='laser') mat=MAT_LASER; if(k==='mirror') mat=MAT_MIRROR; 
    if(k==='fish') mat=MAT_FISH; if(k==='bee') mat=MAT_BEE;
    if(k==='conveyor') mat=MAT_CONVEYOR; if(k==='fan') mat=MAT_FAN;
    if(k==='wall') mat=MAT_WALL; if(k==='eraser') mat=MAT_ERASER;
    tools[k].onclick = () => setTool(mat);
  });

  /* ------ BRUSH TYPE ------ */
  const btnSolid = document.getElementById("btn-brush-solid"); const btnSpray = document.getElementById("btn-brush-spray"); const btnSym = document.getElementById("btn-brush-sym");
  btnSolid.onclick = () => { isSprayBrush = false; btnSolid.classList.add("active"); btnSpray.classList.remove("active"); };
  btnSpray.onclick = () => { isSprayBrush = true; btnSpray.classList.add("active"); btnSolid.classList.remove("active"); };
  btnSym.onclick = () => { isSymBrush = !isSymBrush; if(isSymBrush) btnSym.classList.add("active"); else btnSym.classList.remove("active"); };

  const sizeSlider = document.getElementById("brush-size"); const lblSize = document.getElementById("lbl-size");
  sizeSlider.addEventListener("input", e => { brushSize = parseInt(e.target.value); lblSize.innerText = brushSize; });

  /* ------ DRAWING EVENTS ------ */
  function getCoordinates(e) {
    const rect = canvasEl.getBoundingClientRect();
    let cx = e.clientX; let cy = e.clientY;
    if (e.touches && e.touches.length > 0) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; }
    const scaleX = SIM_WIDTH / rect.width; const scaleY = SIM_HEIGHT / rect.height;
    return { x: Math.floor((cx - rect.left) * scaleX), y: Math.floor((cy - rect.top) * scaleY) };
  }
  const doDraw = (e) => {
    if (!isDrawing) return;
    const cd = getCoordinates(e);
    if (cd) engine.drawCircle(cd.x, cd.y, brushSize, currentTool, currentColor, isSprayBrush, isSymBrush);
    if (isAudioOn && audioGain && (currentTool===MAT_SAND||currentTool===MAT_WATER||currentTool===MAT_ACID)) audioGain.gain.setTargetAtTime(0.2, audioCtx.currentTime, 0.1); 
  };
  canvasEl.addEventListener("pointerdown", e => { isDrawing = true; doDraw(e); if(canvasEl.setPointerCapture) canvasEl.setPointerCapture(e.pointerId); });
  canvasEl.addEventListener("pointermove", doDraw);
  const stopDraw = e => {
    isDrawing = false; if(canvasEl.releasePointerCapture && e.pointerId) canvasEl.releasePointerCapture(e.pointerId);
    if (isAudioOn && audioGain) audioGain.gain.setTargetAtTime(0.05, audioCtx.currentTime, 1.0); 
  };
  canvasEl.addEventListener("pointerup", stopDraw); canvasEl.addEventListener("pointercancel", stopDraw);

  /* ------ BLUEPRINTS ------ */
  document.getElementById("btn-save-slot").onclick = () => {
    const t = engine.types; const c = engine.colors; const pl = [];
    for (let i = 0; i < t.length; i++) if (t[i] !== 0) pl.push({i, t: t[i], c: c[i]});
    localStorage.setItem("sandscape_bp", JSON.stringify(pl));
    alert(currentLanguage === 'en' ? "Blueprint Saved!" : "Projet Sauvegardé!");
  };
  document.getElementById("btn-load-slot").onclick = () => {
    const d = localStorage.getItem("sandscape_bp"); if (!d) return alert("Empty.");
    try { const pl = JSON.parse(d); engine.clearCanvas(); pl.forEach(p => { engine.types[p.i] = p.t; engine.colors[p.i] = p.c; }); } catch(e){}
  };

  /* ------ ADVANCED OPS ------ */
  const btn3D = document.getElementById("btn-3d");
  btn3D.onclick = () => {
     engine.render3D = !engine.render3D;
     if(engine.render3D) btn3D.classList.add("active"); else btn3D.classList.remove("active");
  };

  /* ------ STENCIL & IMAGE HUD ------ */
  const fileUpl = document.getElementById("file-uploader");
  const imgHud = document.getElementById("image-hud");
  const hudCanvas = document.getElementById("image-hud-canvas");
  const hudScale = document.getElementById("hud-scale");
  const hudThresh = document.getElementById("hud-thresh");
  const hudApply = document.getElementById("hud-apply");
  const hudApplyMat = document.getElementById("hud-apply-mat");
  const hudCancel = document.getElementById("hud-cancel");
  const hCtx = hudCanvas.getContext("2d", { willReadFrequently: true });
  
  let currentLoadedImage = null;
  let hudOffsetX = 0; let hudOffsetY = 0;
  let hudIsDragging = false; let hudLastX = 0; let hudLastY = 0;

  document.getElementById("btn-image-trigger").onclick = () => fileUpl.click();

  // STENCIL LIBRARY LOGIC
  const stencilLib = document.getElementById("stencil-lib");
  document.getElementById("btn-lib-trigger").onclick = () => stencilLib.classList.remove("hidden");
  document.getElementById("btn-lib-close").onclick = () => stencilLib.classList.add("hidden");

  const stencils = {
     space: [{id:'alien',n:'Grey Alien'}, {id:'ufo',n:'UFO Ship'}, {id:'fighter',n:'Space Jet'}],
     animals: [{id:'lion',n:'Wild Lion'}, {id:'dragon',n:'Fire Dragon'}, {id:'wolf',n:'Dire Wolf'}],
     fantasy: [{id:'hero',n:'Super Hero'}, {id:'wizard',n:'Dark Wizard'}],
      structures: [{id:'castle',n:'Medieval Castle'}, {id:'ship',n:'Pirate Ship'}]
  };

  function loadStencil(id) {
     stencilLib.classList.add("hidden");
     const img = new Image();
     img.onload = () => {
        currentLoadedImage = img; hudOffsetX = 0; hudOffsetY = 0;
        imgHud.classList.remove("hidden"); drawHudPreview();
     };
     // Safe data-uri load
     img.src = window.MODEL_ASSETS[id];
  }

  // Populate Stencils
  Object.keys(stencils).forEach(k => {
     const grid = document.getElementById("grid-" + k);
     stencils[k].forEach(em => {
        const d = document.createElement("div");
        d.className = "lib-item"; 
        d.style.backgroundImage = `url('${window.MODEL_ASSETS[em.id]}')`;
        d.innerHTML = `<div class="lib-title-lb">${em.n}</div>`;
        d.onclick = () => loadStencil(em.id);
        grid.appendChild(d);
     });
  });

  fileUpl.addEventListener("change", e => {
     const file = e.target.files[0]; if (!file) return;
     const img = new Image();
     img.onload = () => {
        currentLoadedImage = img;
        hudOffsetX = 0; hudOffsetY = 0;
        imgHud.classList.remove("hidden");
        drawHudPreview();
     };
     const fr = new FileReader(); fr.onload = e => img.src = e.target.result; fr.readAsDataURL(file);
  });

  hudCanvas.addEventListener("pointerdown", e => {
      hudIsDragging = true;
      hudLastX = e.clientX; hudLastY = e.clientY;
      hudCanvas.setPointerCapture(e.pointerId);
  });
  hudCanvas.addEventListener("pointermove", e => {
      if(!hudIsDragging) return;
      hudOffsetX += (e.clientX - hudLastX);
      hudOffsetY += (e.clientY - hudLastY);
      hudLastX = e.clientX; hudLastY = e.clientY;
      drawHudPreview();
  });
  const stopHudDrag = e => {
      hudIsDragging = false;
      if(hudCanvas.releasePointerCapture) hudCanvas.releasePointerCapture(e.pointerId);
  };
  hudCanvas.addEventListener("pointerup", stopHudDrag);
  hudCanvas.addEventListener("pointercancel", stopHudDrag);

  function drawHudPreview() {
     if(!currentLoadedImage) return;
     hCtx.clearRect(0,0,SIM_WIDTH,SIM_HEIGHT);
     const scaleNum = parseInt(hudScale.value) / 100;
     const threshNum = parseInt(hudThresh.value);
     document.getElementById('lbl-img-scale').innerText = hudScale.value;
     document.getElementById('lbl-img-tol').innerText = threshNum;
     
     const bw = currentLoadedImage.width * scaleNum;
     const bh = currentLoadedImage.height * scaleNum;
     const bx = (SIM_WIDTH - bw) / 2 + hudOffsetX;
     const by = (SIM_HEIGHT - bh) / 2 + hudOffsetY;
     hCtx.drawImage(currentLoadedImage, bx, by, bw, bh);
     
     if (threshNum > 0) {
        const limitLuma = 255 - Math.floor((threshNum / 100) * 200);
        const idata = hCtx.getImageData(0,0,SIM_WIDTH,SIM_HEIGHT);
        const d = idata.data;
        for(let i=0; i<d.length; i+=4) {
           if(d[i+3] > 0) { // is rendered pixel
              const luma = (d[i] + d[i+1] + d[i+2]) / 3;
              if(luma > limitLuma) d[i+3] = 0; // make transparent if it is too bright (white bg removal)
           }
        }
        hCtx.putImageData(idata, 0, 0);
     }
  }

  hudScale.addEventListener("input", drawHudPreview);
  hudThresh.addEventListener("input", drawHudPreview);

  hudCancel.onclick = () => { imgHud.classList.add("hidden"); fileUpl.value = ""; currentLoadedImage = null; };
  hudApply.onclick = () => {
     // Bake process
     const d = hCtx.getImageData(0,0,SIM_WIDTH,SIM_HEIGHT).data;
     for(let i=0; i<d.length; i+=4) {
        if(d[i+3] > 50) { // solid enough
           const pxIdx = i / 4;
           const u32 = new Uint32Array(new Uint8Array([d[i], d[i+1], d[i+2], 255]).buffer)[0];
           engine.types[pxIdx] = MAT_WALL;
           engine.colors[pxIdx] = u32;
        }
     }
     imgHud.classList.add("hidden"); fileUpl.value = ""; currentLoadedImage = null;
  }

  hudApplyMat.onclick = () => {
     // Bake process using Current Tool/Color
     const d = hCtx.getImageData(0,0,SIM_WIDTH,SIM_HEIGHT).data;
     const u32Color = engine.hexToRealUint32(currentColor);
     for(let i=0; i<d.length; i+=4) {
        if(d[i+3] > 50) { 
           const pxIdx = i / 4;
           if (currentTool === MAT_ERASER) { engine.types[pxIdx] = 0; engine.colors[pxIdx] = 0; }
           else {
              engine.types[pxIdx] = currentTool;
              engine.colors[pxIdx] = u32Color;
           }
        }
     }
     imgHud.classList.add("hidden"); fileUpl.value = ""; currentLoadedImage = null;
  }


  /* ------ EXPORTS ------ */
  document.getElementById("btn-clear").onclick = () => engine.clearCanvas();
  document.getElementById("btn-export-photo").onclick = () => {
    const a = document.createElement("a"); a.download = `Sandscape_PRO_${Date.now()}.png`; a.href = canvasEl.toDataURL("image/png"); a.click();
  };
  const btnVideo = document.getElementById("btn-export-video"); const badgeRec = document.getElementById("recording-badge");
  btnVideo.onclick = () => {
    if (isRecording) {
      mediaRecorder.stop(); isRecording = false; btnVideo.classList.remove("active"); btnVideo.style.color = "inherit"; badgeRec.classList.add("hidden");
    } else {
      const stream = canvasEl.captureStream(60); recordedChunks = [];
      let ops = { mimeType: 'video/webm;codecs=vp9' }; if (!MediaRecorder.isTypeSupported(ops.mimeType)) ops = { mimeType: 'video/webm' };
      mediaRecorder = new MediaRecorder(stream, ops);
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
      mediaRecorder.onstop = () => {
        const u = URL.createObjectURL(new Blob(recordedChunks, { type: ops.mimeType }));
        const a = document.createElement('a'); a.href = u; a.download = `Sandscape_Video_${Date.now()}.webm`; a.click(); URL.revokeObjectURL(u); applyLanguage();
      };
      mediaRecorder.start(); isRecording = true; btnVideo.classList.add("active"); btnVideo.style.color = "#f85149"; badgeRec.classList.remove("hidden"); applyLanguage();
    }
  };

  document.getElementById("btn-export-html").onclick = async () => {
    try {
      const responseCss = await fetch('css/style.css').then(r => r.text());
      const responseEngine = await fetch('js/engine.js').then(r => r.text());
      const responseModels = await fetch('js/models.js').then(r => r.text());
      const responseTrans = await fetch('js/translations.js').then(r => r.text());
      const responseApp = await fetch('js/app.js').then(r => r.text());

      // Grab current layout state
      const t = engine.types; const c = engine.colors; const pl = [];
      for (let i = 0; i < t.length; i++) if (t[i] !== 0) pl.push({i, t: t[i], c: c[i]});
      const stateJson = JSON.stringify(pl);

      // We need to fetch and inline index.html but replace external scripts and style links
      let indexHtml = await fetch('index.html').then(r => r.text());

      // Clean up header links and script tags from indexHtml
      indexHtml = indexHtml.replace(/<link rel="stylesheet" href="css\/style\.css">/g, '');
      indexHtml = indexHtml.replace(/<script src="js\/translations\.js"><\/script>/g, '');
      indexHtml = indexHtml.replace(/<script src="js\/engine\.js"><\/script>/g, '');
      indexHtml = indexHtml.replace(/<script src="js\/models\.js"><\/script>/g, '');
      indexHtml = indexHtml.replace(/<script src="js\/app\.js"><\/script>/g, '');

      // Build inlined scripts/styles
      const styles = '<style>\n' + responseCss + '\n</style>';
      const scripts = 
        '<sc' + 'ript>\n' + responseTrans + '\n</sc' + 'ript>\n' +
        '<sc' + 'ript>\n' + responseEngine + '\n</sc' + 'ript>\n' +
        '<sc' + 'ript>\n' + responseModels + '\n</sc' + 'ript>\n' +
        '<sc' + 'ript>\n' + responseApp + '\n</sc' + 'ript>\n' +
        '<sc' + 'ript>\n' +
        '  document.addEventListener("DOMContentLoaded", () => {\n' +
        '    setTimeout(() => {\n' +
        '      const savedState = ' + stateJson + ';\n' +
        '      if (savedState && savedState.length > 0 && window.engine) {\n' +
        '        window.engine.clearCanvas();\n' +
        '        savedState.forEach(p => {\n' +
        '          window.engine.types[p.i] = p.t;\n' +
        '          window.engine.colors[p.i] = p.c;\n' +
        '        });\n' +
        '      }\n' +
        '    }, 100);\n' +
        '  });\n' +
        '</sc' + 'ript>\n';

      // Insert styles in head
      indexHtml = indexHtml.replace('</he' + 'ad>', styles + '\n</he' + 'ad>');
      // Insert scripts in body
      indexHtml = indexHtml.replace('</bo' + 'dy>', scripts + '\n</bo' + 'dy>');

      // Create download link
      const blob = new Blob([indexHtml], { type: 'text/html' });
      const u = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = u;
      a.download = `Sandscape_Interactive_${Date.now()}.html`;
      // Mark as bypassed so it downloads directly
      a.dataset.bypassed = 'true';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(u);
    } catch(err) {
      alert("Error generating HTML export: " + err.message);
    }
  };

  /* ------ TRANSLATIONS I18N ------ */
  const btnEn = document.getElementById("btn-en"); const btnFr = document.getElementById("btn-fr");
  function applyLanguage() {
    const dict = window.I18N[currentLanguage];
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      if (dict[key]) {
        if (key === "btn_video" && isRecording) el.innerText = dict["stop_video"];
        else if (key === "audio_off" && isAudioOn) el.innerText = dict["audio_on"];
        else el.innerText = dict[key];
      }
    });
    btnEn.classList.remove("active"); btnFr.classList.remove("active");
    if (currentLanguage === "en") btnEn.classList.add("active");
    if (currentLanguage === "fr") btnFr.classList.add("active");
  }

  btnEn.onclick = () => { currentLanguage = 'en'; applyLanguage(); };
  btnFr.onclick = () => { currentLanguage = 'fr'; applyLanguage(); };
  applyLanguage();

});
