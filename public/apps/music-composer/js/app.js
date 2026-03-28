/**
 * 4D Music Composer & Visualizer
 * Core Application Logic
 */

// --- 1. LANGUAGE DICTIONARY ---

const dict = {
    en: {
        appTitle: "4D Music Composer",
        instrumentsTitle: "Instruments & Sequence",
        play: "Play",
        stop: "Stop",
        bpm: "BPM: ",
        clearSequence: "Clear All",
        save: "Save",
        load: "Load",
        record: "REC",
        stopRecord: "STOP",
        fxTitle: "Audio Effects",
        reverbLevel: "Reverb",
        delayLevel: "Delay",
        distLevel: "Distortion",
        chorusLevel: "Chorus",
        bitLevel: "8-Bit Crush",
        phaserLevel: "Space Phaser",
        mic: "Mic On",
        exportMidi: "Export MIDI",
        swing: "Swing",
        sentinel: "Quantum Sentinel",
        jellyfish: "Ethereal Jellyfish",
        golem: "Rhythm Golem",
        seraphim: "The Seraphim",
        arachnoid: "Arachnoid Construct",
        parasite: "Neural Parasite",
        twins: "Symbiotic Twins",
        lotus: "Hyper-Lotus",
        autopilot: "Autopilot",
        vjCamera: "VJ Camera",
        exportStems: "Export Stems",
        presetLabel: "Studio Templates",
        customText: "Custom Neon Text",
        pitch: "Pitch: ",
        aiGenre: "Musical Genre",
        visualsTitle: "4D Visuals",
        modelType: "Model Type",
        cube: "Hyper Cube",
        sphere: "Energy Sphere",
        torus: "Neon Torus",
        icosa: "Crystal Icosahedron",
        pyramid: "Quantum Pyramid",
        dodeca: "Mystic Dodecahedron",
        torusknot: "Infinity Knot",
        colorTheme: "Color Theme",
        cyberpunk: "Cyberpunk Neon",
        synthwave: "Retro Synthwave",
        matrix: "Matrix Green",
        fire: "Lava Inferno",
        ocean: "Deep Ocean",
        gold: "Royal Gold",
        vaporwave: "Vaporwave Dream"
    },
    fr: {
        appTitle: "Compositeur 4D",
        instrumentsTitle: "Instruments & Séquence",
        play: "Jouer",
        stop: "Arrêt",
        bpm: "BPM: ",
        aiGeneratorTitle: "Générateur IA",
        aiDesc: "Génère automatiquement des séquences mélodiques uniques.",
        generateMusic: "Générer Magie",
        clearSequence: "Tout Effacer",
        save: "Sauver",
        load: "Charger",
        record: "ENR",
        stopRecord: "STOP",
        fxTitle: "Effets Audio",
        reverbLevel: "Réverbération",
        delayLevel: "Délai",
        distLevel: "Distorsion",
        chorusLevel: "Chorus",
        bitLevel: "8-Bit Crush",
        phaserLevel: "Phaser Spatial",
        mic: "Micro",
        exportMidi: "Exporter MIDI",
        swing: "Swing",
        sentinel: "Sentinelle Quantique",
        jellyfish: "Méduse Éthérée",
        golem: "Golem du Rythme",
        seraphim: "Le Séraphin",
        arachnoid: "L'Arachnoïde",
        parasite: "Parasite Neuronal",
        twins: "Jumeaux Symbiotiques",
        lotus: "Hyper-Lotus",
        autopilot: "Pilote Auto",
        vjCamera: "Caméra VJ",
        exportStems: "Exporter Stems",
        presetLabel: "Modèles Studio",
        customText: "Texte 3D Néon",
        pitch: "Pitch: ",
        aiGenre: "Genre Musical",
        visualsTitle: "Visuels 4D",
        modelType: "Type de Modèle",
        cube: "Hyper Cube",
        sphere: "Sphère d'Énergie",
        torus: "Tore Néon",
        icosa: "Icosaèdre de Cristal",
        pyramid: "Pyramide Quantique",
        dodeca: "Dodécaèdre Mystique",
        torusknot: "Nœud Infini",
        colorTheme: "Thème de Couleur",
        cyberpunk: "Néon Cyberpunk",
        synthwave: "Rétro Synthwave",
        matrix: "Vert Matrix",
        fire: "Enfer de Lave",
        ocean: "Océan Profond",
        gold: "Or Royal",
        vaporwave: "Rêve Vaporwave"
    }
};

let currentLang = 'en';

function setLanguage(lang) {
    currentLang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[lang][key]) {
            if (key === 'bpm') {
                 el.innerHTML = `${dict[lang][key]} <span id="bpm-value">${document.getElementById('bpm-slider').value}</span>`;
            } else {
                 el.innerHTML = dict[lang][key];
            }
        }
    });
}

document.getElementById('lang-btn').addEventListener('click', () => {
    setLanguage(currentLang === 'en' ? 'fr' : 'en');
});


// --- 2. AUDIO & SEQUENCER LOGIC (Tone.js) ---

const NUM_STEPS = 16;
let currentStep = 0;
let isPlaying = false;
let synths = null;
let analyzer = null;
let reverbNode = null;
let delayNode = null;
let distNode = null;
let chorusNode = null;
let bitNode = null;
let phaserNode = null;
let fxMaster = null;
let pannerNode = null;
let userMedia = null;

const tracks = [
    { id: 'lead', name: 'Lead', defaultNote: 'C5', volNode: null, mute: false, solo: false, isDrum: false },
    { id: 'pad', name: 'Pad', defaultNote: ['C4', 'E4', 'G4'], volNode: null, mute: false, solo: false, isDrum: false },
    { id: 'bass', name: 'Bass', defaultNote: 'C2', volNode: null, mute: false, solo: false, isDrum: false },
    { id: 'kick', name: 'Kick', defaultNote: 'C1', volNode: null, isDrum: true, mute: false, solo: false },
    { id: 'snare', name: 'Snare', defaultNote: 'C2', volNode: null, isDrum: true, mute: false, solo: false },
    { id: 'hihat', name: 'Hi-Hat', defaultNote: 'C4', volNode: null, isDrum: true, mute: false, solo: false }
];

const patterns = [
    Array(6).fill().map(() => Array(NUM_STEPS).fill(null)),
    Array(6).fill().map(() => Array(NUM_STEPS).fill(null)),
    Array(6).fill().map(() => Array(NUM_STEPS).fill(null)),
    Array(6).fill().map(() => Array(NUM_STEPS).fill(null))
];
let currentBank = 0;

// Initialize tracks with Bank A
tracks.forEach((t, i) => t.steps = patterns[0][i]);

document.querySelectorAll('.btn-bank').forEach((btn, i) => {
    btn.addEventListener('click', () => {
        currentBank = i;
        document.querySelectorAll('.btn-bank').forEach((b, j) => b.classList.toggle('active-bank', i === j));
        tracks.forEach((t, j) => t.steps = patterns[i][j]);
        renderGrid();
    });
});

let micPitchShift, micAutoWah;

function createSynths() {
    analyzer = new Tone.Analyser("waveform", 64);
    fxMaster = new Tone.Volume(0);
    pannerNode = new Tone.Panner(0).connect(analyzer);
    pannerNode.toDestination();
    userMedia = new Tone.UserMedia();
    
    micAutoWah = new Tone.AutoWah(50, 6, -30).connect(analyzer);
    micAutoWah.Q.value = 6;
    micPitchShift = new Tone.PitchShift({pitch: 0, windowSize: 0.1}).connect(micAutoWah);
    
    reverbNode = new Tone.Freeverb().connect(pannerNode);
    delayNode = new Tone.FeedbackDelay("8n", 0.4).connect(reverbNode);
    bitNode = new Tone.BitCrusher(4).connect(delayNode);
    phaserNode = new Tone.Phaser({frequency: 15, octaves: 5, baseFrequency: 1000}).connect(bitNode);
    chorusNode = new Tone.Chorus(4, 2.5, 0.5).connect(phaserNode);
    distNode = new Tone.Distortion(0.8).connect(chorusNode);
    
    fxMaster.connect(distNode);
    
    reverbNode.wet.value = document.getElementById('fx-reverb').value / 100;
    delayNode.wet.value = document.getElementById('fx-delay').value / 100;
    distNode.wet.value = document.getElementById('fx-dist').value / 100;
    chorusNode.wet.value = document.getElementById('fx-chorus').value / 100;
    bitNode.wet.value = document.getElementById('fx-bit').value / 100;
    phaserNode.wet.value = document.getElementById('fx-phaser').value / 100;
    
    tracks.forEach(t => t.volNode = new Tone.Volume(0).connect(fxMaster));

    const lead = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "sawtooth" },
        envelope: { attack: 0.05, decay: 0.1, sustain: 0.2, release: 1 }
    }).connect(tracks[0].volNode);

    const pad = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "sine" },
        envelope: { attack: 0.5, decay: 0.1, sustain: 0.8, release: 2 }
    }).connect(tracks[1].volNode);

    const bass = new Tone.MonoSynth({
        oscillator: { type: "square" },
        envelope: { attack: 0.02, decay: 0.2, sustain: 0.2, release: 0.5 },
        filterEnvelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.5, baseFrequency: 100, octaves: 2 }
    }).connect(tracks[2].volNode);

    const kick = new Tone.MembraneSynth().connect(tracks[3].volNode);
    
    const snare = new Tone.NoiseSynth({
        noise: { type: "white" },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0 }
    }).connect(tracks[4].volNode);
    
    const hihat = new Tone.MetalSynth({
        envelope: { attack: 0.01, decay: 0.05, release: 0.01 },
        harmonicity: 5.1,
        modulationIndex: 32,
        resonance: 4000,
        octaves: 1.5
    }).connect(tracks[5].volNode);

    return { lead, pad, bass, kick, snare, hihat };
}

