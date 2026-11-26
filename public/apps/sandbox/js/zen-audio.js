/**
 * Zen Sandscape v4.0 — Unified Non-Clipping Zen Audio & Musical Chime Engine
 * Fixes ALL legacy audio bugs:
 *  - ONE single AudioContext with DynamicsCompressorNode + Master Gain (ZERO +15dB clipping!)
 *  - Strict Mute/Volume control respected by Piano Blocks, Foley & Explosions!
 *  - 4 Curated Zen Musical Scales (Pentatonic, Japanese Hirajoshi, Celestial Lydian, Deep Minor)
 *  - Exposes MediaStreamDestination for Synced Audio + Video MP4/WebM recording!
 */
(function (globalScope) {
  'use strict';

  const SCALES = {
    pentatonic: { en: 'Zen Pentatonic',    fr: 'Pentatonique Zen', freqs: [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00] },
    hirajoshi:  { en: 'Japanese Hirajoshi',fr: 'Japonais Hirajoshi',freqs: [261.63, 293.66, 311.13, 392.00, 415.30, 523.25, 587.33, 622.25, 783.99, 830.61] },
    lydian:     { en: 'Celestial Lydian',  fr: 'Lydien Céleste',   freqs: [261.63, 293.66, 329.63, 369.99, 392.00, 440.00, 493.88, 523.25, 659.25, 739.99] },
    minor:      { en: 'Deep Ambient Minor',fr: 'Mineur Ambiant',   freqs: [220.00, 246.94, 261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 523.25, 587.33] }
  };

  const ZenAudio = (() => {
    let ctx = null, comp = null, masterGain = null, recordDest = null;
    let enabled = false;
    let volume = 0.65;
    let scaleId = 'pentatonic';
    let lastNoteMs = 0;
    let lastBoomMs = 0;
    let activeVoices = 0;

    function ensureInit() {
      if (ctx) {
        if (ctx.state === 'suspended' && enabled) ctx.resume().catch(() => {});
        return true;
      }
      const AC = globalScope.AudioContext || globalScope.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 6;
      masterGain = ctx.createGain();
      masterGain.gain.value = enabled ? volume : 0;

      comp.connect(masterGain);
      masterGain.connect(ctx.destination);
      if (ctx.createMediaStreamDestination) {
        recordDest = ctx.createMediaStreamDestination();
        masterGain.connect(recordDest);
      }
      return true;
    }

    function setEnabled(on) {
      enabled = !!on;
      if (enabled) ensureInit();
      if (masterGain && ctx) {
        masterGain.gain.setTargetAtTime(enabled ? volume : 0, ctx.currentTime, 0.04);
        if (enabled && ctx.state === 'suspended') ctx.resume().catch(() => {});
      }
      return enabled;
    }

    function setVolume(v01) {
      volume = Math.max(0, Math.min(1, Number(v01)));
      if (masterGain && ctx && enabled) {
        masterGain.gain.setTargetAtTime(volume, ctx.currentTime, 0.03);
      }
    }

    function setScale(id) {
      if (SCALES[id]) scaleId = id;
    }

    function playChime(yNorm01) {
      if (!enabled || !ensureInit()) return;
      const nowMs = performance.now();
      if (nowMs - lastNoteMs < 75 || activeVoices >= 10) return;
      lastNoteMs = nowMs;

      const freqs = (SCALES[scaleId] || SCALES.pentatonic).freqs;
      const idx = Math.max(0, Math.min(freqs.length - 1, Math.floor((1 - Math.max(0, Math.min(1, yNorm01))) * freqs.length)));
      const freq = freqs[idx];
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const harm = ctx.createOscillator();
      const env = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      harm.type = 'triangle';
      harm.frequency.setValueAtTime(freq * 2, now);

      const hGain = ctx.createGain();
      hGain.gain.value = 0.14;

      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(0.22, now + 0.012);
      env.gain.exponentialRampToValueAtTime(0.0008, now + 0.65);

      osc.connect(env);
      harm.connect(hGain);
      hGain.connect(env);
      env.connect(comp);

      activeVoices++;
      osc.start(now); harm.start(now);
      osc.stop(now + 0.68); harm.stop(now + 0.68);
      osc.onended = () => {
        activeVoices = Math.max(0, activeVoices - 1);
        try { osc.disconnect(); harm.disconnect(); hGain.disconnect(); env.disconnect(); } catch (_) {}
      };
    }

    function playBoom(strength = 18) {
      if (!enabled || !ensureInit()) return;
      const nowMs = performance.now();
      if (nowMs - lastBoomMs < 140) return;
      lastBoomMs = nowMs;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(115, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + 0.35);

      env.gain.setValueAtTime(0.001, now);
      env.gain.linearRampToValueAtTime(Math.min(0.32, strength * 0.014), now + 0.01);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.connect(env);
      env.connect(comp);
      osc.start(now);
      osc.stop(now + 0.40);
      osc.onended = () => { try { osc.disconnect(); env.disconnect(); } catch (_) {} };
    }

    function shutdown() {
      enabled = false;
      if (masterGain && ctx) {
        try { masterGain.gain.setValueAtTime(0, ctx.currentTime); } catch (_) {}
      }
      if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {});
    }

    return {
      SCALES, setEnabled, setVolume, setScale, playChime, playBoom, shutdown,
      isEnabled: () => enabled,
      getRecordStream: () => { ensureInit(); return recordDest ? recordDest.stream : null; }
    };
  })();

  globalScope.ZenAudio = ZenAudio;
})(typeof window !== 'undefined' ? window : globalThis);
