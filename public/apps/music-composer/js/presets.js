// 4D Music Composer - 25 Genre Preset Library
// Returns: [BankA, BankB, BankC, BankD] where each bank is [Lead, Pad, Bass, Kick, Snare, HiHat] array[16]

const S = {
    minor: ['C4', 'D#4', 'F4', 'G4', 'A#4', 'C5'],
    major: ['C4', 'E4', 'G4', 'A4', 'C5', 'E5'],
    harmonic: ['C4', 'D#4', 'F4', 'G4', 'B4', 'C5'],
    dorian: ['D4', 'F4', 'G4', 'A4', 'C5', 'D5'],
    phrygian: ['E4', 'F4', 'G4', 'A4', 'B4', 'D5']
};

function emptyPattern() {
    return Array(6).fill().map(() => Array(16).fill(null));
}

function P(note, velocity = 1) {
    return { note, velocity };
}

window.PRESETS = {
    tango: {
        name: "Tango (Argentine)", bpm: 120, swing: 15, theme: "gold", model: "seraphim",
        gen: () => {
            const p = emptyPattern();
            const sc = S.harmonic;
            // Kick on 1, 2.5, 3
            p[3][0] = 'C1'; p[3][5] = 'C1'; p[3][8] = 'C1'; p[3][10] = P('C1',0.5);
            // Snare/Rim
            p[4][4] = 'C1'; p[4][12] = 'C1'; p[4][15] = P('C1',0.5);
            // HH
            p[5][0] = 'C1'; p[5][4] = 'C1'; p[5][8] = 'C1'; p[5][12] = 'C1';
            // Bass
            p[2][0] = sc[0].replace('4','2'); p[2][5] = sc[2].replace('4','2'); p[2][8] = sc[0].replace('4','2');
            // Pad
            p[1][4] = [sc[0], sc[2], sc[4]]; p[1][12] = [sc[0], sc[2], sc[4]];
            // Lead
            p[0][0] = sc[2]; p[0][2] = sc[3]; p[0][4] = sc[4]; p[0][6] = sc[3]; p[0][8] = sc[2];
            return [p, p, p, p];
        }
    },
    waltz: {
        name: "Viennese Waltz (3/4)", bpm: 160, swing: 0, theme: "ocean", model: "lotus",
        gen: () => {
            const p = emptyPattern();
            const sc = S.major;
            // In 16 steps, 3/4 time feels like accents on 0, 6, 12 or 0, 4, 8 for fast 3/4. Let's do 0, 4, 8 (12 steps loop)
            p[3][0] = 'C1'; p[3][6] = 'C1'; p[3][12] = 'C1';
            p[5][2] = 'C1'; p[5][4] = 'C1'; p[5][8] = 'C1'; p[5][10] = 'C1'; p[5][14] = 'C1';
            p[2][0] = sc[0].replace('4','2'); p[2][6] = sc[1].replace('4','2');
            p[1][2] = [sc[0], sc[2], sc[4]]; p[1][4] = [sc[0], sc[2], sc[4]];
            p[0][0] = sc[0]; p[0][2] = sc[2]; p[0][4] = sc[4];
            return [p, p, p, p];
        }
    },
    polka: {
        name: "Oompah Polka", bpm: 130, swing: 0, theme: "fire", model: "golem",
        gen: () => {
            const p = emptyPattern();
            const sc = S.major;
            for(let i=0; i<16; i+=4) { p[3][i] = 'C1'; p[2][i] = sc[0].replace('4','2'); } // Kick & Bass on 1,2,3,4
            for(let i=2; i<16; i+=4) { p[5][i] = 'C1'; p[4][i] = 'C1'; p[1][i] = [sc[0], sc[2], sc[4]]; } // Snare/Hat/Chord offbeats
            p[0][0] = sc[2]; p[0][2] = sc[3]; p[0][4] = sc[4]; p[0][6] = sc[2];
            return [p, p, p, p];
        }
    },
    reggae: {
        name: "Reggae Groove", bpm: 90, swing: 30, theme: "matrix", model: "jellyfish",
        gen: () => {
            const p = emptyPattern();
            const sc = S.minor;
            p[3][4] = 'C1'; p[3][12] = 'C1'; // Kick on 3
            p[4][4] = 'C1'; p[4][12] = 'C1'; // Snare on 3
            for(let i=0; i<16; i+=2) p[5][i] = 'C1'; // steady hats
            p[1][2] = [sc[0], sc[2]]; p[1][6] = [sc[0], sc[2]]; p[1][10] = [sc[0], sc[2]]; p[1][14] = [sc[0], sc[2]]; // skank guitar/pad
            p[2][0] = sc[0].replace('4','2'); p[2][2] = sc[0].replace('4','2'); p[2][6] = sc[1].replace('4','2'); p[2][8] = sc[2].replace('4','2');
            return [p, p, p, p];
        }
    },
    bossanova: {
        name: "Bossa Nova", bpm: 140, swing: 20, theme: "ocean", model: "parasite",
        gen: () => {
            const p = emptyPattern();
            const sc = S.dorian;
            for(let i=0; i<16; i+=8) { p[3][i] = 'C1'; p[3][i+4] = 'C1'; }
            [0,3,6,10,12].forEach(i => p[4][i] = 'C1'); // Clave
            for(let i=0; i<16; i+=2) p[5][i] = 'C1';
            [0,3,6,10,12].forEach(i => p[1][i] = [sc[0], sc[2], sc[4]]); // Pad Clave
            p[2][0] = sc[0].replace('4','2'); p[2][4] = sc[2].replace('4','2');
            return [p, p, p, p];
        }
    },
    techno: {
        name: "Dark Techno", bpm: 135, swing: 0, theme: "cyberpunk", model: "sentinel",
        gen: () => {
            const p = emptyPattern(); const sc = S.minor;
            for(let i=0; i<16; i+=4) p[3][i] = 'C1';
            for(let i=2; i<16; i+=4) p[5][i] = 'C1';
            p[2][2] = sc[0].replace('4','2'); p[2][6] = sc[0].replace('4','2'); p[2][10] = sc[0].replace('4','2'); p[2][14] = sc[0].replace('4','2');
            p[0][12] = sc[4]; p[0][14] = sc[5];
            return [p, p, p, p];
        }
    },
    house: {
        name: "Deep House", bpm: 122, swing: 15, theme: "vaporwave", model: "twins",
        gen: () => {
            const p = emptyPattern(); const sc = S.minor;
            for(let i=0; i<16; i+=4) p[3][i] = 'C1';
            for(let i=4; i<16; i+=8) p[4][i] = 'C1';
            for(let i=2; i<16; i+=4) p[5][i] = 'C1';
            p[1][2] = [sc[0], sc[2], sc[4]]; p[1][6] = [sc[0], sc[2], sc[4]];
            p[2][1] = sc[0].replace('4','2'); p[2][4] = sc[0].replace('4','2'); p[2][7] = sc[2].replace('4','2');
            p[0][0] = sc[0]; p[0][7] = sc[2]; p[0][10] = sc[4];
            return [p, p, p, p];
        }
    },
    synthwave: {
        name: "Retro Synthwave", bpm: 100, swing: 0, theme: "synthwave", model: "arachnoid",
        gen: () => {
             const p = emptyPattern(); const sc = S.minor;
             for(let i=0; i<16; i+=8) { p[3][i] = 'C1'; p[3][i+2] = P('C1',0.5); }
             p[4][4] = 'C1'; p[4][12] = 'C1';
             for(let i=0; i<16; i+=2) p[5][i] = 'C1';
             for(let i=0; i<16; i+=1) p[2][i] = P(sc[0].replace('4','2'), i%2===0?1:0.7); // driving 16ths
             p[1][0] = [sc[0], sc[2], sc[4]];
             p[0][0] = sc[4]; p[0][3] = sc[4]; p[0][6] = sc[2]; p[0][8] = sc[4];
             return [p, p, p, p];
        }
    },
    trap: {
        name: "Trap Banger", bpm: 140, swing: 5, theme: "fire", model: "seraphim",
        gen: () => {
             const p = emptyPattern(); const sc = S.phrygian;
             p[3][0] = 'C1'; p[3][10] = 'C1'; p[3][11] = 'C1'; // 808 sub
             p[4][8] = 'C1'; // Snare on 3
             // Fast hats
             for(let i=0; i<16; i++) if(i%2===0 || i===12 || i===13 || i===14) p[5][i] = i%2===0 ? 'C1' : P('C1',0.5);
             p[2][0] = sc[0].replace('4','1'); p[2][10] = sc[0].replace('4','1'); p[2][11] = sc[0].replace('4','1');
             p[0][0] = sc[0]; p[0][3] = sc[1]; p[0][6] = sc[2]; p[0][9] = sc[1]; // spooky melody
             return [p, p, p, p];
        }
    },
    ambient: {
        name: "Ambient Cinematic", bpm: 70, swing: 0, theme: "ocean", model: "jellyfish",
        gen: () => {
            const p = emptyPattern(); const sc = S.minor;
            p[3][0] = 'C1';
            p[4][8] = P('C1', 0.5);
            p[5][0] = P('C1', 0.3); p[5][4] = P('C1', 0.5); p[5][12] = P('C1', 0.3);
            p[1][0] = [sc[0], sc[2], sc[4]]; p[1][8] = [sc[2], sc[4], sc[5]]; // Long lush chords
            p[2][0] = sc[0].replace('4','2');
            p[0][0] = sc[2]; p[0][6] = sc[4]; p[0][14] = sc[5];
            return [p, p, p, p];
        }
    },
    dubstep: {
        name: "Dubstep Wobble", bpm: 140, swing: 0, theme: "cyberpunk", model: "sentinel",
        gen: () => {
            const p = emptyPattern(); const sc = S.minor;
            p[3][0] = 'C1'; p[3][10] = 'C1'; // Kick
            p[4][8] = 'C1'; // Snare on 3
            p[5][0] = 'C1'; p[5][4] = 'C1'; p[5][8] = 'C1'; p[5][12] = 'C1';
            // Wobble bass rhythm
            [0,2,3,4,8,10,11].forEach(i => p[2][i] = sc[0].replace('4','2'));
            return [p, p, p, p];
        }
    },
    drum_bass: {
        name: "Drum & Bass", bpm: 174, swing: 0, theme: "vaporwave", model: "parasite",
        gen: () => {
             const p = emptyPattern(); const sc = S.dorian;
             p[3][0] = 'C1'; p[3][10] = 'C1'; // Kick
             p[4][4] = 'C1'; p[4][12] = 'C1'; // Snare
             // Breakbeat ghost snares
             p[4][7] = P('C1',0.5); p[4][9] = P('C1',0.5);
             for(let i=0; i<16; i+=2) p[5][i] = 'C1';
             p[2][0] = sc[0].replace('4','2'); p[2][10] = sc[0].replace('4','2'); // Reese bass
             return [p, p, p, p];
        }
    },
    lofi: {
        name: "Lo-Fi Hip Hop", bpm: 85, swing: 40, theme: "gold", model: "lotus",
        gen: () => {
             const p = emptyPattern(); const sc = S.major;
             p[3][0] = 'C1'; p[3][7] = P('C1',0.5); p[3][10] = 'C1';
             p[4][4] = 'C1'; p[4][12] = 'C1'; p[4][15] = P('C1',0.5);
             for(let i=0; i<16; i+=2) p[5][i] = P('C1', i%4===0?1:0.6);
             p[1][0] = [sc[0], sc[2], sc[4], sc[5]]; // 7th chord
             p[1][8] = [sc[1], sc[3], sc[5], sc[6]||sc[0]];
             p[2][0] = sc[0].replace('4','2'); p[2][10] = sc[1].replace('4','2');
             return [p, p, p, p];
        }
    },
    cyberpunk: {
        name: "Cyberpunk Action", bpm: 115, swing: 0, theme: "matrix", model: "arachnoid",
        gen: () => {
             const p = emptyPattern(); const sc = S.phrygian;
             for(let i=0; i<16; i+=4) p[3][i] = 'C1';
             for(let i=2; i<16; i+=4) p[4][i] = 'C1';
             for(let i=0; i<16; i+=1) p[5][i] = 'C1';
             for(let i=0; i<16; i++) p[2][i] = sc[0].replace('4','1'); // 16th low drone
             p[0][0] = sc[5]; p[0][2] = sc[4]; p[0][4] = sc[2]; p[0][6] = sc[0];
             return [p, p, p, p];
        }
    },
    chillout: {
        name: "Ibiza Chillout", bpm: 105, swing: 10, theme: "ocean", model: "jellyfish",
        gen: () => {
             const p = emptyPattern(); const sc = S.dorian;
             p[3][0] = 'C1'; p[3][8] = 'C1';
             p[4][4] = 'C1'; p[4][12] = 'C1';
             p[5][2] = 'C1'; p[5][6] = 'C1'; p[5][10] = 'C1'; p[5][14] = 'C1';
             p[1][0] = [sc[0], sc[2], sc[4]]; p[1][8] = [sc[0], sc[2], sc[4]];
             p[2][0] = sc[0].replace('4','2'); p[2][8] = sc[0].replace('4','2');
             return [p, p, p, p];
        }
    },
    trance: {
        name: "Classic Trance", bpm: 138, swing: 0, theme: "vaporwave", model: "seraphim",
        gen: () => {
             const p = emptyPattern(); const sc = S.minor;
             for(let i=0; i<16; i+=4) p[3][i] = 'C1';
             for(let i=0; i<16; i+=2) p[5][i] = 'C1';
             // Offbeat bass
             for(let i=2; i<16; i+=4) p[2][i] = sc[0].replace('4','2');
             p[0][0] = sc[2]; p[0][2] = sc[4]; p[0][4] = sc[5]; p[0][6] = sc[4]; p[0][8] = sc[2];
             return [p, p, p, p];
        }
    },
    hardstyle: {
        name: "Hardstyle Jump", bpm: 150, swing: 0, theme: "fire", model: "golem",
        gen: () => {
             const p = emptyPattern(); const sc = S.phrygian;
             for(let i=0; i<16; i+=4) p[3][i] = 'C1';
             for(let i=4; i<16; i+=8) p[4][i] = 'C1';
             p[2][2] = sc[1].replace('4','2'); p[2][6] = sc[2].replace('4','2'); p[2][10] = sc[1].replace('4','2'); p[2][14] = sc[0].replace('4','2'); // Distorted offbeat response
             p[0][0] = sc[0]; p[0][2] = sc[0]; p[0][4] = sc[2]; p[0][6] = sc[4];
             return [p, p, p, p];
        }
    },
    afrobeat: {
        name: "Afrobeat Dance", bpm: 108, swing: 25, theme: "gold", model: "twins",
        gen: () => {
             const p = emptyPattern(); const sc = S.dorian;
             p[3][0] = 'C1'; p[3][5] = 'C1'; p[3][10] = 'C1';
             p[4][4] = 'C1'; p[4][9] = 'C1'; p[4][12] = 'C1';
             [0,2,4,6,8,10,12,14].forEach(i => p[5][i] = 'C1');
             p[2][0] = sc[0].replace('4','2'); p[2][3] = sc[2].replace('4','2'); p[2][8] = sc[4].replace('4','2');
             p[1][4] = [sc[0], sc[2]]; p[1][12] = [sc[0], sc[2]];
             return [p, p, p, p];
        }
    },
    drill: {
        name: "UK Drill", bpm: 140, swing: 15, theme: "matrix", model: "parasite",
        gen: () => {
             const p = emptyPattern(); const sc = S.minor;
             p[3][0] = 'C1'; p[3][11] = 'C1';
             p[4][8] = 'C1'; p[4][14] = P('C1',0.5);
             // Drill hihats (3s)
             [0,2,4,6,9,12,14].forEach(i => p[5][i] = 'C1');
             p[2][0] = sc[0].replace('4','1'); p[2][6] = sc[4].replace('4','1'); p[2][11] = sc[2].replace('4','1'); // Sliding sub
             p[0][0] = sc[0]; p[0][3] = sc[1];
             return [p, p, p, p];
        }
    },
    jazz: {
        name: "Cool Jazz", bpm: 115, swing: 60, theme: "ocean", model: "lotus",
        gen: () => {
             const p = emptyPattern(); const sc = S.major;
             p[3][0] = 'C1'; p[3][10] = P('C1',0.5);
             p[4][4] = 'C1'; p[4][12] = 'C1';
             // Ride cymbal pattern
             [0,4,7,8,12,15].forEach(i => p[5][i] = 'C1');
             p[2][0] = sc[0].replace('4','2'); p[2][4] = sc[2].replace('4','2'); p[2][8] = sc[4].replace('4','2'); p[2][12] = sc[3].replace('4','2'); // Walking bass
             p[1][4] = [sc[0], sc[2], sc[4], sc[5]]; // comping
             return [p, p, p, p];
        }
    },
    blues: {
        name: "12-Bar Blues", bpm: 95, swing: 66, theme: "fire", model: "seraphim",
        gen: () => {
             const p = emptyPattern(); const sc = S.dorian;
             p[3][0] = 'C1'; p[3][8] = 'C1';
             p[4][4] = 'C1'; p[4][12] = 'C1';
             for(let i=0; i<16; i+=2) p[5][i] = 'C1';
             p[2][0] = sc[0].replace('4','2'); p[2][2] = sc[2].replace('4','2'); p[2][4] = sc[4].replace('4','2'); p[2][6] = sc[2].replace('4','2'); // Shuffle bass
             p[1][0] = [sc[0], sc[2], sc[4]];
             p[0][8] = sc[3]; p[0][10] = sc[4]; p[0][12] = sc[5];
             return [p, p, p, p];
        }
    },
    rock: {
        name: "Stadium Rock", bpm: 120, swing: 0, theme: "gold", model: "golem",
        gen: () => {
             const p = emptyPattern(); const sc = S.major;
             p[3][0] = 'C1'; p[3][8] = 'C1'; p[3][10] = 'C1';
             p[4][4] = 'C1'; p[4][12] = 'C1';
             for(let i=0; i<16; i+=2) p[5][i] = 'C1';
             for(let i=0; i<16; i+=2) p[2][i] = sc[0].replace('4','2'); // 8th bass
             p[1][0] = [sc[0], sc[2], sc[4]]; p[1][8] = [sc[0], sc[2], sc[4]]; // Power chords
             p[0][0] = sc[0]; p[0][4] = sc[2]; p[0][8] = sc[4];
             return [p, p, p, p];
        }
    },
    synthpop: {
        name: "80s Synthpop", bpm: 118, swing: 0, theme: "vaporwave", model: "twins",
        gen: () => {
             const p = emptyPattern(); const sc = S.minor;
             p[3][0] = 'C1'; p[3][4] = 'C1'; p[3][8] = 'C1'; p[3][12] = 'C1';
             p[4][4] = 'C1'; p[4][12] = 'C1';
             for(let i=2; i<16; i+=4) p[5][i] = 'C1'; // offbeat hat
             // syncopated bass
             [0,3,6,8,11,14].forEach(i => p[2][i] = sc[0].replace('4','2'));
             p[1][0] = [sc[0], sc[2], sc[4]]; p[1][8] = [sc[1], sc[3], sc[5]];
             p[0][0] = sc[4]; p[0][2] = sc[4]; p[0][4] = sc[2]; p[0][6] = sc[0];
             return [p, p, p, p];
        }
    },
    cinematic: {
        name: "Epic Cinematic", bpm: 90, swing: 0, theme: "fire", model: "arachnoid",
        gen: () => {
             const p = emptyPattern(); const sc = S.minor;
             p[3][0] = 'C1'; p[3][14] = 'C1'; // Taiko hit
             p[4][8] = 'C1'; // Big snare
             p[5][0] = 'C1'; p[5][4] = 'C1'; p[5][8] = 'C1'; p[5][12] = 'C1';
             p[1][0] = [sc[0], sc[2], sc[4]]; // String pad
             p[2][0] = sc[0].replace('4','1'); // Sub boom
             p[0][0] = sc[0]; p[0][8] = sc[4]; // Epic horn
             return [p, p, p, p];
        }
    },
    oriental: {
        name: "Oriental Groove", bpm: 100, swing: 10, theme: "gold", model: "jellyfish",
        gen: () => {
             const p = emptyPattern(); const sc = S.harmonic;
             p[3][0] = 'C1'; p[3][3] = 'C1'; p[3][8] = 'C1'; p[3][11] = 'C1'; // Dum
             p[4][4] = 'C1'; p[4][12] = 'C1'; // Tek
             for(let i=0; i<16; i+=2) p[5][i] = P('C1', i%4===0?1:0.6);
             p[2][0] = sc[0].replace('4','2'); p[2][3] = sc[0].replace('4','2'); p[2][8] = sc[0].replace('4','2');
             p[0][0] = sc[0]; p[0][2] = sc[1]; p[0][3] = sc[2]; p[0][6] = sc[1]; p[0][8] = sc[0]; // Exotic riff
             return [p, p, p, p];
        }
    }
};