function renderGrid() {
    const rack = document.getElementById('instrument-rack');
    rack.innerHTML = '';
    
    tracks.forEach((track, trackIndex) => {
        const row = document.createElement('div');
        row.className = 'track-row';
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        
        const info = document.createElement('div');
        info.className = 'track-info';
        info.style.display = 'flex';
        info.style.flexDirection = 'column';
        info.style.gap = '2px';
        info.style.width = '100px';

        const nameSpan = document.createElement('span');
        nameSpan.innerText = track.name;
        info.appendChild(nameSpan);
        
        const volSlider = document.createElement('input');
        volSlider.type = 'range';
        volSlider.min = '-60';
        volSlider.max = '10';
        volSlider.value = '0';
        volSlider.style.width = '80%';
        volSlider.addEventListener('input', (e) => {
            if (track.volNode) track.volNode.volume.value = e.target.value;
        });
        info.appendChild(volSlider);
        
        const msContainer = document.createElement('div');
        msContainer.style.display = 'flex';
        msContainer.style.gap = '2px';
        
        const btnMute = document.createElement('button');
        btnMute.className = `btn-ms btn-mute ${track.mute ? 'active-mute' : ''}`;
        btnMute.innerText = 'M';
        btnMute.onclick = () => { track.mute = !track.mute; btnMute.classList.toggle('active-mute'); };
        
        const btnSolo = document.createElement('button');
        btnSolo.className = `btn-ms btn-solo ${track.solo ? 'active-solo' : ''}`;
        btnSolo.innerText = 'S';
        btnSolo.onclick = () => { track.solo = !track.solo; btnSolo.classList.toggle('active-solo'); };
        
        msContainer.appendChild(btnMute);
        msContainer.appendChild(btnSolo);
        info.appendChild(msContainer);
        
        if (track.isDrum) {
            const uploadBtn = document.createElement('input');
            uploadBtn.type = 'file';
            uploadBtn.title = 'Upload Custom Drum WAV/MP3';
            uploadBtn.accept = 'audio/*';
            uploadBtn.style.fontSize = '8px';
            uploadBtn.style.width = '80px';
            uploadBtn.addEventListener('change', (e) => {
                if(e.target.files.length > 0 && synths) {
                    const url = URL.createObjectURL(e.target.files[0]);
                    const sampler = new Tone.Sampler({ [Array.isArray(track.defaultNote) ? track.defaultNote[0] : track.defaultNote]: url }).connect(track.volNode);
                    synths[track.id] = sampler;
                }
            });
            info.appendChild(uploadBtn);
        } else {
            const pitchSelect = document.createElement('select');
            pitchSelect.style.fontSize = '9px';
            pitchSelect.style.width = '80%';
            pitchSelect.style.background = 'rgba(0,0,0,0.5)';
            pitchSelect.style.color = '#fff';
            
            const smartChords = [
                {val: 'C Maj', notes: ['C4','E4','G4']},
                {val: 'C Min', notes: ['C4','D#4','G4']},
                {val: 'D Min', notes: ['D4','F4','A4']},
                {val: 'F Maj', notes: ['F4','A4','C5']},
                {val: 'G Maj', notes: ['G4','B4','D5']},
                {val: 'A Min', notes: ['A4','C5','E5']},
                {val: 'Maj 7', notes: ['C4','E4','G4','B4']},
                {val: 'Min 7', notes: ['A3','C4','E4','G4']}
            ];
            const optGrpChords = document.createElement('optgroup');
            optGrpChords.label = "Smart Chords";
            smartChords.forEach(ch => {
                const opt = document.createElement('option');
                opt.value = JSON.stringify(ch.notes);
                opt.innerText = ch.val;
                if(opt.value === track.currentPaintPitch) opt.selected = true;
                optGrpChords.appendChild(opt);
            });
            pitchSelect.appendChild(optGrpChords);
            
            const optGrpNotes = document.createElement('optgroup');
            optGrpNotes.label = "Single Notes";
            const notes = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
            for(let oct=2; oct<=6; oct++) {
                notes.forEach(n => {
                    const opt = document.createElement('option');
                    opt.value = n+oct;
                    opt.innerText = n+oct;
                    if(opt.value === (Array.isArray(track.defaultNote)?track.defaultNote[0]:track.defaultNote)) opt.selected = true;
                    optGrpNotes.appendChild(opt);
                });
            }
            pitchSelect.appendChild(optGrpNotes);
            
            if(!track.currentPaintPitch) track.currentPaintPitch = (Array.isArray(track.defaultNote)?track.defaultNote[0]:track.defaultNote);
            pitchSelect.value = track.currentPaintPitch;
            pitchSelect.onchange = (e) => track.currentPaintPitch = e.target.value;
            info.appendChild(pitchSelect);
        }
        
        const grid = document.createElement('div');
        grid.className = 'step-grid';
        
        track.steps.forEach((stepNote, stepIndex) => {
            const btn = document.createElement('div');
            btn.className = 'step-btn';
            btn.id = `step-${trackIndex}-${stepIndex}`;
            
            if (stepNote !== null) {
                if (stepNote.velocity && stepNote.velocity < 1) btn.classList.add('ghost');
                else btn.classList.add(trackIndex < 3 ? 'active-primary' : 'active');
                
                if (!track.isDrum) {
                    const txt = Array.isArray(stepNote) ? 'Chrd' : (stepNote.note ? stepNote.note : stepNote).replace(/[0-9]/g, '');
                    btn.innerText = txt;
                    btn.style.fontSize = '9px';
                    btn.style.fontWeight = 'bold';
                    btn.style.color = '#000';
                    btn.style.display = 'flex';
                    btn.style.alignItems = 'center';
                    btn.style.justifyContent = 'center';
                }
            }
            
            btn.addEventListener('click', () => {
                if (track.isDrum) {
                    if (track.steps[stepIndex] === null) {
                        track.steps[stepIndex] = track.defaultNote;
                        btn.classList.add('active');
                    } else if (typeof track.steps[stepIndex] === 'string') {
                        track.steps[stepIndex] = { note: track.defaultNote, velocity: 0.5 };
                        btn.classList.remove('active');
                        btn.classList.add('ghost');
                    } else {
                        track.steps[stepIndex] = null;
                        btn.classList.remove('active', 'ghost');
                    }
                } else {
                    if (track.steps[stepIndex] !== null) {
                        track.steps[stepIndex] = null;
                        btn.classList.remove('active-primary');
                        btn.innerText = '';
                    } else {
                        let val = track.currentPaintPitch || track.defaultNote;
                        if (typeof val === 'string' && val.startsWith('[')) val = JSON.parse(val);
                        track.steps[stepIndex] = val;
                        btn.classList.add('active-primary');
                        btn.innerText = Array.isArray(val) ? 'Chrd' : val.replace(/[0-9]/g, '');
                        btn.style.fontSize = '9px';
                        btn.style.fontWeight = 'bold';
                        btn.style.color = '#000';
                        btn.style.display = 'flex';
                        btn.style.alignItems = 'center';
                        btn.style.justifyContent = 'center';
                    }
                }
            });
            grid.appendChild(btn);
        });
        
        row.appendChild(info);
        row.appendChild(grid);
        rack.appendChild(row);
    });
}

function initAudio() {
    renderGrid();
    
    Tone.Transport.scheduleRepeat((time) => {
        let stepIndex = currentStep;
        
        // Autopilot Handling
        if (stepIndex === 0) {
            measureCount++;
            if (isAutopilot && measureCount % 8 === 0) { // Every 2 bars
                const genres = ['techno', 'house', 'synthwave', 'trap', 'ambient'];
                document.getElementById('genre-select').value = genres[Math.floor(Math.random() * genres.length)];
                document.getElementById('btn-ai-gen').click();
                
                const colors = ['cyberpunk', 'synthwave', 'matrix', 'fire', 'ocean', 'gold', 'vaporwave'];
                document.getElementById('color-select').value = colors[Math.floor(Math.random() * colors.length)];
                setTheme(document.getElementById('color-select').value);
                
                const models = ['sentinel', 'jellyfish', 'golem', 'seraphim', 'arachnoid', 'parasite', 'twins', 'lotus'];
                document.getElementById('model-select').value = models[Math.floor(Math.random() * models.length)];
                setGeometry(document.getElementById('model-select').value);
            }
        }
        
        const anySolo = tracks.some(t => t.solo);
        
        tracks.forEach((track, index) => {
            if (track.mute || (anySolo && !track.solo)) return;
            
            const stepNote = track.steps[stepIndex];
            if (stepNote !== null && synths) {
                const synth = synths[track.id];
                const velocity = stepNote.velocity || 1;
                let note = stepNote.note || stepNote;
                
                if (synth) {
                    if (!track.isDrum) {
                        const shift = parseInt(document.getElementById('master-pitch').value) || 0;
                        if (shift !== 0) {
                            note = (Array.isArray(note) ? note : [note]).map(n => Tone.Frequency(n).transpose(shift).toNote());
                        }
                    }

                    if (synth instanceof Tone.PolySynth || track.id === 'bass') {
                        synth.triggerAttackRelease(note, "16n", time, velocity);
                    } else if (track.id === 'kick') {
                        synth.triggerAttackRelease(note, "8n", time, velocity);
                    } else if (track.id === 'snare') {
                        synth.triggerAttackRelease("16n", time, velocity);
                    } else {
                        synth.triggerAttackRelease("32n", time, velocity);
                    }
                }
            }
        });

        Tone.Draw.schedule(() => {
            tracks.forEach((track, index) => {
                 const prevStep = (stepIndex - 1 + NUM_STEPS) % NUM_STEPS;
                 document.getElementById(`step-${index}-${prevStep}`)?.classList.remove('current-step');
                 document.getElementById(`step-${index}-${stepIndex}`)?.classList.add('current-step');
            });
        }, time);

        currentStep = (currentStep + 1) % NUM_STEPS;
    }, "16n");
}


// --- 3. UI CONTROLS ---

// Share URL
document.getElementById('btn-share').addEventListener('click', () => {
    const state = { p: patterns, b: Tone.Transport.bpm.value, s: Tone.Transport.swing, t: document.getElementById('color-select').value, m: document.getElementById('model-select').value };
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(state));
    window.location.hash = compressed;
    navigator.clipboard.writeText(window.location.href);
    const btn = document.getElementById('btn-share');
    btn.innerHTML = `<i class="fa-solid fa-check"></i> URL Copied!`;
    setTimeout(() => btn.innerHTML = `<i class="fa-solid fa-share-nodes"></i> Share URL`, 2000);
});

// Zen Mode
let isZenMode = false;
document.getElementById('btn-zen').addEventListener('click', async () => {
    isZenMode = true;
    document.body.classList.add('zen-mode');
    document.getElementById('btn-exit-zen').style.display = 'block';
    
    const elem = document.documentElement;
    if (elem.requestFullscreen) await elem.requestFullscreen().catch(e=>console.log(e));
    else if (elem.webkitRequestFullscreen) await elem.webkitRequestFullscreen().catch(e=>console.log(e));
    
    setTimeout(() => window.dispatchEvent(new Event('resize')), 200);
});

document.getElementById('btn-exit-zen').addEventListener('click', async () => {
    isZenMode = false;
    document.body.classList.remove('zen-mode');
    document.getElementById('btn-exit-zen').style.display = 'none';
    
    if (document.exitFullscreen && document.fullscreenElement) {
        await document.exitFullscreen().catch(e=>console.log(e));
    } else if (document.webkitExitFullscreen && document.fullscreenElement) {
        await document.webkitExitFullscreen().catch(e=>console.log(e));
    }
    
    setTimeout(() => window.dispatchEvent(new Event('resize')), 200);
});

// Pitch Label Updates
document.getElementById('master-pitch').addEventListener('input', (e) => {
    document.getElementById('pitch-label').innerText = "Pitch: " + (e.target.value > 0 ? "+" : "") + e.target.value;
});

// ---- Screen Wake Lock (Prevents laptop screen sleep during playback) ----
let wakeLock = null;
async function requestWakeLock() {
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.addEventListener('release', () => { wakeLock = null; });
        } catch (e) { console.log('Wake Lock not available:', e.message); }
    }
}
function releaseWakeLock() {
    if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
}
// Re-acquire lock if page becomes visible again while playing
document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && isPlaying && !wakeLock) await requestWakeLock();
});

document.getElementById('btn-play').addEventListener('click', async () => {
    await Tone.start();
    if (!synths) synths = createSynths();
    
    if (!isPlaying) {
        Tone.Transport.start();
        isPlaying = true;
        document.getElementById('btn-play').innerHTML = `<i class="fa-solid fa-pause"></i> <span>Pause</span>`;
        requestWakeLock();
    } else {
        Tone.Transport.pause();
        isPlaying = false;
        document.getElementById('btn-play').innerHTML = `<i class="fa-solid fa-play"></i> <span>Play</span>`;
        releaseWakeLock();
    }
});

document.getElementById('btn-stop').addEventListener('click', () => {
    Tone.Transport.stop();
    isPlaying = false;
    currentStep = 0;
    releaseWakeLock();
    document.getElementById('btn-play').innerHTML = `<i class="fa-solid fa-play"></i> <span>Play</span>`;
    
    // reset UI visuals
    document.querySelectorAll('.step-btn').forEach(btn => btn.classList.remove('current-step'));
});

document.getElementById('bpm-slider').addEventListener('input', (e) => {
    Tone.Transport.bpm.value = e.target.value;
    document.getElementById('bpm-value').innerText = e.target.value;
});

// Swing Control
document.getElementById('swing-slider').addEventListener('input', (e) => {
    Tone.Transport.swing = e.target.value / 100;
    Tone.Transport.swingSubdivision = "16n";
    document.getElementById('swing-label').innerText = `Swing ${e.target.value}%`;
});

// FX Controls
document.getElementById('fx-reverb').addEventListener('input', (e) => { if (reverbNode) reverbNode.wet.value = e.target.value / 100; });
document.getElementById('fx-delay').addEventListener('input', (e) => { if (delayNode) delayNode.wet.value = e.target.value / 100; });
document.getElementById('fx-dist').addEventListener('input', (e) => { if (distNode) distNode.wet.value = e.target.value / 100; });
document.getElementById('fx-chorus').addEventListener('input', (e) => { if (chorusNode) chorusNode.wet.value = e.target.value / 100; });
document.getElementById('fx-bit').addEventListener('input', (e) => { if (bitNode) bitNode.wet.value = e.target.value / 100; });
document.getElementById('fx-phaser').addEventListener('input', (e) => { if (phaserNode) phaserNode.wet.value = e.target.value / 100; });

// Audio Recording
let isRecording = false;
let mediaRecorder = null;
let recordedChunks = [];
let audioDestNode = null;

