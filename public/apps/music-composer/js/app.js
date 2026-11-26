/**
 * 4D Music Composer (v4.0) — Main Studio Application Controller
 * Wires MusicTheory (30 AI Genres & 4-Section Song Composer) + AudioEngine (8-Track Pro DAW)
 * + Visuals4D (Leak-Free Three.js r165 4D Stage) + MusicExports (WAV, MP4/WebM, Web Player HTML,
 * MIDI, Offline Stems, FREE .spmusic Save/Load) + Studios-Pro Host Contracts!
 */
import Visuals4D from './visuals4d.js';

const MT = window.MusicTheory;
const AE = window.AudioEngine;
const EX = window.MusicExports;

const SECTION_LABELS = {
  en: ['Intro', 'Verse', 'Chorus', 'Outro'],
  fr: ['Intro', 'Couplet', 'Refrain', 'Outro']
};

const GENRE_GROUPS = [
  { id: 'electronic', en: '⚡ Electronic & EDM',       fr: '⚡ Électronique & EDM' },
  { id: 'urban',      en: '🔥 Hip-Hop, Trap & Bass',    fr: '🔥 Hip-Hop, Trap & Bass' },
  { id: 'world',      en: '🌍 World & Latin Grooves',   fr: '🌍 Grooves Monde & Latin' },
  { id: 'acoustic',   en: '🎻 Acoustic, Jazz & Classic',fr: '🎻 Acoustique, Jazz & Classique' },
  { id: 'cinematic',  en: '🎬 Cinematic, Synth & Retro',fr: '🎬 Cinématique, Synth & Rétro' }
];

const NOTE_CHOICES = [
  'C2','D2','E2','F2','G2','A2','B2',
  'C3','D3','E3','F3','G3','A3','B3',
  'C4','D4','E4','F4','G4','A4','B4',
  'C5','D5','E5','F5','G5','A5','B5'
];

// 2-Octave White & Black Key Layout (exact seam math: 44px white key width, 28px black key width!)
const WHITE_KEYS = [
  { semi: 0,  name: 'C', pc: 'A' }, { semi: 2,  name: 'D', pc: 'S' }, { semi: 4,  name: 'E', pc: 'D' },
  { semi: 5,  name: 'F', pc: 'F' }, { semi: 7,  name: 'G', pc: 'G' }, { semi: 9,  name: 'A', pc: 'H' },
  { semi: 11, name: 'B', pc: 'J' },
  { semi: 12, name: 'C', pc: 'K' }, { semi: 14, name: 'D', pc: 'L' }, { semi: 16, name: 'E', pc: ';' },
  { semi: 17, name: 'F', pc: "'" }, { semi: 19, name: 'G', pc: 'Z' }, { semi: 21, name: 'A', pc: 'X' },
  { semi: 23, name: 'B', pc: 'C' }
];
const BLACK_KEYS = [
  { semi: 1,  name: 'C#', pc: 'W', afterWhite: 1 }, { semi: 3,  name: 'D#', pc: 'E', afterWhite: 2 },
  { semi: 6,  name: 'F#', pc: 'T', afterWhite: 4 }, { semi: 8,  name: 'G#', pc: 'Y', afterWhite: 5 },
  { semi: 10, name: 'A#', pc: 'U', afterWhite: 6 },
  { semi: 13, name: 'C#', pc: 'O', afterWhite: 8 }, { semi: 15, name: 'D#', pc: 'P', afterWhite: 9 },
  { semi: 18, name: 'F#', pc: 'V', afterWhite: 11 },{ semi: 20, name: 'G#', pc: 'B', afterWhite: 12 },
  { semi: 22, name: 'A#', pc: 'N', afterWhite: 13 }
];

const state = {
  lang: 'en',
  isPro: false,
  song: null,
  activeBank: 0,
  songMode: true,
  autopilot: false,
  autopilotBarCount: 0,
  activeEmotion: null,
  trackPaintNotes: ['C4', 'C4', 'C2', 'G4', 'C1', 'D1', 'F#1', 'A4'],
  pendingExportAction: null,
  recStartMs: 0,
  recTimerId: null,
  thereminHeld: false,
  lastStepHighlighted: -1
};

const $ = id => document.getElementById(id);

let _toastTimer = null;
function showToast(msg, ms = 2600) {
  const el = $('toast-banner');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.add('hidden'), ms);
}

// =========================================================================
// 1. INITIALIZATION & UI POPULATION
// =========================================================================

function populateGenreSelect() {
  const sel = $('genre-select');
  sel.innerHTML = '';
  GENRE_GROUPS.forEach(grp => {
    const og = document.createElement('optgroup');
    og.label = state.lang === 'fr' ? grp.fr : grp.en;
    MT.AI_GENRES.filter(g => g.cat === grp.id).forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.id;
      opt.textContent = `${state.lang === 'fr' ? g.fr : g.en} (${g.bpm} BPM)`;
      og.appendChild(opt);
    });
    sel.appendChild(og);
  });
  if (state.song) sel.value = state.song.genreId;
}

function populateModelSelect() {
  const sel = $('model-select');
  sel.innerHTML = '';
  Visuals4D.VISUAL_MODELS.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = state.lang === 'fr' ? m.fr : m.en;
    sel.appendChild(opt);
  });
  if (state.song) sel.value = state.song.model || 'tesseract';
}

