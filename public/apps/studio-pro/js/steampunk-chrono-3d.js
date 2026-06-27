/**
 * Steampunk Chrono-Engine (EN/FR)
 */
window.SteampunkChrono3D = (() => {
    let panel = null, isOpen = false, clockGroup = null, clockGroupAdded = false, parts = {}, animId = null, selStyle = 'brass';
    
    let steamPoints = null, steamAuraType = 'burst', steamColor = '#dfdfdf', steamTick = 0;

    function destroySteam() {
        if (steamPoints && clockGroup) {
            clockGroup.remove(steamPoints);
            steamPoints = null;
        }
        const scn = getScene();
        if (scn && scn.animCbs) {
            scn.animCbs = scn.animCbs.filter(cb => cb !== updateSteamCb);
        }
    }

    function createSteam() {
        destroySteam();
        if (steamAuraType === 'none' || !clockGroup) return;

        const count = 100;
        const geom = new THREE.BufferGeometry();
        const pos = new Float32Array(count * 3);
        const vels = [];
        const lives = [];

        // Distribute initial positions close to the left and right exhaust pipes
        for (let i = 0; i < count; i++) {
            const isLeft = (i % 2 === 0);
            pos[i*3] = isLeft ? -45 : 45;
            pos[i*3+1] = 35 + (Math.random() - 0.5) * 4;
            pos[i*3+2] = -5 + (Math.random() - 0.5) * 2;
            
            vels.push(new THREE.Vector3(
                (isLeft ? -1.0 : 1.0) * (0.8 + Math.random() * 1.5), 
                1.5 + Math.random() * 2.0, 
                (Math.random() - 0.5) * 0.5
            ));
            lives.push(Math.random() * 100);
        }

        geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({
            color: new THREE.Color(steamColor),
            size: 4.5,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });

        steamPoints = new THREE.Points(geom, mat);
        steamPoints.name = 'SCP_steam';
        clockGroup.add(steamPoints);

        steamPoints.userData = { vels, lives, posArr: pos };

        const scn = getScene();
        if (scn) {
            scn.animCbs = scn.animCbs || [];
            if (!scn.animCbs.includes(updateSteamCb)) {
                scn.animCbs.push(updateSteamCb);
            }
        }
    }

    function updateSteamCb(w) {
        if (!steamPoints || !clockGroup) return;
        steamTick++;
        const speed = w || 1;
        const geom = steamPoints.geometry;
        const posArr = steamPoints.userData.posArr;
        const vels = steamPoints.userData.vels;
        const lives = steamPoints.userData.lives;
        const count = posArr.length / 3;

        // Piston drives steam burst timing
        const burstActive = (Math.sin(steamTick * 0.12) > 0.3);

        for (let i = 0; i < count; i++) {
            lives[i] -= 1.5 * speed;
            const isLeft = (i % 2 === 0);

            if (lives[i] <= 0) {
                // Respawn particle
                lives[i] = 70 + Math.random() * 30;
                posArr[i*3] = isLeft ? -45 : 45;
                posArr[i*3+1] = 35;
                posArr[i*3+2] = -5;

                // Adjust velocity based on steam aura type
                let strength = 1.0;
                if (steamAuraType === 'burst') {
                    strength = burstActive ? 2.5 : 0.2;
                } else if (steamAuraType === 'pulse') {
                    strength = (Math.sin(steamTick * 0.3) > 0) ? 2.0 : 0.4;
                }
                vels[i].set(
                    (isLeft ? -1.0 : 1.0) * (0.5 + Math.random() * 1.0) * strength,
                    (1.0 + Math.random() * 1.5) * strength,
                    (Math.random() - 0.5) * 0.4
                );
            } else {
                // Apply physics and upward drift
                posArr[i*3] += vels[i].x * speed;
                posArr[i*3+1] += vels[i].y * speed;
                posArr[i*3+2] += vels[i].z * speed;

                // Add expansion and drag
                vels[i].x *= 0.94;
                vels[i].y -= 0.05 * speed; // Gravitational deceleration for heavier puffs
            }
        }
        geom.attributes.position.needsUpdate = true;
    }

    function getGeoCode(geo) {
        if (geo.type === 'BoxGeometry') {
            const p = geo.parameters;
            return `new THREE.BoxGeometry(${p.width},${p.height},${p.depth})`;
        } else if (geo.type === 'SphereGeometry') {
            const p = geo.parameters;
            return `new THREE.SphereGeometry(${p.radius},${p.widthSegments||12},${p.heightSegments||12})`;
        } else if (geo.type === 'CylinderGeometry') {
            const p = geo.parameters;
            return `new THREE.CylinderGeometry(${p.radiusTop},${p.radiusBottom},${p.height},${p.radialSegments||8})`;
        } else if (geo.type === 'ConeGeometry') {
            const p = geo.parameters;
            return `new THREE.ConeGeometry(${p.radius},${p.height},${p.radialSegments||8})`;
        } else if (geo.type === 'TorusGeometry') {
            const p = geo.parameters;
            return `new THREE.TorusGeometry(${p.radius},${p.tube},${p.radialSegments||8},${p.tubularSegments||12})`;
        } else if (geo.type === 'OctahedronGeometry') {
            const p = geo.parameters;
            return `new THREE.OctahedronGeometry(${p.radius},${p.detail||0})`;
        }
        return `new THREE.BoxGeometry(2,2,2)`;
    }

    const T = {
        en: {
            title: '⚙️ Steampunk Chrono-Engine',
            styleLabel: 'Chrono Aesthetic',
            partsLabel: 'Assemble Mechanism',
            addedLabel: 'Assembled Parts',
            actLabel: 'Actions',
            noParts: 'No parts active...',
            dial: 'Ornate Clock Dial',
            handH: 'Hour Indicator Hand',
            handM: 'Minute Indicator Hand',
            handS: 'Second Indicator Hand',
            gear8: 'Drive Gear (8T Pinion)',
            gear16: 'Gearwheel (16T Medium)',
            gear32: 'Gearwheel (32T Large)',
            gear64: 'Gearwheel (64T Huge)',
            escapement: 'Escapement Anchor & Wheel',
            pendulum: 'Gravity Pendulum',
            piston: 'Steam Drive Piston',
            pipe: 'Copper Exhaust Pipe',
            fuse: '⚡ Fusion & Export Chrono',
            newChrono: '➕ New Clockwork',
            deleteChrono: '🗑️ Delete',
            statusLabel: 'Mechanism Status',
            customColorLabel: '🎨 Metal Color Tint',
            steamLabel: '💨 Steam Exhaust System',
            steamColorLabel: 'Steam Color',
            steamNone: 'None',
            steamBurst: '💨 Periodic Burst',
            steamSteady: '♨️ Constant Stream',
            steamPulse: '❤️ Heartbeat Pulse',
            ok: 'assembled!',
            noScene: '⚠️ Generate a 3D scene first, then build your clockwork.',
            noFuse: 'Add mechanism parts first!',
            fused: '✅ Clockwork fused — code generated!',
            cleared: '♻️ Clockwork reset.',
            ready: 'Ready.'
        },
        fr: {
            title: '⚙️ Moteur Chrono Steampunk',
            styleLabel: 'Esthétique Chrono',
            partsLabel: 'Assembler Mécanisme',
            addedLabel: 'Pièces Assemblées',
            actLabel: 'Actions',
            noParts: 'Aucune pièce active...',
            dial: 'Cadran Orné de l\'Horloge',
            handH: 'Aiguille des Heures',
            handM: 'Aiguille des Minutes',
            handS: 'Aiguille des Secondes',
            gear8: 'Pignon d\'Entraînement (8T)',
            gear16: 'Roue Dentée Moyenne (16T)',
            gear32: 'Roue Dentée Grande (32T)',
            gear64: 'Roue Dentée Géante (64T)',
            escapement: 'Ancre d\'Échappement & Balancier',
            pendulum: 'Pendule Gravitationnel',
            piston: 'Piston à Vapeur Moteur',
            pipe: 'Tuyau d\'Échappement en Cuivre',
            fuse: '⚡ Fusion & Exporter Chrono',
            newChrono: '➕ Nouveau Chrono',
            deleteChrono: '🗑️ Supprimer',
            statusLabel: 'Statut du Mécanisme',
            customColorLabel: '🎨 Teinte Métallique',
            steamLabel: '💨 Système d\'Échappement Vapeur',
            steamColorLabel: 'Couleur Vapeur',
            steamNone: 'Aucun',
            steamBurst: '💨 Jet Périodique',
            steamSteady: '♨️ Jet Continu',
            steamPulse: '❤️ Pulsation Cardiaque',
            ok: 'assemblé !',
            noScene: '⚠️ Génerez d\'abord une scène 3D, puis assemblez le mécanisme.',
            noFuse: 'Ajoutez d\'abord des pièces !',
            fused: '✅ Mécanisme fusionné — code généré !',
            cleared: '♻️ Mécanisme réinitialisé.',
            ready: 'Prêt.'
        }
    };
    const L = () => T[window.currentLang === 'fr' ? 'fr' : 'en'];

    function injectCSS() {
        if (document.getElementById('sc3-css')) return;
        const s = document.createElement('style'); s.id = 'sc3-css';
        s.textContent = `
        #sc3-panel{position:fixed;top:60px;right:12px;width:288px;max-height:calc(100vh - 76px);background:#0f0a05;border:1px solid rgba(245,158,11,.4);border-radius:12px;box-shadow:0 0 40px rgba(245,158,11,.12),0 20px 60px rgba(0,0,0,.7);z-index:99999;overflow-y:auto;font-family:'Inter',sans-serif;scrollbar-width:thin;}
        #sc3-panel .hdr{padding:10px 12px;background:rgba(245,158,11,.1);border-bottom:1px solid rgba(245,158,11,.2);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:3;}
        #sc3-panel .hdr-title{font-size:12px;font-weight:800;color:#fbbf24;}
        #sc3-panel .x{width:20px;height:20px;border:none;border-radius:50%;padding:0;background:rgba(239,68,68,.25);color:#f87171;cursor:pointer;font-size:12px;line-height:20px;text-align:center;}
        #sc3-panel .x:hover{background:rgba(239,68,68,.6);color:#fff;}
        #sc3-panel .sec{padding:9px 11px;border-bottom:1px solid rgba(255,255,255,.04);}
        #sc3-panel .sec-t{font-size:8.5px;font-weight:700;color:#78350f;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;}
        #sc3-panel .chips{display:flex;flex-wrap:wrap;gap:4px;}
        #sc3-panel .chip{padding:3px 9px;border-radius:20px;font-size:9px;font-weight:700;background:#1a1005;border:1px solid #2d1b08;color:#a16207;cursor:pointer;transition:.2s;}
        #sc3-panel .chip.on{background:rgba(245,158,11,.18);border-color:#f59e0b;color:#fbbf24;}
        #sc3-panel .pgrid{display:grid;grid-template-columns:1fr 1fr;gap:4px;}
        #sc3-panel .pb{padding:9px 4px;background:#1a1005;border:1px solid #2d1b08;border-radius:7px;color:#d97706;font-size:10px;font-weight:600;cursor:pointer;transition:.2s;text-align:center;line-height:1.4;}
        #sc3-panel .pb:hover{background:#2d1b08;border-color:rgba(245,158,11,.6);color:#fbbf24;transform:translateY(-1px);}
        #sc3-panel .pb.done{border-color:#10b981;color:#10b981;background:rgba(16,185,129,.08);opacity:.7;pointer-events:none;}
        #sc3-panel .tags{display:flex;flex-wrap:wrap;gap:3px;}
        #sc3-panel .tag{padding:2px 7px;border-radius:20px;font-size:8.5px;font-weight:700;background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.3);color:#34d399;}
        #sc3-panel .bf{width:100%;padding:10px;margin-bottom:5px;background:linear-gradient(135deg,#f59e0b,#d97706,#b45309);border:none;border-radius:8px;color:#fff;font-size:11px;font-weight:800;cursor:pointer;box-shadow:0 3px 16px rgba(245,158,11,.3);transition:.2s;}
        #sc3-panel .bf:hover{transform:translateY(-2px);}
        
        #sc3-panel .act{padding:10px 11px;display:flex;flex-direction:column;gap:5px;border-top:1px solid rgba(255,255,255,.04);}
        #sc3-panel .abn{width:100%;padding:8px;border:none;border-radius:8px;color:#fff;font-size:10.5px;font-weight:700;cursor:pointer;transition:transform 0.2s, background-color 0.2s, box-shadow 0.2s;text-align:center;}
        #sc3-panel .abn:hover{transform:translateY(-1px);}
        #sc3-panel .abn.pri{background:linear-gradient(135deg,#f59e0b,#d97706,#b45309);font-weight:800;box-shadow:0 3px 12px rgba(245,158,11,.25);}
        #sc3-panel .abn.pri:hover{background:linear-gradient(135deg,#fbbf24,#d97706,#f59e0b);box-shadow:0 4px 16px rgba(245,158,11,.4);}
        #sc3-panel .abn.sec{background:#2d1b08;border:1px solid #452a0c;color:#fbbf24;}
        #sc3-panel .abn.sec:hover{background:#452a0c;color:#fff;}
        #sc3-panel .sbox{background:#1a0f05;border:1px solid #2d1b08;border-radius:8px;padding:8px;margin-top:4px;}
        #sc3-panel .sval{font-size:9.5px;color:#fde047;font-weight:500;margin-bottom:6px;word-break:break-all;line-height:1.3;}
        `;
        document.head.appendChild(s);
    }

    function getGroup() {
        if (window.SketchExtruder && typeof window.SketchExtruder.getGroup === 'function') return window.SketchExtruder.getGroup();
        return null;
    }
    function getScene() {
        if (window.SketchExtruder && typeof window.SketchExtruder.getScene === 'function') return window.SketchExtruder.getScene();
        return null;
    }
    function addMeshToScene(obj) {
        if (window.SketchExtruder && typeof window.SketchExtruder.addMeshToScene === 'function') {
            window.SketchExtruder.addMeshToScene(obj);
            return true;
        }
        const scn = getScene();
        if (scn) { scn.add(obj); return true; }
        return false;
    }

    function ensureGroup() {
        if (!clockGroup) {
            clockGroup = new THREE.Group();
            clockGroup.name = 'SteampunkClock';
        }
        return !!(window.SketchExtruder && typeof window.SketchExtruder.addExtraModule === 'function');
    }

    function getChronoModelId() { return window._sc3ModelId || null; }

    function getPartMaterialProps(mesh) {
        let mat = null;
        if (mesh.material) {
            mat = mesh.material;
        } else {
            mesh.traverse(child => {
                if (!mat && child.material) {
                    mat = child.material;
                }
            });
        }
        if (mat) {
            return {
                colorHex: mat.color ? '#' + mat.color.getHexString() : '#fbbf24',
                emissiveHex: mat.emissive ? '#' + mat.emissive.getHexString() : '#000000',
                metalness: mat.metalness !== undefined ? mat.metalness : 0.9,
                roughness: mat.roughness !== undefined ? mat.roughness : 0.2
            };
        }
        return {
            colorHex: '#fbbf24',
            emissiveHex: '#000000',
            metalness: 0.9,
            roughness: 0.2
        };
    }

    function setPartColor(mesh, colorHex) {
        const color = new THREE.Color(colorHex);
        mesh.traverse(child => {
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => {
                        if (m.color) m.color.copy(color);
                    });
                } else {
                    if (child.material.color) child.material.color.copy(color);
                }
            }
        });
    }

    function syncChronoModel() {
        const clockParts = Object.entries(parts).map(([name, mesh]) => {
            const props = getPartMaterialProps(mesh);
            return {
                name,
                px: parseFloat((mesh.userData && mesh.userData.basePosition ? mesh.userData.basePosition.x : mesh.position.x).toFixed(2)),
                py: parseFloat((mesh.userData && mesh.userData.basePosition ? mesh.userData.basePosition.y : mesh.position.y).toFixed(2)),
                pz: parseFloat((mesh.userData && mesh.userData.basePosition ? mesh.userData.basePosition.z : mesh.position.z).toFixed(2)),
                colorHex: props.colorHex,
                emissiveHex: props.emissiveHex,
                metalness: props.metalness,
                roughness: props.roughness
            };
        });

        let id = getChronoModelId();
        if (!id) {
            id = window.SketchExtruder.addExtraModule('steampunk-chrono', { clockParts, clockStyle: selStyle, importedMesh: clockGroup });
            window._sc3ModelId = id;
            clockGroupAdded = true;
        } else {
            if (window.SketchExtruder && window._hf3UpdateModel) {
                // Leverage the existing model updating routine safely
                window._hf3UpdateModel(id, clockParts, selStyle, clockGroup, 'idle');
            }
        }
    }

    function setStatus(msg) { const el = document.getElementById('sc3-status'); if (el) el.textContent = msg; }
    function addTag(name) {
        const box = document.getElementById('sc3-tags'); if (!box) return;
        const sp = box.querySelector('span[style]'); if (sp) sp.remove();
        const t = document.createElement('span'); t.className = 'tag'; t.textContent = name; box.appendChild(t);
    }

    function makeMat(partName, style) {
        const C = {
            brass: { color: 0xd4af37, metalness: 0.95, roughness: 0.15 },
            copper: { color: 0xc87533, metalness: 0.90, roughness: 0.25 },
            iron: { color: 0x3a3d40, metalness: 0.75, roughness: 0.45 },
            gold: { color: 0xffd700, metalness: 0.98, roughness: 0.10 }
        };
        const s = C[style] || C.brass;
        const col = s.color;
        
        let emi = 0x000000, emInt = 0;
        if (partName.startsWith('hand')) {
            emi = 0xc87533; emInt = 0.3; // subtle glowing indicators
        }

        return new THREE.MeshPhysicalMaterial({ 
            color: col, emissive: emi, emissiveIntensity: emInt,
            metalness: s.metalness, 
            roughness: s.roughness,
            clearcoat: style === 'gold' || style === 'brass' ? 1.0 : 0.2,
            clearcoatRoughness: 0.1,
            flatShading: style === 'iron', 
            side: THREE.DoubleSide
        });
    }

    // Procedural tooth modeler. Creates physical gear teeth recursively added to base cylinder
    function makeGearGeometry(teeth, thickness, scaleRadius) {
        const baseRadius = teeth * 0.4 * scaleRadius;
        const gearGeom = new THREE.CylinderGeometry(baseRadius, baseRadius, thickness, teeth * 2);
        return { geom: gearGeom, baseRadius };
    }

    function addGearTeeth(mesh, teeth, thickness, baseRadius, style) {
        const toothCount = teeth;
        const angleStep = (Math.PI * 2) / toothCount;
        
        // A single tooth box
        const toothW = baseRadius * Math.sin(angleStep / 2) * 1.1;
        const toothD = baseRadius * 0.15;
        const toothH = thickness;

        const toothGeom = new THREE.BoxGeometry(toothW, toothH, toothD);
        const toothMat = makeMat('gear_tooth', style);

        for (let i = 0; i < toothCount; i++) {
            const angle = i * angleStep;
            const toothMesh = new THREE.Mesh(toothGeom, toothMat);
            toothMesh.position.set(
                Math.cos(angle) * (baseRadius + toothD / 4),
                0,
                Math.sin(angle) * (baseRadius + toothD / 4)
            );
            toothMesh.rotation.y = -angle;
            toothMesh.castShadow = true;
            toothMesh.receiveShadow = true;
            toothMesh.name = 'gear_tooth_' + i;
            mesh.add(toothMesh);
        }
    }

    function snapPos(partName) {
        const center = new THREE.Vector3(0, 15, 0);
        const offsets = {
            dial: new THREE.Vector3(0, 0, -2),
            gear64: new THREE.Vector3(0, 0, 0),
            gear32: new THREE.Vector3(-38.4, 0, 2),
            gear16: new THREE.Vector3(32.0, 0, -2),
            gear8: new THREE.Vector3(0, -28.8, -1),
            escapement: new THREE.Vector3(0, 29.6, 1),
            pendulum: new THREE.Vector3(0, 0, -4),
            piston: new THREE.Vector3(-22, -26, -3),
            pipe: new THREE.Vector3(0, 0, -5),
            handH: new THREE.Vector3(32.0, 0, 0),
            handM: new THREE.Vector3(-38.4, 0, 4),
            handS: new THREE.Vector3(0, 0, 2)
        };
        const off = offsets[partName] || new THREE.Vector3(0, 0, 0);
        return center.clone().add(off);
    }

    function addPart(partName) {
        if (!ensureGroup()) {
            const attempts = (addPart._retries = (addPart._retries||0) + 1);
            if (attempts <= 15) { setStatus('⏳ '+(window.currentLang==='fr'?'Initialisation...':'Initializing...')); setTimeout(()=>{ addPart._retries=0; addPart(partName); }, 300); }
            else { addPart._retries=0; setStatus(L().noScene); }
            return;
        }
        addPart._retries = 0;
        if (parts[partName]) clockGroup.remove(parts[partName]);
        
        let mesh;
        const mat = makeMat(partName, selStyle);
        const position = snapPos(partName);

        if (partName === 'dial') {
            // Roman Numeral Dial Faceplate
            const dialGroup = new THREE.Group();
            
            // Outer Ring
            const outerRing = new THREE.Mesh(new THREE.TorusGeometry(36, 1.2, 8, 32), mat);
            dialGroup.add(outerRing);
            
            // Inner Ring
            const innerRing = new THREE.Mesh(new THREE.TorusGeometry(28, 0.8, 8, 32), mat);
            dialGroup.add(innerRing);

            // Dial Back Plate (semi-transparent dark mesh for high readability)
            const backPlate = new THREE.Mesh(
                new THREE.CylinderGeometry(35.5, 35.5, 0.6, 32), 
                new THREE.MeshPhysicalMaterial({ color: 0x110a02, roughness: 0.6, transmission: 0.6, thickness: 1.0 })
            );
            backPlate.rotation.x = Math.PI / 2;
            backPlate.position.z = -0.6;
            dialGroup.add(backPlate);

            // Numerals (represented by radial rods)
            const markerGeom = new THREE.BoxGeometry(0.8, 4.0, 0.8);
            for (let i = 0; i < 12; i++) {
                const marker = new THREE.Mesh(markerGeom, makeMat('marker', 'gold'));
                const ang = (i / 12) * Math.PI * 2;
                marker.position.set(Math.cos(ang) * 31.5, Math.sin(ang) * 31.5, 0.4);
                marker.rotation.z = ang - Math.PI / 2;
                dialGroup.add(marker);
            }
            mesh = dialGroup;
            mesh.name = 'SCP_dial';
        }
        else if (partName.startsWith('gear')) {
            const teeth = parseInt(partName.substring(4));
            const { geom, baseRadius } = makeGearGeometry(teeth, 2.5, 1.0);
            
            const gearMesh = new THREE.Mesh(geom, mat);
            gearMesh.rotation.x = Math.PI / 2;
            gearMesh.castShadow = true; gearMesh.receiveShadow = true;
            
            // Procedurally add teeth
            addGearTeeth(gearMesh, teeth, 2.5, baseRadius, selStyle);
            
            // Inner decorative spoke structure
            const axle = new THREE.Mesh(new THREE.CylinderGeometry(baseRadius * 0.25, baseRadius * 0.25, 3.0, 8), makeMat('axle', 'iron'));
            gearMesh.add(axle);
            
            const spokeGeom = new THREE.BoxGeometry(baseRadius * 1.8, 1.5, 1.2);
            for(let i=0; i<3; i++) {
                const spoke = new THREE.Mesh(spokeGeom, mat);
                spoke.rotation.y = (i * Math.PI) / 3;
                gearMesh.add(spoke);
            }

            mesh = gearMesh;
            mesh.name = 'SCP_' + partName;
        }
        else if (partName.startsWith('hand')) {
            const handGroup = new THREE.Group();
            let len = 12;
            if (partName === 'handH') len = 14;
            if (partName === 'handM') len = 24;
            if (partName === 'handS') len = 28;

            const rodMat = partName === 'handS' ? makeMat('second_hand', 'gold') : mat;
            const rod = new THREE.Mesh(new THREE.BoxGeometry(0.8, len, 0.8), rodMat);
            rod.position.y = len / 2 - 2; // pivot at base
            handGroup.add(rod);

            // Ornate teardrop tip
            const tip = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4, 4), rodMat);
            tip.position.y = len - 2;
            handGroup.add(tip);

            // Center decorative boss (boss cap)
            const cap = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 8), makeMat('hand_cap', 'gold'));
            cap.position.z = 0.6;
            handGroup.add(cap);

            mesh = handGroup;
            mesh.name = 'SCP_' + partName;
        }
        else if (partName === 'escapement') {
            const escapeGroup = new THREE.Group();
            
            // Escape balance wheel
            const escWheel = new THREE.Mesh(new THREE.TorusGeometry(8, 0.8, 6, 24), mat);
            escapeGroup.add(escWheel);

            // Connecting center cross
            const crossG = new THREE.BoxGeometry(15.5, 0.6, 0.6);
            const cross1 = new THREE.Mesh(crossG, mat);
            const cross2 = new THREE.Mesh(crossG, mat);
            cross2.rotation.z = Math.PI / 2;
            escapeGroup.add(cross1, cross2);

            // The escapement anchor fork above it
            const anchorFork = new THREE.Group();
            anchorFork.name = 'escapement_anchor';
            anchorFork.position.y = 8;
            
            const anchorBody = new THREE.Mesh(new THREE.BoxGeometry(1.2, 8.0, 1.2), makeMat('anchor', 'iron'));
            anchorFork.add(anchorBody);

            const prongs = new THREE.Mesh(new THREE.TorusGeometry(4.5, 0.6, 6, 12, Math.PI), makeMat('anchor', 'iron'));
            prongs.rotation.x = Math.PI/2;
            prongs.position.y = -4;
            anchorFork.add(prongs);

            escapeGroup.add(anchorFork);

            mesh = escapeGroup;
            mesh.name = 'SCP_escapement';
        }
        else if (partName === 'pendulum') {
            const pendGroup = new THREE.Group();
            
            // Rod extending down
            const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 45, 8), mat);
            rod.position.y = -22.5;
            pendGroup.add(rod);
            
            // Heavy bottom bob
            const bob = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 2, 16), makeMat('bob', 'gold'));
            bob.position.y = -45;
            bob.rotation.x = Math.PI/2;
            pendGroup.add(bob);

            mesh = pendGroup;
            mesh.name = 'SCP_pendulum';
        }
        else if (partName === 'piston') {
            const pistonGroup = new THREE.Group();
            
            // Steam Cylinder Outer Case
            const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 5, 15, 12), makeMat('cylinder', 'iron'));
            cylinder.castShadow = true; cylinder.receiveShadow = true;
            pistonGroup.add(cylinder);

            // Moving piston rod
            const rod = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 18, 8), makeMat('piston_rod', 'copper'));
            rod.name = 'piston_rod';
            rod.position.y = 5;
            pistonGroup.add(rod);

            // Cylinder brackets
            const bracket = new THREE.Mesh(new THREE.BoxGeometry(11, 2, 4), makeMat('bracket', 'brass'));
            pistonGroup.add(bracket);

            mesh = pistonGroup;
            mesh.name = 'SCP_piston';
        }
        else if (partName === 'pipe') {
            const pipeGroup = new THREE.Group();
            
            // Symmetrical curving left & right copper steam vents
            [-1, 1].forEach(s => {
                const vent = new THREE.Group();
                vent.position.x = s * 45;
                vent.position.y = 20;

                const pipe1 = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.5, 15, 8), mat);
                pipe1.castShadow = true;
                vent.add(pipe1);

                // Ornate curved vent opening
                const cap = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.8, 8, 16), makeMat('pipe_cap', 'gold'));
                cap.rotation.x = Math.PI / 2;
                cap.position.y = 7.5;
                vent.add(cap);

                // Bracket mounting block
                const mount = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 3), makeMat('mount', 'iron'));
                mount.position.set(-s * 5, -3, 0);
                vent.add(mount);

                pipeGroup.add(vent);
            });

            mesh = pipeGroup;
            mesh.name = 'SCP_pipe';
        }

        mesh.position.copy(position);
        mesh.userData.basePosition = mesh.position.clone();
        
        parts[partName] = mesh;
        clockGroup.add(mesh);
        
        syncChronoModel();
        
        addTag(partName);
        setStatus('✅ ' + L()[partName] + ' — ' + L().ok);
        if (window.toast) toast('⚙️ ' + L()[partName] + ' ' + (window.currentLang === 'fr' ? 'assemblé!' : 'assembled!'));

        // Register custom real-time animation callback for the mechanism if not already done
        ensureClockworkAnim();
    }

    function ensureClockworkAnim() {
        const scn = getScene();
        if (scn) {
            scn.animCbs = scn.animCbs || [];
            if (!scn.animCbs.includes(updateClockwork)) {
                scn.animCbs.push(updateClockwork);
            }
        }
    }

    function updateClockwork(w) {
        if (!clockGroup) return;
        const speed = w || 1;
        const now = new Date();
        const ms = now.getMilliseconds();
        const sec = now.getSeconds() + ms / 1000;
        const min = now.getMinutes() + sec / 60;
        const hr = (now.getHours() % 12) + min / 60;

        // Gear rotation angles based on local system time
        const angleS = - (sec / 60) * Math.PI * 2;
        const angleM = - (min / 60) * Math.PI * 2;
        const angleH = - (hr / 12) * Math.PI * 2;

        // Drive gear ratios
        // gear64 drives seconds hand -> spins directly in sync with seconds
        if (parts.gear64) {
            parts.gear64.rotation.y = angleS;
        }
        if (parts.handS) {
            parts.handS.rotation.z = angleS;
        }

        // gear32 drives minutes hand -> spins in sync with minutes
        if (parts.gear32) {
            parts.gear32.rotation.y = angleM;
        }
        if (parts.handM) {
            parts.handM.rotation.z = angleM;
        }

        // gear16 drives hour hand -> spins in sync with hours
        if (parts.gear16) {
            parts.gear16.rotation.y = angleH;
        }
        if (parts.handH) {
            parts.handH.rotation.z = angleH;
        }

        // gear8 is a high-speed driving pinion (ratio 64/8 = 8x faster in opposite direction)
        if (parts.gear8) {
            parts.gear8.rotation.y = -angleS * 8;
        }

        // Escapement Anchor oscillates back and forth at 2 ticks per second (2 Hz)
        if (parts.escapement) {
            const clockTick = sec * Math.PI * 4; // 2 oscillations per sec
            parts.escapement.rotation.y = Math.sin(clockTick) * 0.7; // balance wheel wheel
            
            const anchor = parts.escapement.getObjectByName('escapement_anchor');
            if (anchor) {
                anchor.rotation.z = Math.cos(clockTick) * 0.14; // anchor fork rocking
            }
        }

        // Pendulum swings slowly at exactly 1 Hz
        if (parts.pendulum) {
            const swingTime = sec * Math.PI * 2;
            parts.pendulum.rotation.z = Math.sin(swingTime) * 0.16;
        }

        // Piston steam strokes are driven rapidly (approx 1.5 Hz)
        if (parts.piston) {
            const pistonTime = sec * Math.PI * 3;
            const rod = parts.piston.getObjectByName('piston_rod');
            if (rod) {
                rod.position.y = 5 + Math.sin(pistonTime) * 4.5;
            }
        }
    }

    function serializeMesh(mesh, varName, parentVarName) {
        const lines = [];
        if (mesh instanceof THREE.Group || !mesh.material) {
            lines.push("    var " + varName + " = new THREE.Group();");
        } else {
            const geoStr = getGeoCode(mesh.geometry);
            const col = mesh.material.color ? mesh.material.color.getHexString() : 'ffffff';
            const emi = mesh.material.emissive ? mesh.material.emissive.getHexString() : '000000';
            const emInt = mesh.material.emissiveIntensity !== undefined ? mesh.material.emissiveIntensity : 0;
            const metal = (mesh.material.metalness !== undefined ? mesh.material.metalness : 0).toFixed(2);
            const rough = (mesh.material.roughness !== undefined ? mesh.material.roughness : 0.5).toFixed(2);
            const clearcoat = (mesh.material.clearcoat !== undefined ? mesh.material.clearcoat : 0).toFixed(2);
            
            lines.push("    var " + varName + "_g = " + geoStr + ";");
            if (mesh.material.type === 'MeshBasicMaterial') {
                lines.push("    var " + varName + "_m = new THREE.MeshBasicMaterial({color:0x" + col + "});");
            } else {
                lines.push("    var " + varName + "_m = new THREE.MeshPhysicalMaterial({color:0x" + col + ",emissive:0x" + emi + ",emissiveIntensity:" + emInt + ",metalness:" + metal + ",roughness:" + rough + ",clearcoat:" + clearcoat + "});");
            }
            lines.push("    var " + varName + " = new THREE.Mesh(" + varName + "_g, " + varName + "_m);");
            lines.push("    " + varName + ".castShadow = true; " + varName + ".receiveShadow = true;");
        }
        
        if (mesh.name) {
            lines.push("    " + varName + ".name = '" + mesh.name + "';");
        }
        const pos = mesh.position;
        lines.push("    " + varName + ".position.set(" + pos.x.toFixed(2) + "," + pos.y.toFixed(2) + "," + pos.z.toFixed(2) + ");");
        const rot = mesh.rotation;
        lines.push("    " + varName + ".rotation.set(" + rot.x.toFixed(2) + "," + rot.y.toFixed(2) + "," + rot.z.toFixed(2) + ");");
        const scl = mesh.scale;
        lines.push("    " + varName + ".scale.set(" + scl.x.toFixed(2) + "," + scl.y.toFixed(2) + "," + scl.z.toFixed(2) + ");");
        lines.push("    " + parentVarName + ".add(" + varName + ");");
        
        if (mesh.children && mesh.children.length > 0) {
            mesh.children.forEach(function(child, index) {
                if (child instanceof THREE.Mesh || child instanceof THREE.Group) {
                    lines.push(serializeMesh(child, varName + "_c" + index, varName));
                }
            });
        }
        return lines.join('\n');
    }

    function fuseSteampunk() {
        if (!clockGroup || Object.keys(parts).length === 0) { setStatus(L().noFuse); return; }

        const partEntries = [];
        Object.entries(parts).forEach(([name, mesh]) => {
            const pos = mesh.userData.basePosition || mesh.position;
            const origPos = mesh.position.clone();
            mesh.position.copy(pos);
            const serialized = serializeMesh(mesh, 'part_' + name, 'chrono');
            mesh.position.copy(origPos);
            partEntries.push("  // " + name + "\n  (function(){\n" + serialized + "\n  })()");
        });

        const styleLabel = {
            brass: 'Polished Brass Chrono',
            copper: 'Patina Copper Chrono',
            iron: 'Cast Iron Mechanism',
            gold: 'Burnished Gold Horloge'
        }[selStyle] || selStyle;

        let steamInitCode = '';
        let steamAnimateCode = '';

        if (steamAuraType !== 'none') {
            steamInitCode = `
  // Steam Particle System (${steamAuraType})
  var steamCount = 100;
  var steamGeom = new THREE.BufferGeometry();
  var steamPos = new Float32Array(steamCount * 3);
  var steamVels = [];
  var steamLives = [];
  
  for (var i = 0; i < steamCount; i++) {
    var isLeft = (i % 2 === 0);
    steamPos[i*3] = isLeft ? -45 : 45;
    steamPos[i*3+1] = 35 + (Math.random() - 0.5) * 4;
    steamPos[i*3+2] = -5 + (Math.random() - 0.5) * 2;
    steamVels.push(new THREE.Vector3((isLeft ? -1.0 : 1.0) * (0.8 + Math.random() * 1.5), 1.5 + Math.random() * 2.0, (Math.random() - 0.5) * 0.5));
    steamLives.push(Math.random() * 100);
  }
  steamGeom.setAttribute('position', new THREE.BufferAttribute(steamPos, 3));
  var steamMat = new THREE.PointsMaterial({
    color: new THREE.Color('${steamColor}'),
    size: 4.5,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending
  });
  var steamPoints = new THREE.Points(steamGeom, steamMat);
  chrono.add(steamPoints);
  var steamTick = 0;
`;

            steamAnimateCode = `
    // Update Steam Particles
    steamTick++;
    var posArr = steamPoints.geometry.attributes.position.array;
    var burstActive = (Math.sin(steamTick * 0.12) > 0.3);
    for (var i = 0; i < steamCount; i++) {
      steamLives[i] -= 1.5;
      var isLeft = (i % 2 === 0);
      if (steamLives[i] <= 0) {
        steamLives[i] = 70 + Math.random() * 30;
        posArr[i*3] = isLeft ? -45 : 45;
        posArr[i*3+1] = 35;
        posArr[i*3+2] = -5;
        var strength = 1.0;
        if ('${steamAuraType}' === 'burst') {
          strength = burstActive ? 2.5 : 0.2;
        } else if ('${steamAuraType}' === 'pulse') {
          strength = (Math.sin(steamTick * 0.3) > 0) ? 2.0 : 0.4;
        }
        steamVels[i].set((isLeft ? -1.0 : 1.0) * (0.5 + Math.random() * 1.0) * strength, (1.0 + Math.random() * 1.5) * strength, (Math.random() - 0.5) * 0.4);
      } else {
        posArr[i*3] += steamVels[i].x;
        posArr[i*3+1] += steamVels[i].y;
        posArr[i*3+2] += steamVels[i].z;
        steamVels[i].x *= 0.94;
        steamVels[i].y -= 0.05;
      }
    }
    steamPoints.geometry.attributes.position.needsUpdate = true;
`;
        }

        const clockworkAnimateCode = `
    // Time Synchronization & Gear Meshing Loops
    var now = new Date();
    var ms = now.getMilliseconds();
    var sec = now.getSeconds() + ms / 1000;
    var min = now.getMinutes() + sec / 60;
    var hr = (now.getHours() % 12) + min / 60;

    var angleS = - (sec / 60) * Math.PI * 2;
    var angleM = - (min / 60) * Math.PI * 2;
    var angleH = - (hr / 12) * Math.PI * 2;

    chrono.traverse(function(child) {
      if (child.name === 'SCP_gear64') child.rotation.y = angleS;
      if (child.name === 'SCP_handS') child.rotation.z = angleS;
      if (child.name === 'SCP_gear32') child.rotation.y = angleM;
      if (child.name === 'SCP_handM') child.rotation.z = angleM;
      if (child.name === 'SCP_gear16') child.rotation.y = angleH;
      if (child.name === 'SCP_handH') child.rotation.z = angleH;
      if (child.name === 'SCP_gear8') child.rotation.y = -angleS * 8;
      
      if (child.name === 'SCP_escapement') {
        var clockTick = sec * Math.PI * 4;
        child.rotation.y = Math.sin(clockTick) * 0.7;
        var anchor = child.getObjectByName('escapement_anchor');
        if (anchor) anchor.rotation.z = Math.cos(clockTick) * 0.14;
      }
      if (child.name === 'SCP_pendulum') {
        var swingTime = sec * Math.PI * 2;
        child.rotation.z = Math.sin(swingTime) * 0.16;
      }
      if (child.name === 'SCP_piston') {
        var pistonTime = sec * Math.PI * 3;
        var rod = child.getObjectByName('piston_rod');
        if (rod) rod.position.y = 5 + Math.sin(pistonTime) * 4.5;
      }
    });
`;

        const code = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Steampunk Chrono — ${styleLabel}</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0703;overflow:hidden}</style>