document.getElementById('btn-record').addEventListener('click', async () => {
    if (Tone.context.state !== 'running') await Tone.start();
    if (!synths) synths = createSynths();

    if (!isRecording) {
        // Create 30 FPS video stream from Three.js canvas
        const canvasStream = renderer.domElement.captureStream(30);
        
        // Setup MediaStream destination from Tone.js
        if (!audioDestNode) {
            audioDestNode = Tone.context.createMediaStreamDestination();
            Tone.getDestination().connect(audioDestNode);
        }
        
        // Combine video and audio tracks
        const combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...audioDestNode.stream.getAudioTracks()
        ]);
        
        // Setup MediaRecorder
        mediaRecorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });
        recordedChunks = [];
        
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunks.push(e.data);
        };
        
        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.download = "4d_music_composition.webm";
            anchor.href = url;
            anchor.click();
            URL.revokeObjectURL(url);
        };
        
        mediaRecorder.start();
        isRecording = true;
        document.getElementById('btn-record').style.background = 'red';
        document.getElementById('btn-record').innerHTML = `<i class="fa-solid fa-square"></i> <span data-i18n="stopRecord">STOP</span>`;
        if (currentLang === 'fr') setLanguage('fr');
    } else {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        isRecording = false;
        document.getElementById('btn-record').style.background = 'rgba(255, 50, 50, 0.2)';
        document.getElementById('btn-record').innerHTML = `<i class="fa-solid fa-circle"></i> <span data-i18n="record">REC</span>`;
        if (currentLang === 'fr') setLanguage('fr');
    }
});

// Save / Load System
document.getElementById('btn-save').addEventListener('click', () => {
    const dataToSave = patterns;
    localStorage.setItem('4dMusicComposition', JSON.stringify(dataToSave));
    localStorage.setItem('4dBPM', Tone.Transport.bpm.value);
    alert(currentLang === 'en' ? 'Sequence Saved!' : 'Séquence Sauvegardée!');
});

document.getElementById('btn-load').addEventListener('click', () => {
    const saved = localStorage.getItem('4dMusicComposition');
    const bpm = localStorage.getItem('4dBPM');
    if (saved) {
        const parsed = JSON.parse(saved);
        parsed.forEach((bank, bankIndex) => {
            bank.forEach((savedSteps, trackIndex) => {
                patterns[bankIndex][trackIndex] = savedSteps;
            });
        });
        tracks.forEach((t, i) => t.steps = patterns[currentBank][i]);
        
        if (bpm) {
            Tone.Transport.bpm.value = bpm;
            document.getElementById('bpm-slider').value = bpm;
            document.getElementById('bpm-value').innerText = Math.round(bpm);
        }
        renderGrid();
    } else {
        alert(currentLang === 'en' ? 'No save found.' : 'Aucune sauvegarde trouvée.');
    }
});

// =============================================================
//   PROFESSIONAL KEYBOARD SYNTHESIZER MODULE
// =============================================================

// --- KB Synth State ---
let kbSynth = null;           // Dedicated PolySynth for keys
let kbOctave = 4;             // Current base octave
let kbChordMode = false;      // Auto-chord (root + 3rd + 5th)
let kbArpMode = false;        // Arpeggiator on/off
let kbArpLoop = null;         // Tone.Loop instance for arp
let kbArpNotes = [];          // Notes held for arp
let kbArpIndex = 0;           // Current arp position
let kbArpDir = 1;             // 1=up, -1=down
let kbSustain = false;        // Sustain pedal state
let kbHeld = new Set();       // Currently held keyboard keys
let kbSustainedNotes = new Set(); // Notes sustained after key release
let kbWaveform = 'sawtooth';  // Current waveform

// Keyboard → note name (layout stays fixed; octave applied dynamically)
const KS_KEY_NOTES = {
    // Lower row: white notes
    'z':'C','x':'D','c':'E','v':'F','b':'G','n':'A','m':'B',
    ',':'C','.':'D','/':'E',
    // Lower row: black notes
    's':'C#','d':'D#','g':'F#','h':'G#','j':'A#',
    'l':'C#',';':'D#',
    // Upper row (one octave higher) white
    'q':'C','w':'D','e':'E','r':'F','t':'G','y':'A','u':'B',
    'i':'C','o':'D','p':'E',
    // Upper row black
    '2':'C#','3':'D#','5':'F#','6':'G#','7':'A#'
};

// Keys that are one octave higher than kbOctave
const KS_UPPER_KEYS = new Set([',','.','/',
    'q','w','e','r','t','y','u','i','o','p',
    'l',';','2','3','5','6','7']);

// Semi-tones for major chord (root, major 3rd, perfect 5th)
const CHORD_INTERVALS = [0, 4, 7];

// Map key → HTML element id for visual highlight
const KS_KEY_ELEM = {};

// --- Create dedicated keyboard PolySynth ---
function getKbSynth() {
    if (kbSynth) return kbSynth;
    // Ensure Tone audio context is ready before calling this
    kbSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: kbWaveform },
        envelope: {
            attack:  parseFloat(document.getElementById('ks-adsr-a').value),
            decay:   parseFloat(document.getElementById('ks-adsr-d').value),
            sustain: parseFloat(document.getElementById('ks-adsr-s').value),
            release: parseFloat(document.getElementById('ks-adsr-r').value)
        }
    });
    // Route through existing FX chain
    kbSynth.connect(fxMaster || Tone.getDestination());
    return kbSynth;
}

// --- Compute full note string (e.g. 'C#4') from key ---
function ksNoteForKey(key) {
    const noteName = KS_KEY_NOTES[key];
    if (!noteName) return null;
    const octave = KS_UPPER_KEYS.has(key) ? kbOctave + 1 : kbOctave;
    return noteName + octave;
}

// --- Expand note to chord notes ---
function ksChordNotes(rootNote) {
    return CHORD_INTERVALS.map(interval =>
        Tone.Frequency(rootNote).transpose(interval).toNote()
    );
}

// --- Play note(s) ---
function ksNoteOn(note, velocity) {
    const s = getKbSynth();
    const master = parseInt(document.getElementById('master-pitch').value) || 0;
    let notes = kbChordMode ? ksChordNotes(note) : [note];
    if (master !== 0) notes = notes.map(n => Tone.Frequency(n).transpose(master).toNote());
    s.triggerAttack(notes, Tone.now(), velocity);
    if (lights[0]) lights[0].intensity = 8;
    return notes;
}

// --- Release note(s) ---
function ksNoteOff(note) {
    const s = getKbSynth();
    const master = parseInt(document.getElementById('master-pitch').value) || 0;
    let notes = kbChordMode ? ksChordNotes(note) : [note];
    if (master !== 0) notes = notes.map(n => Tone.Frequency(n).transpose(master).toNote());
    s.triggerRelease(notes, Tone.now());
}

// --- Visual key highlight ---
function ksHighlightKey(elemId, on) {
    const el = document.getElementById(elemId);
    if (el) el.classList.toggle('pressed', on);
}

// --- Arp engine ---
function ksStartArp() {
    if (kbArpLoop) { kbArpLoop.dispose(); kbArpLoop = null; }
    const speed = document.getElementById('ks-arp-speed').value;
    kbArpIndex = 0;
    kbArpLoop = new Tone.Loop(time => {
        if (kbArpNotes.length === 0) return;
        const note = kbArpNotes[kbArpIndex % kbArpNotes.length];
        const s = getKbSynth();
        s.triggerAttackRelease(note, '32n', time, 0.75);
        kbArpIndex++;
        if (kbArpIndex >= kbArpNotes.length) {
            kbArpIndex = 0;
            kbArpDir *= -1; // bounce
            if (kbArpDir < 0) kbArpNotes.reverse();
        }
    }, speed).start(0);
}

function ksStopArp() {
    if (kbArpLoop) { kbArpLoop.dispose(); kbArpLoop = null; }
    kbArpIndex = 0;
}

// --- Build visual piano keyboard ---
(function buildPianoKeys() {
    const container = document.getElementById('ks-keys-container');
    container.innerHTML = '';

    // Define 2-octave key sequence starting from oct kbOctave
    // Pattern: C D E F G A B  (7 white, 5 black = 12 semitones)
    const whiteNames = ['C','D','E','F','G','A','B'];
    // Black key positions within octave (after C, D, F, G, A = positions 0,1,3,4,5)
    const blackPositions = [0, 1, 3, 4, 5]; // index of white key they're after
    const blackNames    = ['C#','D#','F#','G#','A#'];
    // keyboard letter assignments per white key (across 2 octaves)
    const whiteKeys2Oct = [
        ['z','x','c','v','b','n','m'],   // oct base
        [',','.','/',null,null,null,null] // oct+1 (only C D E visible)
    ];
    const blackKeys2Oct = [
        ['s','d',null,'g','h','j',null],  // oct base (no E# or B#)
        ['l',';',null,null,null,null,null]
    ];

    const NUM_OCT = 2;
    const WHITE_W = 34; // px per white key

    for (let oct = 0; oct < NUM_OCT; oct++) {
        const octN = (oct === 0) ? kbOctave : kbOctave + 1;
        whiteNames.forEach((name, wi) => {
            const kbdKey = whiteKeys2Oct[oct][wi];
            // Skip if no keys available for this position in this octave
            if (oct === 1 && wi > 2) return;

            const noteStr = name + octN;
            const el = document.createElement('div');
            el.className = 'ks-key-white';
            const elemId = 'ks-key-' + noteStr.replace('#','s');
            el.id = elemId;
            el.innerHTML = `<span class="ks-key-label">${noteStr}</span>${kbdKey ? '<span class="ks-key-kbd">['+kbdKey+']</span>' : ''}`;

            // Mouse events for click play
            el.addEventListener('mousedown', async (ev) => {
                ev.preventDefault();
                if (Tone.context.state !== 'running') await Tone.start();
                if (!synths) synths = createSynths();
                ksNoteOn(noteStr, 0.7);
                el.classList.add('pressed');
            });
            el.addEventListener('mouseup', () => {
                if (!kbSustain) { ksNoteOff(noteStr); el.classList.remove('pressed'); }
                else kbSustainedNotes.add(noteStr);
            });
            el.addEventListener('mouseleave', () => {
                if (!kbSustain) { ksNoteOff(noteStr); el.classList.remove('pressed'); }
            });

            if (kbdKey) KS_KEY_ELEM[kbdKey] = elemId;
            container.appendChild(el);

            // Black key after this white key (if applicable)
            const bi = blackPositions.indexOf(wi);
            if (bi !== -1) {
                const bName = blackNames[bi];
                const bNoteStr = bName + octN;
                const bKbdKey = blackKeys2Oct[oct][wi];
                const bEl = document.createElement('div');
                bEl.className = 'ks-key-black';
                const bElemId = 'ks-key-' + bNoteStr.replace('#','s');
                bEl.id = bElemId;
                bEl.innerHTML = `<span class="ks-key-label">${bNoteStr}</span>${bKbdKey ? '<span class="ks-key-kbd">['+bKbdKey+']</span>' : ''}`;

                // Position black key between white keys
                const whitesBefore = container.querySelectorAll('.ks-key-white').length - 1;
                bEl.style.left = (whitesBefore * WHITE_W + WHITE_W * 0.62) + 'px';

                bEl.addEventListener('mousedown', async (ev) => {
                    ev.preventDefault();
                    if (Tone.context.state !== 'running') await Tone.start();
                    if (!synths) synths = createSynths();
                    ksNoteOn(bNoteStr, 0.7);
                    bEl.classList.add('pressed');
                });
                bEl.addEventListener('mouseup', () => {
                    if (!kbSustain) { ksNoteOff(bNoteStr); bEl.classList.remove('pressed'); }
                    else kbSustainedNotes.add(bNoteStr);
                });
                bEl.addEventListener('mouseleave', () => {
                    if (!kbSustain) { ksNoteOff(bNoteStr); bEl.classList.remove('pressed'); }
                });

                if (bKbdKey) KS_KEY_ELEM[bKbdKey] = bElemId;
                container.appendChild(bEl);
            }
        });
    }
})();