function populateKeyScaleSelects() {
  const rSel = $('root-select');
  rSel.innerHTML = '';
  MT.NOTE_NAMES.forEach(n => {
    const opt = document.createElement('option');
    opt.value = n;
    opt.textContent = n;
    rSel.appendChild(opt);
  });

  const sSel = $('scale-select');
  sSel.innerHTML = '';
  Object.entries(MT.SCALES).forEach(([id, meta]) => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = state.lang === 'fr' ? meta.fr : meta.en;
    sSel.appendChild(opt);
  });
  if (state.song) {
    rSel.value = state.song.root;
    sSel.value = state.song.scale;
  }
}

function renderEmotionsGrid() {
  const grid = $('emotion-grid');
  grid.innerHTML = '';
  MT.EMOTIONS.forEach(em => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'emo-btn' + (state.activeEmotion === em.id ? ' active' : '');
    btn.dataset.emotion = em.id;
    btn.innerHTML = `<span>${em.icon}</span><span>${state.lang === 'fr' ? em.fr : em.en}</span>`;
    btn.addEventListener('click', () => applyEmotion(em.id));
    grid.appendChild(btn);
  });
}

// =========================================================================
// 2. SEQUENCER & MIXER RENDERING (8 TRACKS × 16 STEPS)
// =========================================================================

function renderSequencer() {
  const wrap = $('seq-container');
  wrap.innerHTML = '';
  const bank = state.song.banks[state.activeBank];
  const mixer = AE.getMixerState();

  MT.TRACKS_META.forEach((tr, ti) => {
    const row = document.createElement('div');
    row.className = 'seq-row';
    row.style.setProperty('--track-color', tr.color);

    // Track Label
    const idDiv = document.createElement('div');
    idDiv.className = 'tr-id';
    idDiv.innerHTML = `<span class="tr-bar" style="background:${tr.color}"></span><span class="tr-name">${tr.icon} ${state.lang === 'fr' ? tr.fr : tr.en}</span>`;

    // Volume slider
    const vol = document.createElement('input');
    vol.type = 'range'; vol.min = 0; vol.max = 125; vol.value = Math.round((mixer[ti]?.volume ?? 0.85) * 100);
    vol.className = 'tr-vol';
    vol.title = 'Track Volume';
    vol.addEventListener('input', () => AE.setTrackVolume(ti, Number(vol.value) / 100));

    // Mute / Solo
    const msDiv = document.createElement('div');
    msDiv.className = 'tr-ms';
    const mBtn = document.createElement('button');
    mBtn.type = 'button'; mBtn.textContent = 'M';
    mBtn.className = 'ms-btn' + (mixer[ti]?.muted ? ' muted' : '');
    mBtn.addEventListener('click', () => {
      const m = AE.toggleMute(ti);
      mBtn.classList.toggle('muted', m);
    });
    const sBtn = document.createElement('button');
    sBtn.type = 'button'; sBtn.textContent = 'S';
    sBtn.className = 'ms-btn' + (mixer[ti]?.solo ? ' soloed' : '');
    sBtn.addEventListener('click', () => {
      const s = AE.toggleSolo(ti);
      sBtn.classList.toggle('soloed', s);
    });
    msDiv.append(mBtn, sBtn);

    // Note Selector (melodic & pitched perc) or Drum Tag (Kick / Snare / Hi-Hat)
    const isUnpitchedDrum = ti >= 4 && ti <= 6;
    let pitchEl;
    if (!isUnpitchedDrum) {
      pitchEl = document.createElement('select');
      pitchEl.className = 'tr-note-sel';
      NOTE_CHOICES.forEach(n => {
        const opt = document.createElement('option');
        opt.value = n; opt.textContent = n;
        pitchEl.appendChild(opt);
      });
      pitchEl.value = state.trackPaintNotes[ti] || 'C4';
      pitchEl.addEventListener('change', () => { state.trackPaintNotes[ti] = pitchEl.value; });
    } else {
      pitchEl = document.createElement('span');
      pitchEl.className = 'tr-drum-tag';
      pitchEl.textContent = tr.id.toUpperCase();
    }

    // 16-Step Pads
    const grid = document.createElement('div');
    grid.className = 'step-grid';
    for (let s = 0; s < 16; s++) {
      const cell = bank[ti][s];
      const pad = document.createElement('button');
      pad.type = 'button';
      pad.className = 'step-cell' + (s % 4 === 0 ? ' beat-start' : '') + (cell ? ' on' : '');
      pad.dataset.track = String(ti);
      pad.dataset.step = String(s);
      if (cell) pad.title = Array.isArray(cell.note) ? cell.note.join(' ') : String(cell.note);
      pad.addEventListener('click', () => {
        const cur = state.song.banks[state.activeBank][ti][s];
        if (cur) {
          state.song.banks[state.activeBank][ti][s] = null;
          pad.classList.remove('on');
          pad.title = '';
        } else {
          const baseNote = state.trackPaintNotes[ti] || 'C4';
          const noteVal = (ti === 1)
            ? MT.buildDiatonicChord(state.song.root, state.song.scale, Math.floor(s / 4) % 6, 3, false)
            : (isUnpitchedDrum ? baseNote : MT.quantizeNoteToScale(baseNote, state.song.root, state.song.scale));
          state.song.banks[state.activeBank][ti][s] = {
            note: noteVal,
            vel: s % 4 === 0 ? 0.92 : 0.78,
            dur: ti === 1 ? '2n' : ti === 4 ? '8n' : '16n'
          };
          pad.classList.add('on');
          pad.title = Array.isArray(noteVal) ? noteVal.join(' ') : String(noteVal);
        }
        Visuals4D.triggerPulse(0.28);
      });
      grid.appendChild(pad);
    }

    row.append(idDiv, vol, msDiv, pitchEl, grid);
    wrap.appendChild(row);
  });
}

