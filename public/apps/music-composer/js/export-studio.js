/**
 * 4D Music Composer (v4.0) — Complete Offline Audio, 4D Video (MP4/WebM),
 * Standalone Web Music Player (.HTML), Built-In Zero-CDN SMF Type 1 MIDI (.MID),
 * Offline Track Stems (.WAV), FREE Project (.spmusic) & Share URL Export Suite!
 * Zero CDN dependencies for MIDI/WAV/HTML/Project — 100% unit-testable in Node.js!
 */
(function (globalScope) {
  'use strict';

  function MT() { return globalScope.MusicTheory; }

  function sanitizeFilename(name) {
    return String(name || 'StudiosPro_4D_Track')
      .replace(/[^a-zA-Z0-9_\- ]+/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 48) || 'StudiosPro_4D_Track';
  }

  function triggerDownload(blob, filename) {
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

  // =========================================================================
  // 1. PURE JS 16-BIT PCM STEREO WAV ENCODER (Peak Normalized to -1 dBFS)
  // =========================================================================

  function encodeFloatChannelsToWavBytes(left, right, sampleRate) {
    const numChannels = right ? 2 : 1;
    const len = left.length;
    const bytesPerSample = 2;
    const dataSize = len * numChannels * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    function writeStr(off, s) {
      for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
    }

    // Peak scan for clean mastering headroom (-1 dBFS = 0.891)
    let peak = 0.0001;
    for (let i = 0; i < len; i++) {
      const a = Math.abs(left[i]);
      if (a > peak) peak = a;
      if (right) {
        const b = Math.abs(right[i]);
        if (b > peak) peak = b;
      }
    }
    const normGain = Math.min(1.8, 0.891 / peak);

    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
    view.setUint16(32, numChannels * bytesPerSample, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < len; i++) {
      const l = Math.max(-1, Math.min(1, left[i] * normGain));
      view.setInt16(offset, l < 0 ? l * 0x8000 : l * 0x7fff, true);
      offset += 2;
      if (right) {
        const r = Math.max(-1, Math.min(1, right[i] * normGain));
        view.setInt16(offset, r < 0 ? r * 0x8000 : r * 0x7fff, true);
        offset += 2;
      }
    }
    return new Uint8Array(buffer);
  }

  function audioBufferToWavBlob(audioBuffer) {
    const ch0 = audioBuffer.getChannelData(0);
    const ch1 = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : ch0;
    const bytes = encodeFloatChannelsToWavBytes(ch0, ch1, audioBuffer.sampleRate || 44100);
    return new Blob([bytes], { type: 'audio/wav' });
  }

  function uint8ToBase64(u8) {
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < u8.length; i += chunk) {
      bin += String.fromCharCode.apply(null, u8.subarray(i, i + chunk));
    }
    return btoa(bin);
  }

  // =========================================================================
  // 2. FAST OFFLINE AUDIO RENDERER (Tone.Offline — Renders Full Song in ~1-2s!)
  // =========================================================================

  function durToSeconds(dur, stepSec) {
    if (dur === '1m' || dur === '1n') return stepSec * 15;
    if (dur === '2n') return stepSec * 7.5;
    if (dur === '4n') return stepSec * 3.8;
    if (dur === '8n') return stepSec * 1.85;
    if (dur === '32n') return stepSec * 0.55;
    return stepSec * 0.92; // 16n default
  }

  async function renderSongOfflineBuffer(song, opts = {}) {
    const Tone = globalScope.Tone;
    if (!Tone || !Tone.Offline) throw new Error('Tone.Offline unavailable');

    const bpm = Math.max(55, Math.min(200, song.bpm || 120));
    const stepSec = 60 / bpm / 4;
    const arrangement = (opts.arrangement && opts.arrangement.length)
      ? opts.arrangement
      : (song.arrangement && song.arrangement.length ? song.arrangement : [0, 1, 2, 3]);
    const cycles = Math.max(1, opts.cycles || 1);
    const totalBars = arrangement.length * cycles;
    const tailSec = 2.2;
    const totalDuration = totalBars * 16 * stepSec + tailSec;
    const onlyTrack = typeof opts.onlyTrack === 'number' ? opts.onlyTrack : -1;
    const masterPitch = opts.masterPitch || 0;
    const mixer = opts.mixer || null;
    const fx = opts.fx || { reverb: 35, delay: 22, chorus: 18, dist: 0, phaser: 0, filter: 65 };
    const swingRatio = Math.max(0, Math.min(0.65, (song.swing || 0) / 100));

    const timbreTable = {
      supersaw: { oscillator: { type: 'fatsawtooth', count: 3, spread: 24 }, envelope: { attack: 0.015, decay: 0.22, sustain: 0.55, release: 0.45 } },
      piano:    { oscillator: { type: 'triangle' },                           envelope: { attack: 0.008, decay: 0.45, sustain: 0.18, release: 0.85 } },
      bell:     { oscillator: { type: 'sine' },                               envelope: { attack: 0.005, decay: 0.75, sustain: 0.08, release: 1.25 } },
      pluck:    { oscillator: { type: 'sawtooth' },                           envelope: { attack: 0.006, decay: 0.18, sustain: 0.06, release: 0.30 } },
      flute:    { oscillator: { type: 'sine' },                               envelope: { attack: 0.09,  decay: 0.15, sustain: 0.75, release: 0.45 } },
      square:   { oscillator: { type: 'square' },                             envelope: { attack: 0.008, decay: 0.16, sustain: 0.42, release: 0.25 } }
    };

    const rendered = await Tone.Offline(() => {
      const masterEq = new Tone.EQ3(1.5, 0, 1.0);
      const comp = new Tone.Compressor({ threshold: -14, ratio: 3.5, attack: 0.015, release: 0.18 });
      const lim = new Tone.Limiter(-1.0);
      masterEq.chain(comp, lim);
      lim.toDestination();

      const drive = new Tone.Distortion({ distortion: 0.35, wet: (fx.dist || 0) / 100 * 0.65 });
      const delay = new Tone.PingPongDelay({ delayTime: stepSec * 3, feedback: 0.3, wet: (fx.delay || 0) / 100 * 0.55 });
      const reverb = new Tone.Freeverb({ roomSize: 0.72, dampening: 3200, wet: (fx.reverb || 0) / 100 * 0.55 });
      const melodicBus = new Tone.Gain(0.86);
      melodicBus.chain(drive, delay, reverb, masterEq);
      const drumBus = new Tone.Gain(0.92).connect(masterEq);

      const tGain = (ti, base) => {
        if (onlyTrack >= 0 && onlyTrack !== ti) return 0;
        if (mixer && mixer[ti]) {
          const anySolo = mixer.some(m => m.solo);
          if (mixer[ti].muted || (anySolo && !mixer[ti].solo)) return 0;
          return base * (mixer[ti].volume ?? 0.85);
        }
        return base * 0.85;
      };

      const leadFilter = new Tone.Filter(400 + ((fx.filter ?? 65) / 100) * 9600, 'lowpass');
      const lead = new Tone.PolySynth(Tone.Synth, { maxPolyphony: 12, ...(timbreTable[song.timbre] || timbreTable.supersaw) });
      lead.chain(leadFilter, new Tone.Gain(tGain(0, 0.75)), melodicBus);

      const pad = new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 16,
        oscillator: { type: 'fatsawtooth', count: 3, spread: 28 },
        envelope: { attack: 0.24, decay: 0.4, sustain: 0.72, release: 1.3 }
      });
      pad.chain(new Tone.Filter(2400, 'lowpass'), new Tone.Gain(tGain(1, 0.62)), melodicBus);

      const bass = new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        filter: { Q: 2.2, type: 'lowpass', rolloff: -24 },
        envelope: { attack: 0.012, decay: 0.24, sustain: 0.55, release: 0.32 },
        filterEnvelope: { attack: 0.01, decay: 0.22, sustain: 0.3, baseFrequency: 95, octaves: 2.6 }
      });
      bass.chain(new Tone.Gain(tGain(2, 0.88)), masterEq);

      const arp = new Tone.PolySynth(Tone.Synth, { maxPolyphony: 14, ...timbreTable.pluck });
      arp.chain(new Tone.Gain(tGain(3, 0.66)), melodicBus);

      const kick = new Tone.MembraneSynth({ pitchDecay: 0.045, octaves: 6.5, oscillator: { type: 'sine' }, envelope: { attack: 0.002, decay: 0.32, sustain: 0.01, release: 0.25 } });
      kick.chain(new Tone.Gain(tGain(4, 0.95)), drumBus);

      const snareG = new Tone.Gain(tGain(5, 0.82)).connect(drumBus);
      const snareN = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.002, decay: 0.16, sustain: 0, release: 0.08 } });
      snareN.chain(new Tone.Filter(1800, 'bandpass'), snareG);
      const snareB = new Tone.MembraneSynth({ pitchDecay: 0.02, octaves: 2, envelope: { attack: 0.002, decay: 0.11, sustain: 0, release: 0.06 } }).connect(snareG);

      const hat = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.03 } });
      hat.chain(new Tone.Filter(7800, 'highpass'), new Tone.Gain(tGain(6, 0.55)), drumBus);

      const perc = new Tone.PolySynth(Tone.Synth, { maxPolyphony: 8, oscillator: { type: 'triangle' }, envelope: { attack: 0.003, decay: 0.12, sustain: 0, release: 0.14 } });
      perc.chain(new Tone.Gain(tGain(7, 0.62)), melodicBus);

      let barCursor = 0;
      for (let cyc = 0; cyc < cycles; cyc++) {
        for (let ai = 0; ai < arrangement.length; ai++) {
          const bank = song.banks[arrangement[ai]];
          if (bank) {
            for (let s = 0; s < 16; s++) {
              const swingOffset = (s % 2 === 1) ? stepSec * swingRatio * 0.45 : 0;
              const t = 0.04 + (barCursor * 16 + s) * stepSec + swingOffset;

              for (let ti = 0; ti < 8; ti++) {
                if (onlyTrack >= 0 && onlyTrack !== ti) continue;
                const cell = bank[ti] && bank[ti][s];
                if (!cell) continue;
                const vel = Math.max(0.05, Math.min(1, cell.vel ?? 0.85));
                const dSec = durToSeconds(cell.dur, stepSec);

                if (ti === 0) lead.triggerAttackRelease(MT().transposeNote(cell.note, masterPitch), dSec, t, vel);
                else if (ti === 1) pad.triggerAttackRelease(MT().transposeNote(cell.note, masterPitch), Math.max(dSec, stepSec * 4), t, vel);
                else if (ti === 2) {
                  const raw = Array.isArray(cell.note) ? cell.note[0] : cell.note;
                  let midi = MT().noteToMidi(raw) + masterPitch;
                  while (midi > 52) midi -= 12;
                  while (midi < 28) midi += 12;
                  bass.triggerAttackRelease(MT().midiToNote(midi), dSec, t, vel);
                }
                else if (ti === 3) arp.triggerAttackRelease(MT().transposeNote(cell.note, masterPitch), dSec, t, vel);
                else if (ti === 4) kick.triggerAttackRelease('C1', stepSec * 1.5, t, vel);
                else if (ti === 5) {
                  snareN.triggerAttackRelease(stepSec * 0.9, t, vel * 0.85);
                  snareB.triggerAttackRelease('E2', stepSec * 0.8, t, vel * 0.6);
                }
                else if (ti === 6) hat.triggerAttackRelease(dSec, t, vel * 0.7);
                else if (ti === 7) perc.triggerAttackRelease(MT().transposeNote(cell.note || 'A4', masterPitch), stepSec * 0.8, t, vel * 0.65);
              }
            }
          }
          barCursor++;
        }
      }
    }, totalDuration, 2, 44100);

    return rendered.get ? rendered.get() : rendered;
  }

  async function exportMasterWAV(song, opts = {}) {
    const buf = await renderSongOfflineBuffer(song, { cycles: opts.cycles || 2, ...opts });
    const blob = audioBufferToWavBlob(buf);
    const fname = sanitizeFilename(song.title) + '_Master.wav';
    triggerDownload(blob, fname);
    return { filename: fname, size: blob.size, duration: buf.duration };
  }

  async function exportOfflineStems(song, opts = {}, onProgress) {
    const meta = MT().TRACKS_META;
    const arrangement = song.arrangement && song.arrangement.length ? song.arrangement : [0, 1, 2, 3];
    const activeTracks = [];
    for (let ti = 0; ti < 8; ti++) {
      const hasNotes = arrangement.some(bi => song.banks[bi] && song.banks[bi][ti] && song.banks[bi][ti].some(Boolean));
      if (hasNotes) activeTracks.push(ti);
    }
    const base = sanitizeFilename(song.title);
    const exported = [];
    for (let idx = 0; idx < activeTracks.length; idx++) {
      const ti = activeTracks[idx];
      if (onProgress) onProgress(idx + 1, activeTracks.length, meta[ti].en);
      const buf = await renderSongOfflineBuffer(song, { ...opts, cycles: 1, onlyTrack: ti });
      const blob = audioBufferToWavBlob(buf);
      const fname = `${base}_Stem_${ti + 1}_${meta[ti].id}.wav`;
      triggerDownload(blob, fname);
      exported.push({ track: meta[ti].id, filename: fname, size: blob.size });
      await new Promise(r => setTimeout(r, 220));
    }
    return exported;
  }

  // =========================================================================
  // 3. STANDALONE OFFLINE WEB MUSIC PLAYER (.HTML) — Works 100% Offline!
  // =========================================================================

  function buildWebMusicPlayerHTML(song, wavBase64) {
    const title = String(song.title || '4D Composition').replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
    const genreObj = MT() ? MT().getGenreMeta(song.genreId) : { en: song.genreId || 'Electronic' };
    const safeFile = sanitizeFilename(song.title) + '.wav';
    const bpm = song.bpm || 120;
    const keyStr = `${song.root || 'C'} ${(song.scale || 'minor')}`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title} — Studios-Pro 4D Music Player</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 20% 20%,#12193b 0%,#050712 65%,#02030a 100%);color:#e8f1ff;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:20px}
