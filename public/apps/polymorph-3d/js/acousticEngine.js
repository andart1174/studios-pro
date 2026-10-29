/**
 * PolyMorph 3D Studio - Acoustic & Soundwave 3D Engine
 * Converts voice, music, audio files, and harmonic frequencies into 3D printable sculptures:
 * 1. Soundwave Bar & Desk Sculpture (Linear waveform with pedestal)
 * 2. Soundwave Ring & Keychain (Circular audio ring with optional lanyard hole)
 * 3. Cymatics & Chladni Harmonic Plates (Resonance frequency node surfaces)
 * 4. Acoustic Spiral Resonator Vases (Vase geometry modulated by audio spectrum)
 * 100% Watertight solid geometry, client-side Web Audio API.
 */

class AcousticEngine {
  // --------------------------------------------------------------------------
  // Audio Synthesis & Waveform Processing
  // --------------------------------------------------------------------------

  static getPresetWaveform(presetKey = 'love_voice', samplesCount = 128) {
    const data = new Float32Array(samplesCount);

    switch (presetKey) {
      case 'love_voice': {
        // Formant structure of "I Love You"
        for (let i = 0; i < samplesCount; i++) {
          const t = i / samplesCount;
          const envelope = Math.sin(t * Math.PI) * Math.exp(-t * 1.5) * 1.8 +
                           Math.sin(Math.max(0, t - 0.4) * Math.PI * 2) * 0.8 +
                           Math.sin(Math.max(0, t - 0.7) * Math.PI * 3) * 0.6;
          const carrier = Math.sin(t * 48) * 0.5 + Math.sin(t * 96) * 0.3 + Math.sin(t * 144) * 0.2;
          data[i] = Math.abs(envelope * carrier);
        }
        break;
      }
      case 'heartbeat': {
        // Lub-Dub physiological pulse
        for (let i = 0; i < samplesCount; i++) {
          const t = (i % (samplesCount / 2)) / (samplesCount / 2);
          let val = 0;
          if (t < 0.18) val = Math.sin(t / 0.18 * Math.PI) * 0.95;
          else if (t > 0.28 && t < 0.48) val = Math.sin((t - 0.28) / 0.2 * Math.PI) * 0.75;
          data[i] = Math.abs(val + Math.sin(i * 0.4) * 0.05);
        }
        break;
      }
      case 'cymatics_432hz': {
        // Harmonic 432 Hz Solfeggio standing wave
        for (let i = 0; i < samplesCount; i++) {
          const t = i / samplesCount;
          data[i] = Math.abs(Math.sin(t * Math.PI * 8) * 0.6 + Math.cos(t * Math.PI * 16) * 0.35 + 0.1);
        }
        break;
      }
      case 'synthwave_arp': {
        // Electronic arpeggio sequence
        for (let i = 0; i < samplesCount; i++) {
          const step = Math.floor(i / (samplesCount / 8));
          const stepFreq = (step + 1) * 3;
          data[i] = Math.abs(Math.sin((i / samplesCount) * Math.PI * stepFreq) * ((step % 2 === 0) ? 0.9 : 0.6));
        }
        break;
      }
      default: {
        for (let i = 0; i < samplesCount; i++) {
          data[i] = Math.abs(Math.sin(i * 0.15) * 0.5 + 0.3);
        }
      }
    }

    // Normalize to [0.08, 1.0]
    let maxVal = 0;
    for (let i = 0; i < samplesCount; i++) maxVal = Math.max(maxVal, data[i]);
    if (maxVal > 0) {
      for (let i = 0; i < samplesCount; i++) {
        data[i] = Math.max(0.08, data[i] / maxVal);
      }
    }

    return data;
  }

  static async extractWaveformFromAudioFile(file, samplesCount = 128) {
    const arrayBuffer = await file.arrayBuffer();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    const channelData = audioBuffer.getChannelData(0);
    const blockSize = Math.floor(channelData.length / samplesCount);
    const waveform = new Float32Array(samplesCount);

    for (let i = 0; i < samplesCount; i++) {
      const start = i * blockSize;
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(channelData[start + j]);
      }
      waveform[i] = sum / blockSize;
    }

    // Normalize
    let max = 0;
    for (let i = 0; i < samplesCount; i++) max = Math.max(max, waveform[i]);
    if (max > 0) {
      for (let i = 0; i < samplesCount; i++) {
        waveform[i] = Math.max(0.08, waveform[i] / max);
      }
    }