function highlightStep(step, bankIdx) {
  if (bankIdx !== state.activeBank) {
    state.activeBank = bankIdx;
    syncBankPills(bankIdx, true);
    renderSequencer();
  }
  $('meta-step-badge').textContent = `${String(step + 1).padStart(2, '0')}/16`;

  const prev = document.querySelectorAll('.step-cell.playing');
  prev.forEach(el => el.classList.remove('playing'));
  const cur = document.querySelectorAll(`.step-cell[data-step="${step}"]`);
  cur.forEach(el => el.classList.add('playing'));

  // Pulse 4D stage cleanly on Kick/Snare downbeats
  const bank = state.song.banks[bankIdx];
  if (bank && bank[4] && bank[4][step]) Visuals4D.triggerPulse(0.65);
}

// =========================================================================
// 3. FIXED 2-OCTAVE LIVE PIANO + 7 DIATONIC CHORD PADS
// =========================================================================

function buildPianoKeyboard() {
  const container = $('piano-keys');
  container.innerHTML = '';
  const baseOct = AE.getState().kb.octave;

  // Render 14 white keys
  WHITE_KEYS.forEach(wk => {
    const oct = baseOct + (wk.semi >= 12 ? 1 : 0);
    const noteStr = wk.name + oct;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'piano-key-white';
    btn.dataset.note = noteStr;
    btn.dataset.pc = wk.pc.toLowerCase();
    btn.innerHTML = `<span class="k-note">${noteStr}</span><span class="k-pc">${wk.pc}</span>`;
    attachPianoPointer(btn, noteStr);
    container.appendChild(btn);
  });

  // Render 10 black keys positioned at EXACT mathematical seam: (afterWhite * 44 - 14)px!
  BLACK_KEYS.forEach(bk => {
    const oct = baseOct + (bk.semi >= 12 ? 1 : 0);
    const noteStr = bk.name + oct;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'piano-key-black';
    btn.style.left = `${bk.afterWhite * 44 - 14}px`;
    btn.dataset.note = noteStr;
    btn.dataset.pc = bk.pc.toLowerCase();
    btn.innerHTML = `<span class="k-note">${bk.name}</span><span class="k-pc">${bk.pc}</span>`;
    attachPianoPointer(btn, noteStr);
    container.appendChild(btn);
  });
}

function attachPianoPointer(el, noteStr) {
  const triggerId = 'mouse_' + noteStr;
  el.addEventListener('pointerdown', e => {
    e.preventDefault();
    el.classList.add('pressed');
    AE.kbNoteOn(triggerId, noteStr, 0.84).catch(() => {});
    Visuals4D.triggerPulse(0.45);
  });
  const rel = () => {
    if (!el.classList.contains('pressed')) return;
    el.classList.remove('pressed');
    AE.kbNoteOff(triggerId);
  };
  el.addEventListener('pointerup', rel);
  el.addEventListener('pointerleave', rel);
  el.addEventListener('pointercancel', rel);
}

function renderChordPads() {
  const row = $('chord-pads-row');
  row.innerHTML = '';
  const romanMaj = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
  const romanMin = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];
  const isMinor = state.song.scale !== 'major' && state.song.scale !== 'lydian' && state.song.scale !== 'mixolydian';
  const romans = isMinor ? romanMin : romanMaj;

  for (let deg = 0; deg < 7; deg++) {
    const chordNotes = MT.buildDiatonicChord(state.song.root, state.song.scale, deg, 4, false);
    const rootLabel = chordNotes[0].replace(/\d$/, '');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chord-pad';
    btn.innerHTML = `<span class="deg">${romans[deg]}</span><strong>${rootLabel}</strong>`;
    btn.title = chordNotes.join(' - ');
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      btn.classList.add('pressed');
      AE.triggerChordPad(chordNotes, '2n').catch(() => {});
      Visuals4D.triggerPulse(0.55);
    });
    const rel = () => btn.classList.remove('pressed');
    btn.addEventListener('pointerup', rel);
    btn.addEventListener('pointerleave', rel);
    row.appendChild(btn);
  }
}

// =========================================================================
// 4. SONG COMPOSITION, EMOTIONS, TIMELINE & SYNC
// =========================================================================

