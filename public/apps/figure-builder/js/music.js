/**
 * music.js — 4D Figure Builder Music Engine
 * Pure Web Audio API — no external dependencies.
 * v2: adds MediaStreamDestination (audio in video export) + AnalyserNode (beat sync)
 */
const MusicEngine = (() => {
    let ctx = null, masterGain = null, schedulerId = null;
    let isPlaying = false, currentPresetIdx = -1, pIdx = 0, lastNoteTime = 0;
    let currentPreset = null, frequencies = [];
    let bpm = 120;
    // New: audio capture + analyser
    let streamDest = null, analyser = null, analyserData = null;
    let _beatPower = 0;

    function getCtx() {
        if (!ctx) {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
            masterGain = ctx.createGain();
            masterGain.gain.value = 0.5;

            // Reverb
            const rev = ctx.createConvolver();
            const buf = ctx.createBuffer(2, ctx.sampleRate * 2, ctx.sampleRate);
            for (let c = 0; c < 2; c++) {
                const d = buf.getChannelData(c);
                for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/d.length, 3);
            }
            rev.buffer = buf;
            const rg = ctx.createGain(); rg.gain.value = 0.2;
            masterGain.connect(rev); rev.connect(rg); rg.connect(ctx.destination);
            masterGain.connect(ctx.destination);

            // Analyser for beat detection (connected before destination)
            analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.7;
            analyserData = new Uint8Array(analyser.frequencyBinCount);
            masterGain.connect(analyser);

            // MediaStreamDestination so audio can be captured in video recordings
            streamDest = ctx.createMediaStreamDestination();
            masterGain.connect(streamDest);
        }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }

    const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    const SCALES = {
        major:[0,2,4,5,7,9,11], minor:[0,2,3,5,7,8,10], pentatonic:[0,2,4,7,9],
        blues:[0,3,5,6,7,10], dorian:[0,2,3,5,7,9,10], phrygian:[0,1,3,5,7,8,10],
        lydian:[0,2,4,6,7,9,11], wholetone:[0,2,4,6,8,10], diminished:[0,2,3,5,6,8,9,11],
    };
    const ROOTS = ['C','D','E','F','G','A','B'];

    function scaleFreqs(root, scaleName, octave = 4) {
        const ints = SCALES[scaleName] || SCALES.pentatonic;
        const ri = NOTE_NAMES.indexOf(root);
        const freqs = [];
        for (let i = 0; i < ints.length * 2; i++) {
            const semi = ints[i % ints.length] + Math.floor(i / ints.length) * 12;
            freqs.push(440 * Math.pow(2, (ri - 9 + (octave - 4) * 12 + semi) / 12));
        }
        return freqs;
    }

    function playNote(freq, t0, dur, wave = 'sine', vel = 0.45) {
        const c = getCtx();
        const o = c.createOscillator(), g = c.createGain();
        o.type = wave; o.frequency.setValueAtTime(freq, t0);
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(vel, t0 + 0.02);
        g.gain.setTargetAtTime(0, t0 + dur * 0.7, 0.06);
        o.connect(g); g.connect(masterGain);
        o.start(t0); o.stop(t0 + dur + 0.15);
    }

    // Beat power: call every animation frame. Returns 0..1
    function updateBeat() {
        if (!analyser || !analyserData) return 0;
        analyser.getByteFrequencyData(analyserData);
        // Use bass frequencies (lower bins) for beat
        let sum = 0;
        const bassEnd = Math.min(8, analyserData.length);
        for (let i = 0; i < bassEnd; i++) sum += analyserData[i];
        const rms = sum / bassEnd / 255;
        _beatPower += (rms - _beatPower) * 0.25;
        return _beatPower;
    }

    const PRESETS = [
        { id:0,  name_en:'Cosmic Drift',      name_fr:'Dérive Cosmique',      icon:'🌌', root:'A', scale:'pentatonic',  octave:4, wave:'sine',     bpm:80,  arp:true,  pattern:[0,2,4,7,4,2,0,4,7,9,7,4,2,0,4,2],         durations:[0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,1]     },
        { id:1,  name_en:'Quantum Pulse',     name_fr:'Pulsation Quantique',  icon:'⚡', root:'E', scale:'minor',       octave:3, wave:'sawtooth',  bpm:140, arp:false, pattern:[0,0,2,0,3,0,2,0,0,0,3,0,5,3,2,0],         durations:[0.25,0.25,0.25,0.25,0.5,0.25,0.25,0.25,0.25,0.25,0.5,0.25,0.5,0.25,0.5,0.5] },
        { id:2,  name_en:'Hyperspace',        name_fr:'Hyperespace',          icon:'🚀', root:'D', scale:'wholetone',   octave:4, wave:'triangle',  bpm:100, arp:true,  pattern:[0,1,2,3,4,5,4,3,2,1,0,5,4,3,2,1],         durations:[0.4,0.4,0.4,0.4,0.4,0.4,0.4,0.4,0.4,0.4,0.4,0.4,0.4,0.4,0.4,0.5]  },
        { id:3,  name_en:'Alien Chant',       name_fr:'Chant Extraterrestre', icon:'👽', root:'G', scale:'phrygian',    octave:3, wave:'sine',     bpm:72,  arp:false, pattern:[0,1,0,3,0,1,3,5,1,0,5,3,1,0,3,1],         durations:[0.5,0.25,0.5,0.5,0.25,0.5,0.25,0.5,0.5,0.25,0.5,0.5,0.25,0.5,0.5,1] },
        { id:4,  name_en:'Neural Grid',       name_fr:'Grille Neurale',       icon:'🧠', root:'C', scale:'diminished',  octave:4, wave:'square',   bpm:160, arp:true,  pattern:[0,3,1,4,2,5,3,6,4,7,5,6,4,3,2,0],         durations:[0.25,0.25,0.25,0.25,0.25,0.25,0.25,0.25,0.25,0.25,0.25,0.25,0.5,0.25,0.25,0.5] },
        { id:5,  name_en:'Void Whisper',      name_fr:'Murmure du Vide',      icon:'🌑', root:'B', scale:'minor',       octave:3, wave:'sine',     bpm:55,  arp:false, pattern:[0,2,0,3,2,0,5,3,2,0,3,2,0,7,5,0],         durations:[1,0.5,1,0.5,0.5,1,0.5,0.5,1,0.5,0.5,0.5,1,0.5,0.5,2]              },
        { id:6,  name_en:'Crystal Resonance', name_fr:'Résonance Cristalline',icon:'💎', root:'F', scale:'lydian',      octave:4, wave:'triangle', bpm:90,  arp:true,  pattern:[0,2,4,6,7,6,4,2,0,4,6,7,9,7,6,4],         durations:[0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,1]    },
        { id:7,  name_en:'Robot March',       name_fr:'Marche des Robots',    icon:'🤖', root:'D', scale:'minor',       octave:3, wave:'square',   bpm:120, arp:false, pattern:[0,0,0,3,0,0,0,5,3,0,5,3,2,0,2,0],         durations:[0.25,0.25,0.25,0.25,0.25,0.25,0.5,0.25,0.25,0.25,0.5,0.25,0.25,0.25,0.5,0.5] },
        { id:8,  name_en:'Dimension Gate',    name_fr:'Portail Dimensionnel', icon:'🌀', root:'A', scale:'diminished',  octave:4, wave:'sawtooth',  bpm:130, arp:true,  pattern:[0,1,0,2,0,3,0,4,0,5,0,6,0,5,0,4],         durations:[0.25,0.125,0.25,0.125,0.25,0.125,0.25,0.125,0.25,0.125,0.25,0.125,0.5,0.125,0.5,0.5] },
        { id:9,  name_en:'Aurora Waves',      name_fr:'Vagues Aurorales',     icon:'🌈', root:'G', scale:'major',       octave:4, wave:'sine',     bpm:76,  arp:false, pattern:[0,2,4,5,4,2,0,2,4,5,7,5,4,2,4,0],         durations:[0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,1]    },
        { id:10, name_en:'Singularity',       name_fr:'Singularité',          icon:'⚫', root:'C#',scale:'diminished',  octave:3, wave:'sawtooth',  bpm:145, arp:true,  pattern:[0,3,6,9,6,3,0,9,6,3,9,6,3,0,6,3],         durations:[0.25,0.25,0.25,0.25,0.25,0.25,0.5,0.25,0.25,0.25,0.25,0.25,0.25,0.5,0.25,0.5] },
        { id:11, name_en:'Telepathy',         name_fr:'Télépathie',           icon:'📡', root:'E', scale:'pentatonic',  octave:4, wave:'triangle', bpm:88,  arp:false, pattern:[4,2,0,2,4,4,4,2,2,2,0,0,0,2,4,0],         durations:[0.5,0.5,1,0.5,0.5,0.25,0.25,0.5,0.5,0.25,0.25,0.5,0.5,0.5,0.5,1]  },
        { id:12, name_en:'Neon Circuit',      name_fr:'Circuit Néon',         icon:'💡', root:'F#',scale:'dorian',      octave:3, wave:'square',   bpm:150, arp:true,  pattern:[0,2,3,5,7,5,3,2,0,3,5,7,8,7,5,3],         durations:[0.25,0.25,0.5,0.25,0.5,0.25,0.25,0.5,0.25,0.5,0.25,0.5,0.25,0.25,0.5,0.5] },
        { id:13, name_en:'Nebula Lullaby',    name_fr:'Berceuse Nébuleuse',   icon:'🌠', root:'C', scale:'major',       octave:4, wave:'sine',     bpm:60,  arp:false, pattern:[0,4,2,4,0,4,2,5,4,2,0,2,4,0,2,0],         durations:[1,0.5,0.5,1,1,0.5,0.5,1,0.5,0.5,1,0.5,0.5,1,0.5,2]                },
        { id:14, name_en:'Warp Drive',        name_fr:'Propulsion Warp',      icon:'🛸', root:'G#',scale:'minor',       octave:3, wave:'sawtooth',  bpm:180, arp:true,  pattern:[0,2,3,5,7,8,7,5,3,2,0,3,5,7,5,3],         durations:[0.25,0.125,0.25,0.125,0.25,0.25,0.25,0.125,0.25,0.125,0.5,0.25,0.25,0.5,0.25,0.5] },
        { id:15, name_en:'Sacred Geometry',   name_fr:'Géométrie Sacrée',     icon:'🔷', root:'D', scale:'pentatonic',  octave:3, wave:'triangle', bpm:96,  arp:false, pattern:[0,7,4,9,2,7,4,0,7,4,9,7,4,2,0,9],         durations:[0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,1]    },
        { id:16, name_en:'Xenomorph Call',    name_fr:'Appel Xénomorphe',     icon:'👾', root:'A#',scale:'phrygian',    octave:3, wave:'square',   bpm:65,  arp:false, pattern:[1,0,1,3,1,0,3,5,3,1,5,3,1,0,1,3],         durations:[0.5,0.5,0.25,0.5,0.5,0.25,0.5,0.5,0.5,0.25,0.5,0.5,0.25,0.5,0.5,1] },
        { id:17, name_en:'Time Crystal',      name_fr:'Cristal Temporel',     icon:'⏳', root:'B', scale:'diminished',  octave:4, wave:'sine',     bpm:108, arp:true,  pattern:[0,3,6,9,3,6,0,9,6,9,3,6,9,0,3,6],         durations:[0.4,0.4,0.4,0.4,0.4,0.4,0.4,0.4,0.4,0.4,0.4,0.4,0.4,0.4,0.4,0.5]  },
        { id:18, name_en:'Plasma Storm',      name_fr:'Tempête de Plasma',    icon:'🌩', root:'F', scale:'wholetone',   octave:4, wave:'sawtooth',  bpm:170, arp:true,  pattern:[0,2,4,6,4,2,0,6,2,4,6,8,6,4,2,0],         durations:[0.25,0.25,0.25,0.25,0.25,0.25,0.25,0.25,0.25,0.25,0.25,0.25,0.25,0.25,0.25,0.5] },
        { id:19, name_en:'Eternal Return',    name_fr:'Retour Éternel',       icon:'♾', root:'A', scale:'dorian',      octave:4, wave:'triangle', bpm:82,  arp:false, pattern:[0,9,2,7,4,5,4,7,2,9,0,7,5,4,2,0],         durations:[0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,2]    },
        { id:20, name_en:'Binary Sunset',     name_fr:'Coucher Binaire',      icon:'🌅', root:'C', scale:'pentatonic',  octave:4, wave:'sine',     bpm:70,  arp:false, pattern:[4,2,0,2,4,4,4,2,2,0,2,0,2,4,2,0],         durations:[0.5,0.5,1,0.5,0.5,0.5,0.5,0.5,0.5,1,0.5,0.5,0.5,0.5,0.5,2]         },
        { id:21, name_en:'Hypercube Dance',   name_fr:"Danse de l'Hypercube", icon:'🕺', root:'E', scale:'dorian',      octave:4, wave:'square',   bpm:135, arp:true,  pattern:[0,2,3,5,7,5,3,2,0,7,5,3,2,0,3,5],         durations:[0.25,0.25,0.25,0.25,0.5,0.25,0.25,0.25,0.5,0.25,0.25,0.25,0.25,0.5,0.25,0.5] },
        { id:22, name_en:'Starforge',         name_fr:'Forge Stellaire',      icon:'⭐', root:'G', scale:'minor',       octave:3, wave:'sawtooth',  bpm:115, arp:false, pattern:[0,0,0,7,3,5,3,2,0,0,5,3,2,0,5,7],         durations:[0.5,0.25,0.25,0.5,0.25,0.5,0.25,0.5,0.5,0.25,0.5,0.25,0.5,0.5,0.25,1] },
        { id:23, name_en:'Morphic Field',     name_fr:'Champ Morphique',      icon:'🫧', root:'D#',scale:'blues',       octave:3, wave:'triangle', bpm:92,  arp:false, pattern:[0,3,4,3,0,3,5,3,4,3,0,4,3,0,3,4],         durations:[0.5,0.25,0.25,0.5,0.5,0.25,0.5,0.25,0.25,0.5,0.5,0.25,0.5,0.5,0.25,1] },
        { id:24, name_en:'4D Symphony',       name_fr:'Symphonie 4D',         icon:'🎼', root:'C', scale:'major',       octave:4, wave:'sine',     bpm:86,  arp:true,  pattern:[0,4,7,4,2,5,9,5,4,7,11,7,5,9,12,9],        durations:[0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,2]    },
    ];

    const AI_THEMES = {
        cosmic:  { scales:['pentatonic','lydian','wholetone'],  waves:['sine','triangle'],    tempos:[70,85,96],   name_en:'Cosmic',    name_fr:'Cosmique'       },
        dark:    { scales:['diminished','minor','phrygian'],    waves:['sawtooth','square'],  tempos:[110,130,150],name_en:'Dark',      name_fr:'Sombre'          },
        alien:   { scales:['phrygian','blues','wholetone'],     waves:['sine','square'],      tempos:[65,80,92],   name_en:'Alien',     name_fr:'Extraterrestre'  },
        tech:    { scales:['dorian','diminished','minor'],      waves:['square','sawtooth'],  tempos:[140,155,180],name_en:'Tech',      name_fr:'Technologique'   },
        nature:  { scales:['pentatonic','major','dorian'],      waves:['sine','triangle'],    tempos:[60,72,88],   name_en:'Nature',    name_fr:'Nature'          },
        battle:  { scales:['minor','diminished','phrygian'],    waves:['sawtooth','square'],  tempos:[160,180,200],name_en:'Battle',    name_fr:'Combat'          },
        dream:   { scales:['lydian','pentatonic','wholetone'],  waves:['sine','triangle'],    tempos:[55,65,75],   name_en:'Dream',     name_fr:'Rêve'            },
        tribal:  { scales:['blues','pentatonic','dorian'],      waves:['triangle','sine'],    tempos:[90,100,115], name_en:'Tribal',    name_fr:'Tribal'          },
    };

    function scheduleNotes() {
        if (!isPlaying || !currentPreset) return;
        const c = getCtx();
        const spb = 60 / (currentPreset.bpm || bpm);
        while (lastNoteTime < c.currentTime + 0.5) {
            const ni = pIdx % currentPreset.pattern.length;
            const deg = currentPreset.pattern[ni];
            const dur = currentPreset.durations[ni] * spb * 2;
            const freq = frequencies[Math.min(deg, frequencies.length - 1)];
            playNote(freq, Math.max(lastNoteTime, c.currentTime + 0.01), dur, currentPreset.wave || 'sine', 0.4);
            if (currentPreset.arp && ni % 8 === 0) playNote(frequencies[0] * 0.5, Math.max(lastNoteTime, c.currentTime + 0.01), dur * 2, 'sine', 0.1);
            lastNoteTime += dur;
            pIdx++;
        }
        schedulerId = setTimeout(scheduleNotes, 180);
    }

    function playPreset(idx) {
        stop();
        const preset = PRESETS[idx];
        if (!preset) return null;
        currentPreset = preset; currentPresetIdx = idx;
        frequencies = scaleFreqs(preset.root, preset.scale, preset.octave);
        isPlaying = true; pIdx = 0;
        lastNoteTime = getCtx().currentTime + 0.05;
        scheduleNotes();
        return preset;
    }

    function stop() {
        isPlaying = false; clearTimeout(schedulerId); pIdx = 0; lastNoteTime = 0;
    }

    function setVolume(v) { if (masterGain) masterGain.gain.setTargetAtTime(v, getCtx().currentTime, 0.05); }
    
    function setBPM(v) {
        bpm = v;
        if (currentPreset) currentPreset.bpm = v;
    }

    function aiGenerate(themeName) {
        const theme = AI_THEMES[themeName] || AI_THEMES.cosmic;
        const pick = arr => arr[Math.floor(Math.random() * arr.length)];
        const scale = pick(theme.scales), wave = pick(theme.waves), tempo = pick(theme.tempos);
        const root = pick(ROOTS), octave = 3 + Math.floor(Math.random() * 2);
        const len = pick([8,12,16]);
        const pattern = [], durations = [];
        const dCh = [0.25,0.5,0.5,0.75,1.0];
        const maxDeg = (SCALES[scale] || [0]).length * 2 - 1;
        for (let i = 0; i < len; i++) { pattern.push(Math.floor(Math.random()*(maxDeg+1))); durations.push(pick(dCh)); }
        stop();
        currentPreset = { id:'ai', name_en:`AI ${theme.name_en}`, name_fr:`IA ${theme.name_fr}`, root, scale, octave, wave, pattern, durations, bpm: tempo, arp: Math.random()>0.5, icon:'🤖' };
        currentPresetIdx = -1;
        frequencies = scaleFreqs(root, scale, octave);
        isPlaying = true; pIdx = 0;
        lastNoteTime = getCtx().currentTime + 0.05;
        scheduleNotes();
        return currentPreset;
    }

    /** Returns the MediaStream containing the audio output — for video recording */
    function getAudioStream() {
        getCtx(); // ensure initialised
        return streamDest ? streamDest.stream : null;
    }

    /** Returns the live beat power 0..1 — call every animation frame */
    function getBeatPower() { return updateBeat(); }

    /** BPM of the current melody */
    function getCurrentBpm() { return currentPreset ? (currentPreset.bpm || bpm) : bpm; }

    return {
        PRESETS, AI_THEMES,
        playPreset, stop, setVolume, setBPM, aiGenerate,
        isPlaying: () => isPlaying,
        currentIdx: () => currentPresetIdx,
        getAudioStream,
        getBeatPower,
        getCurrentBpm,
    };
})();

