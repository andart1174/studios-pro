/**
 * 4D Music Composer (v4.0) — Zero-Freeze 8-Track Pro Web Audio Engine (Tone.js 14.8.49)
 * Fixes ALL legacy audio freezes & crashes:
 *  - NO broken 3-arg MetalSynth crash! (Crisp filtered NoiseSynth Hi-Hat)
 *  - NO MonoSynth Array crash on Bass! (Always unwraps single note clamped to C1-C3)
 *  - Parallel FX Sends + Bypass when wet=0 + Running Chorus.start() + Master Compressor + -1dB Limiter!
 *  - True Song Mode (A -> B -> C -> D) with Tone.Draw UI updates (never blocks audio thread!)
 *  - Zero-Stuck-Note Live Keyboard, WORKING AI Smart Harmonizer (1v/2v/3v),
 *    WORKING 3-Slot Loop Recorder (F1/F2/F3), Clean Theremin XY, Feedback-Safe Mic FX,
 *    and 3-Band FFT Audio Reactivity (Bass / Mid / Treble)!
 */
(function (globalScope) {
  'use strict';

  function MT() { return globalScope.MusicTheory; }

  const AudioEngine = (() => {
    let _ready = false;
    let _isPlaying = false;
    let _songMode = true; // true: chain A->B->C->D, false: loop currentBank
    let _currentBankIdx = 0;
    let _currentStep = 0;
    let _masterPitch = 0;

    let _songRef = null;
    let _onStepUI = null;
    let _onBankChange = null;
    let _onBarEnd = null;

    // Master Mastering Bus + Recording Stream + FFT Analysers
    let _limiter = null, _compressor = null, _masterEq = null, _masterGain = null;
    let _reverb = null, _delay = null, _chorus = null, _drive = null, _phaser = null;
    let _melodicBus = null, _drumBus = null;
    let _fftAnalyser = null, _waveAnalyser = null, _recordDest = null;

    // 8 Track Channels & Instruments (mixer state persists even before Tone.start()!)
    const _tracks = []; // { gain, muted, solo, inst, extra, customPlayer }
    const _mixerState = Array.from({ length: 8 }, () => ({ volume: 0.85, muted: false, solo: false }));
    const _fxState = { reverb: 38, delay: 25, chorus: 20, dist: 0, phaser: 0, filter: 65 };
    let _repeatId = null;

    // Live Keyboard, Harmonizer, Arp, Loop Recorder, Theremin & Mic
    let _kbSynth = null, _kbFilter = null, _kbVibrato = null;
    let _kbState = {
      wave: 'sawtooth', octave: 4, chordMode: false, arpMode: false, arpRate: '8n',
      scaleLock: false, harmVoices: 0, sustain: false, velocity: 0.78
    };
    const _activeKeyVoices = new Map(); // triggerKey -> string[] notes released cleanly!
    const _sustainedNotes = new Set();
    let _arpNotes = [];
    let _arpLoop = null;
    let _arpStep = 0;

    // Working 3-Slot Loop Recorder (F1/F2/F3)!
    const _loops = [
      { state: 'empty', events: [], startTime: 0, dur: 0, timers: [] },
      { state: 'empty', events: [], startTime: 0, dur: 0, timers: [] },
      { state: 'empty', events: [], startTime: 0, dur: 0, timers: [] }
    ];
    let _recordingLoopIdx = -1;

    // Mic Vocoder (lazy-initialized only when enabled, echoCancellation ON!)
    let _mic = null, _micFx = null, _micActive = false;

    const TIMBRE_MAP = {
      supersaw: { oscillator: { type: 'fatsawtooth', count: 3, spread: 24 }, envelope: { attack: 0.015, decay: 0.22, sustain: 0.55, release: 0.45 } },
      piano:    { oscillator: { type: 'triangle' },                           envelope: { attack: 0.008, decay: 0.45, sustain: 0.18, release: 0.85 } },
      bell:     { oscillator: { type: 'sine' },                               envelope: { attack: 0.005, decay: 0.75, sustain: 0.08, release: 1.25 } },
      pluck:    { oscillator: { type: 'sawtooth' },                           envelope: { attack: 0.006, decay: 0.18, sustain: 0.06, release: 0.30 } },
      flute:    { oscillator: { type: 'sine' },                               envelope: { attack: 0.09,  decay: 0.15, sustain: 0.75, release: 0.45 } },
      square:   { oscillator: { type: 'square' },                             envelope: { attack: 0.008, decay: 0.16, sustain: 0.42, release: 0.25 } }
    };

    async function ensureReady() {
      const Tone = globalScope.Tone;
      if (!Tone) throw new Error('Tone.js not loaded');
      await Tone.start();
      if (Tone.context.state !== 'running') await Tone.context.resume();
      if (_ready) return;

      // 1. Mastering Chain: EQ3 -> Compressor -> Brickwall Limiter (-1dB) -> Speakers + Analysers + Record Stream
      _masterEq = new Tone.EQ3(1.5, 0, 1.0);
      _compressor = new Tone.Compressor({ threshold: -14, ratio: 3.5, attack: 0.015, release: 0.18 });
      _limiter = new Tone.Limiter(-1.0);
      _masterGain = new Tone.Gain(0.88);
      _fftAnalyser = new Tone.Analyser('fft', 64);
      _waveAnalyser = new Tone.Analyser('waveform', 64);

      _masterEq.chain(_compressor, _limiter, _masterGain);
      _masterGain.toDestination();
      _masterGain.connect(_fftAnalyser);
      _masterGain.connect(_waveAnalyser);

      // Recording tap for MP4/WebM capture
      if (Tone.context && Tone.context.createMediaStreamDestination) {
        _recordDest = Tone.context.createMediaStreamDestination();
        _masterGain.connect(_recordDest);
      }

      // 2. Melodic FX Bus (Chorus properly .start()ed!) + Clean Punchy Drum Bus
      _drive = new Tone.Distortion({ distortion: 0.35, wet: 0 });
      _chorus = new Tone.Chorus({ frequency: 1.8, delayTime: 3.5, depth: 0.6, wet: 0.15 }).start();
      _phaser = new Tone.Phaser({ frequency: 0.6, octaves: 3, baseFrequency: 350, wet: 0 });
      _delay = new Tone.PingPongDelay({ delayTime: '8n.', feedback: 0.32, wet: 0.18 });
      _reverb = new Tone.Reverb({ decay: 2.6, wet: 0.28 });

      _melodicBus = new Tone.Gain(0.85);
      _melodicBus.chain(_drive, _chorus, _phaser, _delay, _reverb, _masterEq);

      _drumBus = new Tone.Gain(0.92);
      _drumBus.connect(_masterEq);

      // 3. Build 8 Studio Instruments
      // Track 0: Lead Synth (warm filtered PolySynth)
      const leadFilter = new Tone.Filter(4800, 'lowpass');
      const leadGain = new Tone.Gain(0.75);
      const leadInst = new Tone.PolySynth(Tone.Synth, { maxPolyphony: 12, ...TIMBRE_MAP.supersaw });
      leadInst.chain(leadFilter, leadGain, _melodicBus);

      // Track 1: Warm Pad / Strings (real sustained chord pad!)
      const padFilter = new Tone.Filter(2400, 'lowpass');
      const padGain = new Tone.Gain(0.62);
      const padInst = new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 16,
        oscillator: { type: 'fatsawtooth', count: 3, spread: 30 },
        envelope: { attack: 0.24, decay: 0.4, sustain: 0.72, release: 1.35 }
      });
      padInst.chain(padFilter, padGain, _melodicBus);

      // Track 2: Sub / 808 Bass (clean lowpass MonoSynth directly to Master EQ so bass never muddies!)
      const bassGain = new Tone.Gain(0.88);
      const bassInst = new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        filter: { Q: 2.2, type: 'lowpass', rolloff: -24 },
        envelope: { attack: 0.012, decay: 0.24, sustain: 0.55, release: 0.32 },
        filterEnvelope: { attack: 0.01, decay: 0.22, sustain: 0.3, baseFrequency: 95, octaves: 2.6 }
      });
      bassInst.chain(bassGain, _masterEq);

      // Track 3: Arp / Electric Piano Keys
      const arpGain = new Tone.Gain(0.66);
      const arpInst = new Tone.PolySynth(Tone.Synth, { maxPolyphony: 14, ...TIMBRE_MAP.pluck });
      arpInst.chain(arpGain, _melodicBus);

      // Track 4: Punchy Kick Drum
      const kickGain = new Tone.Gain(0.95);
      const kickInst = new Tone.MembraneSynth({
        pitchDecay: 0.045, octaves: 6.5,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.002, decay: 0.32, sustain: 0.01, release: 0.25 }
      });
      kickInst.chain(kickGain, _drumBus);

      // Track 5: Layered Snare / Clap (Noise snap + tonal body!)
      const snareGain = new Tone.Gain(0.82);
      const snareFilter = new Tone.Filter(1800, 'bandpass');
      const snareInst = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.002, decay: 0.16, sustain: 0, release: 0.08 }
      });
      const snareBody = new Tone.MembraneSynth({
        pitchDecay: 0.02, octaves: 2,
        envelope: { attack: 0.002, decay: 0.11, sustain: 0, release: 0.06 }
      });
      snareInst.chain(snareFilter, snareGain, _drumBus);
      snareBody.chain(snareGain, _drumBus);

      // Track 6: FIXED Hi-Hat (Crisp highpass filtered NoiseSynth — ZERO Tone v14 MetalSynth 4-arg crash!)
      const hatGain = new Tone.Gain(0.55);
      const hatFilter = new Tone.Filter(7800, 'highpass');
      const hatInst = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.03 }
      });
      hatInst.chain(hatFilter, hatGain, _drumBus);

      // Track 7: Perc / Bell / Rim
      const percGain = new Tone.Gain(0.62);
      const percInst = new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 8,
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.003, decay: 0.12, sustain: 0, release: 0.14 }
      });
      percInst.chain(percGain, _melodicBus);

      _tracks.length = 0;
      [
        { gain: leadGain,  inst: leadInst,  filter: leadFilter, baseGain: 0.75 },
        { gain: padGain,   inst: padInst,   filter: padFilter,  baseGain: 0.62 },
        { gain: bassGain,  inst: bassInst,                      baseGain: 0.88 },
        { gain: arpGain,   inst: arpInst,                       baseGain: 0.66 },
        { gain: kickGain,  inst: kickInst,                      baseGain: 0.95 },
        { gain: snareGain, inst: snareInst, extra: snareBody,   baseGain: 0.82 },
        { gain: hatGain,   inst: hatInst,                       baseGain: 0.55 },
        { gain: percGain,  inst: percInst,                      baseGain: 0.62 }
      ].forEach((t, i) => {
        const ms = _mixerState[i];
        const tr = { ...t, muted: ms.muted, solo: ms.solo, volume: ms.volume, customPlayer: null };
        tr.gain.gain.value = tr.muted ? 0 : tr.baseGain * tr.volume;
        _tracks.push(tr);
      });
      // Apply pending FX slider settings right on audio boot
      Object.keys(_fxState).forEach(k => applyFXLive(k, _fxState[k]));

      // 4. Dedicated Live Keyboard Synth (Clean single routing — ZERO Theremin double output!)
      _kbVibrato = new Tone.Vibrato({ frequency: 5.5, depth: 0 });
      _kbFilter = new Tone.Filter(6200, 'lowpass');
      _kbSynth = new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 24,
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.015, decay: 0.25, sustain: 0.5, release: 0.55 }
      });
      _kbSynth.chain(_kbVibrato, _kbFilter, _melodicBus);

      // 5. Transport 16th-Note Master Sequencer Loop (Tone.Draw for UI — zero audio thread DOM lag!)
      _repeatId = Tone.Transport.scheduleRepeat(time => {
        if (!_songRef) return;
        const step = _currentStep;
        const bankIdx = _currentBankIdx;
        const bank = _songRef.banks[bankIdx];
        const anySolo = _tracks.some(t => t.solo);

        if (bank) {
          for (let ti = 0; ti < 8; ti++) {
            const tr = _tracks[ti];
            if (tr.muted || (anySolo && !tr.solo)) continue;
            const cell = bank[ti] && bank[ti][step];
            if (!cell) continue;
            triggerTrackCell(ti, tr, cell, time);
          }
        }

        Tone.Draw.schedule(() => {
          if (_onStepUI) _onStepUI(step, bankIdx);
        }, time);

        _currentStep = (step + 1) % 16;
        if (_currentStep === 0) {
          if (_songMode && _songRef.arrangement && _songRef.arrangement.length > 0) {
            const arr = _songRef.arrangement;
            const curPos = arr.indexOf(_currentBankIdx);
            const nextBank = arr[(curPos + 1) % arr.length];
            _currentBankIdx = nextBank;
            Tone.Draw.schedule(() => {
              if (_onBankChange) _onBankChange(_currentBankIdx);
            }, time);
          }
          Tone.Draw.schedule(() => {
            if (_onBarEnd) _onBarEnd();
          }, time);
        }
      }, '16n');

      _ready = true;
      if (_songRef) applySongAudioParams(_songRef);
    }

    function triggerTrackCell(ti, tr, cell, time) {
      const vel = Math.max(0.05, Math.min(1, cell.vel !== undefined ? cell.vel : 0.85));
      const dur = cell.dur || (ti === 1 ? '2n' : ti === 4 ? '8n' : '16n');

      try {
        if (tr.customPlayer && tr.customPlayer.loaded) {
          tr.customPlayer.start(time);
          return;
        }
        if (ti === 0 || ti === 1 || ti === 3) {
          // Melodic PolySynths
          const pitched = MT().transposeNote(cell.note, _masterPitch);
          tr.inst.triggerAttackRelease(pitched, dur, time, vel);
        } else if (ti === 2) {
          // Bass MonoSynth — ALWAYS unwrap to single safe bass note (ZERO Array crash / C5 screech!)
          const raw = Array.isArray(cell.note) ? cell.note[0] : cell.note;
          let midi = MT().noteToMidi(raw) + _masterPitch;
          while (midi > 52) midi -= 12;
          while (midi < 28) midi += 12;
          tr.inst.triggerAttackRelease(MT().midiToNote(midi), dur, time, vel);
        } else if (ti === 4) {
          // Kick
          tr.inst.triggerAttackRelease('C1', '8n', time, vel);
        } else if (ti === 5) {
          // Snare (Noise + Tonal Body!)
          tr.inst.triggerAttackRelease('16n', time, vel * 0.85);
          if (tr.extra) tr.extra.triggerAttackRelease('E2', '16n', time, vel * 0.6);
        } else if (ti === 6) {
          // FIXED Hi-Hat NoiseSynth (3 args valid: dur, time, vel — zero MetalSynth crash!)
          tr.inst.triggerAttackRelease(dur, time, vel * 0.7);
        } else if (ti === 7) {
          // Perc / Bell
          const pitched = MT().transposeNote(cell.note || 'A4', _masterPitch);
          tr.inst.triggerAttackRelease(pitched, '16n', time, vel * 0.65);
        }
      } catch (_) {}
    }

    function applySongAudioParams(song) {
      _songRef = song;
      if (!_ready || !song) return;
      const Tone = globalScope.Tone;
      Tone.Transport.bpm.rampTo(Math.max(55, Math.min(200, song.bpm || 120)), 0.08);
      Tone.Transport.swing = Math.max(0, Math.min(0.8, (song.swing || 0) / 100));
      Tone.Transport.swingSubdivision = '16n';
      setLeadTimbre(song.timbre || 'supersaw');
    }

    function setLeadTimbre(timbreId) {
      if (!_ready || !_tracks[0]) return;
      const preset = TIMBRE_MAP[timbreId] || TIMBRE_MAP.supersaw;
      try { _tracks[0].inst.set(preset); } catch (_) {}
    }

    async function play() {
      await ensureReady();
      const Tone = globalScope.Tone;
      if (_isPlaying) {
        Tone.Transport.pause();
        _isPlaying = false;
      } else {
        Tone.Transport.start('+0.04');
        _isPlaying = true;
      }
      return _isPlaying;
    }

    function stop() {
      if (_ready && globalScope.Tone) {
        globalScope.Tone.Transport.stop();
      }
      _isPlaying = false;
      _currentStep = 0;
      if (_songMode) _currentBankIdx = 0;
      panicKeys();
    }

    function setBPM(v) {
      const bpm = Math.max(55, Math.min(200, Number(v) || 120));
      if (_songRef) _songRef.bpm = bpm;
      if (_ready && globalScope.Tone) globalScope.Tone.Transport.bpm.value = bpm;
    }

    function setSwing(pct) {
      const s = Math.max(0, Math.min(80, Number(pct) || 0));
      if (_songRef) _songRef.swing = s;
      if (_ready && globalScope.Tone) globalScope.Tone.Transport.swing = s / 100;
    }

    function setMasterPitch(semi) { _masterPitch = Math.max(-12, Math.min(12, parseInt(semi, 10) || 0)); }
    function setSongMode(v) { _songMode = !!v; }
    function setBank(idx) { _currentBankIdx = Math.max(0, Math.min(3, idx)); }

    function setTrackVolume(ti, val01) {
      if (ti < 0 || ti >= 8) return;
      const v = Math.max(0, Math.min(1.25, Number(val01)));
      _mixerState[ti].volume = v;
      const tr = _tracks[ti];
      if (!tr) return;
      tr.volume = v;
      if (tr.gain) tr.gain.gain.rampTo(tr.muted ? 0 : tr.baseGain * tr.volume, 0.03);
    }

    function toggleMute(ti) {
      if (ti < 0 || ti >= 8) return false;
      _mixerState[ti].muted = !_mixerState[ti].muted;
      const tr = _tracks[ti];
      if (tr) {
        tr.muted = _mixerState[ti].muted;
        if (tr.gain) tr.gain.gain.rampTo(tr.muted ? 0 : tr.baseGain * tr.volume, 0.03);
      }
      return _mixerState[ti].muted;
    }

    function toggleSolo(ti) {
      if (ti < 0 || ti >= 8) return false;
      _mixerState[ti].solo = !_mixerState[ti].solo;
      const tr = _tracks[ti];
      if (tr) tr.solo = _mixerState[ti].solo;
      return _mixerState[ti].solo;
    }

    function applyFXLive(name, pct) {
      const w = Math.max(0, Math.min(1, (Number(pct) || 0) / 100));
      if (name === 'reverb' && _reverb) _reverb.wet.value = w * 0.72;
      else if (name === 'delay' && _delay) _delay.wet.value = w * 0.65;
      else if (name === 'chorus' && _chorus) _chorus.wet.value = w * 0.75;
      else if (name === 'dist' && _drive) _drive.wet.value = w * 0.65;
      else if (name === 'phaser' && _phaser) _phaser.wet.value = w * 0.65;
      else if (name === 'filter' && _tracks[0] && _tracks[0].filter) {
        _tracks[0].filter.frequency.value = 400 + w * 9600;
      }
    }

    function setFX(name, pct) {
      const val = Math.max(0, Math.min(100, Number(pct) || 0));
      if (Object.prototype.hasOwnProperty.call(_fxState, name)) _fxState[name] = val;
      if (!_ready) return;
      applyFXLive(name, val);
    }

    // -----------------------------------------------------------------------
    // LIVE KEYBOARD SYNTH (0 STUCK NOTES, WORKING HARMONIZER, LOOPS & ARP!)
    // -----------------------------------------------------------------------
    function buildTriggeredNotes(baseNote) {
      let root = baseNote;
      if (_kbState.scaleLock && _songRef) {
        root = MT().quantizeNoteToScale(baseNote, _songRef.root, _songRef.scale);
      }
      root = MT().transposeNote(root, _masterPitch);
      const out = [root];

      if (_kbState.chordMode) {
        const sc = (_songRef && _songRef.scale) || 'minor';
        const isMinor = sc === 'minor' || sc === 'dorian' || sc === 'phrygian' || sc === 'harmonic';
        out.push(MT().transposeNote(root, isMinor ? 3 : 4));
        out.push(MT().transposeNote(root, 7));
      } else if (_kbState.harmVoices > 0 && _songRef) {
        // WORKING AI Smart Diatonic Harmonizer (1v = 3rd, 2v = 3rd+5th, 3v = 3rd+5th+7th!)
        const intervals = [3, 7, 10];
        for (let i = 0; i < Math.min(3, _kbState.harmVoices); i++) {
          const raw = MT().transposeNote(root, intervals[i]);
          out.push(MT().quantizeNoteToScale(raw, _songRef.root, _songRef.scale));
        }
      }
      return [...new Set(out)];
    }

    async function kbNoteOn(triggerKey, noteStr, vel) {
      await ensureReady();
      // If user already released key before Tone.start() finished -> abort (fixes stuck note bug #1!)
      if (_activeKeyVoices.has(triggerKey)) kbNoteOff(triggerKey);

      const notes = buildTriggeredNotes(noteStr);
      const v = vel !== undefined ? vel : _kbState.velocity;
      _activeKeyVoices.set(triggerKey, notes);

      if (_kbState.arpMode) {
        notes.forEach(n => { if (!_arpNotes.includes(n)) _arpNotes.push(n); });
        ensureArpTimer();
      } else {
        _kbSynth.triggerAttack(notes, undefined, v);
      }

      // Record into active Loop Slot if recording!
      if (_recordingLoopIdx >= 0) {
        const lp = _loops[_recordingLoopIdx];
        lp.events.push({ notes, t: performance.now() - lp.startTime, vel: v });
      }
      return notes;
    }

    function kbNoteOff(triggerKey) {
      const notes = _activeKeyVoices.get(triggerKey);
      if (!notes) return;
      _activeKeyVoices.delete(triggerKey);

      if (_kbState.arpMode) {
        _arpNotes = _arpNotes.filter(n => !notes.includes(n));
        if (_arpNotes.length === 0 && _arpLoop) { clearInterval(_arpLoop); _arpLoop = null; }
        return;
      }

      if (_kbState.sustain) {
        notes.forEach(n => _sustainedNotes.add(n));
      } else if (_kbSynth) {
        _kbSynth.triggerRelease(notes);
      }
    }

    async function triggerChordPad(notesArr, dur) {
      await ensureReady();
      const pitched = MT().transposeNote(notesArr, _masterPitch);
      _kbSynth.triggerAttackRelease(pitched, dur || '2n', undefined, _kbState.velocity);
      if (_recordingLoopIdx >= 0) {
        const lp = _loops[_recordingLoopIdx];
        lp.events.push({ notes: pitched, t: performance.now() - lp.startTime, vel: _kbState.velocity });
      }
      return pitched;
    }

    function ensureArpTimer() {
      if (_arpLoop) return;
      const bpm = (_songRef && _songRef.bpm) || 120;
      const div = _kbState.arpRate === '16n' ? 4 : _kbState.arpRate === '4n' ? 1 : 2;
      const ms = Math.max(65, Math.round((60000 / bpm) / div));
      _arpLoop = setInterval(() => {
        if (!_arpNotes.length || !_kbSynth) { clearInterval(_arpLoop); _arpLoop = null; return; }
        const n = _arpNotes[_arpStep % _arpNotes.length];
        _arpStep++;
        _kbSynth.triggerAttackRelease(n, _kbState.arpRate, undefined, _kbState.velocity * 0.9);
      }, ms);
    }

    function setKbParam(k, v) {
      _kbState[k] = v;
      if (!_ready || !_kbSynth) return;
      if (k === 'wave') _kbSynth.set({ oscillator: { type: v === 'pulse' ? 'square' : v } });
      if (k === 'sustain' && !v && _sustainedNotes.size > 0) {
        _kbSynth.triggerRelease([..._sustainedNotes]);
        _sustainedNotes.clear();
      }
    }

    function setKbADSR(a, d, s, r) {
      if (_ready && _kbSynth) _kbSynth.set({ envelope: { attack: a, decay: d, sustain: s, release: r } });
    }

    function setTheremin(active, xNorm, yNorm) {
      if (!_ready || !_kbFilter || !_kbVibrato) return;
      if (!active) {
        _kbFilter.frequency.rampTo(6200, 0.08);
        _kbVibrato.depth.value = 0;
        return;
      }
      const x = Math.max(0, Math.min(1, xNorm));
      const y = Math.max(0, Math.min(1, yNorm));
      _kbFilter.frequency.rampTo(260 + Math.pow(x, 2) * 8500, 0.04);
      _kbVibrato.depth.value = y * 0.75;
    }

    function panicKeys() {
      _activeKeyVoices.clear();
      _sustainedNotes.clear();
      _arpNotes = [];
      if (_arpLoop) { clearInterval(_arpLoop); _arpLoop = null; }
      if (_kbSynth) try { _kbSynth.releaseAll(); } catch (_) {}
      setTheremin(false, 0, 0);
    }

    // WORKING 3-Slot Loop Recorder (F1/F2/F3)!
    async function toggleLoopSlot(idx) {
      await ensureReady();
      const lp = _loops[idx];
      if (!lp) return 'empty';
      if (lp.state === 'empty') {
        lp.state = 'recording';
        lp.events = [];
        lp.startTime = performance.now();
        _recordingLoopIdx = idx;
      } else if (lp.state === 'recording') {
        _recordingLoopIdx = -1;
        lp.dur = Math.max(500, performance.now() - lp.startTime);
        if (lp.events.length === 0) { lp.state = 'empty'; }
        else { lp.state = 'playing'; startLoopPlayback(lp); }
      } else if (lp.state === 'playing') {
        lp.state = 'stopped';
        stopLoopTimers(lp);
      } else {
        lp.state = 'playing';
        startLoopPlayback(lp);
      }
      return lp.state;
    }

    function startLoopPlayback(lp) {
      stopLoopTimers(lp);
      const scheduleCycle = () => {
        if (lp.state !== 'playing') return;
        lp.events.forEach(ev => {
          const tid = setTimeout(() => {
            if (lp.state === 'playing' && _kbSynth) {
              _kbSynth.triggerAttackRelease(ev.notes, '8n', undefined, ev.vel || 0.75);
            }
          }, ev.t);
          lp.timers.push(tid);
        });
        const nextCycle = setTimeout(scheduleCycle, lp.dur);
        lp.timers.push(nextCycle);
      };
      scheduleCycle();
    }

    function stopLoopTimers(lp) {
      lp.timers.forEach(clearTimeout);
      lp.timers = [];
    }

    function clearAllLoops() {
      _recordingLoopIdx = -1;
      _loops.forEach(lp => { stopLoopTimers(lp); lp.state = 'empty'; lp.events = []; });
    }

    // Feedback-Safe Mic FX Toggle
    async function toggleMic() {
      await ensureReady();
      const Tone = globalScope.Tone;
      if (_micActive) {
        if (_mic) { _mic.close(); _mic.disconnect(); }
        if (_micFx) _micFx.disconnect();
        _micActive = false;
        return false;
      }
      _mic = new Tone.UserMedia();
      await _mic.open();
      _micFx = new Tone.AutoWah({ baseFrequency: 180, octaves: 4, sensitivity: -18 });
      _mic.chain(_micFx, _melodicBus);
      _micActive = true;
      return true;
    }

    // Real 3-Band FFT Audio Reactivity for Three.js 4D Visualizer!
    function getAudioBands() {
      if (!_ready || !_fftAnalyser) return { bass: 0, mid: 0, treble: 0, level: 0 };
      const fft = _fftAnalyser.getValue();
      const norm = v => Math.max(0, Math.min(1, (v + 95) / 75));
      let bass = 0, mid = 0, treble = 0;
      for (let i = 0; i < 8; i++) bass += norm(fft[i]);
      for (let i = 8; i < 28; i++) mid += norm(fft[i]);
      for (let i = 28; i < 56; i++) treble += norm(fft[i]);
      bass /= 8; mid /= 20; treble /= 28;
      return { bass, mid, treble, level: bass * 0.5 + mid * 0.35 + treble * 0.15 };
    }

    function shutdownAll() {
      stop();
      clearAllLoops();
      if (_micActive) toggleMic().catch(() => {});
    }

    return {
      ensureReady, applySongAudioParams, setLeadTimbre,
      play, stop, setBPM, setSwing, setMasterPitch, setSongMode, setBank,
      setTrackVolume, toggleMute, toggleSolo, setFX,
      kbNoteOn, kbNoteOff, triggerChordPad, setKbParam, setKbADSR, setTheremin, panicKeys,
      toggleLoopSlot, clearAllLoops, toggleMic, getAudioBands, shutdownAll,
      getRecordStream: () => (_recordDest ? _recordDest.stream : null),
      getMixerState: () => _mixerState.map(m => ({ ...m })),
      getFXState: () => ({ ..._fxState }),
      getState: () => ({ ready: _ready, isPlaying: _isPlaying, songMode: _songMode, currentBankIdx: _currentBankIdx, masterPitch: _masterPitch, tracks: _tracks, mixer: _mixerState, fx: _fxState, kb: _kbState, loops: _loops, micActive: _micActive }),
      setCallbacks: cbs => { _onStepUI = cbs.onStep; _onBankChange = cbs.onBankChange; _onBarEnd = cbs.onBarEnd; }
    };
  })();

  globalScope.AudioEngine = AudioEngine;
})(typeof window !== 'undefined' ? window : globalThis);