function syncSongToUI(updateVisuals = true) {
  const s = state.song;
  if (!s) return;
  $('song-title-input').value = s.title;
  $('genre-select').value = s.genreId;
  $('bpm-slider').value = s.bpm;
  $('bpm-val').textContent = String(s.bpm);
  $('root-select').value = s.root;
  $('scale-select').value = s.scale;
  $('fx-swing').value = s.swing || 0;
  $('val-swing').textContent = `${s.swing || 0}%`;

  const gMeta = MT.getGenreMeta(s.genreId);
  const scMeta = MT.SCALES[s.scale] || MT.SCALES.minor;
  $('meta-genre-badge').textContent = state.lang === 'fr' ? gMeta.fr : gMeta.en;
  $('meta-key-badge').textContent = `${s.root} ${state.lang === 'fr' ? scMeta.fr.split(' ')[0] : scMeta.en.split(' ')[0]}`;

  document.querySelectorAll('.timbre-btn').forEach(b => b.classList.toggle('active', b.dataset.timbre === s.timbre));

  if (updateVisuals) {
    $('model-select').value = s.model || 'tesseract';
    $('theme-select').value = s.theme || 'cyberpunk';
    Visuals4D.setTheme(s.theme || 'cyberpunk');
    Visuals4D.setModel(s.model || 'tesseract');
  }

  AE.applySongAudioParams(s);
  syncBankPills(state.activeBank, AE.getState().isPlaying);
  renderSequencer();
  renderChordPads();
}

function syncBankPills(activeIdx, isPlaying) {
  const labels = SECTION_LABELS[state.lang === 'fr' ? 'fr' : 'en'];
  document.querySelectorAll('.bank-pill').forEach((btn, i) => {
    btn.classList.toggle('active', i === activeIdx);
    btn.classList.toggle('playing-now', isPlaying && i === activeIdx);
    const sp = btn.querySelector('span');
    if (sp) sp.textContent = labels[i];
  });
}

function composeNewSong(genreId, opts = {}) {
  state.activeEmotion = null;
  state.song = MT.composeFullSong(genreId || $('genre-select').value, opts);
  state.activeBank = 0;
  AE.setBank(0);
  syncSongToUI(true);
  renderEmotionsGrid();
  Visuals4D.triggerPulse(0.85);
  showToast(state.lang === 'fr'
    ? `✨ Chanson 4 sections composée : ${state.song.title}`
    : `✨ 4-Section Song Composed: ${state.song.title}`);
}

function applyEmotion(emotionId) {
  state.activeEmotion = emotionId;
  const em = MT.reharmonizeSongByEmotion(state.song, emotionId);
  syncSongToUI(true);
  renderEmotionsGrid();
  Visuals4D.triggerPulse(0.75);
  showToast(`${em.icon} ${state.lang === 'fr' ? em.fr : em.en} (${state.song.root} ${state.song.scale} · ${state.song.bpm} BPM)`);
}

// =========================================================================
// 5. EXPORT PERMISSION GATE (ONLY FOR PRO EXPORTS — .spmusic ALWAYS FREE!)
// =========================================================================

function requestExportPermission(format, runFn) {
  // Standalone local run OR Pro user -> immediate export!
  if (window.parent === window || state.isPro) {
    runFn();
    return;
  }
  state.pendingExportAction = { format, runFn };
  window.parent.postMessage({ type: 'CHECK_EXPORT_LIMIT', format, app: 'music-composer' }, '*');
}

function setExportStatus(msg) {
  const bar = $('export-status-bar');
  if (!msg) { bar.classList.add('hidden'); return; }
  bar.textContent = msg;
  bar.classList.remove('hidden');
}

