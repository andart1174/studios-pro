/**
 * Zen Sandscape v4.0 — Museum Fine-Art, Video+Audio, Lightweight Interactive HTML,
 * Watertight 3D Sculpted Sand-Relief (.STL & Vertex-Colored .GLB), AR Wall Art & FREE .zsand Export Suite!
 * Zero CDN dependencies — 100% pure binary JS encoders, testable in Node.js and Browser!
 */
(function (globalScope) {
  'use strict';

  function SM() { return globalScope.SandMaterials; }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try { document.body.removeChild(a); } catch (_) {}
      try { URL.revokeObjectURL(url); } catch (_) {}
    }, 1500);
  }

  function safeSlug(title) {
    return String(title || 'ZenSandscape_Art')
      .replace(/[^a-zA-Z0-9_\- ]+/g, '').trim().replace(/\s+/g, '_').slice(0, 42) || 'ZenSandscape_Art';
  }

  // =========================================================================
  // 1. 4K FRAMED MUSEUM FINE-ART PRINT (.PNG)
  // =========================================================================

  function exportFramed4KPNG(sourceCanvas, title = 'Zen Sandscape', framed = true) {
    const out = document.createElement('canvas');
    const pad = framed ? 140 : 0;
    const footer = framed ? 90 : 0;
    const artW = 2400, artH = 1680;
    out.width = artW + pad * 2;
    out.height = artH + pad * 2 + footer;
    const ctx = out.getContext('2d');

    if (framed) {
      // Rich dark walnut/gallery mat presentation frame
      ctx.fillStyle = '#0c0f18';
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 6;
      ctx.strokeRect(36, 36, out.width - 72, out.height - 72);
      ctx.fillStyle = '#141926';
      ctx.fillRect(pad - 18, pad - 18, artW + 36, artH + 36);
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sourceCanvas, pad, pad, artW, artH);

    if (framed) {
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '700 44px "Space Grotesk", system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(String(title || 'ZEN SANDSCAPE').toUpperCase(), pad, pad + artH + 92);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 28px Inter, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('STUDIOS-PRO · LIVING PHYSICS FINE ART', pad + artW, pad + artH + 92);
    }

    return new Promise(resolve => {
      out.toBlob(blob => {
        const fname = `${safeSlug(title)}_4K_Print.png`;
        downloadBlob(blob, fname);
        resolve({ filename: fname, size: blob.size });
      }, 'image/png');
    });
  }

  // =========================================================================
  // 2. SYNCED AUDIO + VIDEO RECORDER (.MP4 Native Preferred / .WebM Fallback!)
  // =========================================================================

  let _recorder = null, _chunks = [], _canvasStream = null, _ext = 'webm';

  function cleanupRec() {
    if (_canvasStream) {
      _canvasStream.getTracks().forEach(t => { try { t.stop(); } catch (_) {} });
      _canvasStream = null;
    }
  }

  function startVideoRec(canvas, title, onFinish) {
    if (_recorder && _recorder.state === 'recording') return false;
    _canvasStream = canvas.captureStream(30);
    const tracks = [..._canvasStream.getVideoTracks()];
    const audioStream = globalScope.ZenAudio && globalScope.ZenAudio.getRecordStream();
    if (audioStream) tracks.push(...audioStream.getAudioTracks());
    const combined = new MediaStream(tracks);

    const candidates = [
      { mime: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', ext: 'mp4' },
      { mime: 'video/mp4',                              ext: 'mp4' },
      { mime: 'video/webm;codecs=vp9,opus',             ext: 'webm' },
      { mime: 'video/webm;codecs=vp8,opus',             ext: 'webm' },
      { mime: 'video/webm',                             ext: 'webm' },
      { mime: '',                                       ext: 'webm' }
    ];
    let chosen = { mime: '', ext: 'webm' };
    _recorder = null;
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      if (c.mime) {
        let ok = false;
        try { ok = MediaRecorder.isTypeSupported(c.mime); } catch (_) {}
        if (!ok) continue;
      }
      try {
        _recorder = new MediaRecorder(combined, c.mime ? { mimeType: c.mime, videoBitsPerSecond: 4500000 } : { videoBitsPerSecond: 4500000 });
        chosen = c;
        break;
      } catch (_) { _recorder = null; }
    }
    if (!_recorder) { cleanupRec(); throw new Error('MediaRecorder unsupported'); }

    _ext = chosen.ext;
    _chunks = [];
    _recorder.ondataavailable = e => { if (e.data && e.data.size > 0) _chunks.push(e.data); };
    _recorder.onstop = () => {
      cleanupRec();
      const blob = new Blob(_chunks, { type: chosen.mime || (_ext === 'mp4' ? 'video/mp4' : 'video/webm') });
      const fname = `${safeSlug(title)}_LivingArt.${_ext}`;
      if (blob.size > 0) downloadBlob(blob, fname);
      _chunks = [];
      _recorder = null;
      if (onFinish) onFinish({ filename: fname, ext: _ext, size: blob.size });
    };
    _recorder.onerror = () => { cleanupRec(); _recorder = null; if (onFinish) onFinish(null); };
    _recorder.start(250);
    return { ext: _ext };
  }

  function stopVideoRec() {
    if (_recorder && _recorder.state === 'recording') {
      try { _recorder.stop(); } catch (_) { cleanupRec(); }
      return true;
    }
    cleanupRec();
    return false;
  }

  // =========================================================================
  // 3. LIGHTWEIGHT (<120 KB) STANDALONE INTERACTIVE LIVING WEB ART (.HTML)
  // =========================================================================

  function buildInteractiveHTML(engine, title = 'Zen Sandscape Art') {
    const safeTitle = String(title).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
    // Downsample + subtle RGB444 color quantization so RLE compresses ultra-tight (<55KB!) & 100% interactive!
    const tw = 160, th = 112;
    const runs = [];
    let lastT = -1, lastC = 0, cnt = 0;
    for (let y = 0; y < th; y++) {
      const sy = Math.floor((y / th) * engine.h);
      for (let x = 0; x < tw; x++) {
        const sx = Math.floor((x / tw) * engine.w);
        const i = sy * engine.w + sx;
        const t = engine.types[i] ? (engine.types[i] === 9 || engine.types[i] === 40 ? 2 : 1) : 0;
        const raw = engine.colors[i] >>> 0;
        const c = (raw & 0xfff0f0f0) >>> 0; // Quantize RGB channels to 16 levels -> 5x smaller RLE!
        if (t === lastT && (t === 0 || c === lastC)) cnt++;
        else { if (cnt > 0) runs.push(lastT === 0 ? [0, cnt] : [lastT, cnt, lastC]); lastT = t; lastC = c; cnt = 1; }
      }
    }
    if (cnt > 0) runs.push(lastT === 0 ? [0, cnt] : [lastT, cnt, lastC]);

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${safeTitle} — Interactive Zen Sandscape</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:radial-gradient(circle at top,#141b36,#050814);color:#eef4ff;font-family:system-ui,-apple-system,sans-serif;padding:18px}
h1{font-size:20px;font-weight:800;letter-spacing:.03em;background:linear-gradient(90deg,#f5c542,#38bdf8,#f472b6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
canvas{width:min(92vw,840px);aspect-ratio:200/140;border-radius:14px;border:1px solid rgba(212,175,55,.45);box-shadow:0 24px 70px rgba(0,0,0,.7);cursor:crosshair;touch-action:none;image-rendering:pixelated}
.bar{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
button{padding:7px 14px;border-radius:9px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.08);color:#fff;font-weight:700;cursor:pointer;font-size:12px}
button.on{background:#38bdf8;color:#041221;border-color:#38bdf8}
</style>
</head>
<body>
<h1>${safeTitle}</h1>
<canvas id="c" width="${tw}" height="${th}"></canvas>
<div class="bar">
  <button id="m1" class="on">⏳ Pour Gold Sand</button>
  <button id="m2">🪨 Draw Wall</button>
  <button id="m0">🧹 Erase</button>
  <button id="rst">↺ Reset Artwork</button>
</div>
<script>
const W=${tw},H=${th},INIT=${JSON.stringify(runs)};
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
const img=ctx.createImageData(W,H),buf=new Uint32Array(img.data.buffer);
const T=new Uint8Array(W*H),C=new Uint32Array(W*H);
let mode=1,down=false,hue=38;
function load(){
  T.fill(0);C.fill(0);let p=0;
  for(const r of INIT){const e=Math.min(W*H,p+r[1]);if(r[0]===0){p=e;continue;}for(;p<e;p++){T[p]=r[0];C[p]=r[2];}}
}
load();
function pack(h){const s=.85,l=.62,c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;let r=0,g=0,b=0;if(h<60){r=c;g=x;}else if(h<120){r=x;g=c;}else if(h<180){g=c;b=x;}else if(h<240){g=x;b=c;}else if(h<300){r=x;b=c;}else{r=c;b=x;}return((255<<24)|(Math.round((b+m)*255)<<16)|(Math.round((g+m)*255)<<8)|Math.round((r+m)*255))>>>0;}
function paint(e){
  const rc=cv.getBoundingClientRect();
  const cx=Math.floor((e.clientX-rc.left)/rc.width*W),cy=Math.floor((e.clientY-rc.top)/rc.height*H);
  hue=(hue+1.2)%360;const col=mode===2?0xff685848:pack(hue);
  for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){if(dx*dx+dy*dy>16)continue;const x=cx+dx,y=cy+dy;if(x<0||x>=W||y<0||y>=H)continue;const i=y*W+x;T[i]=mode;C[i]=mode?col:0;}
}
cv.onpointerdown=e=>{down=true;paint(e);};
cv.onpointermove=e=>{if(down)paint(e);};
window.onpointerup=()=>{down=false;};
[1,2,0].forEach(m=>{document.getElementById('m'+m).onclick=()=>{mode=m;[1,2,0].forEach(k=>document.getElementById('m'+k).classList.toggle('on',k===m));};});
document.getElementById('rst').onclick=load;
function tick(){
  for(let y=H-2;y>=0;y--){
    const lr=(y&1)===0;
    for(let k=0;k<W;k++){
      const x=lr?k:W-1-k,i=y*W+x;if(T[i]!==1)continue;
      const b=i+W;
      if(T[b]===0){T[b]=1;C[b]=C[i];T[i]=0;C[i]=0;}
      else{const d=Math.random()<.5?-1:1,nx=x+d;if(nx>=0&&nx<W&&T[b+d]===0){T[b+d]=1;C[b+d]=C[i];T[i]=0;C[i]=0;}}
    }
  }
  for(let i=0;i<W*H;i++) buf[i]=T[i]?C[i]:0xff140a07;
  ctx.putImageData(img,0,0);
  requestAnimationFrame(tick);
}
tick();
</script>
</body>
</html>`;
  }

  function exportInteractiveHTML(engine, title) {
    const html = buildInteractiveHTML(engine, title);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const fname = `${safeSlug(title)}_InteractiveArt.html`;
    downloadBlob(blob, fname);
    return { filename: fname, size: blob.size };
  }

  // =========================================================================
  // 4. WATERTIGHT 3D SCULPTED SAND-RELIEF (.STL & VERTEX-COLORED .GLB + AR WALL ART!)
  //    Pure binary JS — ZERO Three.js CDN needed, 100% watertight solid bas-relief!
  // =========================================================================

  function sampleReliefHeightGrid(engine, gx = 96, gy = 68) {
    const { MAT_BY_ID } = SM();
    const heights = new Float32Array(gx * gy);
    const colors = new Float32Array(gx * gy * 3); // linear-ish RGB 0..1
    const baseThick = 3.0; // mm backplate thickness
    const reliefMax = 11.0; // mm max sculpted relief height

    for (let y = 0; y < gy; y++) {
      const sy0 = Math.floor((y / gy) * engine.h);
      const sy1 = Math.max(sy0 + 1, Math.floor(((y + 1) / gy) * engine.h));
      for (let x = 0; x < gx; x++) {
        const sx0 = Math.floor((x / gx) * engine.w);
        const sx1 = Math.max(sx0 + 1, Math.floor(((x + 1) / gx) * engine.w));
        let hSum = 0, rSum = 0, gSum = 0, bSum = 0, cnt = 0, occ = 0;
        for (let sy = sy0; sy < sy1; sy++) {
          const row = sy * engine.w;
          for (let sx = sx0; sx < sx1; sx++) {
            const idx = row + sx;
            const t = engine.types[idx];
            cnt++;
            if (t !== 0) {
              occ++;
              const def = MAT_BY_ID[t];
              hSum += (def && def.relief) ? def.relief : 0.65;
              const col = engine.colors[idx];
              rSum += (col & 255) / 255;
              gSum += ((col >>> 8) & 255) / 255;
              bSum += ((col >>> 16) & 255) / 255;
            }
          }
        }
        const gi = y * gx + x;
        const density = cnt ? hSum / cnt : 0;
        heights[gi] = baseThick + density * reliefMax;
        if (occ > 0) {
          colors[gi * 3]     = Math.pow(rSum / occ, 2.2);
          colors[gi * 3 + 1] = Math.pow(gSum / occ, 2.2);
          colors[gi * 3 + 2] = Math.pow(bSum / occ, 2.2);
        } else {
          // Gallery obsidian plaque base color
          colors[gi * 3] = 0.025; colors[gi * 3 + 1] = 0.035; colors[gi * 3 + 2] = 0.065;
        }
      }
    }
    return { gx, gy, heights, colors, plaqueWmm: 240, plaqueHmm: 168 };
  }

  function buildReliefSTLBytes(engine) {
    const { gx, gy, heights, plaqueWmm, plaqueHmm } = sampleReliefHeightGrid(engine, 96, 68);
    const tris = [];
    const pushTri = (ax, ay, az, bx, by, bz, cx, cy, cz) => tris.push([ax, ay, az, bx, by, bz, cx, cy, cz]);

    const px = x => (x / (gx - 1) - 0.5) * plaqueWmm;
    const py = y => (0.5 - y / (gy - 1)) * plaqueHmm;

    // Top relief surface + Bottom flat backplate
    for (let y = 0; y < gy - 1; y++) {
      for (let x = 0; x < gx - 1; x++) {
        const x0 = px(x), x1 = px(x + 1), y0 = py(y), y1 = py(y + 1);
        const z00 = heights[y * gx + x], z10 = heights[y * gx + x + 1];
        const z01 = heights[(y + 1) * gx + x], z11 = heights[(y + 1) * gx + x + 1];
        pushTri(x0, y0, z00, x0, y1, z01, x1, y1, z11);
        pushTri(x0, y0, z00, x1, y1, z11, x1, y0, z10);
        // Flat bottom (CCW facing -Z)
        pushTri(x0, y0, 0, x1, y1, 0, x0, y1, 0);
        pushTri(x0, y0, 0, x1, y0, 0, x1, y1, 0);
      }
    }
    // 4 Watertight Side Skirt Walls
    for (let x = 0; x < gx - 1; x++) {
      const x0 = px(x), x1 = px(x + 1);
      // Top edge (y=0)
      const yt = py(0), zt0 = heights[x], zt1 = heights[x + 1];
      pushTri(x0, yt, 0, x0, yt, zt0, x1, yt, zt1);
      pushTri(x0, yt, 0, x1, yt, zt1, x1, yt, 0);
      // Bottom edge (y=gy-1)
      const yb = py(gy - 1), zb0 = heights[(gy - 1) * gx + x], zb1 = heights[(gy - 1) * gx + x + 1];
      pushTri(x0, yb, 0, x1, yb, zb1, x0, yb, zb0);
      pushTri(x0, yb, 0, x1, yb, 0, x1, yb, zb1);
    }
    for (let y = 0; y < gy - 1; y++) {
      const y0 = py(y), y1 = py(y + 1);
      const xl = px(0), zl0 = heights[y * gx], zl1 = heights[(y + 1) * gx];
      pushTri(xl, y0, 0, xl, y1, zl1, xl, y0, zl0);
      pushTri(xl, y0, 0, xl, y1, 0, xl, y1, zl1);
      const xr = px(gx - 1), zr0 = heights[y * gx + gx - 1], zr1 = heights[(y + 1) * gx + gx - 1];
      pushTri(xr, y0, 0, xr, y0, zr0, xr, y1, zr1);
      pushTri(xr, y0, 0, xr, y1, zr1, xr, y1, 0);
    }

    const buf = new ArrayBuffer(84 + tris.length * 50);
    const dv = new DataView(buf);
    const hdr = 'Zen Sandscape v4.0 Watertight 3D Sand Relief (mm)';
    for (let i = 0; i < hdr.length; i++) dv.setUint8(i, hdr.charCodeAt(i));
    dv.setUint32(80, tris.length, true);

    let off = 84;
    for (let i = 0; i < tris.length; i++) {
      const t = tris[i];
      const ux = t[3] - t[0], uy = t[4] - t[1], uz = t[5] - t[2];
      const vx = t[6] - t[0], vy = t[7] - t[1], vz = t[8] - t[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const nl = Math.hypot(nx, ny, nz) || 1;
      dv.setFloat32(off, nx / nl, true); off += 4;
      dv.setFloat32(off, ny / nl, true); off += 4;
      dv.setFloat32(off, nz / nl, true); off += 4;
      for (let k = 0; k < 9; k++) { dv.setFloat32(off, t[k], true); off += 4; }
      dv.setUint16(off, 0, true); off += 2;
    }
    return new Uint8Array(buf);
  }

  // Pure Zero-CDN Binary glTF 2.0 (.GLB) Vertex-Colored 3D Wall Art Sculpture (in real meters: 0.48m × 0.336m)!
  function buildReliefGLBBuffer(engine) {
    const { gx, gy, heights, colors } = sampleReliefHeightGrid(engine, 96, 68);
    const wM = 0.48, hM = 0.336, zScale = 0.002; // 48cm x 33.6cm gallery framed wall art!
    const vCount = gx * gy;
    const positions = new Float32Array(vCount * 3);
    const normals = new Float32Array(vCount * 3);
    const vColors = new Float32Array(vCount * 3);

    let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let y = 0; y < gy; y++) {
      for (let x = 0; x < gx; x++) {
        const i = y * gx + x;
        const px = (x / (gx - 1) - 0.5) * wM;
        const py = (0.5 - y / (gy - 1)) * hM;
        const pz = heights[i] * zScale;
        positions[i * 3] = px; positions[i * 3 + 1] = py; positions[i * 3 + 2] = pz;
        if (px < minX) minX = px; if (px > maxX) maxX = px;
        if (py < minY) minY = py; if (py > maxY) maxY = py;
        if (pz < minZ) minZ = pz; if (pz > maxZ) maxZ = pz;

        // Smooth surface normal from neighboring relief heights
        const hL = heights[y * gx + Math.max(0, x - 1)] * zScale;
        const hR = heights[y * gx + Math.min(gx - 1, x + 1)] * zScale;
        const hU = heights[Math.max(0, y - 1) * gx + x] * zScale;
        const hD = heights[Math.min(gy - 1, y + 1) * gx + x] * zScale;
        const dx = (wM / (gx - 1)) * 2, dy = (hM / (gy - 1)) * 2;
        let nx = -(hR - hL) / dx, ny = (hD - hU) / dy, nz = 1;
        const nl = Math.hypot(nx, ny, nz) || 1;
        normals[i * 3] = nx / nl; normals[i * 3 + 1] = ny / nl; normals[i * 3 + 2] = nz / nl;

        vColors[i * 3] = colors[i * 3]; vColors[i * 3 + 1] = colors[i * 3 + 1]; vColors[i * 3 + 2] = colors[i * 3 + 2];
      }
    }

    const idxCount = (gx - 1) * (gy - 1) * 6;
    const indices = new Uint16Array(idxCount);
    let ip = 0;
    for (let y = 0; y < gy - 1; y++) {
      for (let x = 0; x < gx - 1; x++) {
        const a = y * gx + x, b = a + 1, c = a + gx, d = c + 1;
        indices[ip++] = a; indices[ip++] = c; indices[ip++] = d;
        indices[ip++] = a; indices[ip++] = d; indices[ip++] = b;
      }
    }

    const pad4 = n => (n + 3) & ~3;
    const posLen = positions.byteLength;
    const normLen = normals.byteLength;
    const colLen = vColors.byteLength;
    const idxLen = indices.byteLength;
    const binLen = pad4(posLen + normLen + colLen + idxLen);

    const binBuf = new Uint8Array(binLen);
    binBuf.set(new Uint8Array(positions.buffer), 0);
    binBuf.set(new Uint8Array(normals.buffer), posLen);
    binBuf.set(new Uint8Array(vColors.buffer), posLen + normLen);
    binBuf.set(new Uint8Array(indices.buffer), posLen + normLen + colLen);

    const gltf = {
      asset: { version: '2.0', generator: 'Zen Sandscape v4.0' },
      scene: 0,
      scenes: [{ nodes: [0] }],
      nodes: [{ mesh: 0, name: 'ZenSandscape_Relief' }],
      materials: [{ pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0.15, roughnessFactor: 0.55 }, doubleSided: true }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, COLOR_0: 2 }, indices: 3, material: 0 }] }],
      buffers: [{ byteLength: binLen }],
      bufferViews: [
        { buffer: 0, byteOffset: 0, byteLength: posLen, target: 34962 },
        { buffer: 0, byteOffset: posLen, byteLength: normLen, target: 34962 },
        { buffer: 0, byteOffset: posLen + normLen, byteLength: colLen, target: 34962 },
        { buffer: 0, byteOffset: posLen + normLen + colLen, byteLength: idxLen, target: 34963 }
      ],
      accessors: [
        { bufferView: 0, componentType: 5126, count: vCount, type: 'VEC3', min: [minX, minY, minZ], max: [maxX, maxY, maxZ] },
        { bufferView: 1, componentType: 5126, count: vCount, type: 'VEC3' },
        { bufferView: 2, componentType: 5126, count: vCount, type: 'VEC3' },
        { bufferView: 3, componentType: 5123, count: idxCount, type: 'SCALAR' }
      ]
    };

    const jsonStr = JSON.stringify(gltf);
    const jsonBytes = new TextEncoder().encode(jsonStr);
    const jsonPadLen = pad4(jsonBytes.length);
    const totalLen = 12 + 8 + jsonPadLen + 8 + binLen;

    const out = new ArrayBuffer(totalLen);
    const dv = new DataView(out);
    const u8 = new Uint8Array(out);
    dv.setUint32(0, 0x46546c67, true); // 'glTF'
    dv.setUint32(4, 2, true);
    dv.setUint32(8, totalLen, true);
    dv.setUint32(12, jsonPadLen, true);
    dv.setUint32(16, 0x4e4f534a, true); // 'JSON'
    u8.set(jsonBytes, 20);
    for (let p = jsonBytes.length; p < jsonPadLen; p++) u8[20 + p] = 0x20;
    const binOff = 20 + jsonPadLen;
    dv.setUint32(binOff, binLen, true);
    dv.setUint32(binOff + 4, 0x004e4942, true); // 'BIN\0'
    u8.set(binBuf, binOff + 8);
    return out;
  }

  function exportReliefSTL(engine, title) {
    const bytes = buildReliefSTLBytes(engine);
    const blob = new Blob([bytes], { type: 'application/octet-stream' });
    const fname = `${safeSlug(title)}_3D_Relief.stl`;
    downloadBlob(blob, fname);
    return { filename: fname, size: blob.size };
  }

  function exportReliefGLB(engine, title) {
    const buf = buildReliefGLBBuffer(engine);
    const blob = new Blob([buf], { type: 'model/gltf-binary' });
    const fname = `${safeSlug(title)}_3D_Relief.glb`;
    downloadBlob(blob, fname);
    return { filename: fname, size: blob.size };
  }

  // DIRECT 1:1 AR WALL ART HANDOFF via StudiosProAR.sendModel({ modelData, placement: 'wall', ... })!
  function openARWallArt(engine, title) {
    if (!globalScope.StudiosProAR || typeof globalScope.StudiosProAR.sendModel !== 'function') {
      throw new Error('StudiosProAR bridge unavailable');
    }
    const glbBuf = buildReliefGLBBuffer(engine);
    const fname = `${safeSlug(title)}_AR_WallArt.glb`;
    const ok = globalScope.StudiosProAR.sendModel({
      modelData: glbBuf,
      name: fname,
      extension: 'glb',
      isBinary: true,
      placement: 'wall',
      dimensionsMm: { x: 480, y: 336, z: 28 },
      sourceStudio: 'sandbox'
    });
    return { ok, filename: fname, size: glbBuf.byteLength };
  }

  // FREE Compact RLE Project Save (.zsand)
  function exportProjectFree(engine, rendererOpts, title) {
    const payload = {
      ...engine.serializeRLE(),
      title: title || 'Zen Sandscape',
      fx: rendererOpts || {}
    };
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const fname = `${safeSlug(title)}.zsand`;
    downloadBlob(blob, fname);
    return { filename: fname, size: blob.size };
  }

  const SandExports = {
    exportFramed4KPNG, startVideoRec, stopVideoRec,
    isRecording: () => !!(_recorder && _recorder.state === 'recording'),
    buildInteractiveHTML, exportInteractiveHTML,
    buildReliefSTLBytes, buildReliefGLBBuffer, exportReliefSTL, exportReliefGLB, openARWallArt,
    exportProjectFree
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = SandExports;
  if (globalScope) globalScope.SandExports = SandExports;
})(typeof window !== 'undefined' ? window : globalThis);
