/**
 * 4D Music Composer (v4.0) — Music Theory, 30 AI Genres, 4-Section Full-Song Composer (A->B->C->D),
 * Natural-Language Music Prompt Parser, 6 Live Re-Harmonizing Emotions & 25 Upgraded Studio Presets.
 * Zero external dependencies — 100% testable in Node.js and Browser.
 */
(function (globalScope) {
  'use strict';

  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const SCALES = {
    major:      { en: 'Major (Ionian)',    fr: 'Majeur (Ionien)',      intervals: [0, 2, 4, 5, 7, 9, 11] },
    minor:      { en: 'Natural Minor',     fr: 'Mineur Naturel',       intervals: [0, 2, 3, 5, 7, 8, 10] },
    harmonic:   { en: 'Harmonic Minor',    fr: 'Mineur Harmonique',    intervals: [0, 2, 3, 5, 7, 8, 11] },
    dorian:     { en: 'Dorian (Groove)',   fr: 'Dorien (Groove)',      intervals: [0, 2, 3, 5, 7, 9, 10] },
    phrygian:   { en: 'Phrygian (Dark)',   fr: 'Phrygien (Sombre)',    intervals: [0, 1, 3, 5, 7, 8, 10] },
    lydian:     { en: 'Lydian (Dreamy)',   fr: 'Lydien (Rêveur)',      intervals: [0, 2, 4, 6, 7, 9, 11] },
    mixolydian: { en: 'Mixolydian (Rock)', fr: 'Mixolydien (Rock)',    intervals: [0, 2, 4, 5, 7, 9, 10] },
    pentatonic: { en: 'Minor Pentatonic',  fr: 'Pentatonique Mineur',  intervals: [0, 3, 5, 7, 10] },
    blues:      { en: 'Blues Scale',       fr: 'Gamme Blues',          intervals: [0, 3, 5, 6, 7, 10] },
    hijaz:      { en: 'Hijaz (Oriental)',  fr: 'Hijaz (Oriental)',     intervals: [0, 1, 4, 5, 7, 8, 10] }
  };

  // =========================================================================
  // 1. DETERMINISTIC PRNG & NOTE/CHORD THEORY MATH
  // =========================================================================

  function hash32(str) {
    let h = 2166136261 >>> 0;
    const s = String(str || '');
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }

  function createRng(seed) {
    let a = (typeof seed === 'number' ? seed : hash32(seed)) >>> 0;
    if (!a) a = 0x9e3779b9;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function noteToMidi(noteStr) {
    if (typeof noteStr === 'number') return Math.max(0, Math.min(127, Math.round(noteStr)));
    const m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(String(noteStr || 'C4').trim());
    if (!m) return 60;
    const baseMap = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    let semi = baseMap[m[1].toUpperCase()];
    if (m[2] === '#') semi += 1;
    else if (m[2] === 'b') semi -= 1;
    const oct = parseInt(m[3], 10);
    return Math.max(0, Math.min(127, (oct + 1) * 12 + semi));
  }

  function midiToNote(midi) {
    const m = Math.max(0, Math.min(127, Math.round(midi)));
    return NOTE_NAMES[m % 12] + (Math.floor(m / 12) - 1);
  }

  function transposeNote(noteOrArr, semitones) {
    if (!semitones) return Array.isArray(noteOrArr) ? noteOrArr.slice() : noteOrArr;
    if (Array.isArray(noteOrArr)) return noteOrArr.map(n => midiToNote(noteToMidi(n) + semitones));
    return midiToNote(noteToMidi(noteOrArr) + semitones);
  }

  function getScaleMidis(rootName, scaleId, octaveStart, count) {
    const rootPc = Math.max(0, NOTE_NAMES.indexOf(String(rootName || 'C').toUpperCase()));
    const ivs = (SCALES[scaleId] || SCALES.minor).intervals;
    const out = [];
    const base = (octaveStart + 1) * 12 + rootPc;
    const total = count || 14;
    for (let i = 0; i < total; i++) {
      const octShift = Math.floor(i / ivs.length) * 12;
      out.push(base + octShift + ivs[i % ivs.length]);
    }
    return out;
  }

  function quantizeNoteToScale(noteStr, rootName, scaleId) {
    if (!scaleId || scaleId === 'chromatic') return noteStr;
    const midi = noteToMidi(noteStr);
    const rootPc = Math.max(0, NOTE_NAMES.indexOf(String(rootName || 'C').toUpperCase()));
    const ivs = (SCALES[scaleId] || SCALES.minor).intervals;
    const pc = ((midi - rootPc) % 12 + 12) % 12;
    let bestDiff = 99;
    for (let i = 0; i < ivs.length; i++) {
      let diff = ivs[i] - pc;
      if (diff > 6) diff -= 12;
      if (diff < -6) diff += 12;
      if (Math.abs(diff) < Math.abs(bestDiff)) bestDiff = diff;
    }
    return midiToNote(midi + bestDiff);
  }

  // Build real diatonic triad or 7th chord on degree (0..6) in given key & scale!
  function buildDiatonicChord(rootName, scaleId, degree, octave, addSeventh) {
    const ivs = (SCALES[scaleId] || SCALES.minor).intervals;
    const len = ivs.length;
    const rootPc = Math.max(0, NOTE_NAMES.indexOf(String(rootName || 'C').toUpperCase()));
    const base = (octave + 1) * 12 + rootPc;
    const degAt = d => {
      const wrapped = ((d % len) + len) % len;
      const oct = Math.floor(d / len) * 12;
      return base + oct + ivs[wrapped];
    };
    const notes = [degAt(degree), degAt(degree + 2), degAt(degree + 4)];
    if (addSeventh && len >= 6) notes.push(degAt(degree + 6));
    return notes.map(midiToNote);
  }

  function getScaleDegreeNote(rootName, scaleId, degree, octave) {
    const ivs = (SCALES[scaleId] || SCALES.minor).intervals;
    const len = ivs.length;
    const rootPc = Math.max(0, NOTE_NAMES.indexOf(String(rootName || 'C').toUpperCase()));
    const wrapped = ((degree % len) + len) % len;
    const oct = Math.floor(degree / len) * 12;
    return midiToNote((octave + 1) * 12 + rootPc + oct + ivs[wrapped]);
  }

  // =========================================================================
  // 2. 8-TRACK STUDIO ARCHITECTURE
  // =========================================================================

  const TRACKS_META = [
    { id: 'lead',  idx: 0, type: 'melodic', color: '#22d3ee', icon: '🎹', defaultNote: 'C5', en: 'Lead Synth',   fr: 'Synthé Lead' },
    { id: 'pad',   idx: 1, type: 'chord',   color: '#a855f7', icon: '🌌', defaultNote: 'C4', en: 'Warm Pad',     fr: 'Nappe Pad' },
    { id: 'bass',  idx: 2, type: 'bass',    color: '#f59e0b', icon: '🎸', defaultNote: 'C2', en: 'Bass / 808',   fr: 'Basse / 808' },
    { id: 'arp',   idx: 3, type: 'melodic', color: '#ec4899', icon: '✨', defaultNote: 'G4', en: 'Arp / Keys',   fr: 'Arpège / Piano' },
    { id: 'kick',  idx: 4, type: 'drum',    color: '#ef4444', icon: '🥁', defaultNote: 'C1', en: 'Kick Drum',    fr: 'Grosse Caisse' },
    { id: 'snare', idx: 5, type: 'drum',    color: '#f97316', icon: '💥', defaultNote: 'D1', en: 'Snare / Clap', fr: 'Caisse Claire' },
    { id: 'hihat', idx: 6, type: 'drum',    color: '#10b981', icon: '🎩', defaultNote: 'F#1',en: 'Hi-Hat',       fr: 'Charleston' },
    { id: 'perc',  idx: 7, type: 'drum',    color: '#38bdf8', icon: '🔔', defaultNote: 'A1', en: 'Perc / Bell',  fr: 'Percu / Cloche' }
  ];

  // =========================================================================
  // 3. 30 FULL AI MUSICAL GENRES (6× MORE THAN LEGACY 5 GENRES!)
  // =========================================================================

  const AI_GENRES = [
    // --- ELECTRONIC & CLUB (8) ---
    { id: 'house',     cat: 'electronic', en: 'Deep House',          fr: 'Deep House',           bpm: 122, swing: 14, root: 'A', scale: 'dorian',     prog: [0, 3, 5, 4], seventh: true,  groove: 'four',      timbre: 'piano',    theme: 'vaporwave', model: 'twins' },
    { id: 'techno',    cat: 'electronic', en: 'Melodic Techno',      fr: 'Techno Mélodique',     bpm: 132, swing: 4,  root: 'F', scale: 'minor',      prog: [0, 5, 3, 4], seventh: false, groove: 'four',      timbre: 'supersaw', theme: 'cyberpunk', model: 'sentinel' },
    { id: 'trance',    cat: 'electronic', en: 'Uplifting Trance',    fr: 'Trance Épique',        bpm: 138, swing: 0,  root: 'D', scale: 'minor',      prog: [0, 5, 2, 6], seventh: false, groove: 'trance',    timbre: 'supersaw', theme: 'ocean',     model: 'seraphim' },
    { id: 'synthwave', cat: 'electronic', en: 'Synthwave / Outrun',  fr: 'Synthwave / 80s',      bpm: 108, swing: 6,  root: 'C', scale: 'minor',      prog: [0, 5, 3, 4], seventh: false, groove: 'synthwave', timbre: 'supersaw', theme: 'synthwave', model: 'tesseract' },
    { id: 'cyberpunk', cat: 'electronic', en: 'Cyberpunk Industrial',fr: 'Cyberpunk Industriel', bpm: 118, swing: 0,  root: 'E', scale: 'phrygian',   prog: [0, 1, 0, 6], seventh: false, groove: 'industrial',timbre: 'square',   theme: 'matrix',    model: 'arachnoid' },
    { id: 'drum_bass', cat: 'electronic', en: 'Liquid Drum & Bass',  fr: 'Drum & Bass Liquide',  bpm: 172, swing: 5,  root: 'F', scale: 'minor',      prog: [0, 3, 5, 4], seventh: true,  groove: 'dnb',       timbre: 'pluck',    theme: 'cyberpunk', model: 'parasite' },
    { id: 'dubstep',   cat: 'electronic', en: 'Melodic Dubstep',     fr: 'Dubstep Mélodique',    bpm: 140, swing: 0,  root: 'G', scale: 'minor',      prog: [0, 5, 2, 4], seventh: false, groove: 'halftime',  timbre: 'supersaw', theme: 'fire',      model: 'golem' },
    { id: 'hardstyle', cat: 'electronic', en: 'Hardstyle / Rave',    fr: 'Hardstyle / Rave',     bpm: 150, swing: 0,  root: 'C', scale: 'minor',      prog: [0, 5, 2, 6], seventh: false, groove: 'four',      timbre: 'supersaw', theme: 'fire',      model: 'cathedral' },

    // --- HIP-HOP, URBAN & GROOVE (6) ---
    { id: 'trap',      cat: 'urban',      en: 'Trap 808 Banger',     fr: 'Trap 808 Puissant',    bpm: 140, swing: 8,  root: 'C', scale: 'harmonic',   prog: [0, 5, 0, 4], seventh: false, groove: 'trap',      timbre: 'bell',     theme: 'fire',      model: 'seraphim' },
    { id: 'drill',     cat: 'urban',      en: 'UK Drill',            fr: 'UK Drill Sombre',      bpm: 142, swing: 12, root: 'D', scale: 'phrygian',   prog: [0, 1, 5, 4], seventh: false, groove: 'drill',     timbre: 'piano',    theme: 'matrix',    model: 'parasite' },
    { id: 'lofi',      cat: 'urban',      en: 'Lo-Fi Chillhop',      fr: 'Lo-Fi Chillhop',       bpm: 84,  swing: 34, root: 'F', scale: 'major',      prog: [1, 4, 0, 5], seventh: true,  groove: 'lofi',      timbre: 'piano',    theme: 'gold',      model: 'lotus' },
    { id: 'boombap',   cat: 'urban',      en: 'Boom-Bap Classic',    fr: 'Boom-Bap Hip-Hop',     bpm: 92,  swing: 26, root: 'A', scale: 'dorian',     prog: [0, 3, 1, 4], seventh: true,  groove: 'boombap',   timbre: 'piano',    theme: 'gold',      model: 'cube' },
    { id: 'afrobeat',  cat: 'urban',      en: 'Afrobeat Dance',      fr: 'Afrobeat Solaire',     bpm: 108, swing: 22, root: 'G', scale: 'major',      prog: [0, 4, 5, 3], seventh: false, groove: 'afro',      timbre: 'pluck',    theme: 'gold',      model: 'twins' },
    { id: 'funk',      cat: 'urban',      en: 'Funk / Nu-Disco',     fr: 'Funk / Nu-Disco',      bpm: 116, swing: 18, root: 'E', scale: 'dorian',     prog: [0, 3, 0, 4], seventh: true,  groove: 'funk',      timbre: 'pluck',    theme: 'vaporwave', model: 'cathedral' },

    // --- WORLD, LATIN & DANCE (6) ---
    { id: 'tango',     cat: 'world',      en: 'Argentine Tango',     fr: 'Tango Argentin',       bpm: 120, swing: 10, root: 'D', scale: 'harmonic',   prog: [0, 3, 4, 0], seventh: false, groove: 'tango',     timbre: 'piano',    theme: 'fire',      model: 'seraphim' },
    { id: 'bossanova', cat: 'world',      en: 'Bossa Nova Rio',      fr: 'Bossa Nova Rio',       bpm: 126, swing: 16, root: 'C', scale: 'major',      prog: [0, 5, 1, 4], seventh: true,  groove: 'bossa',     timbre: 'pluck',    theme: 'ocean',     model: 'lotus' },
    { id: 'reggae',    cat: 'world',      en: 'Reggae / Dub',        fr: 'Reggae / Dub',         bpm: 88,  swing: 24, root: 'A', scale: 'minor',      prog: [0, 3, 4, 0], seventh: false, groove: 'reggae',    timbre: 'pluck',    theme: 'matrix',    model: 'jellyfish' },
    { id: 'oriental',  cat: 'world',      en: 'Oriental Maqam',      fr: 'Oriental Maqam Hijaz', bpm: 104, swing: 12, root: 'D', scale: 'hijaz',      prog: [0, 1, 6, 0], seventh: false, groove: 'oriental',  timbre: 'pluck',    theme: 'gold',      model: 'lotus' },
    { id: 'reggaeton', cat: 'world',      en: 'Reggaeton / Latin',   fr: 'Reggaeton / Latino',   bpm: 96,  swing: 10, root: 'B', scale: 'minor',      prog: [0, 5, 2, 6], seventh: false, groove: 'reggaeton', timbre: 'pluck',    theme: 'synthwave', model: 'twins' },
    { id: 'celtic',    cat: 'world',      en: 'Celtic Highlands',    fr: 'Celtique & Folk',      bpm: 114, swing: 14, root: 'D', scale: 'mixolydian', prog: [0, 6, 3, 0], seventh: false, groove: 'folk',      timbre: 'flute',    theme: 'ocean',     model: 'lotus' },

    // --- ACOUSTIC, JAZZ & CLASSICAL (5) ---
    { id: 'jazz',      cat: 'acoustic',   en: 'Cool Jazz (ii-V-I)',  fr: 'Cool Jazz (ii-V-I)',   bpm: 114, swing: 45, root: 'C', scale: 'dorian',     prog: [1, 4, 0, 5], seventh: true,  groove: 'jazz',      timbre: 'piano',    theme: 'ocean',     model: 'lotus' },
    { id: 'blues',     cat: 'acoustic',   en: '12-Bar Soul Blues',   fr: 'Blues Soul 12 Mesures',bpm: 94,  swing: 48, root: 'A', scale: 'blues',      prog: [0, 3, 0, 4], seventh: true,  groove: 'blues',     timbre: 'piano',    theme: 'gold',      model: 'seraphim' },
    { id: 'rock',      cat: 'acoustic',   en: 'Stadium Anthem Rock', fr: 'Rock de Stade',        bpm: 124, swing: 4,  root: 'E', scale: 'minor',      prog: [0, 5, 2, 6], seventh: false, groove: 'rock',      timbre: 'supersaw', theme: 'fire',      model: 'golem' },
    { id: 'waltz',     cat: 'acoustic',   en: 'Viennese Waltz',      fr: 'Valse Viennoise',      bpm: 132, swing: 0,  root: 'G', scale: 'major',      prog: [0, 3, 4, 0], seventh: false, groove: 'waltz',     timbre: 'piano',    theme: 'ocean',     model: 'lotus' },
    { id: 'classical', cat: 'acoustic',   en: 'Neo-Classical Piano', fr: 'Piano Néo-Classique',  bpm: 96,  swing: 0,  root: 'A', scale: 'minor',      prog: [0, 5, 2, 6], seventh: false, groove: 'ambient',   timbre: 'piano',    theme: 'gold',      model: 'seraphim' },

    // --- CINEMATIC, AMBIENT & RETRO (5) ---
    { id: 'cinematic', cat: 'cinematic',  en: 'Epic Orchestral',     fr: 'Orchestral Épique',    bpm: 92,  swing: 0,  root: 'D', scale: 'minor',      prog: [0, 5, 2, 6], seventh: false, groove: 'cinematic', timbre: 'supersaw', theme: 'fire',      model: 'cathedral' },
    { id: 'ambient',   cat: 'cinematic',  en: 'Ambient Deep Space',  fr: 'Ambient Espace Profond',bpm: 74, swing: 0,  root: 'C', scale: 'lydian',     prog: [0, 4, 5, 3], seventh: true,  groove: 'ambient',   timbre: 'bell',     theme: 'ocean',     model: 'jellyfish' },
    { id: 'chillout',  cat: 'cinematic',  en: 'Ibiza Sunset Chill',  fr: 'Ibiza Chillout',       bpm: 102, swing: 12, root: 'F', scale: 'lydian',     prog: [0, 3, 4, 5], seventh: true,  groove: 'chill',     timbre: 'pluck',    theme: 'ocean',     model: 'jellyfish' },
    { id: 'synthpop',  cat: 'cinematic',  en: '80s Neon Synthpop',   fr: 'Synthpop Années 80',   bpm: 118, swing: 4,  root: 'C', scale: 'major',      prog: [0, 4, 5, 3], seventh: false, groove: 'synthwave', timbre: 'supersaw', theme: 'vaporwave', model: 'twins' },
    { id: 'chiptune',  cat: 'cinematic',  en: '8-Bit Chiptune Hero', fr: 'Chiptune 8-Bit Rétro', bpm: 146, swing: 0,  root: 'C', scale: 'major',      prog: [0, 4, 5, 3], seventh: false, groove: 'four',      timbre: 'square',   theme: 'cyberpunk', model: 'tesseract' }
  ];

  const EMOTIONS = [
    { id: 'happy',  icon: '☀️', en: 'Euphoric', fr: 'Joyeux',     scale: 'major',    bpmDelta: +8,  reverb: 32, delay: 20, theme: 'gold' },
    { id: 'sad',    icon: '🌧️', en: 'Emotional',fr: 'Mélancolique',scale: 'minor',   bpmDelta: -14, reverb: 62, delay: 32, theme: 'ocean' },
    { id: 'tense',  icon: '⚡', en: 'Epic/Dark',fr: 'Épique/Sombre',scale: 'harmonic',bpmDelta: +4,  reverb: 48, delay: 25, theme: 'fire' },
    { id: 'dreamy', icon: '🌙', en: 'Dreamy',   fr: 'Rêveur',     scale: 'lydian',   bpmDelta: -10, reverb: 72, delay: 45, theme: 'vaporwave' },
    { id: 'rage',   icon: '🔥', en: 'Aggressive',fr: 'Énergie Max',scale: 'phrygian', bpmDelta: +18, reverb: 22, delay: 14, theme: 'matrix' },
    { id: 'zen',    icon: '🪷', en: 'Zen Peace',fr: 'Sérénité Zen',scale: 'pentatonic',bpmDelta: -18,reverb: 78, delay: 40, theme: 'ocean' }
  ];

  // =========================================================================
  // 4. AUTHENTIC GENRE DRUM GROOVE LIBRARY (REAL VELOCITIES & GHOST NOTES!)
  // =========================================================================

  function getDrumGroove(grooveId, sectionIdx) {
    // Returns { kick, snare, hihat, perc } arrays of 16 velocities (0..1)
    const empty = () => new Array(16).fill(0);
    const patterns = {
      four: {
        kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
        snare: [0,0,0,0, 0.9,0,0,0, 0,0,0,0, 0.95,0,0,0],
        hihat: [0.3,0.2,0.85,0.25, 0.3,0.2,0.85,0.3, 0.3,0.2,0.85,0.25, 0.3,0.25,0.9,0.4],
        perc:  [0,0,0,0.45, 0,0,0.4,0, 0,0,0,0.5, 0,0,0.45,0]
      },
      trance: {
        kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
        snare: [0,0,0,0, 0.85,0,0,0, 0,0,0,0, 0.9,0,0.35,0],
        hihat: [0.4,0.3,0.9,0.35, 0.4,0.3,0.9,0.35, 0.4,0.3,0.9,0.35, 0.4,0.3,0.95,0.5],
        perc:  [0.7,0,0,0, 0,0,0.5,0, 0.7,0,0,0, 0,0,0.6,0]
      },
      synthwave: {
        kick:  [1,0,0,0, 0,0,0.4,0, 1,0,0.6,0, 0,0,0,0],
        snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0.3],
        hihat: [0.7,0,0.45,0, 0.7,0,0.45,0, 0.7,0,0.45,0, 0.7,0,0.55,0.35],
        perc:  [0,0,0,0, 0,0,0,0.4, 0,0,0,0, 0,0,0.5,0.65]
      },
      industrial: {
        kick:  [1,0,0,0.7, 1,0,0,0, 1,0,0.6,0, 1,0,0.8,0],
        snare: [0,0,0,0, 1,0,0,0.4, 0,0,0,0, 1,0,0,0.5],
        hihat: [0.7,0.4,0.7,0.4, 0.7,0.4,0.7,0.4, 0.7,0.4,0.7,0.4, 0.8,0.5,0.9,0.6],
        perc:  [0.8,0,0.5,0, 0,0.6,0,0, 0.8,0,0,0.5, 0,0,0.7,0]
      },
      dnb: {
        kick:  [1,0,0,0, 0,0,0,0, 0,0,0.95,0, 0,0,0,0],
        snare: [0,0,0,0, 1,0,0,0.35, 0,0.3,0,0, 1,0,0,0.35],
        hihat: [0.8,0.35,0.7,0.35, 0.8,0.35,0.7,0.4, 0.8,0.35,0.7,0.35, 0.85,0.4,0.8,0.5],
        perc:  [0,0,0.5,0, 0,0,0,0, 0,0,0,0.5, 0,0,0.6,0]
      },
      halftime: {
        kick:  [1,0,0,0, 0,0,0,0, 0,0,0.85,0, 0,0,0,0.5],
        snare: [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0.3,0],
        hihat: [0.7,0,0.5,0, 0.7,0,0.5,0.3, 0.7,0,0.5,0, 0.7,0.4,0.7,0.5],
        perc:  [0.6,0,0,0, 0,0,0.45,0, 0,0,0,0, 0,0,0.5,0]
      },
      trap: {
        kick:  [1,0,0,0, 0,0,0.75,0, 0,0,0.9,0, 0,0,0,0],
        snare: [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0.3],
        hihat: [0.8,0.4,0.7,0.4, 0.8,0.9,0.5,0.4, 0.8,0.4,0.7,0.9, 0.85,0.6,0.9,0.5],
        perc:  [0,0,0,0.5, 0,0,0,0, 0,0,0,0.55, 0,0.45,0,0]
      },
      drill: {
        kick:  [1,0,0,0, 0,0,0,0, 0,0,0.9,0, 0,0.75,0,0],
        snare: [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0.85,0],
        hihat: [0.8,0,0,0.7, 0,0,0.8,0, 0.7,0,0,0.85, 0,0.5,0.75,0.4],
        perc:  [0,0,0.5,0, 0,0,0,0.5, 0,0,0,0, 0.5,0,0,0]
      },
      lofi: {
        kick:  [0.9,0,0,0, 0,0,0,0.5, 0,0,0.8,0, 0,0,0,0],
        snare: [0,0,0,0, 0.8,0,0,0, 0,0,0,0, 0.85,0,0,0.25],
        hihat: [0.55,0,0.35,0, 0.55,0,0.35,0.25, 0.55,0,0.35,0, 0.55,0,0.4,0.25],
        perc:  [0,0,0,0.35, 0,0,0,0, 0,0,0,0.35, 0,0,0,0]
      },
      boombap: {
        kick:  [1,0,0,0, 0,0,0,0.65, 0,0,0.95,0, 0,0,0,0],
        snare: [0,0,0,0, 0.95,0,0,0, 0,0,0,0, 0.95,0,0,0.35],
        hihat: [0.7,0,0.5,0, 0.7,0,0.5,0.3, 0.7,0,0.5,0, 0.7,0,0.55,0.35],
        perc:  [0,0,0,0, 0,0,0.4,0, 0,0,0,0, 0,0,0.45,0]
      },
      afro: {
        kick:  [1,0,0,0.7, 0,0,0.85,0, 1,0,0,0, 0.8,0,0,0],
        snare: [0,0,0,0, 0,0,0.75,0, 0,0,0,0, 0,0,0.8,0],
        hihat: [0.6,0.3,0.6,0.3, 0.6,0.3,0.6,0.3, 0.6,0.3,0.6,0.3, 0.6,0.3,0.6,0.3],
        perc:  [0.7,0,0,0.7, 0,0,0.7,0, 0,0,0.7,0, 0.7,0,0,0]
      },
      funk: {
        kick:  [1,0,0,0, 0,0,0.65,0, 0,0,0.9,0, 0,0,0.5,0],
        snare: [0,0,0,0, 0.95,0,0,0.3, 0,0.3,0,0, 0.95,0,0,0.3],
        hihat: [0.8,0.4,0.7,0.4, 0.8,0.4,0.7,0.4, 0.8,0.4,0.7,0.4, 0.8,0.4,0.8,0.5],
        perc:  [0,0,0.55,0, 0,0,0,0.5, 0,0,0.55,0, 0,0,0.5,0]
      },
      tango: {
        kick:  [1,0,0,0, 0.85,0,0,0, 0.95,0,0,0, 0.9,0,0.7,0],
        snare: [0,0,0,0.7, 0,0,0.6,0, 0,0,0,0, 0.85,0,0,0.6],
        hihat: [0.5,0,0,0.4, 0.5,0,0,0, 0.5,0,0,0.4, 0.5,0,0.5,0],
        perc:  [0.7,0,0,0.6, 0,0,0.6,0, 0.7,0,0,0, 0.8,0,0,0]
      },
      bossa: {
        kick:  [0.9,0,0,0.55, 0.85,0,0,0.55, 0.9,0,0,0.55, 0.85,0,0,0.55],
        snare: [0.6,0,0,0.6, 0,0,0.6,0, 0,0,0.6,0, 0,0.6,0,0],
        hihat: [0.45,0.25,0.45,0.25, 0.45,0.25,0.45,0.25, 0.45,0.25,0.45,0.25, 0.45,0.25,0.45,0.25],
        perc:  [0.6,0,0,0.6, 0,0,0.6,0, 0,0,0.6,0, 0.6,0,0,0]
      },
      reggae: {
        kick:  [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
        snare: [0,0,0,0, 0,0,0,0, 0.85,0,0,0, 0,0,0.35,0],
        hihat: [0.4,0,0.75,0, 0.4,0,0.75,0, 0.4,0,0.75,0, 0.4,0,0.75,0.3],
        perc:  [0,0,0.65,0, 0,0,0.65,0, 0,0,0.65,0, 0,0,0.65,0]
      },
      oriental: {
        kick:  [1,0,0,0, 0,0,0.85,0, 0,0,0.8,0, 0,0,0,0],
        snare: [0,0,0,0.7, 0,0,0,0, 0.85,0,0,0.6, 0.7,0,0.4,0],
        hihat: [0.5,0.3,0.5,0.3, 0.5,0.3,0.5,0.3, 0.5,0.3,0.5,0.3, 0.5,0.3,0.5,0.3],
        perc:  [0.8,0,0,0.7, 0,0,0.75,0, 0.8,0,0,0, 0.7,0,0.5,0]
      },
      reggaeton: {
        kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
        snare: [0,0,0,0.85, 0,0,0.9,0, 0,0,0,0.85, 0,0,0.9,0],
        hihat: [0.5,0,0.4,0, 0.5,0,0.4,0, 0.5,0,0.4,0, 0.5,0,0.4,0],
        perc:  [0,0,0,0.6, 0,0,0.65,0, 0,0,0,0.6, 0,0,0.65,0]
      },
      folk: {
        kick:  [0.9,0,0,0, 0,0,0.6,0, 0.85,0,0,0, 0,0,0.5,0],
        snare: [0,0,0,0, 0.75,0,0,0, 0,0,0,0, 0.8,0,0,0],
        hihat: [0.5,0,0.4,0.3, 0.5,0,0.4,0.3, 0.5,0,0.4,0.3, 0.5,0,0.4,0.3],
        perc:  [0.7,0,0,0.5, 0,0,0.6,0, 0.7,0,0,0.5, 0,0,0.6,0]
      },
      jazz: {
        kick:  [0.65,0,0,0, 0,0,0,0, 0,0,0.5,0, 0,0,0,0.45],
        snare: [0,0,0,0, 0.4,0,0,0.3, 0,0,0,0, 0.45,0,0,0.25],
        hihat: [0.75,0,0,0, 0.75,0,0.55,0, 0.75,0,0,0, 0.75,0,0.6,0],
        perc:  [0.6,0,0,0, 0.5,0,0.5,0, 0.6,0,0,0, 0.5,0,0.5,0]
      },
      blues: {
        kick:  [0.9,0,0,0, 0,0,0.5,0, 0.85,0,0,0, 0,0,0.45,0],
        snare: [0,0,0,0, 0.85,0,0,0, 0,0,0,0, 0.9,0,0,0.3],
        hihat: [0.65,0,0.5,0, 0.65,0,0.5,0, 0.65,0,0.5,0, 0.65,0,0.5,0],
        perc:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0.5,0,0.5,0]
      },
      rock: {
        kick:  [1,0,0,0, 0,0,0.7,0, 1,0,0.75,0, 0,0,0,0],
        snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0.4],
        hihat: [0.75,0,0.65,0, 0.75,0,0.65,0, 0.75,0,0.65,0, 0.75,0,0.65,0],
        perc:  [0.8,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
      },
      waltz: {
        kick:  [0.9,0,0,0, 0,0,0,0, 0.75,0,0,0, 0,0,0,0],
        snare: [0,0,0,0, 0.45,0,0,0, 0,0,0,0, 0.45,0,0,0],
        hihat: [0.5,0,0,0, 0.4,0,0,0, 0.5,0,0,0, 0.4,0,0,0],
        perc:  [0.65,0,0,0, 0,0,0,0, 0.55,0,0,0, 0,0,0,0]
      },
      cinematic: {
        kick:  [1,0,0,0, 0,0,0.7,0, 0.9,0,0,0, 0.75,0,0.85,0],
        snare: [0,0,0,0, 0,0,0,0, 0.8,0,0,0, 0,0,0.6,0.7],
        hihat: [0.35,0,0.3,0, 0.35,0,0.3,0, 0.35,0,0.3,0, 0.35,0,0.4,0.4],
        perc:  [0.9,0,0,0, 0,0,0,0, 0.75,0,0,0, 0.85,0,0,0]
      },
      chill: {
        kick:  [0.85,0,0,0, 0,0,0,0, 0.8,0,0,0, 0,0,0,0],
        snare: [0,0,0,0, 0.65,0,0,0, 0,0,0,0, 0.7,0,0,0],
        hihat: [0.4,0,0.3,0.2, 0.4,0,0.3,0.2, 0.4,0,0.3,0.2, 0.4,0,0.3,0.2],
        perc:  [0,0,0.45,0, 0,0,0,0, 0,0,0.45,0, 0,0,0,0.4]
      },
      ambient: {
        kick:  [0.5,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
        snare: empty(),
        hihat: [0.25,0,0,0, 0.2,0,0,0, 0.25,0,0,0, 0.2,0,0,0],
        perc:  [0.55,0,0,0, 0,0,0,0, 0,0,0.45,0, 0,0,0,0]
      }
    };

    const g = patterns[grooveId] || patterns.four;
    const out = {
      kick: g.kick.slice(),
      snare: g.snare.slice(),
      hihat: g.hihat.slice(),
      perc: g.perc.slice()
    };

    // Section Dynamics (A: Intro light, B: Groove, C: Peak Drop + Fill, D: Bridge/Resolution!)
    if (sectionIdx === 0) {
      // Intro: strip snare & half kicks so the track builds tension!
      out.snare = empty();
      out.kick = out.kick.map((v, i) => (i % 8 === 0 ? v * 0.7 : 0));
      out.hihat = out.hihat.map(v => v * 0.65);
    } else if (sectionIdx === 2) {
      // Chorus/Drop: full energy + exciting end-of-bar drum fill on steps 13-15!
      out.snare[13] = Math.max(out.snare[13], 0.55);
      out.snare[14] = Math.max(out.snare[14], 0.75);
      out.snare[15] = Math.max(out.snare[15], 0.92);
      out.perc[0] = Math.max(out.perc[0], 0.85);
    } else if (sectionIdx === 3) {
      // Bridge/Outro: atmospheric release
      out.kick = out.kick.map((v, i) => (i < 12 ? v * 0.8 : 0));
      out.hihat = out.hihat.map(v => v * 0.75);
    }
    return out;
  }

  // =========================================================================
  // 5. FULL 4-SECTION ALGORITHMIC SONG COMPOSER (DEEP-CLONED BANKS A/B/C/D!)
  // =========================================================================

  function createEmptyBank() {
    return Array.from({ length: 8 }, () => new Array(16).fill(null));
  }

  function cloneBank(bank) {
    return bank.map(row => row.map(cell => {
      if (!cell) return null;
      return {
        note: Array.isArray(cell.note) ? cell.note.slice() : cell.note,
        vel: cell.vel !== undefined ? cell.vel : 0.85,
        dur: cell.dur || '16n'
      };
    }));
  }

  function getGenreMeta(id) {
    return AI_GENRES.find(g => g.id === id) || AI_GENRES[0];
  }

  function composeFullSong(genreId, opts) {
    const g = getGenreMeta(genreId);
    const seed = (opts && opts.seed) || Math.floor(Math.random() * 1e9);
    const rng = createRng(seed);
    const root = (opts && opts.root) || g.root;
    const scale = (opts && opts.scale) || g.scale;
    const bpm = (opts && opts.bpm) || g.bpm;
    const prog = g.prog; // 4 chords across the 4 sections OR 2 chords per bar!

    // Compose a memorable core 8-step melodic motif so the song feels unified & musical!
    const motifDegrees = [];
    let curDeg = Math.floor(rng() * 5);
    for (let i = 0; i < 8; i++) {
      if (i === 0 || rng() < 0.68) {
        const step = rng() < 0.55 ? (rng() < 0.5 ? 1 : -1) : (rng() < 0.5 ? 2 : -2);
        curDeg = Math.max(0, Math.min(9, curDeg + step));
        motifDegrees.push(curDeg);
      } else {
        motifDegrees.push(null); // musical rest!
      }
    }

    const banks = [];
    for (let sec = 0; sec < 4; sec++) {
      const bank = createEmptyBank();
      const degA = prog[sec % prog.length];
      const degB = prog[(sec + 1) % prog.length];
      const chordA = buildDiatonicChord(root, scale, degA, 3, g.seventh);
      const chordB = buildDiatonicChord(root, scale, degB, 3, g.seventh);

      // 1. PAD / STRINGS (Track 1): Warm sustained real chords (half-bar '2n' durations!)
      bank[1][0] = { note: chordA, vel: sec === 2 ? 0.82 : 0.68, dur: '2n' };
      bank[1][8] = { note: chordB, vel: sec === 2 ? 0.85 : 0.70, dur: '2n' };

      // 2. BASS / 808 (Track 2): Deep root/fifth bassline clamped safely to E1-D3 (MIDI 28..50)!
      const clampBass = n => {
        let m = noteToMidi(n);
        while (m > 50) m -= 12;
        while (m < 28) m += 12;
        return midiToNote(m);
      };
      const bassRootA = clampBass(getScaleDegreeNote(root, scale, degA, 2));
      const bassFifthA = clampBass(getScaleDegreeNote(root, scale, degA + 4, 2));
      const bassRootB = clampBass(getScaleDegreeNote(root, scale, degB, 2));
      const bassOctB = clampBass(getScaleDegreeNote(root, scale, degB, 1));

      if (sec >= 1 || g.cat === 'electronic') {
        if (g.groove === 'synthwave' || g.groove === 'rock' || g.groove === 'industrial') {
          for (let s = 0; s < 16; s += 2) {
            const n = s < 8 ? (s === 6 ? bassFifthA : bassRootA) : (s === 14 ? bassOctB : bassRootB);
            bank[2][s] = { note: n, vel: s % 4 === 0 ? 0.95 : 0.72, dur: '8n' };
          }
        } else if (g.groove === 'trap' || g.groove === 'drill' || g.groove === 'halftime') {
          bank[2][0] = { note: bassRootA, vel: 1.0, dur: '4n' };
          bank[2][6] = { note: bassFifthA, vel: 0.85, dur: '8n' };
          bank[2][10] = { note: bassRootB, vel: 0.95, dur: '4n' };
        } else {
          bank[2][0] = { note: bassRootA, vel: 0.92, dur: '4n' };
          bank[2][3] = { note: bassRootA, vel: 0.65, dur: '16n' };
          bank[2][6] = { note: bassFifthA, vel: 0.78, dur: '8n' };
          bank[2][8] = { note: bassRootB, vel: 0.92, dur: '4n' };
          bank[2][12] = { note: bassRootB, vel: 0.75, dur: '8n' };
          bank[2][14] = { note: bassFifthA, vel: 0.72, dur: '8n' };
        }
      }

      // 3. ARP / KEYS (Track 3): Sparkling chord arpeggio or rhythmic keys!
      const arpStride = (sec === 2 || g.groove === 'trance' || g.groove === 'chiptune') ? 1 : 2;
      const arpNotesA = chordA.map(n => transposeNote(n, 12));
      const arpNotesB = chordB.map(n => transposeNote(n, 12));
      for (let s = 0; s < 16; s += arpStride) {
        if (g.groove === 'ambient' && s % 4 !== 0 && s % 4 !== 3) continue;
        const pool = s < 8 ? arpNotesA : arpNotesB;
        const note = pool[(s + sec) % pool.length];
        bank[3][s] = { note, vel: s % 4 === 0 ? 0.72 : 0.48, dur: '16n' };
      }

      // 4. LEAD SYNTH (Track 0): Expressive melodic phrase with motif repetition & climax in Chorus C!
      if (sec >= 1) {
        const oct = sec === 2 ? 5 : 4;
        for (let m = 0; m < 8; m++) {
          const d = motifDegrees[m];
          if (d === null) continue;
          const stepPos = m * 2;
          const chordShift = stepPos < 8 ? degA : degB;
          const pitch = getScaleDegreeNote(root, scale, chordShift + d, oct);
          const isClimax = sec === 2;
          bank[0][stepPos] = { note: pitch, vel: isClimax ? 0.92 : 0.76, dur: m === 7 ? '4n' : '8n' };
          // Subtle passing ornament in Chorus C or Bridge D
          if ((sec === 2 || sec === 3) && m % 3 === 1 && stepPos + 1 < 16) {
            bank[0][stepPos + 1] = {
              note: getScaleDegreeNote(root, scale, chordShift + d + 1, oct),
              vel: 0.64,
              dur: '16n'
            };
          }
        }
      }

      // 5. DRUMS (Tracks 4..7): Authentic groove with real velocities!
      const drums = getDrumGroove(g.groove, sec);
      for (let s = 0; s < 16; s++) {
        if (drums.kick[s] > 0)  bank[4][s] = { note: 'C1',  vel: drums.kick[s],  dur: '8n' };
        if (drums.snare[s] > 0) bank[5][s] = { note: 'D1',  vel: drums.snare[s], dur: '16n' };
        if (drums.hihat[s] > 0) bank[6][s] = { note: 'F#1', vel: drums.hihat[s], dur: drums.hihat[s] > 0.85 ? '8n' : '32n' };
        if (drums.perc[s] > 0)  bank[7][s] = { note: getScaleDegreeNote(root, scale, degA, 4), vel: drums.perc[s], dur: '16n' };
      }

      banks.push(bank);
    }

    return {
      genreId: g.id,
      title: `${g.en} #${String(seed % 999).padStart(3, '0')}`,
      root,
      scale,
      bpm,
      swing: g.swing,
      timbre: g.timbre,
      theme: g.theme,
      model: g.model,
      arrangement: [0, 1, 2, 3], // Song Mode sequence: A -> B -> C -> D!
      banks
    };
  }

  function applyDrumFill(bank) {
    // Exciting musical snare + perc fill on final beat (steps 12-15)
    for (let s = 12; s < 16; s++) {
      bank[5][s] = { note: 'D1', vel: 0.55 + (s - 12) * 0.14, dur: '16n' };
      if (s === 14 || s === 15) bank[7][s] = { note: 'G4', vel: 0.85, dur: '16n' };
    }
    return bank;
  }

  // Real Live Emotion Re-Harmonization (transforms actual notes across all 4 banks!)
  function reharmonizeSongByEmotion(song, emotionId) {
    const em = EMOTIONS.find(e => e.id === emotionId) || EMOTIONS[0];
    song.scale = em.scale;
    song.theme = em.theme;
    song.bpm = Math.max(64, Math.min(185, song.bpm + Math.round(em.bpmDelta * 0.5)));

    for (let b = 0; b < song.banks.length; b++) {
      const bank = song.banks[b];
      for (let t = 0; t < 4; t++) {
        for (let s = 0; s < 16; s++) {
          const cell = bank[t][s];
          if (!cell) continue;
          if (Array.isArray(cell.note)) {
            cell.note = cell.note.map(n => quantizeNoteToScale(n, song.root, em.scale));
          } else {
            cell.note = quantizeNoteToScale(cell.note, song.root, em.scale);
          }
        }
      }
    }
    return em;
  }

  // =========================================================================
  // 6. NATURAL-LANGUAGE AI MUSIC PROMPT PARSER (EN & FR!)
  // =========================================================================

  function parseMusicPrompt(promptText) {
    const q = String(promptText || '').toLowerCase();
    const matchers = [
      ['cinematic', /epic|épique|orchestr|hans|zimmer|movie|film|trailer|hero/],
      ['lofi',      /lofi|lo-fi|chillhop|rain|pluie|study|étud|coffee|café/],
      ['cyberpunk', /cyber|blade|neon|industri|robot|hacker|2077|futur/],
      ['synthwave', /synthwave|outrun|retro|80s|années 80|kavinsky|miami/],
      ['techno',    /techno|berlin|rave|warehouse/],
      ['house',     /house|club|ibiza|deep|dance/],
      ['trance',    /trance|uplift|euphor/],
      ['trap',      /trap|808|banger|rap|hip/],
      ['drill',     /drill|uk|sombre rap/],
      ['boombap',   /boom|old school|90s/],
      ['drum_bass', /dnb|drum.?&?.?bass|jungle|liquid/],
      ['dubstep',   /dubstep|wobble|heavy bass/],
      ['hardstyle', /hardstyle|hardcore|gabber/],
      ['jazz',      /jazz|swing|sax|lounge|noir/],
      ['blues',     /blues|soul|guitar/],
      ['classical', /classic|piano|mozart|beethoven|chopin|néo/],
      ['waltz',     /waltz|valse|vienna/],
      ['rock',      /rock|stadium|metal|punk/],
      ['ambient',   /ambient|space|espace|meditat|sleep|dormir|zen|calm/],
      ['chillout',  /chill|sunset|beach|plage|relax/],
      ['oriental',  /orient|arab|desert|désert|egypt|turk|maqam/],
      ['tango',     /tango|argentin|buenos/],
      ['bossanova', /bossa|brazil|brésil|samba|rio/],
      ['reggae',    /reggae|dub|jamaic|marley/],
      ['afrobeat',  /afro|africa|afrique|tribal/],
      ['reggaeton', /reggaeton|latin|salsa|caliente/],
      ['funk',      /funk|disco|groove|daft/],
      ['celtic',    /celtic|celtiq|irish|folk|medieval/],
      ['synthpop',  /pop|synthpop|indie/],
      ['chiptune',  /8bit|8-bit|chip|arcade|game|jeu|mario|nintendo/]
    ];

    let genreId = null;
    for (let i = 0; i < matchers.length; i++) {
      if (matchers[i][1].test(q)) { genreId = matchers[i][0]; break; }
    }
    const seed = hash32(q || String(Date.now()));
    if (!genreId) genreId = AI_GENRES[seed % AI_GENRES.length].id;

    let emotion = null;
    if (/happy|joy|euphor|soleil|sun/.test(q)) emotion = 'happy';
    else if (/sad|triste|mélancol|emotional|cry|rain/.test(q)) emotion = 'sad';
    else if (/dark|sombre|epic|épique|intense/.test(q)) emotion = 'tense';
    else if (/dream|rêve|float|space/.test(q)) emotion = 'dreamy';
    else if (/rage|angry|aggress|hard|beast/.test(q)) emotion = 'rage';
    else if (/zen|peace|calm|relax|medit/.test(q)) emotion = 'zen';

    const bpmMatch = q.match(/(\d{2,3})\s*bpm/);
    const bpm = bpmMatch ? Math.max(60, Math.min(190, parseInt(bpmMatch[1], 10))) : null;

    return { genreId, emotion, bpm, seed };
  }

  // =========================================================================
  // 7. COMPLETE 100% BILINGUAL UI DICTIONARY (EN / FR)
  // =========================================================================

  const UI_I18N = {
    en: {
      back: 'Back',
      appTitle: '4D Music Composer',
      play: 'Play',
      pause: 'Pause',
      stop: 'Stop',
      songMode: 'Song A→D',
      loopMode: 'Loop Bank',
      recVideo: 'REC Video',
      stopRec: 'Stop REC',
      micOn: 'Mic FX',
      exportBtn: 'Export Music',
      zen: 'Zen',
      exitZen: 'Exit Zen',
      share: 'Share',
      aiTitle: 'AI Music Composer (30 Genres)',
      promptPlaceholder: 'Describe song: e.g. "epic emotional orchestral 95 bpm"',
      composeFull: 'Compose Full Song (A→D)',
      variation: 'Variation',
      autopilot: 'Autopilot',
      drumFill: 'Drum Fill',
      clearBank: 'Clear Bank',
      emotionsTitle: 'Live Emotion Re-Harmonizer',
      visualsTitle: '4D Stage & Visuals',
      modelLbl: '4D Entity',
      themeLbl: 'Color Theme',
      neonTextLbl: '3D Neon Title',
      vjCam: 'VJ Camera',
      liteMode: 'Lite Mode',
      tabSeq: 'Sequencer & Mixer (8 Tracks)',
      tabKeys: 'Live Piano, Chords & Loops',
      tabFx: 'Master FX & Sound Design',
      saveProj: 'Save .spmusic',
      loadProj: 'Load',
      exportTitle: 'Export Music, MP4 Video & Web Player',
      expWav: 'Studio Master Audio (.WAV)',
      expWavDesc: 'Fast offline 44.1kHz stereo mixdown (<2s)',
      expMp4: '4D Music Video (.MP4 / .WebM)',
      expMp4Desc: 'Full song rendered with synced 4D visuals + audio',
      expWeb: 'Web Music Player (.HTML)',
      expWebDesc: 'Standalone offline web player with audio & visualizer',
      expMidi: 'Multi-Track DAW MIDI (.MID)',
      expMidiDesc: 'FL Studio / Ableton / Logic ready (GM Ch 10 drums)',
      expStems: 'Offline Track Stems (.WAV)',
      expStemsDesc: 'Clean isolated audio stems without freezing',
      expProj: 'Save Project (.spmusic FREE)',
      expProjDesc: 'Full 4-section song, BPM, FX & 4D settings'
    },
    fr: {
      back: 'Retour',
      appTitle: 'Compositeur 4D',
      play: 'Lecture',
      pause: 'Pause',
      stop: 'Stop',
      songMode: 'Chanson A→D',
      loopMode: 'Boucle',
      recVideo: 'ENR Vidéo',
      stopRec: 'Stop ENR',
      micOn: 'Micro FX',
      exportBtn: 'Exporter',
      zen: 'Zen',
      exitZen: 'Quitter Zen',
      share: 'Partager',
      aiTitle: 'Compositeur IA (30 Genres)',
      promptPlaceholder: 'Décrivez : ex "orchestral épique 95 bpm" ou "lofi jazz"',
      composeFull: 'Composer Chanson (A→D)',
      variation: 'Variation',
      autopilot: 'Autopilote',
      drumFill: 'Break Batterie',
      clearBank: 'Vider',
      emotionsTitle: 'Émotion Live (Ré-Harmonisation)',
      visualsTitle: 'Scène & Visuels 4D',
      modelLbl: 'Entité 4D',
      themeLbl: 'Thème Couleur',
      neonTextLbl: 'Titre Néon 3D',
      vjCam: 'Caméra VJ',
      liteMode: 'Mode Léger',
      tabSeq: 'Séquenceur & Mixeur (8 Pistes)',
      tabKeys: 'Piano Live, Accords & Boucles',
      tabFx: 'Effets Master & Son',
      saveProj: 'Sauver .spmusic',
      loadProj: 'Ouvrir',
      exportTitle: 'Exporter Musique, Vidéo MP4 & Lecteur Web',
      expWav: 'Audio Master Studio (.WAV)',
      expWavDesc: 'Rendu stéréo 44,1kHz hors-ligne instantané (<2s)',
      expMp4: 'Clip Vidéo 4D (.MP4 / .WebM)',
      expMp4Desc: 'Chanson complète avec visuels 4D + audio synchronisé',
      expWeb: 'Lecteur Musical Web (.HTML)',
      expWebDesc: 'Page web autonome hors-ligne avec audio & spectre animé',
      expMidi: 'MIDI Multi-Pistes (.MID)',
      expMidiDesc: 'Compatible FL Studio / Ableton / Logic (Batterie Ch 10)',
      expStems: 'Pistes Séparées Stems (.WAV)',
      expStemsDesc: 'Rendu hors-ligne propre par piste sans blocage',
      expProj: 'Sauver Projet (.spmusic GRATUIT)',
      expProjDesc: '4 sections complètes, BPM, FX & scène 4D'
    }
  };

  function getT(lang) { return UI_I18N[lang === 'fr' ? 'fr' : 'en']; }

  const MusicTheory = {
    NOTE_NAMES, SCALES, TRACKS_META, AI_GENRES, EMOTIONS, UI_I18N,
    hash32, createRng, noteToMidi, midiToNote, transposeNote,
    getScaleMidis, quantizeNoteToScale, buildDiatonicChord, getScaleDegreeNote,
    createEmptyBank, cloneBank, getGenreMeta, composeFullSong,
    applyDrumFill, reharmonizeSongByEmotion, parseMusicPrompt, getT
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = MusicTheory;
  if (globalScope) globalScope.MusicTheory = MusicTheory;
})(typeof window !== 'undefined' ? window : globalThis);