// --- Keyboard event handlers (polyphonic, sustain, velocity) ---
window.addEventListener('keydown', async (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (e.repeat) return;

    const key = e.key.toLowerCase();

    // Octave shift via arrow keys
    if (e.key === 'ArrowLeft')  { kbOctave = Math.max(1, kbOctave - 1); document.getElementById('ks-octave-val').innerText = kbOctave; e.preventDefault(); return; }
    if (e.key === 'ArrowRight') { kbOctave = Math.min(7, kbOctave + 1); document.getElementById('ks-octave-val').innerText = kbOctave; e.preventDefault(); return; }

    // Sustain pedal = Space
    if (e.key === ' ') {
        e.preventDefault();
        kbSustain = true;
        const ind = document.getElementById('ks-sustain-indicator');
        ind.textContent = 'SUSTAIN ON';
        ind.classList.add('active');
        return;
    }

    if (!KS_KEY_NOTES[key]) return;
    e.preventDefault();

    if (Tone.context.state !== 'running') await Tone.start();
    if (!synths) synths = createSynths();

    // Velocity: Shift = forte (1.0), Ctrl = piano (0.4), else mezzo (0.7)
    let velocity = 0.7;
    let velLabel = 'vel: mf';
    if (e.shiftKey)   { velocity = 1.0; velLabel = 'vel: ff '; }
    else if (e.ctrlKey) { velocity = 0.4; velLabel = 'vel: pp'; }
    document.getElementById('ks-vel-display').textContent = velLabel;

    const note = ksNoteForKey(key);
    if (!note) return;

    kbHeld.add(key);
    if (kbArpMode) {
        if (!kbArpNotes.includes(note)) kbArpNotes.push(note);
    } else {
        ksNoteOn(note, velocity);
    }
    // visual
    const elemId = KS_KEY_ELEM[key];
    if (elemId) ksHighlightKey(elemId, true);
});


// ---- PANIC / NOTE RELEASE SAFETY ----
// Called whenever the window loses focus or Escape is pressed
// Prevents notes from getting stuck when keyup never fires
function kbPanic() {
    if (kbSynth) kbSynth.releaseAll();
    kbHeld.clear();
    kbSustainedNotes.clear();
    kbArpNotes = [];
    // Remove all visual pressed states
    document.querySelectorAll('.ks-key-white.pressed, .ks-key-black.pressed')
        .forEach(el => el.classList.remove('pressed'));
    // Reset sustain UI
    const ind = document.getElementById('ks-sustain-indicator');
    if (ind) { ind.textContent = 'SUSTAIN OFF'; ind.classList.remove('active'); }
    kbSustain = false;
}
window.addEventListener('blur', kbPanic);
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') kbPanic();
});

// ---- HELPER: release root + harmony voices ----
function kbFullNoteOff(note) {
    const quantNote = quantizeNoteToScale ? quantizeNoteToScale(note) : note;
    // Release root note
    if (kbSynth) {
        try { kbSynth.triggerRelease(quantNote, Tone.now()); } catch(e) {}
        // Release harmony voices if active
        if (typeof kbHarmVoices !== 'undefined' && kbHarmVoices > 0 &&
            typeof getHarmNotes === 'function') {
            const harmNotes = getHarmNotes(quantNote);
            if (harmNotes.length > 0) {
                try { kbSynth.triggerRelease(harmNotes, Tone.now()); } catch(e) {}
            }
        }
    }
}

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();

    // Escape = full panic (release everything)
    if (e.key === 'Escape') { kbPanic(); return; }

    // Release sustain pedal
    if (e.key === ' ') {
        kbSustain = false;
        const ind = document.getElementById('ks-sustain-indicator');
        ind.textContent = 'SUSTAIN OFF';
        ind.classList.remove('active');
        // Release all sustained notes (root + harmony)
        kbSustainedNotes.forEach(n => kbFullNoteOff(n));
        kbSustainedNotes.clear();
        return;
    }

    if (!KS_KEY_NOTES[key]) return;
    kbHeld.delete(key);
    const note = ksNoteForKey(key);
    if (!note) return;

    if (kbArpMode) {
        kbArpNotes = kbArpNotes.filter(n => n !== note);
    } else {
        if (kbSustain) {
            kbSustainedNotes.add(note);
        } else {
            kbFullNoteOff(note); // releases root + harmony voices
        }
    }

    const elemId = KS_KEY_ELEM[key];
    if (elemId && !kbSustain) ksHighlightKey(elemId, false);
});

// --- Waveform selector ---
document.getElementById('ks-wave-group').addEventListener('click', (e) => {
    const btn = e.target.closest('.ks-wave-btn');
    if (!btn) return;
    kbWaveform = btn.dataset.wave;
    document.querySelectorAll('.ks-wave-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (kbSynth) {
        kbSynth.set({ oscillator: { type: kbWaveform } });
    }
});

// --- ADSR live update ---
['ks-adsr-a','ks-adsr-d','ks-adsr-s','ks-adsr-r'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
        if (!kbSynth) return;
        kbSynth.set({ envelope: {
            attack:  parseFloat(document.getElementById('ks-adsr-a').value),
            decay:   parseFloat(document.getElementById('ks-adsr-d').value),
            sustain: parseFloat(document.getElementById('ks-adsr-s').value),
            release: parseFloat(document.getElementById('ks-adsr-r').value)
        }});
    });
});

// --- Octave buttons ---
document.getElementById('ks-oct-down').addEventListener('click', () => {
    kbOctave = Math.max(1, kbOctave - 1);
    document.getElementById('ks-octave-val').innerText = kbOctave;
});
document.getElementById('ks-oct-up').addEventListener('click', () => {
    kbOctave = Math.min(7, kbOctave + 1);
    document.getElementById('ks-octave-val').innerText = kbOctave;
});

// --- Chord Mode toggle ---
document.getElementById('ks-chord-btn').addEventListener('click', () => {
    kbChordMode = !kbChordMode;
    document.getElementById('ks-chord-btn').classList.toggle('active', kbChordMode);
});

// --- Arpeggiator toggle ---
document.getElementById('ks-arp-btn').addEventListener('click', async () => {
    kbArpMode = !kbArpMode;
    document.getElementById('ks-arp-btn').classList.toggle('active', kbArpMode);
    if (kbArpMode) {
        if (Tone.context.state !== 'running') await Tone.start();
        if (!synths) synths = createSynths();
        if (Tone.Transport.state !== 'started') Tone.Transport.start();
        ksStartArp();
    } else {
        ksStopArp();
        kbArpNotes = [];
    }
});

// Arp speed change
document.getElementById('ks-arp-speed').addEventListener('change', () => {
    if (kbArpMode) ksStartArp();
});

// =============================================================
//   FEATURE 1 — SCALE LOCK
//   Maps every keyboard note to the nearest in-scale pitch
// =============================================================

// Semitone offsets for each scale (relative to root C)
const SCALE_SEMITONES = {
    chromatic:   [0,1,2,3,4,5,6,7,8,9,10,11],
    major:       [0,2,4,5,7,9,11],
    minor:       [0,2,3,5,7,8,10],
    pentatonic:  [0,2,4,7,9],
    blues:       [0,3,5,6,7,10],
    dorian:      [0,2,3,5,7,9,10],
    phrygian:    [0,1,3,5,7,8,10],
    lydian:      [0,2,4,6,7,9,11],
    mixolydian:  [0,2,4,5,7,9,10],
    harmonic:    [0,2,3,5,7,8,11]
};

let kbScaleLocked = false;
let kbScaleName   = 'chromatic';

function quantizeNoteToScale(noteStr) {
    if (!kbScaleLocked || kbScaleName === 'chromatic') return noteStr;
    const freq   = Tone.Frequency(noteStr);
    const midi   = freq.toMidi();
    const semis  = SCALE_SEMITONES[kbScaleName];
    const rel    = midi % 12;
    // Find nearest in-scale semitone
    let best = semis[0], bestDist = 12;
    semis.forEach(s => {
        const d = Math.abs(((rel - s + 18) % 12) - 6); // circular distance
        if (d < bestDist) { bestDist = d; best = s; }
    });
    const quantMidi = midi - rel + best;
    return Tone.Frequency(quantMidi, 'midi').toNote();
}

// Patch ksNoteOn to quantize before playing
const _origNoteOn = ksNoteOn;
window.ksNoteOn = function(note, velocity) {
    return _origNoteOn(quantizeNoteToScale(note), velocity);
};
// Override global symbol
Object.defineProperty(window, 'ksNoteOn', { value: window.ksNoteOn, writable: true });

document.getElementById('ks-scale-lock-btn').addEventListener('click', () => {
    kbScaleLocked = !kbScaleLocked;
    kbScaleName   = document.getElementById('ks-scale-select').value;
    const btn = document.getElementById('ks-scale-lock-btn');
    btn.textContent = kbScaleLocked ? `Lock ON (${kbScaleName})` : 'Lock OFF';
    btn.classList.toggle('active', kbScaleLocked);
});
document.getElementById('ks-scale-select').addEventListener('change', () => {
    kbScaleName = document.getElementById('ks-scale-select').value;
    if (kbScaleLocked) {
        document.getElementById('ks-scale-lock-btn').textContent = `Lock ON (${kbScaleName})`;
    }
});

// =============================================================
//   FEATURE 2 — EMOTION ENGINE
// =============================================================

const EMOTIONS = {
    happy:  { scale:'major',      bpm:128, swing:10, rev:30, del:20, dist:0,  cho:40, bit:0,  pha:0,  wave:'sine',     theme:'cyberpunk', genre:'house' },
    sad:    { scale:'dorian',     bpm:80,  swing:0,  rev:70, del:40, dist:0,  cho:0,  bit:0,  pha:20, wave:'triangle', theme:'ocean',    genre:'ambient' },
    tense:  { scale:'phrygian',   bpm:145, swing:0,  rev:20, del:10, dist:50, cho:0,  bit:0,  pha:40, wave:'sawtooth', theme:'fire',     genre:'techno' },
    dreamy: { scale:'lydian',     bpm:72,  swing:20, rev:80, del:60, dist:0,  cho:30, bit:0,  pha:30, wave:'triangle', theme:'vaporwave',genre:'ambient' },
    rage:   { scale:'blues',      bpm:160, swing:0,  rev:10, del:10, dist:80, cho:0,  bit:20, pha:60, wave:'square',   theme:'synthwave',genre:'techno' },
    zen:    { scale:'pentatonic', bpm:60,  swing:0,  rev:90, del:50, dist:0,  cho:10, bit:0,  pha:10, wave:'sine',     theme:'matrix',   genre:'ambient' }
};

document.querySelectorAll('.ks-emotion-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        const em = EMOTIONS[btn.dataset.emotion];
        if (!em) return;

        // Mark active
        document.querySelectorAll('.ks-emotion-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Apply scale lock
        kbScaleName   = em.scale;
        kbScaleLocked = true;
        document.getElementById('ks-scale-select').value = em.scale;
        document.getElementById('ks-scale-lock-btn').textContent = `Lock ON (${em.scale})`;
        document.getElementById('ks-scale-lock-btn').classList.add('active');

        // Apply BPM
        Tone.Transport.bpm.value = em.bpm;
        document.getElementById('bpm-slider').value = em.bpm;
        document.getElementById('bpm-value').innerText = em.bpm;

        // Apply swing
        Tone.Transport.swing = em.swing / 100;
        document.getElementById('swing-slider').value = em.swing;
        document.getElementById('swing-label').innerText = `Swing ${em.swing}%`;

        // Apply FX
        const fxMap = { rev:'fx-reverb', del:'fx-delay', dist:'fx-dist', cho:'fx-chorus', bit:'fx-bit', pha:'fx-phaser' };
        Object.entries(fxMap).forEach(([k,id]) => {
            document.getElementById(id).value = em[k];
            document.getElementById(id).dispatchEvent(new Event('input'));
        });

        // Apply waveform
        kbWaveform = em.wave;
        document.querySelectorAll('.ks-wave-btn').forEach(b => b.classList.toggle('active', b.dataset.wave === em.wave));
        if (kbSynth) kbSynth.set({ oscillator: { type: em.wave } });

        // Apply visual theme + genre
        document.getElementById('color-select').value = em.theme;
        if (typeof setTheme === 'function') setTheme(em.theme);
        document.getElementById('genre-select').value = em.genre;
    });
});

