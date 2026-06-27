/**
 * Steampunk Chrono-Engine Pro (EN/FR)
 * Premium interactive clocks with high-fidelity mechanics, Audio Synthesis, and Standalone Export.
 */
window.SteampunkChronoPro3D = (() => {
    let panel = null, isOpen = false, clockGroup = null, clockGroupAdded = false;
    let clockType = 'chrono'; // chrono, orrery, alarm, quantum
    let metalStyle = 'brass'; // brass, copper, iron, gold
    let accentColor = '#ff5500';
    let speedMultiplier = 1.0;
    let alarmTime = '12:00';
    let irisOpen = true;
    let customLogoStr = null;

    // Chrono state
    let chronoRunning = false;
    let chronoElapsed = 0;
    let chronoStartTime = null;

    // Alarm/Sound state
    let testAlarmActive = false;
    let audioCtx = null;
    let chimeInterval = null;

    const T = {
        en: {
            title: '⚙️👑 Steampunk Pro Engine',
            typeLabel: 'Clock Engine Type',
            styleLabel: 'Metal Aesthetic',
            accentLabel: 'Neon Core Hue',
            speedLabel: 'Time-Flow Speed',
            alarmLabel: 'Alarm Set (HH:MM)',
            testAlarm: '🔔 Test Alarm Strike',
            stopAlarm: '🔕 Silence Alarm',
            chronoLabel: 'Stopwatch Controls',
            chronoStart: '▶️ Start Chrono',
            chronoStop: '⏸️ Stop Chrono',
            chronoReset: '♻️ Reset Chrono',
            statusLabel: 'System Status',
            statusReady: 'Mechanical systems active.',
            statusRunning: 'Chrono stopwatch measuring time.',
            statusAlarm: '🚨 ALARM TRIPPED! Piston vent opening...',
            statusOrrery: 'Planetary gravitational gears locked.',
            statusQuantum: 'Temporal coordinates bending in real-time.',
            fuseBtn: '⚡ Fusion & Export Pro',
            closeBtn: 'Close',
            errNoScene: '⚠️ Create a 3D scene first, then launch the Pro mechanism!',
            successFused: '✅ Pro clock fused into scene - standalone ready!',
            typeTourbillon: '⚙️ Tourbillon',
            typeNeon: '💡 Neon LED',
            typeBinary: '🔢 Binary',
            statusTourbillon: 'Swiss tourbillon escapement oscillating.',
            statusNeon: 'Neon segments pulsing with energy.',
            statusBinary: 'Binary matrix displaying time.',
            typeHolo: '📽️ Holo-Projector',
            typeNixie: '☢️ Nixie Tubes',
            typeAstrolabe: '🧭 Astrolabe',
            statusHolo: 'Holographic beams projecting temporal data.',
            statusNixie: 'Vintage neon filaments glowing.',
            statusAstrolabe: 'Ancient astronomical discs aligned.',
            irisLabel: '👁️ Mechanical Iris',
            logoLabel: '🖼️ Custom Center Logo (PNG/JPG)'
        },
        fr: {
            title: '⚙️👑 Moteur Steampunk Pro',
            typeLabel: 'Type de Moteur Horloge',
            styleLabel: 'Esthétique Métallique',
            accentLabel: 'Teinte Néon du Noyau',
            speedLabel: 'Vitesse Temporelle',
            alarmLabel: 'Alarme Réglage (HH:MM)',
            testAlarm: '🔔 Tester le Chime d\'Alarme',
            stopAlarm: '🔕 Silencer l\'Alarme',
            chronoLabel: 'Contrôles du Chronographe',
            chronoStart: '▶️ Démarrer le Chrono',
            chronoStop: '⏸️ Arrêter le Chrono',
            chronoReset: '♻️ Réinitialiser',
            statusLabel: 'Statut du Système',
            statusReady: 'Systèmes mécaniques actifs.',
            statusRunning: 'Chronographe en cours d\'enregistrement.',
            statusAlarm: '🚨 ALARME DÉCLENCHÉE! Évent à vapeur activé...',
            statusOrrery: 'Engrenages gravitationnels planétaires verrouillés.',
            statusQuantum: 'Coordonnées temporelles courbées en temps réel.',
            fuseBtn: '⚡ Fusionner & Exporter Pro',
            closeBtn: 'Fermer',
            errNoScene: '⚠️ Créez d\'abord une scène 3D pour lancer le mécanisme Pro !',
            successFused: '✅ Horloge Pro fusionnée dans la scène - autonome prête !',
            typeTourbillon: '⚙️ Tourbillon',
            typeNeon: '💡 Néon LED',
            typeBinary: '🔢 Binaire',
            statusTourbillon: 'Tourbillon suisse en oscillation.',
            statusNeon: 'Segments néon pulsant d\'énergie.',
            statusBinary: 'Matrice binaire affichant l\'heure.',
            typeHolo: '📽️ Holo-Projecteur',
            typeNixie: '☢️ Tubes Nixie',
            typeAstrolabe: '🧭 Astrolabe',
            statusHolo: 'Faisceaux holographiques projetant les données.',
            statusNixie: 'Filaments néon vintage incandescents.',
            statusAstrolabe: 'Disques astronomiques anciens alignés.',
            irisLabel: '👁️ Iris Mécanique',
            logoLabel: '🖼️ Logo Central Perso (PNG/JPG)'
        }
    };

    const L = () => T[window.currentLang === 'fr' ? 'fr' : 'en'];

    function injectCSS() {
        if (document.getElementById('sc3pro-css')) return;
        const s = document.createElement('style');
        s.id = 'sc3pro-css';
        s.textContent = `
        #sc3pro-panel{position:fixed;top:60px;right:12px;width:300px;max-height:calc(100vh - 76px);background:rgba(15,10,5,0.85);backdrop-filter:blur(12px);border:1px solid rgba(249,115,22,0.4);border-radius:12px;box-shadow:0 0 40px rgba(249,115,22,0.15),0 20px 60px rgba(0,0,0,0.8);z-index:99999;overflow-y:auto;font-family:'Inter',sans-serif;scrollbar-width:thin;}
        #sc3pro-panel::-webkit-scrollbar{width:6px;}
        #sc3pro-panel::-webkit-scrollbar-thumb{background:rgba(249,115,22,0.4);border-radius:3px;}
        #sc3pro-panel .hdr{padding:10px 12px;background:rgba(249,115,22,0.12);border-bottom:1px solid rgba(249,115,22,0.25);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:3;}
        #sc3pro-panel .hdr-title{font-size:12.5px;font-weight:800;color:#fb923c;}
        #sc3pro-panel .x{width:22px;height:22px;border:none;border-radius:50%;padding:0;background:rgba(239,68,68,0.25);color:#f87171;cursor:pointer;font-size:11px;line-height:22px;text-align:center;font-weight:700;}
        #sc3pro-panel .x:hover{background:rgba(239,68,68,0.6);color:#fff;}
        #sc3pro-panel .sec{padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.05);}
        #sc3pro-panel .sec-t{font-size:9px;font-weight:700;color:#ea580c;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;}
        #sc3pro-panel .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:6px;}
        #sc3pro-panel .btn-choice{padding:8px 6px;background:#241405;border:1px solid #452405;border-radius:6px;color:#f97316;font-size:10px;font-weight:700;cursor:pointer;transition:all 0.2s;text-align:center;}
        #sc3pro-panel .btn-choice.active{background:rgba(249,115,22,0.25);border-color:#f97316;color:#fdba74;}
        #sc3pro-panel .btn-choice:hover{background:#381d05;border-color:rgba(249,115,22,0.7);color:#fed7aa;}
        #sc3pro-panel .input-text{width:100%;padding:6px;background:#1a0e05;border:1px solid #452405;border-radius:6px;color:#fed7aa;font-size:11px;font-weight:600;outline:none;}
        #sc3pro-panel .input-text:focus{border-color:#f97316;}
        #sc3pro-panel .slider{width:100%;accent-color:#f97316;cursor:pointer;}
        #sc3pro-panel .action-btn{width:100%;padding:8px;border:none;border-radius:6px;color:#fff;font-size:11px;font-weight:700;cursor:pointer;transition:all 0.2s;text-align:center;margin-top:4px;}
        #sc3pro-panel .action-btn.primary{background:linear-gradient(135deg,#f97316,#ea580c);box-shadow:0 3px 12px rgba(249,115,22,0.3);}
        #sc3pro-panel .action-btn.primary:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(249,115,22,0.45);}
        #sc3pro-panel .action-btn.secondary{background:#2a1805;border:1px solid #5a3005;color:#fdba74;}
        #sc3pro-panel .action-btn.secondary:hover{background:#3d2305;color:#fff;}
        #sc3pro-panel .status-box{background:#170f07;border:1px solid #381f08;border-radius:8px;padding:8px;margin-top:4px;font-size:10px;color:#fed7aa;line-height:1.4;}
        `;
        document.head.appendChild(s);
    }

    function getScene() {
        return window.SketchExtruder ? window.SketchExtruder.getScene() : null;
    }

    function ensureGroup() {
        if (!clockGroup) {
            clockGroup = new THREE.Group();
            clockGroup.name = 'SteampunkClockPro';
        }
        return !!(window.SketchExtruder && typeof window.SketchExtruder.addExtraModule === 'function');
    }

    function playAlarmChime() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        const now = audioCtx.currentTime;
        const playStrike = (freq, delay) => {
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = freq;

            gainNode.gain.setValueAtTime(0, now + delay);
            gainNode.gain.linearRampToValueAtTime(0.4, now + delay + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.8);

            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            osc.start(now + delay);
            osc.stop(now + delay + 1.0);
        };
        playStrike(880, 0);
        playStrike(1174, 0.12);
    }

    function startAlarmSiren() {
        if (chimeInterval) return;
        chimeInterval = setInterval(() => {
            playAlarmChime();
        }, 350);
    }

    function stopAlarmSiren() {
        if (chimeInterval) {
            clearInterval(chimeInterval);
            chimeInterval = null;
        }
    }

    function syncProModel() {
        if (!ensureGroup()) return;
        const clockParts = [{
            name: 'metadata',
            clockType: clockType,
            metalStyle: metalStyle,
            accentHex: accentColor,
            speedMultiplier: speedMultiplier,
            alarmTime: alarmTime,
            chronoRunning: chronoRunning,
            chronoElapsed: chronoElapsed,
            chronoStartTime: chronoStartTime,
            irisOpen: irisOpen,
            customLogo: customLogoStr,
            testAlarmActive: testAlarmActive
        }];

        let id = window._sc3ProModelId || null;
        if (!id) {
            id = window.SketchExtruder.addExtraModule('steampunk-chrono-pro', { clockParts, clockStyle: metalStyle, importedMesh: clockGroup });
            window._sc3ProModelId = id;
            clockGroupAdded = true;
        } else {
            if (window._hf3UpdateModel) {
                window._hf3UpdateModel(id, clockParts, metalStyle, clockGroup, 'idle');
            }
        }
    }

    function updateClockworkPro(w) {
        if (!clockGroup) return;
        const speed = w || 1;
        const mult = speedMultiplier;
        const now = new Date();
        const ms = now.getMilliseconds();
        const sec = now.getSeconds() + ms / 1000;
        const min = now.getMinutes() + sec / 60;
        const hr = (now.getHours() % 12) + min / 60;

        // Alarm real-time trigger check
        if (clockType === 'alarm') {
            const timeParts = alarmTime.split(':');
            const alH = parseInt(timeParts[0] || 12);
            const alM = parseInt(timeParts[1] || 0);
            if (now.getHours() === alH && now.getMinutes() === alM) {
                startAlarmSiren();
            } else if (!testAlarmActive) {
                stopAlarmSiren();
            }
        } else {
            stopAlarmSiren();
        }

        const angleS = - (sec / 60) * Math.PI * 2 * mult;
        const angleM = - (min / 60) * Math.PI * 2 * mult;
        const angleH = - (hr / 12) * Math.PI * 2 * mult;

        if (clockType === 'chrono') {
            let currentElapsed = chronoElapsed;
            if (chronoRunning && chronoStartTime) {
                currentElapsed = chronoElapsed + (Date.now() - chronoStartTime);
            }
            const elapsedMs = currentElapsed % 1000;
            const elapsedSec = Math.floor(currentElapsed / 1000) % 60 + elapsedMs / 1000;
            const elapsedMin = Math.floor(currentElapsed / 60000) % 60 + elapsedSec / 60;

            const angleMs = - (elapsedMs / 1000) * Math.PI * 2;
            const angleSec = - (elapsedSec / 60) * Math.PI * 2;
            const angleMin = - (elapsedMin / 60) * Math.PI * 2;

            const handMs = clockGroup.getObjectByName('hand_ms');
            const handSec = clockGroup.getObjectByName('hand_sec');
            const handMin = clockGroup.getObjectByName('hand_min');

            if (handMs) handMs.rotation.z = angleMs;
            if (handSec) handSec.rotation.z = angleSec;
            if (handMin) handMin.rotation.z = angleMin;

            const angleH_real = - (hr / 12) * Math.PI * 2;
            const angleM_real = - (min / 60) * Math.PI * 2;
            const handH = clockGroup.getObjectByName('hand_h');
            const handM = clockGroup.getObjectByName('hand_m');
            if (handH) handH.rotation.z = angleH_real;
            if (handM) handM.rotation.z = angleM_real;

            const gearSpin = - (elapsedSec / 10) * Math.PI * 2;
            const gearA = clockGroup.getObjectByName('gearA');
            const gearB = clockGroup.getObjectByName('gearB');
            if (gearA) gearA.rotation.y = gearSpin;
            if (gearB) gearB.rotation.y = -gearSpin * 2;

            const pistonRod = clockGroup.getObjectByName('piston_rod');
            if (pistonRod) {
                pistonRod.position.y = 10 + Math.sin(sec * Math.PI * 3) * 4.5;
            }
        }

        if (clockType === 'orrery') {
            const orbitSpeed = sec * 0.05 * mult;
            const earthArm = clockGroup.getObjectByName('earthArm');
            const moonArm = clockGroup.getObjectByName('moonArm');
            const sun = clockGroup.getObjectByName('sun');
            const zodiacRing = clockGroup.getObjectByName('zodiac');

            if (earthArm) earthArm.rotation.z = orbitSpeed;
            if (moonArm) moonArm.rotation.z = orbitSpeed * 12;
            if (sun) sun.rotation.y += 0.01 * speed;
            if (zodiacRing) zodiacRing.rotation.z -= 0.001 * speed;

            const handH = clockGroup.getObjectByName('hand_h');
            const handM = clockGroup.getObjectByName('hand_m');
            const handS = clockGroup.getObjectByName('hand_s');
            if (handH) handH.rotation.z = angleH;
            if (handM) handM.rotation.z = angleM;
            if (handS) handS.rotation.z = angleS;
        }

        if (clockType === 'alarm') {
            const handS = clockGroup.getObjectByName('hand_s');
            const handM = clockGroup.getObjectByName('hand_m');
            const handH = clockGroup.getObjectByName('hand_h');
            const handAlarm = clockGroup.getObjectByName('hand_alarm');

            if (handS) handS.rotation.z = angleS;
            if (handM) handM.rotation.z = angleM;
            if (handH) handH.rotation.z = angleH;

            const gearA = clockGroup.getObjectByName('gearA');
            const gearB = clockGroup.getObjectByName('gearB');
            if (gearA) gearA.rotation.y = angleS;
            if (gearB) gearB.rotation.y = -angleS * 2;

            const timeParts = alarmTime.split(':');
            const alH = parseInt(timeParts[0] || 12) % 12;
            const alM = parseInt(timeParts[1] || 0);
            const angleAlarm = - ((alH + alM / 60) / 12) * Math.PI * 2;
            if (handAlarm) handAlarm.rotation.z = angleAlarm;

            const hammer = clockGroup.getObjectByName('hammer');
            if (hammer) {
                if (testAlarmActive || (now.getHours() === parseInt(timeParts[0]||12) && now.getMinutes() === alM)) {
                    hammer.rotation.z = Math.sin(Date.now() * 0.08) * 0.25;
                } else {
                    hammer.rotation.z = 0;
                }
            }
        }

        if (clockType === 'quantum') {
            const qMult = mult;
            const ring1 = clockGroup.getObjectByName('ring1');
            const ring2 = clockGroup.getObjectByName('ring2');
            const ring3 = clockGroup.getObjectByName('ring3');

            if (ring1) { ring1.rotation.z += 0.01 * speed * qMult; ring1.rotation.x += 0.003 * speed * qMult; }
            if (ring2) { ring2.rotation.z -= 0.015 * speed * qMult; ring2.rotation.y += 0.002 * speed * qMult; }
            if (ring3) { ring3.rotation.z += 0.02 * speed * qMult; }

            const handH = clockGroup.getObjectByName('hand_h');
            const handM = clockGroup.getObjectByName('hand_m');
            const handS = clockGroup.getObjectByName('hand_s');
            if (handH) handH.rotation.z = angleH;
            if (handM) handM.rotation.z = angleM;
            if (handS) handS.rotation.z = angleS;

            const vortex = clockGroup.getObjectByName('quantum_vortex');
            if (vortex) {
                const uData = vortex.userData;
                const pos = uData.posArr || vortex.geometry.attributes.position.array;
                const count = uData.count;
                const radii = uData.radii;
                const angles = uData.angles;
                const speeds = uData.speeds;

                for(let i=0; i<count; i++) {
                    angles[i] += speeds[i] * speed * qMult;
                    const currentRadius = radii[i] + Math.sin(Date.now()*0.002 + i)*0.5;
                    pos[i*3] = Math.cos(angles[i]) * currentRadius;
                    pos[i*3+1] = Math.sin(angles[i]) * currentRadius;
                }
                vortex.geometry.attributes.position.needsUpdate = true;
            }
        }

        if (clockType === 'tourbillon') {
            const handH = clockGroup.getObjectByName('hand_h');
            const handM = clockGroup.getObjectByName('hand_m');
            const handS = clockGroup.getObjectByName('hand_s');
            if (handH) handH.rotation.z = angleH;
            if (handM) handM.rotation.z = angleM;
            if (handS) handS.rotation.z = angleS;
            const cage = clockGroup.getObjectByName('tourbCage');
            if (cage) cage.rotation.z += 0.007 * speedMultiplier;
            const esc = clockGroup.getObjectByName('tourbEsc');
            if (esc) esc.rotation.y += 0.045 * speedMultiplier;
            const bal = clockGroup.getObjectByName('tourbBal');
            if (bal) bal.rotation.z = Math.sin(Date.now() * 0.012) * 0.7;
            ['tourbG1','tourbG2','tourbG3','tourbG4','tourbG5','tourbG6'].forEach((n,i) => {
                const g = clockGroup.getObjectByName(n);
                if (g) g.rotation.y = (i%2===0?1:-1) * (angleS + i * 0.5) * speedMultiplier;
            });
        }

        if (clockType === 'neon') {
            const handH = clockGroup.getObjectByName('hand_h');
            const handM = clockGroup.getObjectByName('hand_m');
            const handS = clockGroup.getObjectByName('hand_s');
            if (handH) handH.rotation.z = angleH;
            if (handM) handM.rotation.z = angleM;
            if (handS) handS.rotation.z = angleS;
            const r1 = clockGroup.getObjectByName('neonRing1');
            const r2 = clockGroup.getObjectByName('neonRing2');
            if (r1) r1.rotation.z += 0.002 * speedMultiplier;
            if (r2) r2.rotation.z -= 0.003 * speedMultiplier;
        }

        if (clockType === 'binary') {
            const now2 = new Date();
            const h = now2.getHours(), mn = now2.getMinutes();
            const cols = [Math.floor(h/10), h%10, Math.floor(mn/10), mn%10];
            const glow = 2.5 + Math.sin(Date.now()*0.004)*0.4;
            for (let c = 0; c < 4; c++) {
                for (let r = 0; r < 4; r++) {
                    const led = clockGroup.getObjectByName('bin_r'+r+'_c'+c);
                    if (!led || !led.material) continue;
                    const bit = (cols[c] >> r) & 1;
                    led.material.emissiveIntensity = bit ? glow : 0.05;
                    if (led.material.color) led.material.color.setHex(bit ? 0x00ff44 : 0x001400);
                    if (led.material.emissive) led.material.emissive.setHex(bit ? 0x00ff44 : 0x001400);
                }
            }
        }
        if (clockType === 'holo') {
            const handH = clockGroup.getObjectByName('hand_h');
            const handM = clockGroup.getObjectByName('hand_m');
            const handS = clockGroup.getObjectByName('hand_s');
            if (handH) handH.rotation.z = angleH;
            if (handM) handM.rotation.z = angleM;
            if (handS) handS.rotation.z = angleS;
            const holoRing0 = clockGroup.getObjectByName('holoRing0');
            const holoRing1 = clockGroup.getObjectByName('holoRing1');
            const holoRing2 = clockGroup.getObjectByName('holoRing2');
            if (holoRing0) holoRing0.rotation.z = angleH;
            if (holoRing1) holoRing1.rotation.z = angleM;
            if (holoRing2) holoRing2.rotation.z = angleS;
        }

        if (clockType === 'nixie') {
            const hStr = String(now.getHours()).padStart(2,'0');
            const mStr = String(now.getMinutes()).padStart(2,'0');
            const sStr = String(Math.floor(sec)).padStart(2,'0');
            const timeStr = hStr + mStr + sStr;
            for (let i = 0; i < 6; i++) {
                const fil = clockGroup.getObjectByName('nixieFil'+i);
                if (fil && fil.material) {
                    const digit = parseInt(timeStr[i]) || 0;
                    // Create digit canvas texture on-the-fly if needed
                    if (!clockGroup._nixieTex) {
                        clockGroup._nixieTex = [];
                        for (let d = 0; d <= 9; d++) {
                            const c = document.createElement('canvas'); c.width=128; c.height=256;
                            const ctx = c.getContext('2d');
                            ctx.fillStyle = '#ff5500'; ctx.font = 'bold 160px sans-serif';
                            ctx.textAlign='center'; ctx.textBaseline='middle';
                            ctx.shadowColor='#ff5500'; ctx.shadowBlur=20;
                            ctx.fillText(d.toString(), 64, 128);
                            clockGroup._nixieTex.push(new THREE.CanvasTexture(c));
                        }
                    }
                    fil.material.map = clockGroup._nixieTex[digit];
                    fil.material.needsUpdate = true;
                    fil.material.opacity = 0.7 + Math.random()*0.3;
                }
            }
        }

        if (clockType === 'astrolabe') {
            const handH = clockGroup.getObjectByName('hand_h');
            const handM = clockGroup.getObjectByName('hand_m');
            if (handH) handH.rotation.z = angleH;
            if (handM) handM.rotation.z = angleM;
            const rete = clockGroup.getObjectByName('rete');
            if (rete) rete.rotation.z += 0.001 * speedMultiplier;
        }
    }

    function build3DClockwork() {
        if (!clockGroup) return;
        while(clockGroup.children.length > 0) {
            clockGroup.remove(clockGroup.children[0]);
        }
        // Reset cached nixie textures so they rebuild fresh
        clockGroup._nixieTex = null;

        if (window.SketchExtruder && window.SketchExtruder.getScene) {
            const dummyModel = {
                clockParts: [{
                    clockType, accentColor, speedMultiplier, alarmTime,
                    chronoRunning, chronoElapsed, chronoStartTime,
                    testAlarmActive, irisOpen,
                    customLogo: customLogoStr   // ✅ corrected key name
                }],
                clockStyle: metalStyle
            };
            const builtGeo = window.SketchExtruder.buildSteampunkChronoProGeo(dummyModel);

            // Add children directly (not cloned) so async textures (logo) stay live
            const toAdd = [];
            builtGeo.children.forEach(c => toAdd.push(c));
            toAdd.forEach(c => {
                builtGeo.remove(c);
                clockGroup.add(c);
            });

            const targetVortex = clockGroup.getObjectByName('quantum_vortex');
            const builtVortex = builtGeo.getObjectByName('quantum_vortex') ||
                                clockGroup.getObjectByName('quantum_vortex');
            if (builtVortex && targetVortex && builtVortex !== targetVortex) {
                targetVortex.userData = builtVortex.userData;
            } else if (targetVortex && targetVortex.userData && !targetVortex.userData.count) {
                // userData already attached during buildSteampunkChronoProGeo
            }
        }

        const scn = getScene();
        if (scn) {
            scn.animCbs = scn.animCbs || [];
            if (!scn.animCbs.includes(updateClockworkPro)) {
                scn.animCbs.push(updateClockworkPro);
            }
        }
    }

    function renderPanel() {
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'sc3pro-panel';
            document.body.appendChild(panel);
        }
        injectCSS();

        const l = L();
        panel.innerHTML = `
            <div class="hdr">
                <span class="hdr-title">${l.title}</span>
                <button class="x">✕</button>
            </div>
            <div class="sec">
                <div class="sec-t">${l.typeLabel}</div>
                <div class="grid-2">
                    <button class="btn-choice ${clockType==='chrono'?'active':''}" id="sc3p-t-chrono">⏱️ Chrono</button>
                    <button class="btn-choice ${clockType==='orrery'?'active':''}" id="sc3p-t-orrery">🌌 Orrery</button>
                    <button class="btn-choice ${clockType==='alarm'?'active':''}" id="sc3p-t-alarm">⏰ Alarm</button>
                    <button class="btn-choice ${clockType==='quantum'?'active':''}" id="sc3p-t-quantum">🌀 Quantum</button>
                    <button class="btn-choice ${clockType==='tourbillon'?'active':''}" id="sc3p-t-tourbillon">⚙️ Tourbillon</button>
                    <button class="btn-choice ${clockType==='neon'?'active':''}" id="sc3p-t-neon">💡 Neon LED</button>
                    <button class="btn-choice ${clockType==='binary'?'active':''}" id="sc3p-t-binary">🔢 Binary</button>
                    <button class="btn-choice ${clockType==='holo'?'active':''}" id="sc3p-t-holo">${l.typeHolo}</button>
                    <button class="btn-choice ${clockType==='nixie'?'active':''}" id="sc3p-t-nixie">${l.typeNixie}</button>
                    <button class="btn-choice ${clockType==='astrolabe'?'active':''}" id="sc3p-t-astrolabe">${l.typeAstrolabe}</button>
                </div>
            </div>
            
            <div class="sec">
                <div class="sec-t">✨ Customization / Add-ons</div>
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                    <input type="checkbox" id="sc3p-i-iris" ${irisOpen ? 'checked' : ''} style="cursor:pointer;" />
                    <label for="sc3p-i-iris" style="font-size:11px;color:#cbd5e1;cursor:pointer;">${l.irisLabel}</label>
                </div>
                <div style="font-size:11px;color:#cbd5e1;margin-bottom:4px;">${l.logoLabel}</div>
                <input type="file" id="sc3p-i-logo" accept="image/png, image/jpeg" style="width:100%;font-size:10px;background:#111;color:#fb923c;border:1px solid rgba(249,115,22,0.3);border-radius:4px;padding:4px;" />
            </div>

            <div class="sec">
                <div class="sec-t">${l.styleLabel}</div>
                <div class="grid-2">
                    <button class="btn-choice ${metalStyle==='brass'?'active':''}" id="sc3p-s-brass">Brass</button>
                    <button class="btn-choice ${metalStyle==='copper'?'active':''}" id="sc3p-s-copper">Copper</button>
                    <button class="btn-choice ${metalStyle==='iron'?'active':''}" id="sc3p-s-iron">Iron</button>
                    <button class="btn-choice ${metalStyle==='gold'?'active':''}" id="sc3p-s-gold">Gold</button>
                </div>
            </div>
            <div class="sec">
                <div class="sec-t">${l.accentLabel}</div>
                <input type="color" id="sc3p-accent" value="${accentColor}" style="width:100%;height:32px;border:none;border-radius:6px;cursor:pointer;background:none;"/>
            </div>
            <div class="sec">
                <div class="sec-t">${l.speedLabel}</div>
                <div style="display:flex;align-items:center;gap:10px;">
                    <input type="range" id="sc3p-speed" class="slider" min="-5" max="5" step="0.2" value="${speedMultiplier}"/>
                    <span style="color:#fdba74;font-size:11px;font-weight:700;min-width:24px;" id="sc3p-speed-val">${speedMultiplier}x</span>
                </div>
            </div>
            
            <div class="sec" id="sc3p-segment-chrono" style="display:${clockType==='chrono'?'block':'none'};">
                <div class="sec-t">${l.chronoLabel}</div>
                <div style="display:flex;flex-direction:column;gap:5px;">
                    <button class="action-btn primary" id="sc3p-chrono-start">${l.chronoStart}</button>
                    <button class="action-btn secondary" id="sc3p-chrono-stop">${l.chronoStop}</button>
                    <button class="action-btn secondary" id="sc3p-chrono-reset">${l.chronoReset}</button>
                </div>
            </div>

            <div class="sec" id="sc3p-segment-alarm" style="display:${clockType==='alarm'?'block':'none'};">
                <div class="sec-t">${l.alarmLabel}</div>
                <input type="time" class="input-text" id="sc3p-alarm-time" value="${alarmTime}"/>
                <button class="action-btn primary" id="sc3p-alarm-test" style="margin-top:6px;">${testAlarmActive ? l.stopAlarm : l.testAlarm}</button>
            </div>

            <div class="sec">
                <div class="sec-t">${l.statusLabel}</div>
                <div class="status-box" id="sc3p-status">${l.statusReady}</div>
            </div>

            <div class="sec" style="border:none;">
                <button class="action-btn primary" id="sc3p-btn-fuse">${l.fuseBtn}</button>
            </div>
        `;

        setupPanelEvents();
        updateStatusText();
    }

    function updateStatusText() {
        const l = L();
        const el = document.getElementById('sc3p-status');
        if (!el) return;

        if (clockType === 'chrono') {
            el.textContent = chronoRunning ? l.statusRunning : l.statusReady;
            el.style.color = chronoRunning ? '#10b981' : '#fed7aa';
        } else if (clockType === 'orrery') {
            el.textContent = l.statusOrrery;
            el.style.color = '#38bdf8';
        } else if (clockType === 'alarm') {
            el.textContent = testAlarmActive ? l.statusAlarm : l.statusReady;
            el.style.color = testAlarmActive ? '#ef4444' : '#fed7aa';
        } else if (clockType === 'quantum') {
            el.textContent = l.statusQuantum;
            el.style.color = '#a855f7';
        } else if (clockType === 'tourbillon') {
            el.textContent = l.statusTourbillon;
            el.style.color = '#d4af37';
        } else if (clockType === 'neon') {
            el.textContent = l.statusNeon;
            el.style.color = '#ff5500';
        } else if (clockType === 'binary') {
            el.textContent = l.statusBinary;
            el.style.color = '#00ff44';
        } else if (clockType === 'holo') {
            el.textContent = l.statusHolo;
            el.style.color = '#0ea5e9';
        } else if (clockType === 'nixie') {
            el.textContent = l.statusNixie;
            el.style.color = '#fb923c';
        } else if (clockType === 'astrolabe') {
            el.textContent = l.statusAstrolabe;
            el.style.color = '#eab308';
        }
    }

    function setupPanelEvents() {
        const l = L();
        panel.querySelector('.x').onclick = () => {
            isOpen = false;
            panel.style.display = 'none';
            stopAlarmSiren();
        };

        ['chrono', 'orrery', 'alarm', 'quantum', 'tourbillon', 'neon', 'binary', 'holo', 'nixie', 'astrolabe'].forEach(t => {
            const btn = document.getElementById(`sc3p-t-${t}`);
            if (btn) {
                btn.onclick = () => {
                    clockType = t;
                    stopAlarmSiren();
                    testAlarmActive = false;
                    renderPanel();
                    build3DClockwork();
                    syncProModel();
                };
            }
        });

        ['brass', 'copper', 'iron', 'gold'].forEach(s => {
            const btn = document.getElementById(`sc3p-s-${s}`);
            if (btn) {
                btn.onclick = () => {
                    metalStyle = s;
                    renderPanel();
                    build3DClockwork();
                    syncProModel();
                };
            }
        });

        const picker = document.getElementById('sc3p-accent');
        if (picker) {
            picker.oninput = (e) => {
                accentColor = e.target.value;
                build3DClockwork();
                syncProModel();
            };
        }

        const slider = document.getElementById('sc3p-speed');
        if (slider) {
            slider.oninput = (e) => {
                speedMultiplier = parseFloat(e.target.value);
                document.getElementById('sc3p-speed-val').textContent = speedMultiplier + 'x';
                syncProModel();
            };
        }

        const cStart = document.getElementById('sc3p-chrono-start');
        if (cStart) {
            cStart.onclick = () => {
                chronoRunning = true;
                chronoStartTime = Date.now();
                updateStatusText();
                syncProModel();
            };
        }
        const cStop = document.getElementById('sc3p-chrono-stop');
        if (cStop) {
            cStop.onclick = () => {
                if (chronoRunning && chronoStartTime) {
                    chronoElapsed += (Date.now() - chronoStartTime);
                }
                chronoRunning = false;
                chronoStartTime = null;
                updateStatusText();
                syncProModel();
            };
        }
        const cReset = document.getElementById('sc3p-chrono-reset');
        if (cReset) {
            cReset.onclick = () => {
                chronoRunning = false;
                chronoElapsed = 0;
                chronoStartTime = null;
                updateStatusText();
                syncProModel();
            };
        }

        const alarmIn = document.getElementById('sc3p-alarm-time');
        if (alarmIn) {
            alarmIn.onchange = (e) => {
                alarmTime = e.target.value;
                syncProModel();
            };
        }

        const alarmTest = document.getElementById('sc3p-alarm-test');
        if (alarmTest) {
            alarmTest.onclick = () => {
                testAlarmActive = !testAlarmActive;
                if (testAlarmActive) {
                    startAlarmSiren();
                    alarmTest.textContent = l.stopAlarm;
                } else {
                    stopAlarmSiren();
                    alarmTest.textContent = l.testAlarm;
                }
                updateStatusText();
                syncProModel();
            };
        }

        const irisCb = document.getElementById('sc3p-i-iris');
        if (irisCb) {
            irisCb.onchange = (e) => {
                irisOpen = e.target.checked;
                build3DClockwork();
                syncProModel();
            };
        }

        const logoIn = document.getElementById('sc3p-i-logo');
        if (logoIn) {
            logoIn.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) { customLogoStr = null; build3DClockwork(); return; }
                const reader = new FileReader();
                reader.onload = (ev) => {
                    customLogoStr = ev.target.result;
                    build3DClockwork();
                    syncProModel();
                };
                reader.readAsDataURL(file);
            };
        }

        const fuseBtn = document.getElementById('sc3p-btn-fuse');
        if (fuseBtn) {
            fuseBtn.onclick = () => {
                const scn = getScene();
                if (!scn) {
                    alert(l.errNoScene);
                    return;
                }
                build3DClockwork();
                syncProModel();
                if (window.toast) {
                    window.toast(l.successFused);
                } else {
                    alert(l.successFused);
                }
            };
        }
    }

    return {
        init: (sidebar, button) => {
            if (!button) return;
            button.onclick = () => {
                const scn = getScene();
                if (!scn) {
                    alert(L().errNoScene);
                    return;
                }

                isOpen = !isOpen;
                if (isOpen) {
                    ensureGroup();
                    if (!clockGroupAdded) {
                        const grp = window.SketchExtruder.getGroup();
                        if (grp) {
                            grp.add(clockGroup);
                            clockGroup.position.set(0, 30, 0);
                        }
                    }
                    renderPanel();
                    panel.style.display = 'block';
                    build3DClockwork();
                    syncProModel();
                } else {
                    panel.style.display = 'none';
                    stopAlarmSiren();
                }
            };
            
            // Detect global language changes to keep panel localized in EN/FR
            setInterval(() => {
                if (isOpen && panel && panel.style.display !== 'none') {
                    // Update only text content if currentLang switched
                    const header = panel.querySelector('.hdr-title');
                    if (header && header.textContent !== L().title) {
                        renderPanel();
                    }
                }
            }, 1000);
        }
    };
})();