.card{width:100%;max-width:680px;background:rgba(13,18,38,.88);border:1px solid rgba(0,240,255,.28);border-radius:22px;padding:26px;box-shadow:0 24px 80px rgba(0,0,0,.65),0 0 40px rgba(0,240,255,.12);backdrop-filter:blur(16px)}
.badge-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}
.badge{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:4px 10px;border-radius:999px;background:rgba(0,240,255,.12);color:#00f0ff;border:1px solid rgba(0,240,255,.28)}
.badge.alt{background:rgba(255,0,170,.12);color:#ff66cc;border-color:rgba(255,0,170,.3)}
h1{font-size:26px;font-weight:800;letter-spacing:-.02em;margin-bottom:16px;background:linear-gradient(90deg,#00f0ff,#fff,#ff00aa);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
canvas{width:100%;height:220px;border-radius:14px;background:radial-gradient(circle at center,#0c1530 0%,#040712 100%);border:1px solid rgba(255,255,255,.08);display:block;margin-bottom:18px}
.controls{display:flex;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap}
button{cursor:pointer;border:none;border-radius:12px;font-weight:700;transition:transform .12s,box-shadow .15s}
button:active{transform:scale(.96)}
.btn-play{background:linear-gradient(135deg,#00f0ff,#3b82f6);color:#03101c;padding:11px 22px;font-size:14px;box-shadow:0 0 22px rgba(0,240,255,.35)}
.btn-sec{background:rgba(255,255,255,.08);color:#e8f1ff;padding:10px 14px;font-size:13px;border:1px solid rgba(255,255,255,.14)}
.btn-sec.active{background:rgba(0,240,255,.22);border-color:#00f0ff;color:#00f0ff}
.seek-wrap{display:flex;align-items:center;gap:10px;margin-bottom:12px;font-size:12px;color:#94a3b8;font-variant-numeric:tabular-nums}
input[type=range]{flex:1;accent-color:#00f0ff;cursor:pointer}
.footer{display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#64748b;padding-top:12px;border-top:1px solid rgba(255,255,255,.08)}
.footer a{color:#00f0ff;text-decoration:none;font-weight:600}
</style>
</head>
<body>
<div class="card">
  <div class="badge-row">
    <span class="badge">${genreObj.en}</span>
    <span class="badge alt">${bpm} BPM</span>
    <span class="badge">${keyStr}</span>
  </div>
  <h1>${title}</h1>
  <canvas id="viz" width="628" height="220"></canvas>
  <div class="seek-wrap">
    <span id="cur">0:00</span>
    <input id="seek" type="range" min="0" max="1000" value="0">
    <span id="dur">0:00</span>
  </div>
  <div class="controls">
    <button id="playBtn" class="btn-play">▶ Play Music</button>
    <button id="loopBtn" class="btn-sec active">🔁 Loop</button>
    <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#94a3b8;margin-left:auto">🔊 <input id="vol" type="range" min="0" max="100" value="90" style="width:90px"></label>
    <a id="dlLink" class="btn-sec" style="text-decoration:none" download="${safeFile}">⬇ WAV</a>
  </div>
  <div class="footer">
    <span>Created with Studios-Pro 4D Music Composer v4.0</span>
    <span>100% Standalone Offline Web Player</span>
  </div>
</div>
<script>
const AUDIO_B64 = "${wavBase64}";
const audioSrc = "data:audio/wav;base64," + AUDIO_B64;
const audio = new Audio(audioSrc);
audio.loop = true;
document.getElementById('dlLink').href = audioSrc;

let actx, analyser, dataArr;
function initAudioGraph(){
  if(actx) return;
  actx = new (window.AudioContext || window.webkitAudioContext)();
  const src = actx.createMediaElementSource(audio);
  analyser = actx.createAnalyser();
  analyser.fftSize = 128;
  src.connect(analyser);
  analyser.connect(actx.destination);
  dataArr = new Uint8Array(analyser.frequencyBinCount);
}

const playBtn = document.getElementById('playBtn');
const loopBtn = document.getElementById('loopBtn');
const seek = document.getElementById('seek');
const curEl = document.getElementById('cur');
const durEl = document.getElementById('dur');
const vol = document.getElementById('vol');
const fmt = s => { s = Math.max(0, Math.floor(s||0)); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); };

playBtn.onclick = async () => {
  initAudioGraph();
  if(actx.state === 'suspended') await actx.resume();
  if(audio.paused){ await audio.play(); playBtn.textContent = '⏸ Pause'; }
  else { audio.pause(); playBtn.textContent = '▶ Play Music'; }
};
loopBtn.onclick = () => { audio.loop = !audio.loop; loopBtn.classList.toggle('active', audio.loop); };
vol.oninput = () => { audio.volume = vol.value / 100; };
audio.onloadedmetadata = () => { durEl.textContent = fmt(audio.duration); };
audio.ontimeupdate = () => {
  if(!audio.duration) return;
  curEl.textContent = fmt(audio.currentTime);
  seek.value = Math.round((audio.currentTime / audio.duration) * 1000);
};
seek.oninput = () => { if(audio.duration) audio.currentTime = (seek.value / 1000) * audio.duration; };

const cv = document.getElementById('viz'), ctx = cv.getContext('2d');
let phase = 0;
function draw(){
  requestAnimationFrame(draw);
  phase += 0.025;
  ctx.fillStyle = 'rgba(4,7,18,0.28)';
  ctx.fillRect(0,0,cv.width,cv.height);
  const n = dataArr ? dataArr.length : 48;
  if(analyser) analyser.getByteFrequencyData(dataArr);
  const cx = cv.width/2, cy = cv.height/2;
  const barW = cv.width / n;
  let bass = 0;
  for(let i=0;i<n;i++){
    const v = dataArr ? dataArr[i]/255 : (0.12 + 0.08*Math.sin(phase + i*0.3));
    if(i<6) bass += v;
    const h = v * (cv.height * 0.72);
    const grad = ctx.createLinearGradient(0, cv.height-h, 0, cv.height);
    grad.addColorStop(0, '#00f0ff');
    grad.addColorStop(1, '#ff00aa');
    ctx.fillStyle = grad;
    ctx.fillRect(i*barW + 2, cv.height - h, Math.max(2, barW - 4), h);
  }
  bass /= 6;
  ctx.beginPath();
  ctx.arc(cx, cy - 12, 26 + bass * 44, 0, Math.PI*2);
  ctx.strokeStyle = 'rgba(0,240,255,' + (0.35 + bass*0.65) + ')';
  ctx.lineWidth = 2.5 + bass*3;
  ctx.stroke();
}
draw();
</script>
</body>
</html>`;
  }

  async function exportWebMusicPlayerHTML(song, opts = {}) {
    const buf = await renderSongOfflineBuffer(song, { cycles: opts.cycles || 1, ...opts });
    const ch0 = buf.getChannelData(0);
    const ch1 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : ch0;
    const wavBytes = encodeFloatChannelsToWavBytes(ch0, ch1, buf.sampleRate || 44100);
    const b64 = uint8ToBase64(wavBytes);
    const html = buildWebMusicPlayerHTML(song, b64);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const fname = sanitizeFilename(song.title) + '_WebPlayer.html';
    triggerDownload(blob, fname);
    return { filename: fname, size: blob.size };
  }

  // =========================================================================
  // 4. 4D MUSIC VIDEO EXPORT (.MP4 Native Preferred / .WebM Fallback — ZERO LEAK!)
  // =========================================================================

  let _videoRecorder = null;
  let _videoChunks = [];
  let _activeCanvasStream = null;
  let _activeExt = 'webm';
  let _autoStopTimer = null;

  function pickBestVideoMime() {
    if (typeof MediaRecorder === 'undefined') return { mime: '', ext: 'webm' };
    const candidates = [
      { mime: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', ext: 'mp4' },
      { mime: 'video/mp4',                              ext: 'mp4' },
      { mime: 'video/webm;codecs=vp9,opus',             ext: 'webm' },
      { mime: 'video/webm;codecs=vp8,opus',             ext: 'webm' },
      { mime: 'video/webm',                             ext: 'webm' }
    ];
    for (let i = 0; i < candidates.length; i++) {
      try {
        if (MediaRecorder.isTypeSupported(candidates[i].mime)) return candidates[i];
      } catch (_) {}
    }
    return { mime: '', ext: 'webm' };
  }

  function cleanupVideoTracks() {
    if (_autoStopTimer) { clearTimeout(_autoStopTimer); _autoStopTimer = null; }
    if (_activeCanvasStream) {
      _activeCanvasStream.getTracks().forEach(t => { try { t.stop(); } catch (_) {} });
      _activeCanvasStream = null;
    }
  }

  function startVideoRecording(song, onFinish) {
    if (_videoRecorder && _videoRecorder.state === 'recording') return false;
    const canvas = globalScope.Visuals4D && globalScope.Visuals4D.getCanvas();
    if (!canvas || !canvas.captureStream) throw new Error('4D stage canvas unavailable');
    const audioStream = globalScope.AudioEngine && globalScope.AudioEngine.getRecordStream();

    _activeCanvasStream = canvas.captureStream(30);
    const combinedTracks = [..._activeCanvasStream.getVideoTracks()];
    if (audioStream) combinedTracks.push(...audioStream.getAudioTracks());
    const combinedStream = new MediaStream(combinedTracks);

    const candidates = [
      { mime: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', ext: 'mp4' },
      { mime: 'video/mp4',                              ext: 'mp4' },
      { mime: 'video/webm;codecs=vp9,opus',             ext: 'webm' },
      { mime: 'video/webm;codecs=vp8,opus',             ext: 'webm' },
      { mime: 'video/webm',                             ext: 'webm' },
      { mime: '',                                       ext: 'webm' }
    ];

    let chosen = { mime: '', ext: 'webm' };
    _videoRecorder = null;
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      if (c.mime) {
        let ok = false;
        try { ok = MediaRecorder.isTypeSupported(c.mime); } catch (_) { ok = false; }
        if (!ok) continue;
      }
      try {
        const opts = c.mime ? { mimeType: c.mime, videoBitsPerSecond: 4500000 } : { videoBitsPerSecond: 4500000 };
        _videoRecorder = new MediaRecorder(combinedStream, opts);
        chosen = c;
        break;
      } catch (_) {
        _videoRecorder = null;
      }
    }
    if (!_videoRecorder) {
      cleanupVideoTracks();
      throw new Error('MediaRecorder unsupported in this browser');
    }

    const { mime, ext } = chosen;
    _activeExt = ext;
    _videoChunks = [];

    _videoRecorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) _videoChunks.push(e.data);
    };
    _videoRecorder.onstop = () => {
      cleanupVideoTracks();
      const type = mime || (_activeExt === 'mp4' ? 'video/mp4' : 'video/webm');
      const blob = new Blob(_videoChunks, { type });
      const fname = `${sanitizeFilename(song.title)}_4D_Video.${_activeExt}`;
      if (blob.size > 0) triggerDownload(blob, fname);
      _videoChunks = [];
      _videoRecorder = null;
      if (onFinish) onFinish({ filename: fname, ext: _activeExt, size: blob.size });
    };
    _videoRecorder.onerror = () => {
      cleanupVideoTracks();
      _videoRecorder = null;
      if (onFinish) onFinish(null);
    };

    _videoRecorder.start(250);
    return { ext: _activeExt, mime };
  }

  function stopVideoRecording() {
    if (_videoRecorder && _videoRecorder.state === 'recording') {
      try { _videoRecorder.stop(); } catch (_) { cleanupVideoTracks(); }
      return true;
    }
    cleanupVideoTracks();
    return false;
  }

  async function recordFullSongVideo(song, onFinish) {
    if (!globalScope.AudioEngine) throw new Error('AudioEngine unavailable');
    await globalScope.AudioEngine.ensureReady();
    globalScope.AudioEngine.stop();
    globalScope.AudioEngine.setSongMode(true);
    globalScope.AudioEngine.setBank(0);

    const info = startVideoRecording(song, res => {
      globalScope.AudioEngine.stop();
      if (onFinish) onFinish(res);
    });

    await globalScope.AudioEngine.play();
    const arrangementLen = (song.arrangement && song.arrangement.length) || 4;
    const barSec = (60 / Math.max(55, song.bpm || 120)) * 4;
    const totalMs = Math.round((arrangementLen * barSec + 1.4) * 1000);

    _autoStopTimer = setTimeout(() => {
      stopVideoRecording();
    }, totalMs);

    return { ...info, durationSec: +(totalMs / 1000).toFixed(1) };
  }

  // =========================================================================
  // 5. BUILT-IN ZERO-CDN STANDARD MIDI FILE (SMF TYPE 1) BINARY WRITER
  //    Handles Melodic Channels 0-3 & GM Drum Channel 10 (Kick 36, Snare 38, Hat 42, Perc 56)
  // =========================================================================

  function writeVLQ(val) {
    let v = Math.max(0, Math.floor(val));
    const bytes = [v & 0x7f];
    while ((v >>= 7) > 0) bytes.unshift((v & 0x7f) | 0x80);
    return bytes;
  }

  function strBytes(s) {
    const out = [];
    for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i) & 0x7f);
    return out;
  }

  function u32Bytes(n) { return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]; }
  function u16Bytes(n) { return [(n >>> 8) & 255, n & 255]; }

  function buildMidiTrackChunk(events) {
    events.sort((a, b) => a.tick - b.tick || a.order - b.order);
    const body = [];
    let lastTick = 0;
    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      const delta = Math.max(0, ev.tick - lastTick);
      lastTick = ev.tick;
      body.push(...writeVLQ(delta), ...ev.bytes);
    }
    // End of Track meta event
    body.push(0x00, 0xff, 0x2f, 0x00);
    return [...strBytes('MTrk'), ...u32Bytes(body.length), ...body];
  }

  function buildMidiUint8Array(song, opts = {}) {
    const PPQ = 480;
    const stepTicks = PPQ / 4; // 120 ticks per 16th note
    const bpm = Math.max(55, Math.min(200, song.bpm || 120));
    const usPerBeat = Math.round(60000000 / bpm);
    const arrangement = song.arrangement && song.arrangement.length ? song.arrangement : [0, 1, 2, 3];
    const masterPitch = opts.masterPitch || 0;

    // Track 0: Tempo & Song Name meta track
    const tempoTrack = buildMidiTrackChunk([
      { tick: 0, order: 0, bytes: [0xff, 0x03, ...writeVLQ((song.title || '4D Song').length), ...strBytes(song.title || '4D Song')] },
      { tick: 0, order: 1, bytes: [0xff, 0x51, 0x03, (usPerBeat >>> 16) & 255, (usPerBeat >>> 8) & 255, usPerBeat & 255] }
    ]);

    const GM_DRUM_NOTES = { 4: 36, 5: 38, 6: 42, 7: 56 }; // Kick, Snare, Closed Hat, Cowbell/Perc
    const GM_PROGRAMS   = { 0: 81, 1: 89, 2: 38, 3: 4 };  // Saw Lead, Warm Pad, Synth Bass, Electric Piano
    const TRACK_NAMES   = ['Lead Synth', 'Warm Pad', 'Sub Bass', 'Arp Keys', 'Kick Drum', 'Snare Drum', 'Hi-Hat', 'Percussion'];

    const chunks = [tempoTrack];
    const durTicks = d => (d === '1m' || d === '1n' ? stepTicks * 15 : d === '2n' ? stepTicks * 7 : d === '4n' ? stepTicks * 3.8 : d === '8n' ? stepTicks * 1.9 : stepTicks * 0.9);

    for (let ti = 0; ti < 8; ti++) {
      const isDrum = ti >= 4;
      const ch = isDrum ? 9 : ti; // MIDI Ch 10 (index 9) for GM drums!
      const events = [
        { tick: 0, order: 0, bytes: [0xff, 0x03, ...writeVLQ(TRACK_NAMES[ti].length), ...strBytes(TRACK_NAMES[ti])] }
      ];
      if (!isDrum) {
        events.push({ tick: 0, order: 1, bytes: [0xc0 | ch, GM_PROGRAMS[ti] || 0] });
      }

      for (let bar = 0; bar < arrangement.length; bar++) {
        const bank = song.banks[arrangement[bar]];
        if (!bank || !bank[ti]) continue;
        for (let s = 0; s < 16; s++) {
          const cell = bank[ti][s];
          if (!cell) continue;
          const startTick = (bar * 16 + s) * stepTicks;
          const lenTicks = Math.max(30, Math.round(durTicks(cell.dur)));
          const vel = Math.max(1, Math.min(127, Math.round((cell.vel ?? 0.85) * 115)));

          let midis;
          if (isDrum) {
            midis = [GM_DRUM_NOTES[ti]];
          } else {
            const arr = Array.isArray(cell.note) ? cell.note : [cell.note];
            midis = arr.map(n => {
              let m = MT().noteToMidi(n) + masterPitch;
              if (ti === 2) { while (m > 52) m -= 12; while (m < 28) m += 12; }
              return Math.max(0, Math.min(127, m));
            });
          }

          midis.forEach(m => {
            events.push({ tick: startTick, order: 2, bytes: [0x90 | ch, m, vel] });
            events.push({ tick: startTick + lenTicks, order: 1, bytes: [0x80 | ch, m, 0] });
          });
        }
      }

      if (events.length > 2) chunks.push(buildMidiTrackChunk(events));
    }

    const header = [
      ...strBytes('MThd'),
      ...u32Bytes(6),
      ...u16Bytes(1),             // Format 1 (multi-track)
      ...u16Bytes(chunks.length), // Track count
      ...u16Bytes(PPQ)
    ];

    let totalLen = header.length;
    chunks.forEach(c => { totalLen += c.length; });
    const out = new Uint8Array(totalLen);
    let pos = 0;
    out.set(header, pos); pos += header.length;
    chunks.forEach(c => { out.set(c, pos); pos += c.length; });
    return out;
  }

  function exportMIDI(song, opts = {}) {
    const bytes = buildMidiUint8Array(song, opts);
    const blob = new Blob([bytes], { type: 'audio/midi' });
    const fname = sanitizeFilename(song.title) + '.mid';
    triggerDownload(blob, fname);
    return { filename: fname, size: blob.size };
  }

  // =========================================================================
  // 6. FREE PROJECT SAVE / LOAD (.spmusic) & SHAREABLE HASH URL
  // =========================================================================

  function serializeProject(song, fx, mixer, visualState) {
    return JSON.stringify({
      format: 'studios-pro-music-v4',
      savedAt: new Date().toISOString(),
      song,
      fx: fx || {},
      mixer: mixer || [],
      visuals: visualState || {}
    }, null, 2);
  }

  function exportProjectFile(song, fx, mixer, visualState) {
    const json = serializeProject(song, fx, mixer, visualState);
    const blob = new Blob([json], { type: 'application/json' });
    const fname = sanitizeFilename(song.title) + '.spmusic';
    triggerDownload(blob, fname);
    return { filename: fname, size: blob.size };
  }

  function encodeShareHash(song) {
    const slim = { g: song.genreId, t: song.title, r: song.root, sc: song.scale, b: song.bpm, sw: song.swing, tm: song.timbre, th: song.theme, md: song.model };
    const str = unescape(encodeURIComponent(JSON.stringify(slim)));
    return '#sp4d=' + btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decodeShareHash(hashStr) {
    try {
      const m = /^#sp4d=([A-Za-z0-9\-_]+)$/.exec(String(hashStr || '').trim());
      if (!m) return null;
      const b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(escape(atob(b64)));
      return JSON.parse(json);
    } catch (_) {
      return null;
    }
  }

  const MusicExports = {
    sanitizeFilename, encodeFloatChannelsToWavBytes, audioBufferToWavBlob,
    renderSongOfflineBuffer, exportMasterWAV, exportOfflineStems,
    buildWebMusicPlayerHTML, exportWebMusicPlayerHTML,
    pickBestVideoMime, startVideoRecording, stopVideoRecording, recordFullSongVideo,
    isVideoRecording: () => !!(_videoRecorder && _videoRecorder.state === 'recording'),
    buildMidiUint8Array, exportMIDI,
    serializeProject, exportProjectFile, encodeShareHash, decodeShareHash
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = MusicExports;
  if (globalScope) globalScope.MusicExports = MusicExports;
})(typeof window !== 'undefined' ? window : globalThis);