// =============================================================
//   FEATURE 3 — LOOP LAYER RECORDER (F1=loop0, F2=loop1, F3=loop2)
// =============================================================

const LOOP_BARS = 4;  // Record length = 4 bars of 16n steps
const loopState = [
    { recording: false, playing: false, events: [], part: null, startTime: 0, recInterval: null },
    { recording: false, playing: false, events: [], part: null, startTime: 0, recInterval: null },
    { recording: false, playing: false, events: [], part: null, startTime: 0, recInterval: null }
];
const LOOP_COLORS = ['#ff4444','#44aaff','#44ff88'];

function loopRecordNote(loopIdx, note, velocity) {
    const ls = loopState[loopIdx];
    if (!ls.recording) return;
    const now = Tone.now();
    const loopDuration = Tone.Time(`${LOOP_BARS}m`).toSeconds();
    const t = (now - ls.startTime) % loopDuration;
    ls.events.push({ time: t, note, velocity: velocity || 0.7, duration: '8n' });
}

function startLoopRecording(loopIdx) {
    const ls = loopState[loopIdx];
    // Stop existing playback first
    if (ls.part) { ls.part.stop(); ls.part.dispose(); ls.part = null; }
    ls.events = [];
    ls.recording = true;
    ls.startTime = Tone.now();

    const btn = document.getElementById(`ks-loop-${loopIdx}`);
    btn.classList.add('recording');
    btn.classList.remove('playing');

    // Animate fill bar: fills over LOOP_BARS bars then auto-stops
    const loopSecs = Tone.Time(`${LOOP_BARS}m`).toSeconds();
    ls.recInterval = setInterval(() => {
        const elapsed = Tone.now() - ls.startTime;
        const pct = Math.min(100, (elapsed / loopSecs) * 100);
        document.getElementById(`ks-loop-fill-${loopIdx}`).style.width = pct + '%';
        if (pct >= 100) stopLoopRecording(loopIdx);
    }, 80);
}

function stopLoopRecording(loopIdx) {
    const ls = loopState[loopIdx];
    if (!ls.recording) return;
    ls.recording = false;
    clearInterval(ls.recInterval);

    const btn = document.getElementById(`ks-loop-${loopIdx}`);
    btn.classList.remove('recording');

    if (ls.events.length === 0) return;

    // Create Tone.Part for playback
    const loopDuration = `${LOOP_BARS}m`;
    ls.part = new Tone.Part((time, ev) => {
        const s = getKbSynth();
        s.triggerAttackRelease(ev.note, ev.duration, time, ev.velocity);
    }, ls.events.map(ev => [ev.time, ev]));
    ls.part.loop = true;
    ls.part.loopEnd = loopDuration;
    ls.part.start(0);
    ls.playing = true;
    btn.classList.add('playing');

    if (Tone.Transport.state !== 'started') Tone.Transport.start();
}

function toggleLoop(loopIdx) {
    const ls = loopState[loopIdx];
    if (ls.recording) {
        stopLoopRecording(loopIdx);
    } else if (ls.playing) {
        // Stop playback
        if (ls.part) { ls.part.stop(); ls.part.dispose(); ls.part = null; }
        ls.playing = false;
        ls.events = [];
        document.getElementById(`ks-loop-fill-${loopIdx}`).style.width = '0%';
        document.getElementById(`ks-loop-${loopIdx}`).classList.remove('playing', 'recording');
    } else {
        // Start recording
        if (Tone.context.state !== 'running') Tone.start();
        if (!synths) synths = createSynths();
        startLoopRecording(loopIdx);
    }
}

// F1/F2/F3 key bindings & click handlers
window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (e.key === 'F1') { e.preventDefault(); toggleLoop(0); }
    if (e.key === 'F2') { e.preventDefault(); toggleLoop(1); }
    if (e.key === 'F3') { e.preventDefault(); toggleLoop(2); }
    if (e.key === 'F4') { e.preventDefault(); document.getElementById('ks-loop-clear').click(); }
});

[0,1,2].forEach(i => {
    document.getElementById(`ks-loop-${i}`).addEventListener('click', () => toggleLoop(i));
});

document.getElementById('ks-loop-clear').addEventListener('click', () => {
    loopState.forEach((ls, i) => {
        if (ls.part) { ls.part.stop(); ls.part.dispose(); ls.part = null; }
        ls.recording = false; ls.playing = false; ls.events = [];
        clearInterval(ls.recInterval);
        document.getElementById(`ks-loop-fill-${i}`).style.width = '0%';
        document.getElementById(`ks-loop-${i}`).classList.remove('playing','recording');
    });
});

// Patch loopRecordNote into ksNoteOn (hook) — records into active recording loops
const _ksNoteOnOrig = window.ksNoteOn || ksNoteOn;
function ksNoteOnPatched(note, velocity) {
    const result = _ksNoteOnOrig(note, velocity);
    loopState.forEach((ls, i) => { if (ls.recording) loopRecordNote(i, quantizeNoteToScale(note), velocity); });
    return result;
}
// Replace ksNoteOn globally inside the module scope
window._ksNoteOnFinal = ksNoteOnPatched;

// =============================================================
//   FEATURE 4 — THEREMIN MOUSE FX (Tab + mouse XY)
// =============================================================

let thereminIsActive = false;  // Tab held (renamed from Cyrillic to ASCII)
let thereminFilter = null;
let thereminVibrato = null;

function initThereminFX() {
    if (thereminFilter) return;
    thereminFilter  = new Tone.AutoFilter({ frequency: 1, baseFrequency: 200, octaves: 4 }).toDestination();
    thereminVibrato = new Tone.Vibrato({ frequency: 5, depth: 0 });
    // Chain into keyboard synth output
    const s = getKbSynth();
    s.disconnect();
    s.chain(thereminVibrato, thereminFilter, fxMaster || Tone.getDestination());
    thereminFilter.start();
}

const thereminCursor = document.getElementById('theremin-cursor');
const thereminBar    = document.getElementById('theremin-active-bar');
const thereminHint   = document.getElementById('theremin-hint');

window.addEventListener('mousemove', (e) => {
    if (!thereminIsActive) return;
    const xRatio = e.clientX / window.innerWidth;   // 0→1
    const yRatio = 1 - (e.clientY / window.innerHeight); // 0→1 (inverted)

    // X → filter frequency (200 Hz → 8000 Hz)
    if (thereminFilter) thereminFilter.baseFrequency = 200 + xRatio * 7800;

    // Y → vibrato depth (0 → 0.9)
    if (thereminVibrato) thereminVibrato.depth.value = yRatio * 0.9;

    // Move the cursor glow
    thereminCursor.style.left = e.clientX + 'px';
    thereminCursor.style.top  = e.clientY + 'px';
    thereminCursor.style.transform = `scale(${0.5 + yRatio * 2})`;
});

window.addEventListener('keydown', async (e) => {
    if (e.key === 'Tab' && !thereminIsActive) {
        e.preventDefault();
        thereminIsActive = true;
        if (Tone.context.state !== 'running') await Tone.start();
        if (!synths) synths = createSynths();
        initThereminFX();
        thereminCursor.style.display = 'block';
        thereminBar.style.display    = 'block';
        thereminHint.style.display   = 'inline';
    }
}, true);

window.addEventListener('keyup', (e) => {
    if (e.key === 'Tab') {
        e.preventDefault();
        thereminIsActive = false;
        thereminCursor.style.display = 'none';
        thereminBar.style.display    = 'none';
        thereminHint.style.display   = 'none';
        // Reset filter + vibrato to neutral
        if (thereminFilter)  thereminFilter.baseFrequency  = 1000;
        if (thereminVibrato) thereminVibrato.depth.value   = 0;
    }
}, true);

// =============================================================
//   FEATURE 5 — AI SMART HARMONIZER
// =============================================================

let kbHarmVoices = 1; // 0=off, 1=one 5th, 2=third+5th, 3=third+5th+7th

// Scale-aware intervals per mode (semitones above root)
const HARM_SEMITONES = {
    chromatic:   [[7],[4,7],[4,7,11]],
    major:       [[7],[4,7],[4,7,11]],
    minor:       [[7],[3,7],[3,7,10]],
    pentatonic:  [[7],[4,7],[4,7,10]],
    blues:       [[7],[3,7],[3,7,10]],
    dorian:      [[7],[3,7],[3,7,10]],
    phrygian:    [[7],[3,7],[3,7,10]],
    lydian:      [[7],[4,7],[4,7,11]],
    mixolydian:  [[7],[4,7],[4,7,10]],
    harmonic:    [[7],[3,7],[3,7,11]]
};

function getHarmNotes(rootNote) {
    if (kbHarmVoices === 0) return [];
    const scale = kbScaleLocked ? kbScaleName : 'major';
    const tbl   = HARM_SEMITONES[scale] || HARM_SEMITONES.major;
    const intervals = tbl[Math.min(kbHarmVoices - 1, tbl.length - 1)];
    return intervals.map(i => Tone.Frequency(rootNote).transpose(i).toNote());
}

// Override ksNoteOn to add harmony
const _baseNoteOn2 = _ksNoteOnOrig;
function ksNoteOnWithHarmony(note, velocity) {
    // Play root
    const quantNote = quantizeNoteToScale(note);
    _baseNoteOn2(quantNote, velocity);
    // Record in active loops
    loopState.forEach((ls, i) => { if (ls.recording) loopRecordNote(i, quantNote, velocity); });
    // Play harmony voices
    if (kbHarmVoices > 0) {
        const harmNotes = getHarmNotes(quantNote);
        if (harmNotes.length > 0 && kbSynth) {
            kbSynth.triggerAttack(harmNotes, Tone.now(), velocity * 0.6);
        }
    }
}

// Override ksNoteOff to also release harmony
const _baseNoteOff = ksNoteOff;
window.ksNoteOffFull = function(note) {
    const quantNote = quantizeNoteToScale(note);
    _baseNoteOff(quantNote);
    if (kbHarmVoices > 0 && kbSynth) {
        const harmNotes = getHarmNotes(quantNote);
        if (harmNotes.length > 0) kbSynth.triggerRelease(harmNotes, Tone.now());
    }
};