</head>
<body>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"><\/script>
<script>
  var scene=new THREE.Scene();
  scene.fog=new THREE.FogExp2(0x0a0703,0.003);
  var camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,0.1,2000);
  camera.position.set(0,0,130);
  var renderer=new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled=true;
  renderer.setClearColor(0x0a0703);
  document.body.appendChild(renderer.domElement);
  var controls=new THREE.OrbitControls(camera,renderer.domElement);
  controls.autoRotate=false;
  scene.add(new THREE.AmbientLight(0xffffff,0.3));
  var dir=new THREE.DirectionalLight(0xffeedd,1.2);
  dir.position.set(100,100,150); dir.castShadow=true; scene.add(dir);
  scene.add(new THREE.HemisphereLight(0xffeedd,0x1a0f05,0.6));
  scene.add(new THREE.GridHelper(400,40,0x2d1b08,0x1a0f05));
  var chrono=new THREE.Group();
  scene.add(chrono);
${partEntries.join(';\n')}
${steamInitCode}
  function animate(){
    requestAnimationFrame(animate);
    controls.update();
${steamAnimateCode}
${clockworkAnimateCode}
    renderer.render(scene,camera);
  }
  animate();
  window.addEventListener('resize',function(){ camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); });
<\/script>
</body>
</html>`;

        showChronoModal(code, styleLabel);
        setStatus(L().fused);
        if (window.toast) toast('⚙️ ' + (window.currentLang==='fr' ? 'Chrono prêt — cliquez Télécharger !' : 'Chrono ready — click Download!'));
    }

    function showChronoModal(code, label) {
        const old = document.getElementById('sc3-export-modal');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'sc3-export-modal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:999999;display:flex;align-items:center;justify-content:center;';
        modal.innerHTML = `
        <div style="background:#0f0a05;border:1px solid rgba(245,158,11,.4);border-radius:14px;width:700px;max-width:96vw;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 0 60px rgba(245,158,11,.15);">
            <div style="padding:14px 18px;border-bottom:1px solid rgba(245,158,11,.2);display:flex;align-items:center;justify-content:space-between;">
                <div style="font-size:13px;font-weight:800;color:#fbbf24;">⚙️ Steampunk Chrono Export — ${label}</div>
                <button id="sc3-modal-close" style="border:none;background:rgba(239,68,68,.25);color:#f87171;border-radius:50%;width:24px;height:24px;cursor:pointer;font-size:14px;">✕</button>
            </div>
            <div style="padding:10px 14px;display:flex;gap:8px;border-bottom:1px solid rgba(255,255,255,.05);">
                <button id="sc3-copy-btn" style="flex:1;padding:9px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:7px;color:#fff;font-size:11px;font-weight:700;cursor:pointer;">📋 ${window.currentLang==='fr'?'Copier Code':'Copy Code'}</button>
                <button id="sc3-dl-btn" style="flex:1;padding:9px;background:linear-gradient(135deg,#f59e0b,#d97706);border:none;border-radius:7px;color:#fff;font-size:11px;font-weight:800;cursor:pointer;">⬇️ ${window.currentLang==='fr'?'Télécharger HTML':'Download HTML'}</button>
                <button id="sc3-preview-btn" style="flex:1;padding:9px;background:linear-gradient(135deg,#10b981,#059669);border:none;border-radius:7px;color:#fff;font-size:11px;font-weight:700;cursor:pointer;">👁️ ${window.currentLang==='fr'?'Aperçu':'Preview'}</button>
            </div>
            <textarea id="sc3-code-area" style="flex:1;background:#080502;color:#a16207;font-family:monospace;font-size:10px;padding:12px;border:none;outline:none;resize:none;min-height:320px;" readonly></textarea>
            <div id="sc3-preview-frame" style="display:none;height:320px;"></div>
        </div>`;
        document.body.appendChild(modal);
        document.getElementById('sc3-code-area').value = code;

        document.getElementById('sc3-modal-close').onclick = () => modal.remove();
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

        document.getElementById('sc3-copy-btn').onclick = () => {
            navigator.clipboard.writeText(code).then(() => {
                document.getElementById('sc3-copy-btn').textContent = '✅ Copied!';
                setTimeout(() => { const b = document.getElementById('sc3-copy-btn'); if(b) b.textContent = '📋 '+(window.currentLang==='fr'?'Copier Code':'Copy Code'); }, 2000);
            }).catch(() => {
                document.getElementById('sc3-code-area').select();
                document.execCommand('copy');
            });
        };

        document.getElementById('sc3-dl-btn').onclick = () => {
            const blob = new Blob([code], {type:'text/html'});
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'steampunk-chrono-' + label.toLowerCase().replace(/\s+/g,'-') + '.html';
            a.click();
        };

        document.getElementById('sc3-preview-btn').onclick = () => {
            const ta = document.getElementById('sc3-code-area');
            const pf = document.getElementById('sc3-preview-frame');
            if (pf.style.display === 'none') {
                pf.style.display = 'block'; ta.style.display = 'none';
                pf.innerHTML = '';
                const iframe = document.createElement('iframe');
                iframe.style.cssText = 'width:100%;height:100%;border:none;';
                iframe.srcdoc = code;
                pf.appendChild(iframe);
                document.getElementById('sc3-preview-btn').textContent = '📝 '+(window.currentLang==='fr'?'Voir Code':'Show Code');
            } else {
                pf.style.display = 'none'; ta.style.display = 'block';
                document.getElementById('sc3-preview-btn').textContent = '👁️ '+(window.currentLang==='fr'?'Aperçu':'Preview');
            }
        };
    }

    function resetClockwork(deleteFromScene = true) {
        destroySteam();
        const scn = getScene();
        if (scn && scn.animCbs) {
            scn.animCbs = scn.animCbs.filter(cb => cb !== updateClockwork);
        }
        if(animId){cancelAnimationFrame(animId);animId=null;}
        const grp = getGroup();
        if(deleteFromScene) {
            if(clockGroup && grp) grp.remove(clockGroup);
            let id = getChronoModelId();
            if(id && window._hf3RemoveModel) window._hf3RemoveModel(id);
        }
        clockGroup = null; clockGroupAdded = false; parts = {};
        window._sc3ModelId = null;
        
        if(panel){
            panel.querySelectorAll('.pb').forEach(b=>b.classList.remove('done'));
            const tags=document.getElementById('sc3-tags');
            if(tags) tags.innerHTML=`<span style="font-size:9px;color:#78350f;font-style:italic;">${L().noParts}</span>`;
            
            panel.querySelectorAll('.vchip').forEach(c => c.classList.remove('on'));
            const vburst = panel.querySelector('.vchip[data-v="burst"]');
            if (vburst) vburst.classList.add('on');
            steamAuraType = 'burst';
        }
        setStatus(deleteFromScene ? L().cleared : L().newChrono);
    }

    function build() {
        const old=document.getElementById('sc3-panel'); if(old) old.remove();
        injectCSS();
        const l=L(), keys=['dial','handH','handM','handS','gear8','gear16','gear32','gear64','escapement','pendulum','piston','pipe'];
        const icons={dial:'⭕',handH:'⏳',handM:'⏳',handS:'⚡',gear8:'⚙️',gear16:'⚙️',gear32:'⚙️',gear64:'⚙️',escapement:'⚓',pendulum:'🔔',piston:'🚀',pipe:'💨'};
        panel=document.createElement('div'); panel.id='sc3-panel';
        panel.innerHTML=`
        <div class="hdr"><div class="hdr-title">${l.title}</div><button class="x" id="sc3-close">✕</button></div>
        <div class="sec"><div class="sec-t">${l.styleLabel}</div><div class="chips" id="sc3-chips">
            <div class="chip on" data-s="brass">⚙️ Brass</div>
            <div class="chip" data-s="copper">🌿 Copper</div>
            <div class="chip" data-s="iron">🧱 Iron</div>
            <div class="chip" data-s="gold">💎 Gold</div>
        </div></div>
        
        <div class="sec" style="display:flex; justify-content:space-between; align-items:center;">
            <div class="sec-t" style="margin:0;">${l.customColorLabel}</div>
            <input type="color" id="sc3-color-picker" value="#ffffff" style="width:30px;height:30px;padding:0;border:none;border-radius:4px;cursor:pointer;background:transparent;">
        </div>

        <div class="sec"><div class="sec-t">${l.steamLabel}</div>
            <div class="chips" id="sc3-steam-chips" style="margin-bottom:6px;">
                <div class="chip vchip" data-v="none">${l.steamNone}</div>
                <div class="chip vchip on" data-v="burst">${l.steamBurst}</div>
                <div class="chip vchip" data-v="steady">${l.steamSteady}</div>
                <div class="chip vchip" data-v="pulse">${l.steamPulse}</div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div class="sec-t" style="margin:0;font-size:8px;">${l.steamColorLabel}</div>
                <input type="color" id="sc3-steam-color-picker" value="${steamColor}" style="width:24px;height:24px;padding:0;border:none;border-radius:4px;cursor:pointer;background:transparent;">
            </div>
        </div>

        <div class="sec"><div class="sec-t">${l.partsLabel}</div><div class="pgrid">
            ${keys.map(k=>`<button class="pb" id="sc3-p-${k}">${icons[k]}<br>${l[k]||k}</button>`).join('')}
        </div></div>
        <div class="sec"><div class="sec-t">${l.statusLabel}</div><div class="sbox"><div class="sval" id="sc3-status">Ready.</div><div class="tags" id="sc3-tags"><span style="font-size:9px;color:#78350f;font-style:italic;">${l.noParts}</span></div></div></div>
        <div class="act">
            <button class="abn pri" id="sc3-fuse">${l.fuse}</button>
            <div style="display:flex;gap:5px;width:100%;margin-top:5px;">
                <button class="abn sec" id="sc3-new" style="flex:1;background:#059669;color:#fff;">${l.newChrono}</button>
                <button class="abn sec" id="sc3-reset" style="flex:1;">${l.deleteChrono}</button>
            </div>
        </div>`;
        document.body.appendChild(panel);

        document.getElementById('sc3-close').onclick=()=>{panel.remove();panel=null;isOpen=false;};
        
        document.getElementById('sc3-chips').querySelectorAll('.chip:not(.vchip)').forEach(c=>{
            c.onclick=()=>{ 
                document.getElementById('sc3-chips').querySelectorAll('.chip:not(.vchip)').forEach(x=>x.classList.remove('on')); 
                c.classList.add('on'); selStyle=c.dataset.s; 
                Object.keys(parts).forEach(k=>addPart(k));
            };
        });

        document.getElementById('sc3-color-picker').addEventListener('input', (e) => {
            window._sc3CustomColor = e.target.value;
            if (window._sc3LastPart && parts[window._sc3LastPart]) {
                setPartColor(parts[window._sc3LastPart], window._sc3CustomColor);
                syncChronoModel();
            }
        });

        document.getElementById('sc3-steam-chips').querySelectorAll('.vchip').forEach(c=>{
            c.onclick=()=>{ 
                document.getElementById('sc3-steam-chips').querySelectorAll('.vchip').forEach(x=>x.classList.remove('on')); 
                c.classList.add('on'); 
                steamAuraType = c.dataset.v; 
                createSteam();
            };
        });

        document.getElementById('sc3-steam-color-picker').addEventListener('input', (e) => {
            steamColor = e.target.value;
            if (steamAuraType !== 'none') {
                createSteam();
            }
        });

        keys.forEach(k=>{ 
            document.getElementById('sc3-p-'+k).onclick=function(){ 
                window._sc3LastPart = k;
                addPart(k); 
                this.classList.add('done'); 
                if (window._sc3CustomColor && window._sc3CustomColor !== '#ffffff') {
                    setPartColor(parts[k], window._sc3CustomColor);
                    syncChronoModel();
                }
            }; 
        });
        document.getElementById('sc3-fuse').onclick=fuseSteampunk;
        document.getElementById('sc3-new').onclick=()=>resetClockwork(false);
        document.getElementById('sc3-reset').onclick=()=>resetClockwork(true);
        
        createSteam();
    }

    function init(sidebar, triggerBtn) {
        if(!triggerBtn) return;
        triggerBtn.addEventListener('click',()=>{
            if(isOpen&&document.getElementById('sc3-panel')){ document.getElementById('sc3-panel').remove(); panel=null; isOpen=false; return; }
            build(); isOpen=true;
        });
    }
    return { init };
})();