function startRecTimerUI() {
  state.recStartMs = Date.now();
  $('rec-indicator').classList.remove('hidden');
  $('btn-rec').classList.add('recording');
  $('btn-rec').innerHTML = `■ <span>${MT.getT(state.lang).stopRec}</span>`;
  clearInterval(state.recTimerId);
  state.recTimerId = setInterval(() => {
    const sec = Math.floor((Date.now() - state.recStartMs) / 1000);
    $('rec-status-txt').textContent = `REC ${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
  }, 400);
}

function stopRecTimerUI() {
  clearInterval(state.recTimerId);
  state.recTimerId = null;
  $('rec-indicator').classList.add('hidden');
  $('btn-rec').classList.remove('recording');
  $('btn-rec').innerHTML = `● <span>${MT.getT(state.lang).recVideo}</span>`;
}

// =========================================================================
// 6. BILINGUAL I18N (EN / FR)
// =========================================================================

function setLanguage(lang) {
  state.lang = lang === 'fr' ? 'fr' : 'en';
  const dict = MT.getT(state.lang);
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.textContent = dict[key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) el.placeholder = dict[key];
  });
  $('btn-lang-en').classList.toggle('active', state.lang === 'en');
  $('btn-lang-fr').classList.toggle('active', state.lang === 'fr');
  populateGenreSelect();
  populateModelSelect();
  populateKeyScaleSelects();
  renderEmotionsGrid();
  syncSongToUI(false);
}

// =========================================================================
// 7. EVENT LISTENERS & KEYBOARD / THEREMIN INTERACTION
// =========================================================================

function bindEvents() {
  // Clean CLOSE_STUDIO (shuts down all audio & video streams first!)
  $('btn-back').addEventListener('click', () => {
    state.autopilot = false;
    if (EX.isVideoRecording()) EX.stopVideoRecording();
    AE.shutdownAll();
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'CLOSE_STUDIO' }, '*');
    } else {
      showToast('Audio & Studio stopped cleanly');
    }
  });

  // Song Title
  $('song-title-input').addEventListener('input', e => {
    state.song.title = e.target.value || 'Untitled 4D Track';
  });

  // Transport Play / Pause
  $('btn-play').addEventListener('click', async () => {
    try {
      const playing = await AE.play();
      const t = MT.getT(state.lang);
      $('btn-play').classList.toggle('playing', playing);
      $('btn-play').innerHTML = playing ? `⏸ <span>${t.pause}</span>` : `▶ <span>${t.play}</span>`;
      syncBankPills(state.activeBank, playing);
    } catch (err) {
      showToast('Audio error: ' + err.message);
    }
  });

  // Transport Stop
  $('btn-stop').addEventListener('click', () => {
    AE.stop();
    const t = MT.getT(state.lang);
    $('btn-play').classList.remove('playing');
    $('btn-play').innerHTML = `▶ <span>${t.play}</span>`;
    state.activeBank = 0;
    syncBankPills(0, false);
    document.querySelectorAll('.step-cell.playing').forEach(el => el.classList.remove('playing'));
    $('meta-step-badge').textContent = '01/16';
  });

  // Song Mode (A->D) vs Loop Single Bank
  $('btn-song-mode').addEventListener('click', () => {
    state.songMode = !state.songMode;
    AE.setSongMode(state.songMode);
    const t = MT.getT(state.lang);
    $('btn-song-mode').classList.toggle('active', state.songMode);
    $('btn-song-mode').textContent = state.songMode ? t.songMode : t.loopMode;
  });

  // BPM Slider
  $('bpm-slider').addEventListener('input', e => {
    const v = Number(e.target.value);
    $('bpm-val').textContent = String(v);
    AE.setBPM(v);
  });

  // Live Manual 4D Music Video Recorder (REC)
  $('btn-rec').addEventListener('click', async () => {
    if (EX.isVideoRecording()) {
      EX.stopVideoRecording();
      return;
    }
    try {
      await AE.ensureReady();
      const info = EX.startVideoRecording(state.song, res => {
        stopRecTimerUI();
        if (res) showToast(`🎬 Saved ${res.filename} (${(res.size / 1024).toFixed(0)} KB)`);
      });
      if (info) {
        startRecTimerUI();
        showToast(`🔴 Recording 4D Video (.${info.ext.toUpperCase()})...`);
      }
    } catch (err) {
      stopRecTimerUI();
      showToast('Video REC error: ' + err.message);
    }
  });

  // Mic FX
  $('btn-mic').addEventListener('click', async () => {
    try {
      const on = await AE.toggleMic();
      $('btn-mic').classList.toggle('active', on);
      showToast(on ? '🎙 Mic AutoWah FX ON' : '🎙 Mic OFF');
    } catch (_) {
      showToast('🎙 Microphone permission unavailable');
    }
  });

  // Zen Mode (hides Back button cleanly!)
  $('btn-zen').addEventListener('click', () => {
    document.body.classList.add('zen-mode');
    setTimeout(() => Visuals4D.handleResize(), 60);
  });
  $('btn-exit-zen').addEventListener('click', () => {
    document.body.classList.remove('zen-mode');
    setTimeout(() => Visuals4D.handleResize(), 60);
  });

  // Share URL (FREE)
  $('btn-share').addEventListener('click', async () => {
    const hash = EX.encodeShareHash(state.song);
    const url = window.location.origin + window.location.pathname + hash;
    try { window.history.replaceState(null, '', hash); } catch (_) {}
    try {
      await navigator.clipboard.writeText(url);
      showToast(state.lang === 'fr' ? '🔗 Lien copié dans le presse-papiers !' : '🔗 Share URL copied to clipboard!');
    } catch (_) {
      showToast('🔗 URL updated in address bar');
    }
  });

  // Language Switch
  $('btn-lang-en').addEventListener('click', () => setLanguage('en'));
  $('btn-lang-fr').addEventListener('click', () => setLanguage('fr'));

  // Song Section Bank Pills (A / B / C / D)
  document.querySelectorAll('.bank-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeBank = Number(btn.dataset.bank);
      AE.setBank(state.activeBank);
      syncBankPills(state.activeBank, AE.getState().isPlaying);
      renderSequencer();
    });
  });

  // AI Genre & Prompt Composer
  $('genre-select').addEventListener('change', e => composeNewSong(e.target.value));
  $('btn-compose-full').addEventListener('click', () => composeNewSong($('genre-select').value, { seed: Date.now() }));
  $('btn-variation').addEventListener('click', () => {
    const g = state.song.genreId;
    composeNewSong(g, { seed: Math.floor(Math.random() * 1e9) });
  });
  $('btn-autopilot').addEventListener('click', () => {
    state.autopilot = !state.autopilot;
    state.autopilotBarCount = 0;
    $('btn-autopilot').classList.toggle('active', state.autopilot);
    showToast(state.autopilot ? '∞ AI Autopilot ON (evolves every 4 bars)' : '∞ AI Autopilot OFF');
  });

  const runPrompt = () => {
    const txt = $('ai-prompt-input').value.trim();
    if (!txt) { composeNewSong($('genre-select').value, { seed: Date.now() }); return; }
    const parsed = MT.parseMusicPrompt(txt);
    composeNewSong(parsed.genreId, { seed: parsed.seed, bpm: parsed.bpm || undefined });
    if (parsed.emotion) applyEmotion(parsed.emotion);
    if (parsed.bpm) {
      state.song.bpm = parsed.bpm;
      syncSongToUI(false);
    }
  };
  $('btn-ai-prompt').addEventListener('click', runPrompt);
  $('ai-prompt-input').addEventListener('keydown', e => { if (e.key === 'Enter') runPrompt(); });

  // 4D Visual Controls
  $('model-select').addEventListener('change', e => {
    state.song.model = e.target.value;
    Visuals4D.setModel(e.target.value);
  });
  $('theme-select').addEventListener('change', e => {
    state.song.theme = e.target.value;
    Visuals4D.setTheme(e.target.value);
  });
  $('neon-title-input').addEventListener('input', e => Visuals4D.setNeonTitle(e.target.value));
  $('btn-vj-cam').addEventListener('click', () => {
    const next = !Visuals4D.getState().vjCamera;
    Visuals4D.setVJCamera(next);
    $('btn-vj-cam').classList.toggle('active', next);
  });
  $('btn-lite-mode').addEventListener('click', () => {
    const next = !Visuals4D.getState().liteMode;
    Visuals4D.setLiteMode(next);
    $('btn-lite-mode').classList.toggle('active', next);
  });

  // Bottom DAW Tabs
  document.querySelectorAll('.daw-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      document.querySelectorAll('.daw-tab').forEach(b => b.classList.toggle('active', b === tab));
      document.querySelectorAll('.daw-pane').forEach(p => p.classList.toggle('active', p.id === `tab-${target}`));
    });
  });

  // Quick Bank Tools + FREE Save/Load .spmusic
  $('btn-drum-fill').addEventListener('click', () => {
    MT.applyDrumFill(state.song.banks[state.activeBank]);
    renderSequencer();
    showToast('🥁 Drum Fill added to final beat!');
  });
  $('btn-clear-bank').addEventListener('click', () => {
    state.song.banks[state.activeBank] = MT.createEmptyBank();
    renderSequencer();
    showToast('🗑 Current section cleared');
  });
  $('btn-save-proj').addEventListener('click', () => {
    const res = EX.exportProjectFile(state.song, AE.getFXState(), AE.getMixerState(), Visuals4D.getState());
    showToast(`💾 Saved ${res.filename}`);
  });
  $('btn-load-proj').addEventListener('click', () => $('file-load-proj').click());
  $('file-load-proj').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (data.song && Array.isArray(data.song.banks) && data.song.banks.length === 4) {
          state.song = data.song;
          if (data.fx) Object.entries(data.fx).forEach(([k, v]) => AE.setFX(k, v));
          if (Array.isArray(data.mixer)) {
            data.mixer.forEach((m, i) => { if (m && typeof m.volume === 'number') AE.setTrackVolume(i, m.volume); });
          }
          state.activeBank = 0;
          syncSongToUI(true);
          showToast(`📂 Loaded ${state.song.title}`);
        } else {
          showToast('Invalid .spmusic file');
        }
      } catch (_) {
        showToast('Failed to parse project file');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  });

  // Live Keyboard Toolbar
  document.querySelectorAll('.wave-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.wave-btn').forEach(b => b.classList.toggle('active', b === btn));
      AE.setKbParam('wave', btn.dataset.wave);
    });
  });
  $('btn-oct-down').addEventListener('click', () => {
    const oct = Math.max(2, AE.getState().kb.octave - 1);
    AE.setKbParam('octave', oct);
    $('oct-val').textContent = String(oct);
    buildPianoKeyboard();
  });
  $('btn-oct-up').addEventListener('click', () => {
    const oct = Math.min(6, AE.getState().kb.octave + 1);
    AE.setKbParam('octave', oct);
    $('oct-val').textContent = String(oct);
    buildPianoKeyboard();
  });
  $('btn-kb-chord').addEventListener('click', e => {
    const next = !AE.getState().kb.chordMode;
    AE.setKbParam('chordMode', next);
    e.currentTarget.classList.toggle('active', next);
  });
  $('btn-kb-arp').addEventListener('click', e => {
    const next = !AE.getState().kb.arpMode;
    AE.setKbParam('arpMode', next);
    e.currentTarget.classList.toggle('active', next);
  });
  $('btn-kb-lock').addEventListener('click', e => {
    const next = !AE.getState().kb.scaleLock;
    AE.setKbParam('scaleLock', next);
    e.currentTarget.classList.toggle('active', next);
  });
  document.querySelectorAll('.harm-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.harm-btn').forEach(b => b.classList.toggle('active', b === btn));
      AE.setKbParam('harmVoices', Number(btn.dataset.harm));
    });
  });
  document.querySelectorAll('.loop-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = Number(btn.dataset.loop);
      const st = await AE.toggleLoopSlot(idx);
      btn.className = 'loop-btn' + (st !== 'empty' ? ` ${st}` : '');
    });
  });
  $('btn-loops-clear').addEventListener('click', () => {
    AE.clearAllLoops();
    document.querySelectorAll('.loop-btn').forEach(b => { b.className = 'loop-btn'; });
    showToast('Loops cleared');
  });

  // Tab 3: Master FX & Sound Design
  document.querySelectorAll('.timbre-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.song.timbre = btn.dataset.timbre;
      AE.setLeadTimbre(state.song.timbre);
      document.querySelectorAll('.timbre-btn').forEach(b => b.classList.toggle('active', b === btn));
    });
  });
  ['a', 'd', 's', 'r'].forEach(k => {
    $(`adsr-${k}`).addEventListener('input', () => {
      AE.setKbADSR(
        Number($('adsr-a').value) / 100,
        Number($('adsr-d').value) / 100,
        Number($('adsr-s').value) / 100,
        Number($('adsr-r').value) / 100
      );
    });
  });
  $('root-select').addEventListener('change', e => {
    state.song.root = e.target.value;
    syncSongToUI(false);
  });
  $('scale-select').addEventListener('change', e => {
    state.song.scale = e.target.value;
    syncSongToUI(false);
  });
  $('fx-swing').addEventListener('input', e => {
    AE.setSwing(e.target.value);
    $('val-swing').textContent = `${e.target.value}%`;
  });
  $('fx-pitch').addEventListener('input', e => {
    AE.setMasterPitch(e.target.value);
    $('val-pitch').textContent = `${e.target.value > 0 ? '+' : ''}${e.target.value} st`;
  });
  ['filter', 'reverb', 'delay', 'chorus', 'dist', 'phaser'].forEach(fx => {
    $(`fx-${fx}`).addEventListener('input', e => {
      AE.setFX(fx, e.target.value);
      $(`val-${fx}`).textContent = `${e.target.value}%`;
    });
  });

  // Export Modal
  $('btn-export-open').addEventListener('click', () => {
    setExportStatus('');
    $('modal-export').classList.remove('hidden');
  });
  $('btn-export-close').addEventListener('click', () => $('modal-export').classList.add('hidden'));
  $('modal-export').addEventListener('click', e => {
    if (e.target === $('modal-export')) $('modal-export').classList.add('hidden');
  });

  const exportOpts = () => ({
    masterPitch: AE.getState().masterPitch,
    mixer: AE.getMixerState(),
    fx: AE.getFXState()
  });

  $('exp-btn-wav').addEventListener('click', () => {
    requestExportPermission('wav', async () => {
      try {
        setExportStatus('🎧 Rendering 44.1kHz Stereo Master WAV offline...');
        const res = await EX.exportMasterWAV(state.song, exportOpts());
        setExportStatus(`✅ Exported ${res.filename} (${(res.size / 1024).toFixed(0)} KB, ${res.duration.toFixed(1)}s)`);
      } catch (err) {
        setExportStatus('❌ WAV Export failed: ' + err.message);
      }
    });
  });

  $('exp-btn-mp4').addEventListener('click', () => {
    requestExportPermission('mp4', async () => {
      try {
        $('modal-export').classList.add('hidden');
        const info = await EX.recordFullSongVideo(state.song, res => {
          stopRecTimerUI();
          const t = MT.getT(state.lang);
          $('btn-play').classList.remove('playing');
          $('btn-play').innerHTML = `▶ <span>${t.play}</span>`;
          if (res) showToast(`🎬 4D Music Video Saved: ${res.filename} (${(res.size / 1024).toFixed(0)} KB)`, 4000);
        });
        startRecTimerUI();
        const t = MT.getT(state.lang);
        $('btn-play').classList.add('playing');
        $('btn-play').innerHTML = `⏸ <span>${t.pause}</span>`;
        showToast(`🎬 Recording Full Song (${info.durationSec}s) as .${info.ext.toUpperCase()}...`, 4000);
      } catch (err) {
        stopRecTimerUI();
        showToast('❌ Video export failed: ' + err.message);
      }
    });
  });

  $('exp-btn-web').addEventListener('click', () => {
    requestExportPermission('html', async () => {
      try {
        setExportStatus('🌐 Rendering audio & building Standalone Offline Web Music Player (.HTML)...');
        const res = await EX.exportWebMusicPlayerHTML(state.song, exportOpts());
        setExportStatus(`✅ Exported ${res.filename} (${(res.size / 1024).toFixed(0)} KB) — Open in any browser offline!`);
      } catch (err) {
        setExportStatus('❌ Web Player export failed: ' + err.message);
      }
    });
  });

  $('exp-btn-midi').addEventListener('click', () => {
    requestExportPermission('midi', () => {
      const res = EX.exportMIDI(state.song, exportOpts());
      setExportStatus(`✅ Exported Multi-Track DAW MIDI: ${res.filename} (${res.size} bytes)`);
    });
  });

  $('exp-btn-stems').addEventListener('click', () => {
    requestExportPermission('stems', async () => {
      try {
        const list = await EX.exportOfflineStems(state.song, exportOpts(), (cur, tot, name) => {
          setExportStatus(`🎚️ Rendering Stem ${cur}/${tot}: ${name}...`);
        });
        setExportStatus(`✅ Exported ${list.length} isolated .WAV stems cleanly!`);
      } catch (err) {
        setExportStatus('❌ Stems export failed: ' + err.message);
      }
    });
  });

  // FREE .spmusic Project Backup (no paywall!)
  $('exp-btn-proj').addEventListener('click', () => {
    const res = EX.exportProjectFile(state.song, AE.getFXState(), AE.getMixerState(), Visuals4D.getState());
    setExportStatus(`✅ Saved FREE project backup: ${res.filename} (${(res.size / 1024).toFixed(1)} KB)`);
  });

  // PC Keyboard Piano + Loops F1-F3 + Tab Theremin + Space Play
  window.addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.key === 'Escape') {
      $('modal-export').classList.add('hidden');
      document.body.classList.remove('zen-mode');
      return;
    }
    if (e.key === 'Tab') { e.preventDefault(); state.thereminHeld = true; return; }
    if (e.key === 'F1' || e.key === 'F2' || e.key === 'F3') {
      e.preventDefault();
      const idx = Number(e.key[1]) - 1;
      const btn = document.querySelector(`.loop-btn[data-loop="${idx}"]`);
      if (btn) btn.click();
      return;
    }
    if (e.repeat) return;
    const keyChar = e.key.toLowerCase();
    const keyEl = document.querySelector(`#piano-keys [data-pc="${CSS.escape(keyChar)}"]`);
    if (keyEl) {
      keyEl.classList.add('pressed');
      AE.kbNoteOn('pc_' + keyChar, keyEl.dataset.note, 0.82).catch(() => {});
      Visuals4D.triggerPulse(0.4);
    }
  });

  window.addEventListener('keyup', e => {
    if (e.key === 'Tab') { state.thereminHeld = false; AE.setTheremin(false, 0, 0); return; }
    const keyChar = e.key.toLowerCase();
    const keyEl = document.querySelector(`#piano-keys [data-pc="${CSS.escape(keyChar)}"]`);
    if (keyEl) {
      keyEl.classList.remove('pressed');
      AE.kbNoteOff('pc_' + keyChar);
    }
  });

  window.addEventListener('mousemove', e => {
    if (!state.thereminHeld) return;
    AE.setTheremin(true, e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight);
  });

  window.addEventListener('blur', () => {
    AE.panicKeys();
    document.querySelectorAll('#piano-keys .pressed').forEach(el => el.classList.remove('pressed'));
  });
}