// Harmonizer button group
document.querySelectorAll('.ks-harm-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        kbHarmVoices = parseInt(btn.dataset.voices);
        document.querySelectorAll('.ks-harm-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

// Also update padding when panel height changes with the second row
document.body.style.paddingBottom = (document.getElementById('keyboard-synth-panel').offsetHeight + 8) + 'px';
window.addEventListener('resize', () => {
    document.body.style.paddingBottom = (document.getElementById('keyboard-synth-panel').offsetHeight + 8) + 'px';
});

// Microphone Logic with Vocoder FX
document.getElementById('btn-mic').addEventListener('click', async () => {
    if (!userMedia) return;
    if (userMedia.state !== 'started') {
        try {
            await Tone.start();
            await userMedia.open();
            // Connect to PitchShift -> AutoWah vocoder chain
            userMedia.connect(micPitchShift);
            micPitchShift.toDestination(); // Output vocal monitoring
            
            document.getElementById('btn-mic').style.background = 'rgba(0, 255, 0, 0.4)';
            document.getElementById('btn-mic').style.color = '#00ff00';
            document.getElementById('btn-mic').innerHTML = `<i class="fa-solid fa-microphone"></i> <span data-i18n="mic">Mic Active</span>`;
        } catch (e) {
            alert('Microphone access denied or unavailable.');
        }
    } else {
        userMedia.close();
        userMedia.disconnect();
        document.getElementById('btn-mic').style.background = 'rgba(0, 200, 255, 0.2)';
        document.getElementById('btn-mic').style.color = '#00f3ff';
        document.getElementById('btn-mic').innerHTML = `<i class="fa-solid fa-microphone-slash"></i> <span data-i18n="mic">Mic Off</span>`;
    }
});

// MIDI Export
document.getElementById('btn-export-midi').addEventListener('click', () => {
    if (typeof Midi === 'undefined') {
        alert("MIDI library not loaded. Ensure you're connected to the internet.");
        return;
    }
    
    const midi = new Midi();
    midi.header.setTempo(Tone.Transport.bpm.value);
    
    // A 16n in seconds based on current BPM
    const tickDuration = Tone.Time("16n").toSeconds();
    
    tracks.forEach((t) => {
        const track = midi.addTrack();
        track.name = t.name;
        
        t.steps.forEach((stepNote, index) => {
            if (stepNote !== null) {
                const timeOffset = index * tickDuration;
                if (Array.isArray(stepNote)) {
                    stepNote.forEach(n => {
                        track.addNote({ name: n, time: timeOffset, duration: tickDuration });
                    });
                } else {
                    track.addNote({ name: stepNote, time: timeOffset, duration: tickDuration });
                }
            }
        });
    });
    
    const midiArray = midi.toArray();
    // Convert Uint8Array to base64
    let binary = '';
    for (let i = 0; i < midiArray.byteLength; i++) {
        binary += String.fromCharCode(midiArray[i]);
    }
    const base64 = window.btoa(binary);
    
    const uri = "data:audio/midi;base64," + base64;
    const anchor = document.createElement("a");
    anchor.download = "4d_music_composition.mid";
    anchor.href = uri;
    anchor.click();
});

// Stem Multi-Track Audio Export (Real-time Solo Bouncing)
document.getElementById('btn-export-stems').addEventListener('click', async () => {
    if (Tone.context.state !== 'running') await Tone.start();
    if (!synths) synths = createSynths();
    
    const btn = document.getElementById('btn-export-stems');
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>RENDERING STEMS...</span>`;
    btn.disabled = true;
    
    Tone.Transport.stop();
    const prevStates = tracks.map(t => ({ mute: t.mute, solo: t.solo }));
    
    for (let i = 0; i < tracks.length; i++) {
        // Solo just this track
        tracks.forEach((t, j) => { t.mute = (i !== j); t.solo = false; });
        
        let stemDest = Tone.context.createMediaStreamDestination();
        Tone.getDestination().connect(stemDest);
        let recorder = new MediaRecorder(stemDest.stream, { mimeType: 'audio/webm' });
        let chunks = [];
        recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
        
        await new Promise(r => { recorder.onstart = r; recorder.start(); });
        
        Tone.Transport.position = 0;
        currentStep = 0;
        Tone.Transport.start();
        
        const secPerBeat = 60 / Tone.Transport.bpm.value;
        const patternTime = secPerBeat * 4; // 1 bar (16 steps)
        await new Promise(r => setTimeout(r, patternTime * 2000)); // Play 2 bars
        
        Tone.Transport.stop();
        recorder.stop();
        
        await new Promise(r => {
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Stem_${i+1}_${tracks[i].name.replace(' ', '_')}.webm`;
                a.click();
                URL.revokeObjectURL(url);
                r();
            };
        });
        
        Tone.getDestination().disconnect(stemDest);
    }
    
    // Restore states
    tracks.forEach((t, i) => { t.mute = prevStates[i].mute; t.solo = prevStates[i].solo; });
    
    btn.innerHTML = `<i class="fa-solid fa-file-waveform"></i> <span data-i18n="exportStems">Export Stems</span>`;
    btn.disabled = false;
    if (currentLang === 'fr') setLanguage('fr');
});

// AI MUSIC GENERATOR
const scales = [
    ['C4', 'D#4', 'F4', 'G4', 'A#4', 'C5'], // C Minor Pentatonic
    ['D4', 'F4', 'G4', 'A4', 'C5', 'D5'],  // D Minor Pentatonic
    ['E4', 'G4', 'A4', 'B4', 'D5', 'E5']   // E Minor Pentatonic
];

document.getElementById('btn-ai-gen').addEventListener('click', () => {
    const genre = document.getElementById('genre-select').value;
    const scale = scales[Math.floor(Math.random() * scales.length)];
    const padChords = [
        [scale[0], scale[2], scale[4]],
        [scale[1], scale[3], scale[5]],
        [scale[0], scale[2], scale[4]]
    ];
    
    tracks.forEach(track => track.steps.fill(null));
    
    let targetBpm = 120;
    
    // Set Mic Pitch Shift based on scale base note (random octave)
    if (micPitchShift) micPitchShift.pitch = (Math.random() < 0.5 ? -12 : 12);

    for (let i = 0; i < NUM_STEPS; i++) {
        if (genre === 'techno') {
            targetBpm = 135;
            if (i % 4 === 0) tracks[3].steps[i] = tracks[3].defaultNote; // steady 4/4 kick
            if (i % 2 === 1) tracks[5].steps[i] = tracks[5].defaultNote; // offbeat hihat
            if (i % 8 === 4 && Math.random() > 0.5) tracks[4].steps[i] = tracks[4].defaultNote; // occasional snare
            if (i % 4 !== 0 && Math.random() > 0.3) {
                tracks[2].steps[i] = scale[Math.floor(Math.random() * 3)].replace('4', '2'); // syncopated low bass
            }
            if (Math.random() > 0.8) tracks[0].steps[i] = scale[Math.floor(Math.random() * scale.length)]; // sparse lead

        } else if (genre === 'house') {
            targetBpm = 120;
            if (i % 4 === 0) tracks[3].steps[i] = tracks[3].defaultNote; // 4/4 kick
            if (i % 8 === 4) tracks[4].steps[i] = tracks[4].defaultNote; // snare on 2/4
            if (i % 2 === 1 || Math.random() > 0.7) tracks[5].steps[i] = tracks[5].defaultNote; // swingy hats
            if (i % 8 === 2 || i % 8 === 6) tracks[1].steps[i] = padChords[0]; // offbeat chord stabs
            if (Math.random() > 0.6) tracks[2].steps[i] = scale[0].replace('4', '2'); // steady root bass
            if (Math.random() > 0.6) tracks[0].steps[i] = scale[Math.floor(Math.random() * scale.length)];

        } else if (genre === 'synthwave') {
            targetBpm = 100;
            if (i === 0 || i === 8 || i === 10) tracks[3].steps[i] = tracks[3].defaultNote; // typical 80s kick pattern
            if (i === 4 || i === 12) tracks[4].steps[i] = tracks[4].defaultNote; // big snare
            if (i % 2 === 0) tracks[5].steps[i] = tracks[5].defaultNote; // steady 8ths hat
            tracks[2].steps[i] = scale[0].replace('4', '2'); // driving 16th bass on
            if (i % 8 === 0) tracks[1].steps[i] = padChords[Math.floor(Math.random() * 2)];
            if (Math.random() > 0.6) tracks[0].steps[i] = scale[Math.floor(Math.random() * scale.length)];
        } else if (genre === 'trap') {
            targetBpm = 140; // half time feel
            if (i === 0 || i === 10 || i === 11) tracks[3].steps[i] = tracks[3].defaultNote; // boom kick
            if (i === 8) tracks[4].steps[i] = tracks[4].defaultNote; // snare on 3
            if (Math.random() > 0.3) tracks[5].steps[i] = tracks[5].defaultNote; // fast hihat rolls
            if (i === 0 || i === 10) tracks[2].steps[i] = scale[0].replace('4', '1'); // huge 808 style sub bass
            if (i % 4 === 0 && Math.random() > 0.3) tracks[0].steps[i] = scale[4]; // spooky high lead
        } else if (genre === 'ambient') {
            targetBpm = 80;
            if (i === 0) tracks[3].steps[i] = tracks[3].defaultNote; // rare kick
            if (i === 8 && Math.random() > 0.5) tracks[4].steps[i] = tracks[4].defaultNote; // rare snare/rim
            if (Math.random() > 0.8) tracks[5].steps[i] = tracks[5].defaultNote; // sparse hihat
            if (i === 0) tracks[1].steps[i] = padChords[Math.floor(Math.random() * padChords.length)]; // thick drone pad
            if (i === 0 || i === 8) tracks[2].steps[i] = scale[0].replace('4', '2'); // deep drone bass
            if (Math.random() > 0.85) tracks[0].steps[i] = scale[Math.floor(Math.random() * scale.length)]; // rare melodic drop
        }
    }
    
    // Auto-update pattern current bank array
    tracks.forEach((t, i) => patterns[currentBank][i] = t.steps);
    
    // Update BPM slider visually and Tone functionally
    document.getElementById('bpm-slider').value = targetBpm;
    Tone.Transport.bpm.value = targetBpm;
    document.getElementById('bpm-value').innerText = targetBpm;
    
    renderGrid();
});

document.getElementById('btn-clear').addEventListener('click', () => {
    tracks.forEach(track => track.steps.fill(null));
    renderGrid();
});


// --- 4. 3D VISUALIZER & POST-PROCESSING (Three.js) ---

let scene, camera, renderer, composer, bloomPass, mainObject, lights = [];
let isAutopilot = false;
let isVjCamera = false;
let isLiteMode = false;
let measureCount = 0;
let targetCameraPos = new THREE.Vector3(0, 0, 15);
let targetCameraLook = new THREE.Vector3(0, 0, 0);

let textSprite;
let mouse = new THREE.Vector2(-999, -999);
let raycaster = new THREE.Raycaster();
let particles, particlePositions;
let particleCount = 2000;
let currentParticlePos = 0;

window.addEventListener('pointermove', (e) => {
    const stage = document.getElementById('stage-container');
    const rect = stage.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / stage.clientWidth) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / stage.clientHeight) * 2 + 1;
});

document.getElementById('neon-text-input').addEventListener('input', (e) => update3DText(e.target.value.toUpperCase()));

function update3DText(str) {
    if (textSprite) scene.remove(textSprite);
    if (!str || str.length === 0) return;
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 120px Outfit, sans-serif';
    ctx.fillStyle = '#' + themes[document.getElementById('color-select').value].obj.toString(16).padStart(6, '0');
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 20;
    ctx.fillText(str, 512, 128);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    textSprite = new THREE.Sprite(mat);
    textSprite.scale.set(20, 5, 1);
    textSprite.position.set(0, 0, -8);
    scene.add(textSprite);
}

document.getElementById('btn-autopilot').addEventListener('click', () => {
    isAutopilot = !isAutopilot;
    const btn = document.getElementById('btn-autopilot');
    if (isAutopilot) {
        btn.style.background = 'var(--accent-primary)';
        btn.style.color = '#000';
    } else {
        btn.style.background = 'transparent';
        btn.style.color = 'var(--text)';
    }
});

document.getElementById('btn-vj-camera').addEventListener('click', () => {
    isVjCamera = !isVjCamera;
    const btn = document.getElementById('btn-vj-camera');
    if (isVjCamera) {
        btn.style.background = 'var(--accent-secondary)';
        btn.style.color = '#000';
    } else {
        btn.style.background = 'transparent';
        btn.style.color = 'var(--text)';
        camera.position.set(0, 0, 15);
        camera.lookAt(0,0,0);
    }
});

function triggerVjCameraCut() {
    const radius = 8 + Math.random() * 15;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    targetCameraPos.set(radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi) + 5, radius * Math.sin(phi) * Math.sin(theta));
    if (Math.random() > 0.7) camera.position.copy(targetCameraPos);
}

const themes = {
    cyberpunk: { bg: 0x0a0a0f, obj: 0x00f3ff, light1: 0xff00ea, light2: 0x00f3ff },
    synthwave: { bg: 0x1a0518, obj: 0xffa300, light1: 0xff0055, light2: 0x00f3ff },
    matrix: { bg: 0x000000, obj: 0x00ff00, light1: 0x00ff00, light2: 0x003300 },
    fire: { bg: 0x1a0000, obj: 0xff3300, light1: 0xff8800, light2: 0xff0000 },
    ocean: { bg: 0x001133, obj: 0x00ffff, light1: 0x0055ff, light2: 0x00ffff },
    gold: { bg: 0x1a1500, obj: 0xffcc00, light1: 0xffaa00, light2: 0xffffee },
    vaporwave: { bg: 0x220022, obj: 0x00ffff, light1: 0xff00ff, light2: 0x00ffff }
};