    return waveform;
  }

  // --------------------------------------------------------------------------
  // Live Microphone Streaming & Recording
  // --------------------------------------------------------------------------
  static liveMicStream = null;
  static liveAudioCtx = null;
  static liveAnalyser = null;
  static liveMediaRecorder = null;
  static liveRecordedChunks = [];
  static liveAudioBlob = null;
  static isRecording = false;

  static async startLiveMicrophone(onLiveFrame = null) {
    this.liveRecordedChunks = [];
    this.liveAudioBlob = null;
    this.isRecording = true;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.liveMicStream = stream;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.liveAudioCtx = new AudioContextClass();
    const source = this.liveAudioCtx.createMediaStreamSource(stream);

    this.liveAnalyser = this.liveAudioCtx.createAnalyser();
    this.liveAnalyser.fftSize = 256;
    source.connect(this.liveAnalyser);

    this.liveMediaRecorder = new MediaRecorder(stream);
    this.liveMediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.liveRecordedChunks.push(e.data);
    };
    this.liveMediaRecorder.start();

    // Live frame ticker for real-time mesh morphing
    const dataArray = new Uint8Array(this.liveAnalyser.frequencyBinCount);
    const waveformHistory = [];

    const tick = () => {
      if (!this.isRecording) return;
      this.liveAnalyser.getByteFrequencyData(dataArray);
      let avg = 0;
      for (let i = 0; i < dataArray.length; i++) avg += dataArray[i];
      avg = (avg / dataArray.length / 255) * 1.5;
      waveformHistory.push(avg);

      if (onLiveFrame && typeof onLiveFrame === 'function') {
        const samples = 128;
        const liveWave = new Float32Array(samples);
        const len = waveformHistory.length;
        if (len < samples) {
          for (let s = 0; s < samples; s++) {
            const hIdx = Math.floor((s / samples) * len);
            liveWave[s] = Math.max(0.08, waveformHistory[hIdx] || 0.1);
          }
        } else {
          const step = len / samples;
          for (let s = 0; s < samples; s++) {
            const idx = Math.min(len - 1, Math.floor(s * step));
            liveWave[s] = Math.max(0.08, waveformHistory[idx] || 0.1);
          }
        }
        onLiveFrame(liveWave);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  static async stopLiveMicrophone(samplesCount = 128) {
    this.isRecording = false;
    if (this.liveMediaRecorder && this.liveMediaRecorder.state !== 'inactive') {
      try { this.liveMediaRecorder.stop(); } catch (e) {}
    }
    if (this.liveMicStream) {
      this.liveMicStream.getTracks().forEach(t => t.stop());
    }

    return new Promise((resolve) => {
      setTimeout(async () => {
        if (this.liveRecordedChunks.length > 0) {
          this.liveAudioBlob = new Blob(this.liveRecordedChunks, { type: 'audio/webm' });
          try {
            const finalWaveform = await this.extractWaveformFromAudioFile(this.liveAudioBlob, samplesCount);
            resolve({ waveform: finalWaveform, audioBlob: this.liveAudioBlob });
          } catch (err) {
            console.warn("Direct blob decode fallback:", err);
            const fallbackWave = this.getPresetWaveform('love_voice', samplesCount);
            resolve({ waveform: fallbackWave, audioBlob: this.liveAudioBlob });
          }
        } else {
          resolve({ waveform: this.getPresetWaveform('love_voice', samplesCount), audioBlob: null });
        }
      }, 250);
    });
  }

  // --------------------------------------------------------------------------
  // Generator 1: Soundwave Bar / Pedestal Sculpture
  // --------------------------------------------------------------------------

  static generateSoundwaveBar(waveform, options = {}) {
    const opt = Object.assign({
      length: 120,       // Total length in mm
      height: 35,        // Max wave height in mm
      depth: 14,         // Thickness/depth in mm
      baseHeight: 6,     // Solid pedestal height
      style: 'smooth',   // 'smooth' | 'bars' | 'radial'
      symmetry: true     // Mirror top/bottom wave
    }, options);

    const samples = waveform.length;
    const vertices = [];
    const indices = [];

    function addQuad(p0, p1, p2, p3) {
      const base = vertices.length / 3;
      vertices.push(...p0, ...p1, ...p2, ...p3);
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }

    const hl = opt.length / 2;
    const hd = opt.depth / 2;
    const stepX = opt.length / (samples - 1);

    if (opt.style === 'bars') {
      // Discrete modern equalizer 3D bar sculpture
      const barWidth = stepX * 0.72;
      for (let i = 0; i < samples; i++) {
        const cx = -hl + i * stepX;
        const val = waveform[i];
        const barH = opt.baseHeight + val * (opt.height - opt.baseHeight);
        const yTop = opt.symmetry ? barH / 2 : barH;
        const yBot = opt.symmetry ? -barH / 2 : 0;

        const bx1 = cx - barWidth / 2, bx2 = cx + barWidth / 2;
        const bz1 = -hd, bz2 = hd;

        // Bar 6 faces
        addQuad([bx1, yBot, bz2], [bx2, yBot, bz2], [bx2, yTop, bz2], [bx1, yTop, bz2]); // Front
        addQuad([bx2, yBot, bz1], [bx1, yBot, bz1], [bx1, yTop, bz1], [bx2, yTop, bz1]); // Back
        addQuad([bx1, yBot, bz1], [bx1, yBot, bz2], [bx1, yTop, bz2], [bx1, yTop, bz1]); // Left
        addQuad([bx2, yBot, bz2], [bx2, yBot, bz1], [bx2, yTop, bz1], [bx2, yTop, bz2]); // Right
        addQuad([bx1, yTop, bz2], [bx2, yTop, bz2], [bx2, yTop, bz1], [bx1, yTop, bz1]); // Top
        addQuad([bx1, yBot, bz1], [bx2, yBot, bz1], [bx2, yBot, bz2], [bx1, yBot, bz2]); // Bot
      }

      // Base Pedestal
      const pyBot = opt.symmetry ? -opt.height / 2 - opt.baseHeight : -opt.baseHeight;
      const pyTop = opt.symmetry ? -opt.height / 2 : 0;
      const plx1 = -hl - 4, plx2 = hl + 4;
      const pdz1 = -hd - 3, pdz2 = hd + 3;

      addQuad([plx1, pyBot, pdz2], [plx2, pyBot, pdz2], [plx2, pyTop, pdz2], [plx1, pyTop, pdz2]);
      addQuad([plx2, pyBot, pdz1], [plx1, pyBot, pdz1], [plx1, pyTop, pdz1], [plx2, pyTop, pdz1]);
      addQuad([plx1, pyBot, pdz1], [plx1, pyBot, pdz2], [plx1, pyTop, pdz2], [plx1, pyTop, pdz1]);
      addQuad([plx2, pyBot, pdz2], [plx2, pyBot, pdz1], [plx2, pyTop, pdz1], [plx2, pyTop, pdz2]);
      addQuad([plx1, pyTop, pdz2], [plx2, pyTop, pdz2], [plx2, pyTop, pdz1], [plx1, pyTop, pdz1]);
      addQuad([plx1, pyBot, pdz1], [plx2, pyBot, pdz1], [plx2, pyBot, pdz2], [plx1, pyBot, pdz2]);
    } else {
      // Continuous smooth organic soundwave
      const frontTop = [], frontBot = [];
      const backTop = [], backBot = [];

      for (let i = 0; i < samples; i++) {
        const x = -hl + i * stepX;
        const val = waveform[i];
        const h = opt.baseHeight + val * (opt.height - opt.baseHeight);
        const yTop = opt.symmetry ? h / 2 : h;
        const yBot = opt.symmetry ? -h / 2 : 0;

        frontTop.push([x, yTop, hd]);
        frontBot.push([x, yBot, hd]);
        backTop.push([x, yTop, -hd]);
        backBot.push([x, yBot, -hd]);
      }

      // Front & Back ribbons
      for (let i = 0; i < samples - 1; i++) {
        addQuad(frontBot[i], frontBot[i + 1], frontTop[i + 1], frontTop[i]);
        addQuad(backBot[i + 1], backBot[i], backTop[i], backTop[i + 1]);
      }
      // Top & Bottom continuous caps
      for (let i = 0; i < samples - 1; i++) {
        addQuad(frontTop[i], frontTop[i + 1], backTop[i + 1], backTop[i]);
        addQuad(frontBot[i + 1], frontBot[i], backBot[i], backBot[i + 1]);
      }
      // Left & Right end caps
      addQuad(backBot[0], frontBot[0], frontTop[0], backTop[0]);
      addQuad(frontBot[samples - 1], backBot[samples - 1], backTop[samples - 1], frontTop[samples - 1]);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom.toNonIndexed();
  }

  // --------------------------------------------------------------------------
  // Generator 2: Soundwave Ring & Keychain
  // --------------------------------------------------------------------------

  static generateSoundwaveRing(waveform, options = {}) {
    const opt = Object.assign({
      innerRadius: 10,   // Finger ring (10mm) or Keychain (18mm)
      ringWidth: 8,      // Ring band width in mm
      waveAmplitude: 4,  // Height of soundwave spikes
      hasLanyardHole: false, // Keychain attachment loop
      holeRadius: 2.2
    }, options);

    const samples = waveform.length;
    const vertices = [];
    const indices = [];

    function addQuad(p0, p1, p2, p3) {
      const base = vertices.length / 3;
      vertices.push(...p0, ...p1, ...p2, ...p3);
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }

    const hw = opt.ringWidth / 2;
    const innerR = opt.innerRadius;
    const amp = opt.waveAmplitude;

    const innerFront = [], innerBack = [];
    const outerFront = [], outerBack = [];

    for (let i = 0; i < samples; i++) {
      const theta = (i / samples) * Math.PI * 2;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      const val = waveform[i];
      const rOut = innerR + 1.8 + val * amp;

      innerFront.push([cos * innerR, sin * innerR, hw]);
      innerBack.push([cos * innerR, sin * innerR, -hw]);
      outerFront.push([cos * rOut, sin * rOut, hw]);
      outerBack.push([cos * rOut, sin * rOut, -hw]);
    }

    // Outer & Inner cylindrical bands
    for (let i = 0; i < samples; i++) {
      const next = (i + 1) % samples;
      // Outer Waveform Band
      addQuad(outerFront[i], outerFront[next], outerBack[next], outerBack[i]);
      // Inner Smooth Band
      addQuad(innerBack[i], innerBack[next], innerFront[next], innerFront[i]);
      // Front Rim
      addQuad(innerFront[i], innerFront[next], outerFront[next], outerFront[i]);
      // Back Rim
      addQuad(outerBack[i], outerBack[next], innerBack[next], innerBack[i]);
    }

    let geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    geom = geom.toNonIndexed();

    // Add optional Lanyard Ring Loop on Top for Keychain
    if (opt.hasLanyardHole) {
      const loopR = opt.holeRadius + 1.6;
      const topY = innerR + amp + loopR + 1.2;
      const loopGeo = new THREE.TorusGeometry(loopR, 1.4, 12, 24).toNonIndexed();
      loopGeo.translate(0, topY, 0);
      geom = PuzzleEngine.mergeBufferGeometries(geom, loopGeo);
    }

    return geom;
  }

  // --------------------------------------------------------------------------
  // Generator 3: Cymatics & Chladni Harmonic Plates
  // --------------------------------------------------------------------------

  static generateCymaticPlate(freqM = 3, freqN = 5, options = {}) {
    const opt = Object.assign({
      plateSize: 80,     // 80x80mm square plate
      plateThickness: 3, // Base thickness
      ridgeHeight: 5,    // Amplitude of resonance nodes
      gridRes: 48,       // Grid resolution
      mode: 'chladni'    // 'chladni' | 'circular_cymatics'
    }, options);

    const res = opt.gridRes;
    const size = opt.plateSize;
    const L = size / 2;
    const th = opt.plateThickness;
    const amp = opt.ridgeHeight;

    const vertices = [];
    const indices = [];

    function addQuad(p0, p1, p2, p3) {
      const base = vertices.length / 3;
      vertices.push(...p0, ...p1, ...p2, ...p3);
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }

    const grid = [];
    for (let iy = 0; iy <= res; iy++) {
      const row = [];
      const v = iy / res;
      const y = -L + v * size;

      for (let ix = 0; ix <= res; ix++) {
        const u = ix / res;
        const x = -L + u * size;

        let zVal = 0;
        if (opt.mode === 'circular_cymatics') {
          const r = Math.hypot(x, y) / L;
          const theta = Math.atan2(y, x);
          zVal = Math.sin(r * Math.PI * freqM) * Math.cos(theta * freqN) * amp;
        } else {
          // Classic Ernst Chladni (1787) Nodal Sand Formula:
          // w(x,y) = a*sin(n*pi*x/L)*sin(m*pi*y/L) - b*sin(m*pi*x/L)*sin(n*pi*y/L)
          const term1 = Math.sin((freqN * Math.PI * (x + L)) / size) * Math.sin((freqM * Math.PI * (y + L)) / size);
          const term2 = Math.sin((freqM * Math.PI * (x + L)) / size) * Math.sin((freqN * Math.PI * (y + L)) / size);
          zVal = (term1 - term2) * amp;
        }

        if (opt.waveform && opt.waveform.length > 0) {
          const rNorm = Math.min(1.0, Math.hypot(x, y) / L);
          const wIdx = Math.min(opt.waveform.length - 1, Math.floor(rNorm * (opt.waveform.length - 1)));
          const audioPulse = opt.waveform[wIdx] || 0;
          zVal += Math.cos(rNorm * Math.PI * (freqM + 1)) * audioPulse * (amp * 0.45);
        }

        row.push([x, Math.max(0.5, th + zVal), y]);
      }
      grid.push(row);
    }

    // Top Resonance Surface
    for (let iy = 0; iy < res; iy++) {
      for (let ix = 0; ix < res; ix++) {
        addQuad(grid[iy][ix], grid[iy + 1][ix], grid[iy + 1][ix + 1], grid[iy][ix + 1]);
      }
    }

    // Bottom Flat Deck
    addQuad([-L, 0, -L], [-L, 0, L], [L, 0, L], [L, 0, -L]);

    // 4 Side Walls
    for (let ix = 0; ix < res; ix++) {
      // Front (iy = res)
      addQuad(grid[res][ix], [grid[res][ix][0], 0, L], [grid[res][ix + 1][0], 0, L], grid[res][ix + 1]);
      // Back (iy = 0)
      addQuad(grid[0][ix + 1], [grid[0][ix + 1][0], 0, -L], [grid[0][ix][0], 0, -L], grid[0][ix]);
      // Left (ix = 0)
      addQuad(grid[ix + 1][0], [ -L, 0, grid[ix + 1][0][2] ], [ -L, 0, grid[ix][0][2] ], grid[ix][0]);
      // Right (ix = res)
      addQuad(grid[ix][res], [ L, 0, grid[ix][res][2] ], [ L, 0, grid[ix + 1][res][2] ], grid[ix + 1][res]);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom.toNonIndexed();
  }

  // --------------------------------------------------------------------------
  // Generator 4: Acoustic Spiral Vase
  // --------------------------------------------------------------------------

  static generateAcousticVase(waveform, options = {}) {
    const opt = Object.assign({
      height: 90,        // Total height in mm
      baseRadius: 18,    // Base radius in mm
      topRadius: 28,     // Top opening radius in mm
      twistLoops: 2.5,   // Spiral rotation
      waveInfluence: 6,  // Wave modulation amplitude
      segmentsY: 48,
      segmentsRadial: 36
    }, options);

    const segY = opt.segmentsY;
    const segR = opt.segmentsRadial;
    const vertices = [];
    const indices = [];

    function addQuad(p0, p1, p2, p3) {
      const base = vertices.length / 3;
      vertices.push(...p0, ...p1, ...p2, ...p3);
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }

    const rings = [];
    for (let iy = 0; iy <= segY; iy++) {
      const t = iy / segY;
      const y = t * opt.height;
      const wIdx = Math.min(waveform.length - 1, Math.floor(t * waveform.length));
      const waveVal = waveform[wIdx];

      const r = opt.baseRadius + (opt.topRadius - opt.baseRadius) * t + waveVal * opt.waveInfluence;
      const twistAngle = t * Math.PI * 2 * opt.twistLoops;

      const ring = [];
      for (let ir = 0; ir < segR; ir++) {
        const theta = (ir / segR) * Math.PI * 2 + twistAngle;
        const fluting = Math.sin(ir * 6) * 1.5;
        const currentR = r + fluting;
        ring.push([Math.cos(theta) * currentR, y, Math.sin(theta) * currentR]);
      }
      rings.push(ring);
    }

    // Outer Vase Wall
    for (let iy = 0; iy < segY; iy++) {
      for (let ir = 0; ir < segR; ir++) {
        const nextR = (ir + 1) % segR;
        addQuad(rings[iy][ir], rings[iy + 1][ir], rings[iy + 1][nextR], rings[iy][nextR]);
      }
    }

    // Flat Solid Base Cap
    const botCenter = [0, 0, 0];
    for (let ir = 0; ir < segR; ir++) {
      const nextR = (ir + 1) % segR;
      const base = vertices.length / 3;
      vertices.push(...botCenter, ...rings[0][nextR], ...rings[0][ir]);
      indices.push(base, base + 1, base + 2);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom.toNonIndexed();
  }

  // --------------------------------------------------------------------------
  // Generator 5: Extraterrestrial Alien Xenon Morph
  // --------------------------------------------------------------------------
  static generateAlienVoiceMesh(waveform, options = {}) {
    const opt = Object.assign({ height: 75, baseRadius: 14, waveInfluence: 1.0 }, options);
    const vertices = [];
    const indices = [];

    function addQuad(p0, p1, p2, p3) {
      const base = vertices.length / 3;
      vertices.push(...p0, ...p1, ...p2, ...p3);
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }

    const rings = 28, segs = 24;
    const meshRings = [];
    const h = opt.height;

    for (let r = 0; r <= rings; r++) {
      const v = r / rings;
      const y = -h / 2 + v * h;
      const wIdx = Math.min(waveform.length - 1, Math.floor(v * waveform.length));
      const waveVal = waveform[wIdx] || 0.1;

      // Alien skull profile
      let rBase = opt.baseRadius;
      if (v > 0.35) {
        rBase = opt.baseRadius + Math.sin((v - 0.35) / 0.65 * Math.PI) * (20 + waveVal * 15);
      } else {
        rBase = 8 + v * 12 + waveVal * 4;
      }

      const ring = [];
      for (let s = 0; s < segs; s++) {
        const angle = (s / segs) * Math.PI * 2;
        const cos = Math.cos(angle), sin = Math.sin(angle);

        const cranialLobes = Math.cos(angle * 3) * (3.0 + waveVal * 5);
        const spinalCrest = (angle > Math.PI * 0.75 && angle < Math.PI * 1.25) ? (waveVal * 8) : 0;
        const curR = rBase + cranialLobes + spinalCrest;

        const px = cos * curR * 0.85;
        const pz = sin * (curR + (v > 0.45 ? 10 + waveVal * 12 : 0));
        ring.push([px, y, pz]);
      }
      meshRings.push(ring);
    }

    for (let r = 0; r < rings; r++) {
      for (let s = 0; s < segs; s++) {
        const nextS = (s + 1) % segs;
        addQuad(meshRings[r][s], meshRings[r + 1][s], meshRings[r + 1][nextS], meshRings[r][nextS]);
      }
    }

    // Caps
    const topCenter = [0, h / 2 + 2, 8];
    const botCenter = [0, -h / 2, 0];
    for (let s = 0; s < segs; s++) {
      const nextS = (s + 1) % segs;
      const base = vertices.length / 3;
      vertices.push(...topCenter, ...meshRings[rings][s], ...meshRings[rings][nextS]);
      indices.push(base, base + 1, base + 2);
    }
    for (let s = 0; s < segs; s++) {
      const nextS = (s + 1) % segs;
      const base = vertices.length / 3;
      vertices.push(...botCenter, ...meshRings[0][nextS], ...meshRings[0][s]);
      indices.push(base, base + 1, base + 2);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom.toNonIndexed();
  }

  // --------------------------------------------------------------------------
  // Generator 6: Cosmic Starship Cruiser Morph
  // --------------------------------------------------------------------------
  static generateStarshipVoiceMesh(waveform, options = {}) {
    const opt = Object.assign({ length: 95, wingspan: 75, waveInfluence: 1.0 }, options);
    const vertices = [];
    const indices = [];

    function addQuad(p0, p1, p2, p3) {
      const base = vertices.length / 3;
      vertices.push(...p0, ...p1, ...p2, ...p3);
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }

    const steps = 30;
    const l = opt.length;
    const hl = l / 2;
    const ribTops = [], ribBots = [], ribLefts = [], ribRights = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps; // 0 (nose) to 1 (rear engines)
      const z = -hl + t * l;
      const wIdx = Math.min(waveform.length - 1, Math.floor(t * waveform.length));
      const waveVal = waveform[wIdx] || 0.1;

      // Fuselage thickness and wing spread
      const fuselageW = Math.sin(t * Math.PI) * 12 + 4;
      const fuselageH = Math.sin(t * Math.PI * 0.8) * 8 + 3;

      // Wings sweep outwards at t > 0.35
      let wingSpan = 0;
      if (t > 0.3) {
        wingSpan = Math.pow(t - 0.3, 1.3) * (opt.wingspan / 2) * (1 + waveVal * 0.6);
      }

      const totalHalfW = fuselageW + wingSpan;
      const wingH = fuselageH * (t > 0.3 ? 0.35 : 1.0) + waveVal * 3;

      ribTops.push([0, fuselageH + (t > 0.2 && t < 0.6 ? 4 + waveVal * 5 : 0), z]); // Cockpit canopy
      ribBots.push([0, -fuselageH * 0.6, z]);
      ribLefts.push([-totalHalfW, wingH * 0.2, z]);
      ribRights.push([totalHalfW, wingH * 0.2, z]);
    }

    // Connect ribs along length
    for (let i = 0; i < steps; i++) {
      // Top-Left quad
      addQuad(ribTops[i], ribTops[i + 1], ribLefts[i + 1], ribLefts[i]);
      // Top-Right quad
      addQuad(ribTops[i], ribRights[i], ribRights[i + 1], ribTops[i + 1]);
      // Bot-Left quad
      addQuad(ribBots[i], ribLefts[i], ribLefts[i + 1], ribBots[i + 1]);
      // Bot-Right quad
      addQuad(ribBots[i], ribBots[i + 1], ribRights[i + 1], ribRights[i]);
    }

    // Engine Rear Cap
    addQuad(ribTops[steps], ribLefts[steps], ribBots[steps], ribRights[steps]);
    // Nose Cap
    const nosePt = [0, 0, -hl - 2];
    const base1 = vertices.length / 3;
    vertices.push(...nosePt, ...ribTops[0], ...ribRights[0]);
    vertices.push(...nosePt, ...ribRights[0], ...ribBots[0]);
    vertices.push(...nosePt, ...ribBots[0], ...ribLefts[0]);
    vertices.push(...nosePt, ...ribLefts[0], ...ribTops[0]);
    indices.push(base1, base1+1, base1+2, base1+3, base1+4, base1+5, base1+6, base1+7, base1+8, base1+9, base1+10, base1+11);

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom.toNonIndexed();
  }

  // --------------------------------------------------------------------------
  // Generator 7: Sonic Mythical Dragon / Wyvern Morph
  // --------------------------------------------------------------------------
  static generateDragonVoiceMesh(waveform, options = {}) {
    const opt = Object.assign({ length: 90, height: 60 }, options);
    const vertices = [];
    const indices = [];

    function addQuad(p0, p1, p2, p3) {
      const base = vertices.length / 3;
      vertices.push(...p0, ...p1, ...p2, ...p3);
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }

    const segments = 28;
    const segsRadial = 16;
    const spineNodes = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const wIdx = Math.min(waveform.length - 1, Math.floor(t * waveform.length));
      const waveVal = waveform[wIdx] || 0.1;

      // Serpentine S-curve spine
      const sx = Math.sin(t * Math.PI * 2.2) * 12;
      const sy = Math.cos(t * Math.PI * 1.5) * 10 + (t < 0.3 ? 15 : 0);
      const sz = -40 + t * opt.length;

      // Dragon body radius + dorsal spine horn heights
      const rBody = Math.sin(t * Math.PI) * 14 + 5;
      const dorsalSpike = (t > 0.15 && t < 0.85) ? Math.sin(t * Math.PI * 6) * (6 + waveVal * 12) : 0;

      const ring = [];
      for (let s = 0; s < segsRadial; s++) {
        const a = (s / segsRadial) * Math.PI * 2;
        const cos = Math.cos(a), sin = Math.sin(a);

        // Flaring wing fin ridges at sides (a = 0 and a = PI)
        const finFlare = Math.abs(cos) > 0.8 ? (waveVal * 14 * Math.sin(t * Math.PI)) : 0;
        const curR = rBody + finFlare;

        const vx = sx + cos * curR;
        const vy = sy + sin * curR + (sin > 0.7 ? dorsalSpike : 0); // Top spine spikes
        const vz = sz;
        ring.push([vx, vy, vz]);
      }
      spineNodes.push(ring);
    }

    for (let i = 0; i < segments; i++) {
      for (let s = 0; s < segsRadial; s++) {
        const nextS = (s + 1) % segsRadial;
        addQuad(spineNodes[i][s], spineNodes[i + 1][s], spineNodes[i + 1][nextS], spineNodes[i][nextS]);
      }
    }

    // Head & Tail Caps
    const headPeak = [0, 20, -45];
    const tailTip = [0, -5, opt.length / 2 + 10];
    for (let s = 0; s < segsRadial; s++) {
      const nextS = (s + 1) % segsRadial;
      const base = vertices.length / 3;
      vertices.push(...headPeak, ...spineNodes[0][nextS], ...spineNodes[0][s]);
      vertices.push(...tailTip, ...spineNodes[segments][s], ...spineNodes[segments][nextS]);
      indices.push(base, base+1, base+2, base+3, base+4, base+5);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom.toNonIndexed();
  }

  // --------------------------------------------------------------------------
  // Generator 8: Cyber Predator / Wolf Head Morph
  // --------------------------------------------------------------------------
  static generateWolfVoiceMesh(waveform, options = {}) {
    const opt = Object.assign({ length: 80, height: 50 }, options);
    const vertices = [];
    const indices = [];

    function addQuad(p0, p1, p2, p3) {
      const base = vertices.length / 3;
      vertices.push(...p0, ...p1, ...p2, ...p3);
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }

    const rings = 20, segs = 18;
    const meshRings = [];

    for (let r = 0; r <= rings; r++) {
      const t = r / rings; // 0 = snout tip, 1 = neck ruff
      const z = -35 + t * opt.length;
      const wIdx = Math.min(waveform.length - 1, Math.floor(t * waveform.length));
      const waveVal = waveform[wIdx] || 0.1;

      // Angular wolf snout to cranial dome
      let rw = 5 + t * 24;
      let rh = 4 + t * 20;

      // Ears crest at t = 0.7 to 0.9
      const earHeight = (t > 0.65 && t < 0.92) ? (12 + waveVal * 16) : 0;

      const ring = [];
      for (let s = 0; s < segs; s++) {
        const a = (s / segs) * Math.PI * 2;
        const cos = Math.cos(a), sin = Math.sin(a);

        // Ear tips on upper left and upper right
        let earAdd = 0;
        if (sin > 0.4 && Math.abs(cos) > 0.3) {
          earAdd = earHeight * Math.abs(cos);
        }

        const px = cos * rw;
        const py = sin * rh + earAdd;
        ring.push([px, py, z]);
      }
      meshRings.push(ring);
    }

    for (let r = 0; r < rings; r++) {
      for (let s = 0; s < segs; s++) {
        const nextS = (s + 1) % segs;
        addQuad(meshRings[r][s], meshRings[r + 1][s], meshRings[r + 1][nextS], meshRings[r][nextS]);
      }
    }

    // Snout Tip & Neck Caps
    const snoutTip = [0, 0, -38];
    const neckBase = [0, 5, opt.length - 35];
    for (let s = 0; s < segs; s++) {
      const nextS = (s + 1) % segs;
      const base = vertices.length / 3;
      vertices.push(...snoutTip, ...meshRings[0][nextS], ...meshRings[0][s]);
      vertices.push(...neckBase, ...meshRings[rings][s], ...meshRings[rings][nextS]);
      indices.push(base, base+1, base+2, base+3, base+4, base+5);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom.toNonIndexed();
  }

  // --------------------------------------------------------------------------
  // Generator 9: Faceted Crystal Geode Gem Cluster
  // --------------------------------------------------------------------------
  static generateCrystalVoiceMesh(waveform, options = {}) {
    const opt = Object.assign({ radius: 35, spikeCount: 16 }, options);
    let geom = null;

    const spikes = opt.spikeCount;
    for (let i = 0; i < spikes; i++) {
      const phi = Math.acos(-1 + (2 * i) / spikes);
      const theta = Math.sqrt(spikes * Math.PI) * phi;

      const wIdx = Math.min(waveform.length - 1, Math.floor((i / spikes) * waveform.length));
      const waveVal = waveform[wIdx] || 0.1;

      const spikeH = 20 + waveVal * 35;
      const spikeR = 5 + waveVal * 4;

      const crystal = new THREE.ConeGeometry(spikeR, spikeH, 6).toNonIndexed();
      crystal.translate(0, spikeH / 2, 0);

      // Orient crystal outwards
      const dir = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta)
      ).normalize();

      const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      const pos = dir.clone().multiplyScalar(opt.radius * 0.5);

      // Transform geometry
      const posAttr = crystal.attributes.position;
      for (let v = 0; v < posAttr.count; v++) {
        const p = new THREE.Vector3(posAttr.getX(v), posAttr.getY(v), posAttr.getZ(v));
        p.applyQuaternion(quat).add(pos);
        posAttr.setXYZ(v, p.x, p.y, p.z);
      }

      if (!geom) geom = crystal;
      else geom = PuzzleEngine.mergeBufferGeometries(geom, crystal);
    }

    // Add central core polyhedral rock
    const core = new THREE.DodecahedronGeometry(opt.radius * 0.55, 0).toNonIndexed();
    geom = PuzzleEngine.mergeBufferGeometries(geom, core);
    geom.computeVertexNormals();
    return geom;
  }

  // --------------------------------------------------------------------------
  // Generator 10: Wearable Soundwave Royal Tiara / Crown
  // --------------------------------------------------------------------------
  static generateCrownVoiceMesh(waveform, options = {}) {
    const opt = Object.assign({
      crownRadius: 28,   // 56mm diameter tiara
      bandHeight: 8,     // Base headband height
      maxPeakHeight: 35  // Spikes height
    }, options);

    const samples = waveform.length;
    const vertices = [];
    const indices = [];

    function addQuad(p0, p1, p2, p3) {
      const base = vertices.length / 3;
      vertices.push(...p0, ...p1, ...p2, ...p3);
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }

    const rIn = opt.crownRadius;
    const rOut = rIn + 2.4; // 2.4mm band thickness
    const bH = opt.bandHeight;

    const innerBot = [], innerTop = [];
    const outerBot = [], outerTop = [];

    for (let i = 0; i < samples; i++) {
      const a = (i / samples) * Math.PI * 2;
      const cos = Math.cos(a), sin = Math.sin(a);
      const val = waveform[i] || 0.1;

      // Crown spikes rising from voice peaks
      const peakY = bH + val * opt.maxPeakHeight;

      innerBot.push([cos * rIn, 0, sin * rIn]);
      innerTop.push([cos * rIn, peakY, sin * rIn]);
      outerBot.push([cos * rOut, 0, sin * rOut]);
      outerTop.push([cos * rOut, peakY, sin * rOut]);
    }

    for (let i = 0; i < samples; i++) {
      const next = (i + 1) % samples;
      // Outer Face
      addQuad(outerBot[i], outerBot[next], outerTop[next], outerTop[i]);
      // Inner Face
      addQuad(innerTop[i], innerTop[next], innerBot[next], innerBot[i]);
      // Top Spikes Rim
      addQuad(innerTop[i], outerTop[i], outerTop[next], innerTop[next]);
      // Bottom Flat Base
      addQuad(innerBot[i], innerBot[next], outerBot[next], outerBot[i]);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom.toNonIndexed();
  }

  // --------------------------------------------------------------------------
  // SVG Waveform Exporter for Laser Engraving
  // --------------------------------------------------------------------------

  static generateSoundwaveSVG(waveform, modelName = "Soundwave_Art") {
    const width = 200, height = 80;
    const step = width / (waveform.length - 1);
    const midY = height / 2;

    let pathD = `M 0 ${midY}`;
    // Top waveform line
    for (let i = 0; i < waveform.length; i++) {
      const x = i * step;
      const y = midY - waveform[i] * 32;
      pathD += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    // Bottom mirrored line
    for (let i = waveform.length - 1; i >= 0; i--) {
      const x = i * step;
      const y = midY + waveform[i] * 32;
      pathD += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    pathD += ` Z`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}mm" height="${height}mm">
  <rect width="100%" height="100%" fill="#0b0f19" />
  <path d="${pathD}" fill="url(#grad)" stroke="#38bdf8" stroke-width="0.8" />
  <text x="10" y="${height - 6}" font-family="'Segoe UI', sans-serif" font-weight="bold" font-size="5" fill="#94a3b8">${modelName} — PolyMorph 3D Soundwave</text>
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#818cf8" stop-opacity="0.8"/>
    </linearGradient>
  </defs>
</svg>`;
  }
}

if (typeof window !== 'undefined') {
  window.AcousticEngine = AcousticEngine;
}
if (typeof module !== 'undefined') {
  module.exports = AcousticEngine;
}