// =========================================================================
// 8. HOST CONTRACTS (Studios-Pro Parent Messaging + Remix State)
// =========================================================================

window.addEventListener('message', e => {
  const d = e.data;
  if (!d || typeof d !== 'object') return;
  if (d.type === 'SET_LANG' && d.lang) setLanguage(d.lang);
  else if (d.type === 'USER_TIER_STATUS') state.isPro = !!(d.isPro || d.tier === 'pro' || d.tier === 'vip');
  else if (d.type === 'EXPORT_ALLOWED' && state.pendingExportAction) {
    const fn = state.pendingExportAction.runFn;
    state.pendingExportAction = null;
    fn();
  }
});

window.getAppState = () => ({
  format: 'studios-pro-music-v4',
  song: state.song,
  fx: AE.getFXState(),
  mixer: AE.getMixerState(),
  visuals: Visuals4D.getState()
});

window.getAppTags = () => {
  if (!state.song) return ['music', '4d'];
  return ['music', '4d-composer', state.song.genreId, state.song.scale, `${state.song.bpm}bpm`];
};

// =========================================================================
// 9. BOOTSTRAP
// =========================================================================

function boot() {
  // Check URL lang or share hash or sp_remix_state
  const params = new URLSearchParams(window.location.search);
  if (params.get('lang') === 'fr') state.lang = 'fr';

  Visuals4D.init($('stage-4d'));

  AE.setCallbacks({
    onStep: (step, bankIdx) => highlightStep(step, bankIdx),
    onBankChange: bankIdx => {
      state.activeBank = bankIdx;
      syncBankPills(bankIdx, AE.getState().isPlaying);
      renderSequencer();
    },
    onBarEnd: () => {
      if (!state.autopilot) return;
      state.autopilotBarCount++;
      if (state.autopilotBarCount >= 4) {
        state.autopilotBarCount = 0;
        // Evolve smoothly on bar boundary without freezing!
        const nextGenre = MT.AI_GENRES[Math.floor(Math.random() * MT.AI_GENRES.length)].id;
        state.song = MT.composeFullSong(nextGenre, { seed: Date.now() });
        syncSongToUI(true);
      }
    }
  });

  // Restore remix or share hash if present, else boot with rich ready-to-play Synthwave full song!
  let initialSong = null;
  try {
    const remixRaw = localStorage.getItem('sp_remix_state');
    if (remixRaw) {
      const parsed = JSON.parse(remixRaw);
      if (parsed && parsed.song && Array.isArray(parsed.song.banks) && parsed.song.banks.length === 4) {
        initialSong = parsed.song;
        localStorage.removeItem('sp_remix_state');
      }
    }
  } catch (_) {}

  if (!initialSong && window.location.hash.startsWith('#sp4d=')) {
    const sh = EX.decodeShareHash(window.location.hash);
    if (sh && sh.g) {
      initialSong = MT.composeFullSong(sh.g, { bpm: sh.b, root: sh.r, scale: sh.sc });
      if (sh.t) initialSong.title = sh.t;
      if (sh.th) initialSong.theme = sh.th;
      if (sh.md) initialSong.model = sh.md;
    }
  }

  state.song = initialSong || MT.composeFullSong('synthwave', { seed: 42080 });

  populateGenreSelect();
  populateModelSelect();
  populateKeyScaleSelects();
  renderEmotionsGrid();
  buildPianoKeyboard();
  bindEvents();
  setLanguage(state.lang);
}

boot();