function init3D() {
    const container = document.getElementById('stage-container');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(themes.cyberpunk.bg);
    scene.fog = new THREE.Fog(themes.cyberpunk.bg, 10, 50);

    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 15;

    renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    
    // Add canvas behind UI
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.zIndex = '1';
    container.appendChild(renderer.domElement);

    // Setup EffectComposer & UnrealBloomPass
    if (typeof THREE.EffectComposer !== 'undefined') {
        const renderScene = new THREE.RenderPass(scene, camera);
        composer = new THREE.EffectComposer(renderer);
        composer.addPass(renderScene);

        bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(container.clientWidth, container.clientHeight), 1.5, 0.4, 0.85);
        bloomPass.threshold = 0;
        bloomPass.strength = 1.0;
        bloomPass.radius = 0.5;
        composer.addPass(bloomPass);
    }

    // Ensure overlay is above canvas
    container.querySelector('.stage-overlay').style.zIndex = '10';

    // OrbitControls for interaction
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    window.THREE_CONTROLS = controls;

    // 4D Particle System (Starfield/Energy)
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(particleCount * 3);
    for(let i=0; i<particleCount*3; i++) {
        pPos[i] = (Math.random() - 0.5) * 60;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
        color: themes.cyberpunk.obj,
        size: 0.15,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });
    const particlesBase = new THREE.Points(pGeo, pMat);
    scene.add(particlesBase);
    window.THREE_PARTICLES = particlesBase;

    // Interactive Mouse Particles
    const mpGeo = new THREE.BufferGeometry();
    particlePositions = new Float32Array(particleCount * 3);
    mpGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const mpMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.2, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
    particles = new THREE.Points(mpGeo, mpMat);
    scene.add(particles);

    setGeometry('cube');
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const light1 = new THREE.PointLight(themes.cyberpunk.light1, 2, 50);
    light1.position.set(10, 10, 10);
    scene.add(light1);
    lights.push(light1);

    const light2 = new THREE.PointLight(themes.cyberpunk.light2, 2, 50);
    light2.position.set(-10, -10, 10);
    scene.add(light2);
    lights.push(light2);

    const gridHelper = new THREE.GridHelper(50, 50, themes.cyberpunk.obj, 0x222222);
    gridHelper.position.y = -6;
    scene.add(gridHelper);

    animate3D();

    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
        if (composer) composer.setSize(container.clientWidth, container.clientHeight);
    });
}

function setGeometry(type) {
    if (mainObject) scene.remove(mainObject);
    
    const theme = themes[document.getElementById('color-select').value];
    const material = new THREE.MeshPhongMaterial({ 
        color: theme.obj, 
        wireframe: true, 
        emissive: theme.obj,
        emissiveIntensity: 0.3
    });
    
    if (type === 'sentinel') {
        const group = new THREE.Group();
        // Core
        const coreGeo = new THREE.IcosahedronGeometry(1.5, 0);
        const core = new THREE.Mesh(coreGeo, material);
        group.add(core);
        // Eye
        const eyeGeo = new THREE.SphereGeometry(0.8, 16, 16);
        const eyeMat = material.clone();
        eyeMat.wireframe = false;
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.z = 1;
        core.add(eye);
        group.userData.eye = eye;
        
        // 4 floating Orbiters
        group.userData.orbiters = [];
        for (let i=0; i<4; i++) {
            const orbGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
            const orb = new THREE.Mesh(orbGeo, material);
            const angle = (i / 4) * Math.PI * 2;
            orb.position.set(Math.cos(angle)*4, 0, Math.sin(angle)*4);
            group.add(orb);
            group.userData.orbiters.push({mesh: orb, angle: angle});
        }
        mainObject = group;
        mainObject.userData.type = 'sentinel';
        
    } else if (type === 'jellyfish') {
        const group = new THREE.Group();
        const domeGeo = new THREE.SphereGeometry(2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const dome = new THREE.Mesh(domeGeo, material);
        group.add(dome);
        group.userData.dome = dome;
        
        group.userData.tentacles = [];
        for (let i=0; i<8; i++) {
            const tGroup = new THREE.Group();
            const angle = (i / 8) * Math.PI * 2;
            tGroup.position.set(Math.cos(angle)*1.5, 0, Math.sin(angle)*1.5);
            
            // Tentacle segments
            const segments = [];
            for(let j=0; j<10; j++) {
                const segGeo = new THREE.SphereGeometry(0.3 - (j*0.02), 8, 8);
                const seg = new THREE.Mesh(segGeo, material);
                seg.position.y = -j * 0.8;
                tGroup.add(seg);
                segments.push(seg);
            }
            group.add(tGroup);
            group.userData.tentacles.push({group: tGroup, segments: segments, angle: angle});
        }
        mainObject = group;
        mainObject.userData.type = 'jellyfish';

    } else if (type === 'golem') {
        const group = new THREE.Group();
        // Head
        const headGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        const head = new THREE.Mesh(headGeo, material);
        head.position.y = 3;
        group.add(head);
        group.userData.head = head;
        // Torso
        const torsoGeo = new THREE.BoxGeometry(2.5, 3, 1.5);
        const torso = new THREE.Mesh(torsoGeo, material);
        torso.position.y = 0.5;
        group.add(torso);
        
        // Limbs function
        const createLimb = (w, h, d, x, y) => {
            const pivot = new THREE.Group();
            pivot.position.set(x, y, 0);
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
            mesh.position.y = -h/2; // hang down
            pivot.add(mesh);
            group.add(pivot);
            return pivot;
        };
        
        group.userData.leftArm = createLimb(0.8, 2.5, 0.8, -1.8, 2);
        group.userData.rightArm = createLimb(0.8, 2.5, 0.8, 1.8, 2);
        group.userData.leftLeg = createLimb(1, 2.5, 1, -0.6, -1);
        group.userData.rightLeg = createLimb(1, 2.5, 1, 0.6, -1);
        
        mainObject = group;
        mainObject.position.y = 1;
        mainObject.userData.type = 'golem';

    } else if (type === 'seraphim') {
        const group = new THREE.Group();
        const coreGeo = new THREE.SphereGeometry(1.2, 16, 16);
        const core = new THREE.Mesh(coreGeo, material);
        group.add(core);
        group.userData.core = core;
        
        group.userData.rings = [];
        for(let i=0; i<3; i++) {
            const ringGeo = new THREE.TorusGeometry(3 + i*0.8, 0.2, 8, 50);
            const ring = new THREE.Mesh(ringGeo, material);
            ring.rotation.x = Math.random() * Math.PI;
            ring.rotation.y = Math.random() * Math.PI;
            group.add(ring);
            group.userData.rings.push({ mesh: ring, speed: (Math.random() < 0.5 ? -1 : 1) * (0.01 + i*0.005) });
        }
        mainObject = group;
        mainObject.userData.type = 'seraphim';

    } else if (type === 'arachnoid') {
        const group = new THREE.Group();
        const coreGeo = new THREE.IcosahedronGeometry(1.5, 0);
        const core = new THREE.Mesh(coreGeo, material);
        core.position.y = 1;
        group.add(core);
        group.userData.core = core;
        
        group.userData.legs = [];
        for(let i=0; i<6; i++) {
            const pivot = new THREE.Group();
            const angle = (i/6) * Math.PI * 2;
            pivot.position.set(Math.cos(angle)*1.2, 1, Math.sin(angle)*1.2);
            pivot.rotation.y = -angle; // face outward
            
            const legGeo = new THREE.CylinderGeometry(0.2, 0.1, 4, 8);
            legGeo.translate(0, -2, 0); // pivot from top
            const leg = new THREE.Mesh(legGeo, material);
            leg.rotation.z = Math.PI / 4; // bend outward
            
            pivot.add(leg);
            group.add(pivot);
            group.userData.legs.push({ pivot: pivot, phase: i * 1.5 });
        }
        mainObject = group;
        mainObject.userData.type = 'arachnoid';

    } else if (type === 'parasite') {
        const group = new THREE.Group();
        const coreGeo = new THREE.TorusKnotGeometry(1.5, 0.4, 64, 8, 3, 4);
        const core = new THREE.Mesh(coreGeo, material);
        group.add(core);

        group.userData.nerves = [];
        for(let i=0; i<15; i++) {
            const nerveRoot = new THREE.Group();
            nerveRoot.rotation.set(Math.random()*Math.PI*2, Math.random()*Math.PI*2, 0);
            const segments = [];
            for(let j=0; j<6; j++) {
                const seg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 0.1), material);
                seg.position.y = j * 1;
                nerveRoot.add(seg);
                segments.push({ mesh: seg, baseX: seg.position.x, baseZ: seg.position.z });
            }
            group.add(nerveRoot);
            group.userData.nerves.push(segments);
        }
        mainObject = group;
        mainObject.userData.type = 'parasite';

    } else if (type === 'twins') {
        const group = new THREE.Group();
        group.userData.twinA = [];
        group.userData.twinB = [];
        for(let i=0; i<20; i++) {
            const segA = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.8), material);
            const segB = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.8), material);
            group.add(segA);
            group.add(segB);
            group.userData.twinA.push(segA);
            group.userData.twinB.push(segB);
        }
        mainObject = group;
        mainObject.userData.type = 'twins';

    } else if (type === 'lotus') {
        const group = new THREE.Group();
        const core = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 16, 0, Math.PI*2, 0, Math.PI/2), material);
        group.add(core);
        
        group.userData.petals = [];
        for(let i=0; i<12; i++) {
            const pivot = new THREE.Group();
            const angle = (i/12) * Math.PI*2;
            pivot.position.set(Math.cos(angle)*1.2, 0, Math.sin(angle)*1.2);
            pivot.rotation.y = -angle; // face out
            
            const petalMesh = new THREE.Mesh(new THREE.ConeGeometry(0.8, 4, 4), material);
            petalMesh.position.y = 2;
            petalMesh.rotation.x = Math.PI / 6; // slightly open
            pivot.add(petalMesh);
            group.add(pivot);
            group.userData.petals.push(pivot);
        }
        mainObject = group;
        mainObject.userData.type = 'lotus';

    } else {
        let geometry;
        switch(type) {
            case 'cube': geometry = new THREE.BoxGeometry(4, 4, 4); break;
            case 'sphere': geometry = new THREE.SphereGeometry(3, 32, 32); break;
            case 'torus': geometry = new THREE.TorusGeometry(3, 1, 16, 100); break;
            case 'icosahedron': geometry = new THREE.IcosahedronGeometry(3, 0); break;
            case 'pyramid': geometry = new THREE.TetrahedronGeometry(4, 0); break;
            case 'dodecahedron': geometry = new THREE.DodecahedronGeometry(3, 0); break;
            case 'torusknot': geometry = new THREE.TorusKnotGeometry(2, 0.5, 100, 16); break;
        }
        mainObject = new THREE.Mesh(geometry, material);
        mainObject.userData.type = 'shape';
    }
    
    scene.add(mainObject);
}

function setTheme(themeName) {
    const theme = themes[themeName];
    scene.background = new THREE.Color(theme.bg);
    scene.fog.color.setHex(theme.bg);
    
    if (mainObject) {
        mainObject.traverse((child) => {
            if (child.isMesh) {
                child.material.color.setHex(theme.obj);
                child.material.emissive.setHex(theme.obj);
            }
        });
    }
    
    if (window.THREE_PARTICLES) {
        window.THREE_PARTICLES.material.color.setHex(theme.obj);
    }
    
    if (lights[0]) lights[0].color.setHex(theme.light1);
    if (lights[1]) lights[1].color.setHex(theme.light2);
    
    scene.children.forEach(child => {
        if (child instanceof THREE.GridHelper) {
            child.material.color.setHex(theme.obj);
        }
    });
}

document.getElementById('model-select').addEventListener('change', (e) => {
    setGeometry(e.target.value);
});

document.getElementById('color-select').addEventListener('change', (e) => {
    setTheme(e.target.value);
});

document.getElementById('btn-lite-mode').addEventListener('click', () => {
    isLiteMode = !isLiteMode;
    const btn = document.getElementById('btn-lite-mode');
    btn.classList.toggle('lite-mode-active', isLiteMode);
    
    // If we're entering Lite mode, clear the bloom state
    if (isLiteMode) {
        if (bloomPass) bloomPass.strength = 0;
    }
});

function animate3D() {
    requestAnimationFrame(animate3D);
    
    // Declare avg at function scope so it's accessible everywhere in animate3D
    let avg = 0;
    
    if (isVjCamera) {
        camera.position.lerp(targetCameraPos, 0.02);
        camera.lookAt(targetCameraLook);
    } else if (window.THREE_CONTROLS) {
        window.THREE_CONTROLS.update();
        if (pannerNode) {
            pannerNode.pan.value = Math.sin(window.THREE_CONTROLS.getAzimuthalAngle()) * 0.8;
        }
    }
    
    if (mainObject) {
        let pScale = 1;
        
        if (analyzer && (isPlaying || (userMedia && userMedia.state === 'started'))) {
            const data = analyzer.getValue();
            let sum = 0;
            for(let i = 0; i < data.length; i++) sum += Math.abs(data[i]);
            avg = sum / data.length;
        }
        
        pScale = 1 + (avg * 0.8);
        if(window.THREE_PARTICLES) window.THREE_PARTICLES.scale.set(pScale, pScale, pScale);
        
        lights[0].intensity = 2 + (avg * 8);
        lights[1].intensity = 2 + (avg * 8);

        const beatTime = (Date.now() / 1000) * (Tone.Transport.bpm.value / 60) * Math.PI;
        const time = Date.now() / 1000;

        if (mainObject.userData.type === 'shape') {
            mainObject.rotation.x += 0.005;
            mainObject.rotation.y += 0.01;
            const scaleOffset = 1 + (avg * 1.5);
            if (avg > 0) mainObject.scale.set(scaleOffset, scaleOffset, scaleOffset);
            else mainObject.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
        } 
        else if (mainObject.userData.type === 'sentinel') {
            mainObject.rotation.y += 0.005;
            mainObject.userData.eye.scale.setScalar(1 + avg * 3);
            mainObject.userData.eye.material.emissiveIntensity = 0.5 + avg * 5;
            mainObject.userData.orbiters.forEach((orb) => {
                orb.angle += 0.02 + (avg * 0.1);
                orb.mesh.position.x = Math.cos(orb.angle) * (4 + avg * 2);
                orb.mesh.position.z = Math.sin(orb.angle) * (4 + avg * 2);
                orb.mesh.rotation.x += 0.05;
                orb.mesh.rotation.y += 0.05;
            });
            mainObject.position.y = Math.sin(time * 2) * 0.5;
        }
        else if (mainObject.userData.type === 'jellyfish') {
            mainObject.rotation.y += 0.01;
            mainObject.position.y = Math.sin(time) * 1 + 1;
            mainObject.userData.dome.scale.set(1 + avg, 1 + avg * 1.5, 1 + avg);
            mainObject.userData.tentacles.forEach((tData) => {
                tData.segments.forEach((seg, i) => {
                    seg.position.x = Math.sin(time * 3 + i * 0.5 + tData.angle) * (0.5 + avg*2);
                    seg.position.z = Math.cos(time * 3 + i * 0.5 + tData.angle) * (0.5 + avg*2);
                });
            });
        }
        else if (mainObject.userData.type === 'golem') {
            const moveAmt = isPlaying ? 1 : 0;
            const currentBeat = isPlaying ? beatTime : 0;
            
            mainObject.position.y = 1 + Math.abs(Math.sin(currentBeat * 2)) * 0.5 * moveAmt;
            mainObject.userData.head.rotation.y = Math.sin(currentBeat) * 0.2 * moveAmt;
            mainObject.userData.head.rotation.x = (Math.sin(currentBeat * 2) * 0.2 + avg) * moveAmt;
            
            mainObject.userData.leftArm.rotation.x = Math.sin(currentBeat) * 1.2 * moveAmt + avg;
            mainObject.userData.rightArm.rotation.x = Math.sin(currentBeat + Math.PI) * 1.2 * moveAmt + avg;
            
            mainObject.userData.leftLeg.rotation.x = Math.sin(currentBeat + Math.PI) * 0.8 * moveAmt;
            mainObject.userData.rightLeg.rotation.x = Math.sin(currentBeat) * 0.8 * moveAmt;
        }
        else if (mainObject.userData.type === 'seraphim') {
            mainObject.userData.core.scale.setScalar(1 + avg * 2);
            mainObject.userData.rings.forEach(r => {
                r.mesh.rotation.x += r.speed * (1 + avg * 5);
                r.mesh.rotation.y += r.speed * (1 + avg * 5);
            });
        }
        else if (mainObject.userData.type === 'arachnoid') {
            mainObject.position.y = Math.sin(time * 4) * 0.2 * (isPlaying?1:0);
            mainObject.userData.core.rotation.y += 0.01;
            mainObject.userData.legs.forEach(leg => {
                // Procedural IK stepping
                const step = Math.sin(time * 5 + leg.phase) * (isPlaying?1:0);
                leg.pivot.rotation.x = step * 0.5; // Lift
                leg.pivot.children[0].rotation.z = Math.PI/4 + Math.abs(step)*0.3; // Bend knee
            });
        }
        else if (mainObject.userData.type === 'parasite') {
            mainObject.rotation.y += 0.01;
            mainObject.rotation.x += 0.005;
            mainObject.userData.nerves.forEach(nerveObj => {
                nerveObj.forEach((seg, i) => {
                    seg.mesh.position.x = seg.baseX + (Math.random() - 0.5) * (avg * 2);
                    seg.mesh.position.z = seg.baseZ + (Math.random() - 0.5) * (avg * 2);
                    seg.mesh.rotation.x += (Math.random() - 0.5) * 0.1;
                });
            });
        }
        else if (mainObject.userData.type === 'twins') {
            const h = 8; // height spread
            mainObject.rotation.y += 0.02 + avg*0.05;
            mainObject.userData.twinA.forEach((seg, i) => {
                const phase = time * 2 + (i * 0.4);
                seg.position.x = Math.cos(phase) * (2 + avg*2);
                seg.position.z = Math.sin(phase) * (2 + avg*2);
                seg.position.y = (i / 20) * h - (h/2);
                seg.rotation.set(phase, phase, phase);
            });
            mainObject.userData.twinB.forEach((seg, i) => {
                const phase = time * 2 + (i * 0.4) + Math.PI; // opposite phase
                seg.position.x = Math.cos(phase) * (2 + avg*2);
                seg.position.z = Math.sin(phase) * (2 + avg*2);
                seg.position.y = (i / 20) * h - (h/2);
                seg.rotation.set(phase, phase, phase);
            });
        }
        else if (mainObject.userData.type === 'lotus') {
            mainObject.rotation.y += 0.005;
            mainObject.userData.petals.forEach(petal => {
                // Open up on audio peaks
                const targetOpen = Math.PI/6 + avg * Math.PI/1.5;
                petal.rotation.x += (targetOpen - petal.rotation.x) * 0.1; // Smooth lerp
            });
        }
        
        if(avg === 0 && !isPlaying) {
            if(window.THREE_PARTICLES) window.THREE_PARTICLES.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
            lights[0].intensity = Math.max(2, lights[0].intensity - 0.1);
        }
        
        // VJ Camera Choreography trigger
        if (isVjCamera && avg > 0.8 && Math.random() > 0.95 && isPlaying) {
            triggerVjCameraCut();
        }
        
        // Sprite Text Update
        if (textSprite) {
            textSprite.scale.set(15 + avg*15, 4 + avg*5, 1);
            textSprite.position.y = Math.sin(Date.now() * 0.002) * 1.5;
        }

        // Particle Emit
        if (mouse.x !== -999 && isPlaying) {
            raycaster.setFromCamera(mouse, camera);
            const zDir = raycaster.ray.direction.z || -0.0001;
            const dist = (0 - camera.position.z) / zDir;
            const pos = camera.position.clone().add(raycaster.ray.direction.multiplyScalar(dist));
            
            for(let i=0; i<5; i++) {
                particlePositions[currentParticlePos*3] = pos.x + (Math.random()-0.5)*2;
                particlePositions[currentParticlePos*3+1] = pos.y + (Math.random()-0.5)*2;
                particlePositions[currentParticlePos*3+2] = pos.z + (Math.random()-0.5)*2;
                currentParticlePos = (currentParticlePos + 1) % particleCount;
            }
        }
        for(let i=0; i<particleCount; i++) {
            if(particlePositions[i*3]) {
                particlePositions[i*3+1] -= 0.05; // fall
                particlePositions[i*3+2] += 0.05; // come forward
            }
        }
        particles.geometry.attributes.position.needsUpdate = true;
        particles.material.size = 0.05 + (avg * 1.0);
        particles.material.color.setHex(themes[document.getElementById('color-select').value].obj);
    }
    
    // Dynamic Bloom Strength
    if (bloomPass) {
        bloomPass.strength = isPlaying ? 0.3 + (avg || 0) * 3 : 0.3;
    }
    
    if (window.THREE_PARTICLES) {
        window.THREE_PARTICLES.rotation.y += 0.001; // slow spin
    }
    
    if (composer && !isLiteMode) {
        composer.render();
    } else {
        renderer.render(scene, camera);
    }
}


// --- 5. INITIALIZATION ---

window.addEventListener('DOMContentLoaded', () => {
    initAudio();
    init3D();
    setLanguage('en');
    Tone.Transport.bpm.value = 120;
    
    // Init Preset Library
    const presetSelect = document.getElementById('preset-library-select');
    if (window.PRESETS && presetSelect) {
        Object.keys(window.PRESETS).forEach(k => {
            const opt = document.createElement('option');
            opt.value = k;
            opt.innerText = window.PRESETS[k].name;
            presetSelect.appendChild(opt);
        });
        
        document.getElementById('btn-load-preset').addEventListener('click', () => {
            const k = presetSelect.value;
            if(k && window.PRESETS[k]) {
                const pInfo = window.PRESETS[k];
                Tone.Transport.bpm.value = pInfo.bpm;
                document.getElementById('bpm-slider').value = pInfo.bpm;
                document.getElementById('bpm-value').innerText = pInfo.bpm;
                
                Tone.Transport.swing = pInfo.swing / 100;
                document.getElementById('swing-slider').value = pInfo.swing;
                document.getElementById('swing-label').innerText = `Swing ${pInfo.swing}%`;
                
                document.getElementById('color-select').value = pInfo.theme;
                setTheme(pInfo.theme);
                
                document.getElementById('model-select').value = pInfo.model;
                setGeometry(pInfo.model);
                
                const newPatterns = pInfo.gen();
                for(let bank=0; bank<4; bank++) patterns[bank] = newPatterns[bank];
                tracks.forEach((t, i) => t.steps = patterns[currentBank][i]);
                renderGrid();
            }
        });
        
        document.getElementById('btn-auto-fill').addEventListener('click', () => {
            const tHat = tracks[5].steps;
            const tSnare = tracks[4].steps;
            const tKick = tracks[3].steps;
            const fillType = Math.random();
            for(let i=12; i<16; i++) { tHat[i]=null; tSnare[i]=null; tKick[i]=null; }
            
            if (fillType > 0.66) {
                tSnare[12] = {note:'C1', velocity: 0.5}; tSnare[13] = {note:'C1', velocity: 0.7};
                tSnare[14] = {note:'C1', velocity: 0.9}; tSnare[15] = {note:'C1', velocity: 1.0};
                tKick[15] = 'C1';
            } else if (fillType > 0.33) {
                tHat[12] = 'C1'; tHat[13] = {note:'C1',velocity:0.5}; tKick[14] = 'C1'; tSnare[15] = 'C1';
            } else {
                tKick[12] = 'C1'; tKick[13] = 'C1'; tKick[14] = 'C1'; tSnare[15] = 'C1';
            }
            tracks.forEach((t, i) => patterns[currentBank][i] = t.steps);
            renderGrid();
        });
    }

    // Decoder
    if (window.location.hash.length > 10) {
        try {
            const compressed = window.location.hash.substring(1);
            const state = JSON.parse(LZString.decompressFromEncodedURIComponent(compressed));
            if (state) {
                Tone.Transport.bpm.value = state.b; document.getElementById('bpm-slider').value = state.b; document.getElementById('bpm-value').innerText = state.b;
                Tone.Transport.swing = state.s; document.getElementById('swing-slider').value = Math.round(state.s * 100); document.getElementById('swing-label').innerText = `Swing ${Math.round(state.s*100)}%`;
                setTheme(state.t); document.getElementById('color-select').value = state.t;
                setGeometry(state.m); document.getElementById('model-select').value = state.m;
                for(let bank=0; bank<4; bank++) patterns[bank] = state.p[bank];
                tracks.forEach((t, i) => t.steps = patterns[currentBank][i]);
                renderGrid();
            }
        } catch(e) { console.error('Shared URL fail:', e); }
    }
});
