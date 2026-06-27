/**
 * Hero Forge 3D — Character Studio (EN/FR)
 */
window.HeroForge3D = (() => {
    let panel = null, isOpen = false, heroGroup = null, heroGroupAdded = false, parts = {}, animId = null, selStyle = 'cyber';

    let vfxPoints = null, vfxAuraType = 'none', vfxColor = '#facc15', vfxTick = 0;
    
    function destroyVfx() {
        if (vfxPoints && heroGroup) {
            heroGroup.remove(vfxPoints);
            vfxPoints = null;
        }
        const scn = getScene();
        if (scn && scn.animCbs) {
            scn.animCbs = scn.animCbs.filter(cb => cb !== updateVfxCb);
        }
    }

    function createVfx() {
        destroyVfx();
        if (vfxAuraType === 'none' || !heroGroup) return;

        const count = 120;
        const geom = new THREE.BufferGeometry();
        const pos = new Float32Array(count * 3);
        const vels = [];
        const lives = [];

        for (let i = 0; i < count; i++) {
            pos[i*3] = (Math.random() - 0.5) * 30;
            pos[i*3+1] = -25 + Math.random() * 70;
            pos[i*3+2] = (Math.random() - 0.5) * 30;
            vels.push(new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.4 + Math.random() * 0.8, (Math.random() - 0.5) * 0.3));
            lives.push(Math.random() * 100);
        }

        geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({
            color: new THREE.Color(vfxColor),
            size: 3.5,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        vfxPoints = new THREE.Points(geom, mat);
        vfxPoints.name = 'HFP_vfx';
        heroGroup.add(vfxPoints);

        vfxPoints.userData = { vels, lives, posArr: pos };

        const scn = getScene();
        if (scn) {
            scn.animCbs = scn.animCbs || [];
            if (!scn.animCbs.includes(updateVfxCb)) {
                scn.animCbs.push(updateVfxCb);
            }
        }
    }

    function updateVfxCb(w) {
        if (!vfxPoints || !heroGroup) return;
        vfxTick++;
        const speed = w || 1;
        const geom = vfxPoints.geometry;
        const posArr = vfxPoints.userData.posArr;
        const vels = vfxPoints.userData.vels;
        const count = posArr.length / 3;

        for (let i = 0; i < count; i++) {
            if (vfxAuraType === 'fire') {
                posArr[i*3+1] += vels[i].y * speed;
                posArr[i*3] += vels[i].x * speed;
                posArr[i*3+2] += vels[i].z * speed;
                if (posArr[i*3+1] > 45) {
                    posArr[i*3] = (Math.random() - 0.5) * 20;
                    posArr[i*3+1] = -25;
                    posArr[i*3+2] = (Math.random() - 0.5) * 20;
                }
            } else if (vfxAuraType === 'magic') {
                const angle = vfxTick * 0.04 + i * 0.22;
                const r = 16 + Math.sin(vfxTick * 0.02 + i) * 3;
                posArr[i*3] = Math.cos(angle) * r;
                posArr[i*3+2] = Math.sin(angle) * r;
                posArr[i*3+1] += 0.45 * speed;
                if (posArr[i*3+1] > 45) posArr[i*3+1] = -25;
            } else if (vfxAuraType === 'matrix') {
                posArr[i*3+1] -= 0.7 * speed;
                if (posArr[i*3+1] < -25) {
                    posArr[i*3] = (Math.random() - 0.5) * 28;
                    posArr[i*3+1] = 45;
                    posArr[i*3+2] = (Math.random() - 0.5) * 28;
                }
            } else { // spark
                if (Math.random() < 0.08) {
                    posArr[i*3] = (Math.random() - 0.5) * 26;
                    posArr[i*3+1] = -25 + Math.random() * 70;
                    posArr[i*3+2] = (Math.random() - 0.5) * 26;
                }
            }
        }
        geom.attributes.position.needsUpdate = true;
    }

    let gyroAnimCb = (w) => {
        if (!heroGroup) return;
        const speed = w || 1;
        heroGroup.traverse(child => {
            if (child.name === 'gyro_ring1') child.rotation.y += 0.05 * speed;
            if (child.name === 'gyro_ring2') child.rotation.x += 0.03 * speed;
        });
    };

    function ensureGyroAnim() {
        const scn = getScene();
        if (scn) {
            scn.animCbs = scn.animCbs || [];
            if (!scn.animCbs.includes(gyroAnimCb)) {
                scn.animCbs.push(gyroAnimCb);
            }
        }
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
    }    const T = {
        en:{
            title:'🦸 Hero Forge 3D',
            styleLabel:'Visual Style',
            partsLabel:'Add Parts',
            addedLabel:'Parts Added',
            actLabel:'Actions',
            noParts:'No parts yet...',
            torso:'Torso',
            head:'Head',
            armL:'Left Arm',
            armR:'Right Arm',
            legL:'Left Leg',
            legR:'Right Leg',
            weapon:'Weapon',
            cape:'Cape',
            drone:'Companion Drone',
            hoverboard:'Hoverboard',
            shield:'Energy Shield',
            fuse:'⚡ Fusion & Generate Code',
            idle:'🎬 Idle Animation',
            reset:'🗑️ Reset',
            ok:'added!',
            noScene:'⚠️ Generate a 3D object first, then add parts.',
            noFuse:'Add parts first!',
            fused:'✅ Fusion done — code generated!',
            noAnim:'Add parts first!',
            animated:'🎬 Idle animation running...',
            cleared:'♻️ Reset.',
            statusLabel:'Status',
            customColorLabel:'🎨 Part Color Override',
            vfxLabel:'✨ Special Effects (VFX Aura)',
            vfxColorLabel:'Aura Color',
            vfxNone:'None',
            vfxFire:'🔥 Fire',
            vfxSpark:'⚡ Spark',
            vfxMagic:'🌀 Magic',
            vfxMatrix:'💾 Matrix',
            newHero:'➕ New Hero',
            deleteHero:'🗑️ Delete'
        },
        fr:{
            title:'🦸 Hero Forge 3D',
            styleLabel:'Style Visuel',
            partsLabel:'Ajouter Pièces',
            addedLabel:'Pièces Ajoutées',
            actLabel:'Actions',
            noParts:'Aucune pièce...',
            torso:'Torse',
            head:'Tête',
            armL:'Bras Gauche',
            armR:'Bras Droit',
            legL:'Jambe Gauche',
            legR:'Jambe Droite',
            weapon:'Arme',
            cape:'Cape',
            drone:'Drone Compagnon',
            hoverboard:'Hoverboard',
            shield:'Bouclier Énergie',
            fuse:'⚡ Fusion & Générer Code',
            idle:'🎬 Animation Idle',
            reset:'🗑️ Réinitialiser',
            ok:'ajouté !',
            noScene:'⚠️ Générez d\'abord un objet 3D, puis ajoutez des pièces.',
            noFuse:'Ajoutez des pièces d\'abord !',
            fused:'✅ Fusion complète — code généré !',
            noAnim:'Ajoutez des pièces d\'abord !',
            animated:'🎬 Animation Idle en cours...',
            cleared:'♻️ Réinitialisé.',
            statusLabel:'Statut',
            customColorLabel:'🎨 Couleur de la Pièce',
            vfxLabel:'✨ Effets Spéciaux (Aura VFX)',
            vfxColorLabel:'Couleur Aura',
            vfxNone:'Aucun',
            vfxFire:'🔥 Feu',
            vfxSpark:'⚡ Étincelle',
            vfxMagic:'🌀 Magie',
            vfxMatrix:'💾 Matrice',
            newHero:'➕ Nouveau Héros',
            deleteHero:'🗑️ Supprimer'
        }
    };
    const L = () => T[window.currentLang === 'fr' ? 'fr' : 'en'];

    function injectCSS() {
        if (document.getElementById('hf3-css')) return;
        const s = document.createElement('style'); s.id = 'hf3-css';
        s.textContent = `
        #hf3-panel{position:fixed;top:60px;right:12px;width:288px;max-height:calc(100vh - 76px);background:#080e1c;border:1px solid rgba(234,179,8,.4);border-radius:12px;box-shadow:0 0 40px rgba(234,179,8,.12),0 20px 60px rgba(0,0,0,.7);z-index:99999;overflow-y:auto;font-family:'Inter',sans-serif;scrollbar-width:thin;}
        #hf3-panel .hdr{padding:10px 12px;background:rgba(234,179,8,.1);border-bottom:1px solid rgba(234,179,8,.2);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:3;}
        #hf3-panel .hdr-title{font-size:12px;font-weight:800;color:#facc15;}
        #hf3-panel .x{width:20px;height:20px;border:none;border-radius:50%;padding:0;background:rgba(239,68,68,.25);color:#f87171;cursor:pointer;font-size:12px;line-height:20px;text-align:center;}
        #hf3-panel .x:hover{background:rgba(239,68,68,.6);color:#fff;}
        #hf3-panel .sec{padding:9px 11px;border-bottom:1px solid rgba(255,255,255,.04);}
        #hf3-panel .sec-t{font-size:8.5px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;}
        #hf3-panel .chips{display:flex;flex-wrap:wrap;gap:4px;}
        #hf3-panel .chip{padding:3px 9px;border-radius:20px;font-size:9px;font-weight:700;background:#0f172a;border:1px solid #1e293b;color:#64748b;cursor:pointer;transition:.2s;}
        #hf3-panel .chip.on{background:rgba(234,179,8,.18);border-color:#eab308;color:#facc15;}
        #hf3-panel .pgrid{display:grid;grid-template-columns:1fr 1fr;gap:4px;}
        #hf3-panel .pb{padding:9px 4px;background:#0f172a;border:1px solid #1e293b;border-radius:7px;color:#94a3b8;font-size:10px;font-weight:600;cursor:pointer;transition:.2s;text-align:center;line-height:1.4;}
        #hf3-panel .pb:hover{background:#1e293b;border-color:rgba(234,179,8,.6);color:#facc15;transform:translateY(-1px);}
        #hf3-panel .pb.done{border-color:#10b981;color:#10b981;background:rgba(16,185,129,.08);opacity:.7;pointer-events:none;}
        #hf3-panel .tags{display:flex;flex-wrap:wrap;gap:3px;}
        #hf3-panel .tag{padding:2px 7px;border-radius:20px;font-size:8.5px;font-weight:700;background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.3);color:#34d399;}
        #hf3-panel .bf{width:100%;padding:10px;margin-bottom:5px;background:linear-gradient(135deg,#eab308,#f59e0b,#d97706);border:none;border-radius:8px;color:#fff;font-size:11px;font-weight:800;cursor:pointer;box-shadow:0 3px 16px rgba(234,179,8,.3);transition:.2s;}
        #hf3-panel .bf:hover{transform:translateY(-2px);}
        #hf3-panel .ba{width:100%;padding:8px;margin-bottom:5px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:8px;color:#fff;font-size:10px;font-weight:700;cursor:pointer;transition:.2s;}
        #hf3-panel .ba:hover{transform:translateY(-1px);}
        #hf3-panel .br{width:100%;padding:7px;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.35);border-radius:8px;color:#f87171;font-size:10px;font-weight:700;cursor:pointer;transition:.2s;}
        #hf3-panel .br:hover{background:rgba(239,68,68,.3);color:#fff;}
        #hf3-panel .status{text-align:center;font-size:9px;color:#475569;padding:7px 11px 10px;line-height:1.4;}
        
        #hf3-panel .act{padding:10px 11px;display:flex;flex-direction:column;gap:5px;border-top:1px solid rgba(255,255,255,.04);}
        #hf3-panel .abn{width:100%;padding:8px;border:none;border-radius:8px;color:#fff;font-size:10.5px;font-weight:700;cursor:pointer;transition:transform 0.2s, background-color 0.2s, box-shadow 0.2s;text-align:center;}
        #hf3-panel .abn:hover{transform:translateY(-1px);}
        #hf3-panel .abn.pri{background:linear-gradient(135deg,#eab308,#f59e0b,#d97706);font-weight:800;box-shadow:0 3px 12px rgba(234,179,8,.25);}
        #hf3-panel .abn.pri:hover{background:linear-gradient(135deg,#facc15,#f59e0b,#eab308);box-shadow:0 4px 16px rgba(234,179,8,.4);}
        #hf3-panel .abn.sec{background:#1e293b;border:1px solid #334155;color:#94a3b8;}
        #hf3-panel .abn.sec:hover{background:#334155;color:#fff;}
        #hf3-panel .sbox{background:#0b1329;border:1px solid #1e293b;border-radius:8px;padding:8px;margin-top:4px;}
        #hf3-panel .sval{font-size:9.5px;color:#cbd5e1;font-weight:500;margin-bottom:6px;word-break:break-all;line-height:1.3;}
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
        if (!heroGroup) {
            heroGroup = new THREE.Group();
            heroGroup.name = 'HeroForge';
        }
        return !!(window.SketchExtruder && typeof window.SketchExtruder.addExtraModule === 'function');
    }

    function getHeroModelId() { return window._hf3ModelId || null; }

    function syncHeroModel() {
        const heroparts = Object.entries(parts).map(([name, mesh]) => ({
            name,
            px: parseFloat((mesh.userData && mesh.userData.basePosition ? mesh.userData.basePosition.x : mesh.position.x).toFixed(2)),
            py: parseFloat((mesh.userData && mesh.userData.basePosition ? mesh.userData.basePosition.y : mesh.position.y).toFixed(2)),
            pz: parseFloat((mesh.userData && mesh.userData.basePosition ? mesh.userData.basePosition.z : mesh.position.z).toFixed(2)),
            colorHex: mesh.material.color ? '#' + mesh.material.color.getHexString() : '#334155',
            emissiveHex: mesh.material.emissive ? '#' + mesh.material.emissive.getHexString() : '#000000',
            metalness: mesh.material.metalness || 0,
            roughness: mesh.material.roughness || 0.5
        }));

        let id = getHeroModelId();
        if (!id) {
            id = window.SketchExtruder.addExtraModule('hero-forge', { heroparts, herostyle: selStyle, importedMesh: heroGroup });
            window._hf3ModelId = id;
            heroGroupAdded = true;
        } else {
            if (window.SketchExtruder && window._hf3UpdateModel) {
                window._hf3UpdateModel(id, heroparts, selStyle, heroGroup, window._hf3Anim || 'idle');
            }
        }
    }

    function setStatus(msg) { const el = document.getElementById('hf3-status'); if (el) el.textContent = msg; }
    function addTag(name) {
        const box = document.getElementById('hf3-tags'); if (!box) return;
        const sp = box.querySelector('span[style]'); if (sp) sp.remove();
        const t = document.createElement('span'); t.className = 'tag'; t.textContent = name; box.appendChild(t);
    }

    function makeMat(part, style) {
        const C = {
            cyber:{torso:0x1e293b, head:0x0f172a, armL:0x334155, armR:0x334155, legL:0x1e293b, legR:0x1e293b, weapon:0x4f46e5, cape:0x1e40af, drone:0x38bdf8, shield:0x0ea5e9, hoverboard:0x0f172a},
            organic:{torso:0x14532d, head:0x064e3b, armL:0x166534, armR:0x166534, legL:0x14532d, legR:0x14532d, weapon:0x7c3aed, cape:0x581c87, drone:0xa855f7, shield:0x22c55e, hoverboard:0x064e3b},
            blocky:{torso:0x475569, head:0x334155, armL:0x64748b, armR:0x64748b, legL:0x475569, legR:0x475569, weapon:0xd97706, cape:0x991b1b, drone:0xfacc15, shield:0xf59e0b, hoverboard:0x334155},
            crystal:{torso:0x0891b2, head:0x0e7490, armL:0x06b6d4, armR:0x06b6d4, legL:0x0891b2, legR:0x0891b2, weapon:0xa855f7, cape:0x6d28d9, drone:0x22d3ee, shield:0xa855f7, hoverboard:0x0e7490}
        };
        const s = (C[style]||C.cyber);
        const col = s[part]||0x334155;
        
        let emi = 0x000000, emInt = 0;
        if (part === 'weapon' || part === 'drone' || part === 'shield') {
            emi = col; emInt = 0.8;
        } else if (style === 'cyber') { emi = 0x020617; emInt = 0.2; }
        else if (style === 'crystal') { emi = 0x083344; emInt = 0.4; }
        if (part === 'hoverboard') { emi = 0x0ea5e9; emInt = 0.4; }

        return new THREE.MeshPhysicalMaterial({ 
            color: col, emissive: emi, emissiveIntensity: emInt,
            metalness: style==='cyber'||part==='hoverboard'?0.9: style==='crystal'?0.1: 0.2, 
            roughness: style==='cyber'||part==='hoverboard'?0.2: style==='crystal'?0.05: style==='organic'?0.7: 0.6,
            clearcoat: style==='cyber'||style==='crystal'||part==='shield'?1.0:0.0,
            clearcoatRoughness: 0.1,
            transmission: style==='crystal'||part==='shield'?0.8:0.0,
            thickness: style==='crystal'||part==='shield'?2.0:0.0,
            flatShading: style==='blocky', 
            side: THREE.DoubleSide
        });
    }
    function makeGeo(part, style) {
        const b=style==='blocky', o=style==='organic';
        switch(part){
            case 'torso': return (b||!o)?new THREE.BoxGeometry(18,26,12):new THREE.CylinderGeometry(10,12,26,12);
            case 'head':  return b?new THREE.BoxGeometry(12,13,12):new THREE.SphereGeometry(8,24,24);
            case 'armL': case 'armR': return (b||!o)?new THREE.BoxGeometry(5,22,5):new THREE.CylinderGeometry(2.5,2,22,10);
            case 'legL': case 'legR': return (b||!o)?new THREE.BoxGeometry(6,26,6):new THREE.CylinderGeometry(3.5,2.5,26,10);
            case 'weapon': return new THREE.BoxGeometry(3,28,3);
            case 'cape':   return new THREE.ConeGeometry(14,30,8);
            case 'drone':  return new THREE.IcosahedronGeometry(4, 0);
            case 'hoverboard': return new THREE.BoxGeometry(20, 2, 34);
            case 'shield': return new THREE.CylinderGeometry(12, 12, 2, 16);
            default: return new THREE.BoxGeometry(10,10,10);
        }
    }
    function snapPos(part) {
        const t = parts.torso ? (parts.torso.userData.basePosition || parts.torso.position) : new THREE.Vector3(0,15,0);
        const m = { 
            torso:new THREE.Vector3(0,15,0), head:new THREE.Vector3(t.x,t.y+22,t.z), 
            armL:new THREE.Vector3(t.x-15,t.y+2,t.z), armR:new THREE.Vector3(t.x+15,t.y+2,t.z), 
            legL:new THREE.Vector3(t.x-6,t.y-26,t.z), legR:new THREE.Vector3(t.x+6,t.y-26,t.z), 
            weapon:new THREE.Vector3(t.x+22,t.y,t.z), cape:new THREE.Vector3(t.x,t.y-5,t.z-9),
            drone:new THREE.Vector3(t.x+18, t.y+20, t.z+10),
            hoverboard:new THREE.Vector3(t.x, t.y-40, t.z),
            shield:new THREE.Vector3(t.x-22, t.y+2, t.z+4)
        };
        return m[part]||new THREE.Vector3(0,0,0);
    }

    function addPart(partName) {
        if (!ensureGroup()) {
            const attempts = (addPart._retries = (addPart._retries||0) + 1);
            if (attempts <= 15) { setStatus('⏳ '+(window.currentLang==='fr'?'Initialisation...':'Initializing...')); setTimeout(()=>{ addPart._retries=0; addPart(partName); }, 300); }
            else { addPart._retries=0; setStatus(L().noScene); }
            return;
        }
        addPart._retries = 0;
        if (parts[partName]) heroGroup.remove(parts[partName]);
        
        var mesh = new THREE.Mesh(makeGeo(partName, selStyle), makeMat(partName, selStyle));
        mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = 'HFP_'+partName;
        mesh.position.copy(snapPos(partName));
        mesh.userData.basePosition = mesh.position.clone();

        // High fidelity procedural detailing & styling
        if (selStyle === 'cyber') {
            if (partName === 'head') {
                // Segmented Neck Joint
                var neck = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 3, 10), new THREE.MeshStandardMaterial({color: 0x334155, metalness: 0.9, roughness: 0.1}));
                neck.position.set(0, -6, 0);
                mesh.add(neck);
                
                // Glowing Cyber Visor
                var visor = new THREE.Mesh(new THREE.BoxGeometry(10, 2.5, 2.5), new THREE.MeshBasicMaterial({color: 0x0ea5e9}));
                visor.position.set(0, 1.5, 6.5);
                mesh.add(visor);
                
                // Side Antennae
                [-1, 1].forEach(s => {
                    var ant = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 8, 6), new THREE.MeshStandardMaterial({color: 0x64748b, metalness: 0.9}));
                    ant.position.set(s * 7.5, 4, -1);
                    ant.rotation.z = -s * 0.4;
                    var tip = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), new THREE.MeshBasicMaterial({color: 0x38bdf8}));
                    tip.position.set(0, 4, 0);
                    ant.add(tip);
                    mesh.add(ant);
                });
            }
            else if (partName === 'torso') {
                // Chest Torus Reactor Core
                var core = new THREE.Mesh(new THREE.TorusGeometry(3, 1, 8, 16), new THREE.MeshBasicMaterial({color: 0x38bdf8}));
                core.position.set(0, 3, 6);
                core.rotation.x = Math.PI / 2;
                mesh.add(core);
                
                var innerCore = new THREE.Mesh(new THREE.SphereGeometry(2, 12, 12), new THREE.MeshBasicMaterial({color: 0xffffff}));
                innerCore.position.set(0, 3, 5);
                mesh.add(innerCore);
                
                // Pauldrons (Shoulder Armor)
                [-1, 1].forEach(s => {
                    var p = new THREE.Mesh(new THREE.BoxGeometry(7, 5, 10), new THREE.MeshPhysicalMaterial({color: 0x1e293b, metalness: 0.9, roughness: 0.2}));
                    p.position.set(s * 11, 11, 0);
                    p.rotation.z = -s * 0.2;
                    mesh.add(p);
                });
                
                // Back Thrusters
                [-1, 1].forEach(s => {
                    var thr = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.5, 10, 8), new THREE.MeshStandardMaterial({color: 0x475569, metalness: 0.8}));
                    thr.position.set(s * 5, 2, -7);
                    thr.rotation.x = 0.4;
                    var flame = new THREE.Mesh(new THREE.ConeGeometry(1.8, 6, 8), new THREE.MeshBasicMaterial({color: 0xfacc15}));
                    flame.position.set(0, -7, 0);
                    flame.rotation.x = Math.PI;
                    thr.add(flame);
                    mesh.add(thr);
                });
            }
            else if (partName === 'armL' || partName === 'armR') {
                // Elbow Sphere Joint
                var joint = new THREE.Mesh(new THREE.SphereGeometry(3.5, 12, 12), new THREE.MeshStandardMaterial({color: 0x0f172a, metalness: 0.9}));
                joint.position.set(0, 0, 0);
                mesh.add(joint);
                
                // Shoulder Guard Plate
                var guard = new THREE.Mesh(new THREE.BoxGeometry(6, 8, 6), new THREE.MeshStandardMaterial({color: 0x1e293b, metalness: 0.9}));
                guard.position.set(0, 8, 0);
                mesh.add(guard);
            }
            else if (partName === 'legL' || partName === 'legR') {
                // Knee Sphere Joint
                var joint = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 12), new THREE.MeshStandardMaterial({color: 0x0f172a, metalness: 0.9}));
                joint.position.set(0, 0, 0);
                mesh.add(joint);
                
                // Heavy Boot Claws
                var foot = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 12), new THREE.MeshStandardMaterial({color: 0x0f172a, metalness: 0.9}));
                foot.position.set(0, -14, 2);
                mesh.add(foot);
            }
            else if (partName === 'weapon') {
                mesh.geometry = new THREE.CylinderGeometry(1.2, 1.2, 8, 8);
                mesh.material = new THREE.MeshStandardMaterial({color: 0x475569, metalness: 0.9, roughness: 0.2});
                
                var blade = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 24, 8), new THREE.MeshBasicMaterial({color: 0x0ea5e9}));
                blade.position.set(0, 15, 0);
                mesh.add(blade);
                
                var guard = new THREE.Mesh(new THREE.BoxGeometry(6, 1.5, 3), new THREE.MeshStandardMaterial({color: 0x1e293b, metalness: 0.9}));
                guard.position.set(0, 4, 0);
                mesh.add(guard);
            }
            else if (partName === 'shield') {
                var ring1 = new THREE.Mesh(new THREE.TorusGeometry(8, 0.8, 8, 24), new THREE.MeshBasicMaterial({color: 0x0ea5e9}));
                ring1.rotation.x = Math.PI / 2;
                mesh.add(ring1);
                
                var ring2 = new THREE.Mesh(new THREE.TorusGeometry(12, 0.5, 8, 24), new THREE.MeshBasicMaterial({color: 0x38bdf8}));
                ring2.rotation.x = Math.PI / 2;
                mesh.add(ring2);
                
                var emblem = new THREE.Mesh(new THREE.OctahedronGeometry(3), new THREE.MeshBasicMaterial({color: 0xffffff}));
                mesh.add(emblem);
            }
            else if (partName === 'drone') {
                mesh.geometry = new THREE.IcosahedronGeometry(3.5, 0);
                
                var ring1 = new THREE.Mesh(new THREE.TorusGeometry(8, 0.6, 8, 24), new THREE.MeshStandardMaterial({color: 0x334155, metalness: 0.9}));
                ring1.name = 'gyro_ring1';
                mesh.add(ring1);
                
                var ring2 = new THREE.Mesh(new THREE.TorusGeometry(11, 0.6, 8, 24), new THREE.MeshStandardMaterial({color: 0x475569, metalness: 0.9}));
                ring2.name = 'gyro_ring2';
                ring2.rotation.x = Math.PI / 2;
                mesh.add(ring2);
                
                var eye = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), new THREE.MeshBasicMaterial({color: 0xef4444}));
                eye.position.set(0, 0, 3.2);
                mesh.add(eye);
                
                ensureGyroAnim();
            }
            else if (partName === 'hoverboard') {
                [-1, 1].forEach(s => {
                    var t = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 8, 8), new THREE.MeshStandardMaterial({color: 0x334155, metalness: 0.9}));
                    t.position.set(s * 6, -2, -8);
                    t.rotation.x = Math.PI / 2;
                    var f = new THREE.Mesh(new THREE.ConeGeometry(1, 4, 8), new THREE.MeshBasicMaterial({color: 0x0ea5e9}));
                    f.position.set(0, -5, 0);
                    f.rotation.x = Math.PI;
                    t.add(f);
                    mesh.add(t);
                });
                
                [-1, 1].forEach(s => {
                    var st = new THREE.Mesh(new THREE.TorusGeometry(3, 0.6, 8, 12, Math.PI), new THREE.MeshStandardMaterial({color: 0x64748b}));
                    st.position.set(0, 1.5, s * 8);
                    mesh.add(st);
                });
            }
        }
        else if (selStyle === 'organic') {
            if (partName === 'head') {
                [-1, 1].forEach(s => {
                    var eye = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 8), new THREE.MeshBasicMaterial({color: 0x22c55e}));
                    eye.position.set(s * 3, 2, 6.5);
                    mesh.add(eye);
                });
                
                [-1, 1].forEach(s => {
                    var fang = new THREE.Mesh(new THREE.ConeGeometry(0.8, 4, 4), new THREE.MeshStandardMaterial({color: 0xf3f4f6}));
                    fang.position.set(s * 2, -3, 6.5);
                    fang.rotation.x = 0.5;
                    fang.rotation.z = -s * 0.2;
                    mesh.add(fang);
                });
                
                [-1, 1].forEach(s => {
                    var h = new THREE.Mesh(new THREE.ConeGeometry(1.5, 10, 6), new THREE.MeshStandardMaterial({color: 0x4a1942}));
                    h.position.set(s * 4, 10, 0);
                    h.rotation.z = s * 0.3;
                    mesh.add(h);
                });
            }
            else if (partName === 'torso') {
                for (var i = 0; i < 5; i++) {
                    var spike = new THREE.Mesh(new THREE.ConeGeometry(1.5, 6, 6), new THREE.MeshStandardMaterial({color: 0x4a1942}));
                    spike.position.set(0, 10 - i * 5, -7);
                    spike.rotation.x = -1.2;
                    mesh.add(spike);
                }
                
                var core = new THREE.Mesh(new THREE.OctahedronGeometry(2.5), new THREE.MeshBasicMaterial({color: 0xa855f7}));
                core.position.set(0, 2, 5.5);
                mesh.add(core);
            }
            else if (['armL', 'armR', 'legL', 'legR'].includes(partName)) {
                var spike = new THREE.Mesh(new THREE.ConeGeometry(1.2, 5, 4), new THREE.MeshStandardMaterial({color: 0xf3f4f6}));
                spike.position.set(0, 0, -2);
                spike.rotation.x = -0.8;
                mesh.add(spike);
            }
        }
        else if (selStyle === 'crystal') {
            if (partName === 'head') {
                for (var i = 0; i < 5; i++) {
                    var shard = new THREE.Mesh(new THREE.OctahedronGeometry(1.5, 0), new THREE.MeshPhysicalMaterial({color: 0x67e8f9, transmission: 0.9, roughness: 0.1}));
                    var angle = (i / 5) * Math.PI * 2;
                    shard.position.set(Math.cos(angle) * 5, 11, Math.sin(angle) * 5);
                    shard.rotation.set(Math.random(), Math.random(), Math.random());
                    mesh.add(shard);
                }
                
                var eye = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), new THREE.MeshBasicMaterial({color: 0xa855f7}));
                eye.position.set(0, 3, 6.5);
                mesh.add(eye);
            }
            else if (partName === 'torso') {
                [-1, 1].forEach(s => {
                    var wing = new THREE.Mesh(new THREE.ConeGeometry(4, 25, 4), new THREE.MeshPhysicalMaterial({color: 0x22d3ee, transmission: 0.8, roughness: 0.1}));
                    wing.position.set(s * 8, 8, -6);
                    wing.rotation.set(0.5, 0, -s * 1.2);
                    mesh.add(wing);
                });
                
                var o = new THREE.Mesh(new THREE.OctahedronGeometry(5), new THREE.MeshBasicMaterial({color: 0x67e8f9}));
                o.position.set(0, 4, 0);
                mesh.add(o);
            }
            else if (['armL', 'armR', 'legL', 'legR'].includes(partName)) {
                var cluster = new THREE.Mesh(new THREE.OctahedronGeometry(3.5, 0), new THREE.MeshPhysicalMaterial({color: 0x06b6d4, transmission: 0.5}));
                cluster.position.set(0, 0, 0);
                mesh.add(cluster);
            }
        }
        else if (selStyle === 'blocky') {
            if (partName === 'head') {
                var visor = new THREE.Mesh(new THREE.BoxGeometry(8, 2, 2), new THREE.MeshBasicMaterial({color: 0xfacc15}));
                visor.position.set(0, 1.5, 6.5);
                mesh.add(visor);
            }
            else if (partName === 'torso') {
                var harness = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 2), new THREE.MeshStandardMaterial({color: 0x1e293b}));
                harness.position.set(0, 0, -6.5);
                mesh.add(harness);
            }
        }

        parts[partName] = mesh;
        heroGroup.add(mesh);
        
        syncHeroModel();
        
        addTag(partName);
        setStatus('✅ ' + partName + ' — ' + L().ok);
        if (window.toast) toast('✅ ' + partName + ' ' + (window.currentLang === 'fr' ? 'ajouté!' : 'added!'));
    }

    function serializeMesh(mesh, varName, parentVarName) {
        var geoStr = getGeoCode(mesh.geometry);
        var col = mesh.material.color ? mesh.material.color.getHexString() : 'ffffff';
        var emi = mesh.material.emissive ? mesh.material.emissive.getHexString() : '000000';
        var emInt = mesh.material.emissiveIntensity !== undefined ? mesh.material.emissiveIntensity : 0;
        var metal = (mesh.material.metalness !== undefined ? mesh.material.metalness : 0).toFixed(2);
        var rough = (mesh.material.roughness !== undefined ? mesh.material.roughness : 0.5).toFixed(2);
        var clearcoat = (mesh.material.clearcoat !== undefined ? mesh.material.clearcoat : 0).toFixed(2);
        var transmission = (mesh.material.transmission !== undefined ? mesh.material.transmission : 0).toFixed(2);
        
        var lines = [];
        lines.push("    var " + varName + "_g = " + geoStr + ";");
        if (mesh.material.type === 'MeshBasicMaterial') {
            lines.push("    var " + varName + "_m = new THREE.MeshBasicMaterial({color:0x" + col + "});");
        } else {
            lines.push("    var " + varName + "_m = new THREE.MeshPhysicalMaterial({color:0x" + col + ",emissive:0x" + emi + ",emissiveIntensity:" + emInt + ",metalness:" + metal + ",roughness:" + rough + ",clearcoat:" + clearcoat + ",transmission:" + transmission + "});");
        }
        lines.push("    var " + varName + " = new THREE.Mesh(" + varName + "_g, " + varName + "_m);");
        lines.push("    " + varName + ".castShadow = true; " + varName + ".receiveShadow = true;");
        if (mesh.name) {
            lines.push("    " + varName + ".name = '" + mesh.name + "';");
        }
        var pos = mesh.position;
        lines.push("    " + varName + ".position.set(" + pos.x.toFixed(2) + "," + pos.y.toFixed(2) + "," + pos.z.toFixed(2) + ");");
        var rot = mesh.rotation;
        lines.push("    " + varName + ".rotation.set(" + rot.x.toFixed(2) + "," + rot.y.toFixed(2) + "," + rot.z.toFixed(2) + ");");
        var scl = mesh.scale;
        lines.push("    " + varName + ".scale.set(" + scl.x.toFixed(2) + "," + scl.y.toFixed(2) + "," + scl.z.toFixed(2) + ");");
        lines.push("    " + parentVarName + ".add(" + varName + ");");
        
        if (mesh.children && mesh.children.length > 0) {
            mesh.children.forEach(function(child, index) {
                if (child instanceof THREE.Mesh) {
                    lines.push(serializeMesh(child, varName + "_c" + index, varName));
                }
            });
        }
        return lines.join('\n');
    }

    function fuseHero() {
        if (!heroGroup || Object.keys(parts).length === 0) { setStatus(L().noFuse); return; }

        var partEntries = [];
        Object.entries(parts).forEach(([name, mesh]) => {
            var pos = mesh.userData.basePosition || mesh.position;
            var origPos = mesh.position.clone();
            mesh.position.copy(pos);
            var serialized = serializeMesh(mesh, 'part_' + name, 'hero');
            mesh.position.copy(origPos);
            partEntries.push("  // " + name + "\n  (function(){\n" + serialized + "\n  })()");
        });

        var styleLabel = {cyber:'Cyberpunk Mecha',organic:'Organic Monster',blocky:'Blocky Voxel',crystal:'Crystal Alien'}[selStyle]||selStyle;

        var vfxInitCode = '';
        var vfxAnimateCode = '';
        if (vfxAuraType !== 'none') {
            vfxInitCode = `
  // VFX Particle System (${vfxAuraType})
  var vfxCount = 120;
  var vfxGeom = new THREE.BufferGeometry();
  var vfxPos = new Float32Array(vfxCount * 3);
  var vfxVels = [];
  for (var i = 0; i < vfxCount; i++) {
    vfxPos[i*3] = (Math.random() - 0.5) * 30;
    vfxPos[i*3+1] = -25 + Math.random() * 70;
    vfxPos[i*3+2] = (Math.random() - 0.5) * 30;
    vfxVels.push(new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.4 + Math.random() * 0.8, (Math.random() - 0.5) * 0.3));
  }
  vfxGeom.setAttribute('position', new THREE.BufferAttribute(vfxPos, 3));
  var vfxMat = new THREE.PointsMaterial({
    color: new THREE.Color('${vfxColor}'),
    size: 3.5,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending
  });
  var vfxPoints = new THREE.Points(vfxGeom, vfxMat);
  hero.add(vfxPoints);
  var vfxTick = 0;
`;

            vfxAnimateCode = `
    // Update VFX Particles
    vfxTick++;
    var posArr = vfxPoints.geometry.attributes.position.array;
    for (var i = 0; i < vfxCount; i++) {
      if ('${vfxAuraType}' === 'fire') {
        posArr[i*3+1] += vfxVels[i].y;
        posArr[i*3] += vfxVels[i].x;
        posArr[i*3+2] += vfxVels[i].z;
        if (posArr[i*3+1] > 45) {
          posArr[i*3] = (Math.random() - 0.5) * 20;
          posArr[i*3+1] = -25;
          posArr[i*3+2] = (Math.random() - 0.5) * 20;
        }
      } else if ('${vfxAuraType}' === 'magic') {
        var angle = vfxTick * 0.04 + i * 0.22;
        var r = 16 + Math.sin(vfxTick * 0.02 + i) * 3;
        posArr[i*3] = Math.cos(angle) * r;
        posArr[i*3+2] = Math.sin(angle) * r;
        posArr[i*3+1] += 0.45;
        if (posArr[i*3+1] > 45) posArr[i*3+1] = -25;
      } else if ('${vfxAuraType}' === 'matrix') {
        posArr[i*3+1] -= 0.7;
        if (posArr[i*3+1] < -25) {
          posArr[i*3] = (Math.random() - 0.5) * 28;
          posArr[i*3+1] = 45;
          posArr[i*3+2] = (Math.random() - 0.5) * 28;
        }
      } else { // spark
        if (Math.random() < 0.08) {
          posArr[i*3] = (Math.random() - 0.5) * 26;
          posArr[i*3+1] = -25 + Math.random() * 70;
          posArr[i*3+2] = (Math.random() - 0.5) * 26;
        }
      }
    }
    vfxPoints.geometry.attributes.position.needsUpdate = true;
`;
        }

        var gyroAnimateCode = `
    // Update Gyroscope Rings
    hero.traverse(function(child) {
      if (child.name === 'gyro_ring1') child.rotation.y += 0.05;
      if (child.name === 'gyro_ring2') child.rotation.x += 0.03;
    });
`;

        const code = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Hero Forge — ${styleLabel}</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{background:#050815;overflow:hidden}</style>
</head>
<body>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"><\/script>
<script>
  var scene=new THREE.Scene();
  scene.fog=new THREE.FogExp2(0x050815,0.003);
  var camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,0.1,2000);
  camera.position.set(0,60,200);
  var renderer=new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled=true;
  renderer.setClearColor(0x050815);
  document.body.appendChild(renderer.domElement);
  var controls=new THREE.OrbitControls(camera,renderer.domElement);
  controls.autoRotate=true; controls.autoRotateSpeed=1.5;
  scene.add(new THREE.AmbientLight(0xffffff,0.4));
  var dir=new THREE.DirectionalLight(0xffffff,1.0);
  dir.position.set(100,200,200); dir.castShadow=true; scene.add(dir);
  scene.add(new THREE.HemisphereLight(0xffffff,0x444444,0.5));
  scene.add(new THREE.GridHelper(400,40,0x1e293b,0x0f172a));
  var hero=new THREE.Group();
  scene.add(hero);
${partEntries.join(';\n')}
${vfxInitCode}
  function animate(){
    requestAnimationFrame(animate);
    controls.update();
${vfxAnimateCode}
${gyroAnimateCode}
    renderer.render(scene,camera);
  }
  animate();
  window.addEventListener('resize',function(){ camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); });
<\/script>
</body>
</html>`;

        showHeroModal(code, styleLabel);
        setStatus(L().fused);
        if (window.toast) toast('🦸 ' + (window.currentLang==='fr' ? 'Code prêt — cliquez Télécharger !' : 'Code ready — click Download!'));
    }

    function showHeroModal(code, label) {
        const old = document.getElementById('hf3-export-modal');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'hf3-export-modal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:999999;display:flex;align-items:center;justify-content:center;';
        modal.innerHTML = `
        <div style="background:#0d1225;border:1px solid rgba(234,179,8,.4);border-radius:14px;width:700px;max-width:96vw;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 0 60px rgba(234,179,8,.15);">
            <div style="padding:14px 18px;border-bottom:1px solid rgba(234,179,8,.2);display:flex;align-items:center;justify-content:space-between;">
                <div style="font-size:13px;font-weight:800;color:#facc15;">⚡ Hero Forge Export — ${label}</div>
                <button id="hf3-modal-close" style="border:none;background:rgba(239,68,68,.25);color:#f87171;border-radius:50%;width:24px;height:24px;cursor:pointer;font-size:14px;">✕</button>
            </div>
            <div style="padding:10px 14px;display:flex;gap:8px;border-bottom:1px solid rgba(255,255,255,.05);">
                <button id="hf3-copy-btn" style="flex:1;padding:9px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:7px;color:#fff;font-size:11px;font-weight:700;cursor:pointer;">📋 ${window.currentLang==='fr'?'Copier Code':'Copy Code'}</button>
                <button id="hf3-dl-btn" style="flex:1;padding:9px;background:linear-gradient(135deg,#eab308,#d97706);border:none;border-radius:7px;color:#fff;font-size:11px;font-weight:800;cursor:pointer;">⬇️ ${window.currentLang==='fr'?'Télécharger HTML':'Download HTML'}</button>
                <button id="hf3-preview-btn" style="flex:1;padding:9px;background:linear-gradient(135deg,#10b981,#059669);border:none;border-radius:7px;color:#fff;font-size:11px;font-weight:700;cursor:pointer;">👁️ ${window.currentLang==='fr'?'Aperçu':'Preview'}</button>
            </div>
            <textarea id="hf3-code-area" style="flex:1;background:#080e1c;color:#94a3b8;font-family:monospace;font-size:10px;padding:12px;border:none;outline:none;resize:none;min-height:320px;" readonly></textarea>
            <div id="hf3-preview-frame" style="display:none;height:320px;"></div>
        </div>`;
        document.body.appendChild(modal);
        document.getElementById('hf3-code-area').value = code;

        document.getElementById('hf3-modal-close').onclick = () => modal.remove();
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

        document.getElementById('hf3-copy-btn').onclick = () => {
            navigator.clipboard.writeText(code).then(() => {
                document.getElementById('hf3-copy-btn').textContent = '✅ Copied!';
                setTimeout(() => { const b = document.getElementById('hf3-copy-btn'); if(b) b.textContent = '📋 '+(window.currentLang==='fr'?'Copier Code':'Copy Code'); }, 2000);
            }).catch(() => {
                document.getElementById('hf3-code-area').select();
                document.execCommand('copy');
            });
        };

        document.getElementById('hf3-dl-btn').onclick = () => {
            const blob = new Blob([code], {type:'text/html'});
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'hero-forge-' + label.toLowerCase().replace(/\s+/g,'-') + '.html';
            a.click();
        };

        document.getElementById('hf3-preview-btn').onclick = () => {
            const ta = document.getElementById('hf3-code-area');
            const pf = document.getElementById('hf3-preview-frame');
            if (pf.style.display === 'none') {
                pf.style.display = 'block'; ta.style.display = 'none';
                pf.innerHTML = '';
                const iframe = document.createElement('iframe');
                iframe.style.cssText = 'width:100%;height:100%;border:none;';
                iframe.srcdoc = code;
                pf.appendChild(iframe);
                document.getElementById('hf3-preview-btn').textContent = '📝 '+(window.currentLang==='fr'?'Voir Code':'Show Code');
            } else {
                pf.style.display = 'none'; ta.style.display = 'block';
                document.getElementById('hf3-preview-btn').textContent = '👁️ '+(window.currentLang==='fr'?'Aperçu':'Preview');
            }
        };
    }

    function setAnimState(state) {
        window._hf3Anim = state;
        setStatus(L().animated + ' (' + state + ')');
        syncHeroModel();
    }

    function resetHero(deleteFromScene = true) {
        destroyVfx();
        var scn = getScene();
        if (scn && scn.animCbs) {
            scn.animCbs = scn.animCbs.filter(cb => cb !== gyroAnimCb);
        }
        if(animId){cancelAnimationFrame(animId);animId=null;}
        const grp = getGroup();
        if(deleteFromScene) {
            if(heroGroup && grp) grp.remove(heroGroup);
            let id = getHeroModelId();
            if(id && window._hf3RemoveModel) window._hf3RemoveModel(id);
        }
        heroGroup = null; heroGroupAdded = false; parts = {};
        window._hf3ModelId = null;
        window._hf3Anim = 'idle';
        
        if(panel){
            panel.querySelectorAll('.pb').forEach(b=>b.classList.remove('done'));
            const tags=document.getElementById('hf3-tags');
            if(tags) tags.innerHTML=`<span style="font-size:9px;color:#334155;font-style:italic;">${L().noParts}</span>`;
            panel.querySelectorAll('.achip').forEach(c => c.classList.remove('on'));
            const achips = panel.querySelectorAll('.achip');
            if(achips.length > 0) achips[0].classList.add('on');
            
            panel.querySelectorAll('.vchip').forEach(c => c.classList.remove('on'));
            const vnone = panel.querySelector('.vchip[data-v="none"]');
            if (vnone) vnone.classList.add('on');
            vfxAuraType = 'none';
        }
        setStatus(deleteFromScene ? L().cleared : L().newHero);
    }

    function build() {
        const old=document.getElementById('hf3-panel'); if(old) old.remove();
        injectCSS();
        const l=L(), keys=['torso','head','armL','armR','legL','legR','weapon','cape','drone','hoverboard','shield'];
        const icons={torso:'👕',head:'👤',armL:'💪',armR:'💪',legL:'🦵',legR:'🦵',weapon:'⚔️',cape:'🦇',drone:'🛸',hoverboard:'🛹',shield:'🛡️'};
        panel=document.createElement('div'); panel.id='hf3-panel';
        panel.innerHTML=`
        <div class="hdr"><div class="hdr-title">${l.title}</div><button class="x" id="hf3-close">✕</button></div>
        <div class="sec"><div class="sec-t">${l.styleLabel}</div><div class="chips" id="hf3-chips">
            <div class="chip on" data-s="cyber">⚙️ Cyber</div>
            <div class="chip" data-s="organic">🌿 Organic</div>
            <div class="chip" data-s="blocky">🧱 Blocky</div>
            <div class="chip" data-s="crystal">💎 Crystal</div>
        </div></div>
        <div class="sec"><div class="sec-t">🎬 ANIMATION</div><div class="chips" id="hf3-anim-chips">
            <div class="chip achip on" data-a="idle">Idle</div>
            <div class="chip achip" data-a="walk">Walk</div>
            <div class="chip achip" data-a="combat">Combat</div>
            <div class="chip achip" data-a="fly">Fly</div>
        </div></div>
        
        <div class="sec" style="display:flex; justify-content:space-between; align-items:center;">
            <div class="sec-t" style="margin:0;">${l.customColorLabel}</div>
            <input type="color" id="hf3-color-picker" value="#ffffff" style="width:30px;height:30px;padding:0;border:none;border-radius:4px;cursor:pointer;background:transparent;">
        </div>

        <div class="sec"><div class="sec-t">${l.vfxLabel}</div>
            <div class="chips" id="hf3-vfx-chips" style="margin-bottom:6px;">
                <div class="chip vchip on" data-v="none">${l.vfxNone}</div>
                <div class="chip vchip" data-v="fire">${l.vfxFire}</div>
                <div class="chip vchip" data-v="spark">${l.vfxSpark}</div>
                <div class="chip vchip" data-v="magic">${l.vfxMagic}</div>
                <div class="chip vchip" data-v="matrix">${l.vfxMatrix}</div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div class="sec-t" style="margin:0;font-size:8px;">${l.vfxColorLabel}</div>
                <input type="color" id="hf3-vfx-color-picker" value="${vfxColor}" style="width:24px;height:24px;padding:0;border:none;border-radius:4px;cursor:pointer;background:transparent;">
            </div>
        </div>

        <div class="sec"><div class="sec-t">${l.partsLabel}</div><div class="pgrid">
            ${keys.map(k=>`<button class="pb" id="hf3-p-${k}">${icons[k]}<br>${l[k]||k}</button>`).join('')}
        </div></div>
        <div class="sec"><div class="sec-t">${l.statusLabel}</div><div class="sbox"><div class="sval" id="hf3-status">Ready.</div><div class="tags" id="hf3-tags"><span style="font-size:9px;color:#334155;font-style:italic;">${l.noParts}</span></div></div></div>
        <div class="act">
            <button class="abn pri" id="hf3-fuse">${l.fuse}</button>
            <div style="display:flex;gap:5px;width:100%;margin-top:5px;">
                <button class="abn sec" id="hf3-new" style="flex:1;background:#059669;color:#fff;">${l.newHero}</button>
                <button class="abn sec" id="hf3-reset" style="flex:1;">${l.deleteHero}</button>
            </div>
        </div>`;
        document.body.appendChild(panel);

        document.getElementById('hf3-close').onclick=()=>{panel.remove();panel=null;isOpen=false;};
        
        document.getElementById('hf3-chips').querySelectorAll('.chip:not(.achip):not(.vchip)').forEach(c=>{
            c.onclick=()=>{ 
                document.getElementById('hf3-chips').querySelectorAll('.chip:not(.achip):not(.vchip)').forEach(x=>x.classList.remove('on')); 
                c.classList.add('on'); selStyle=c.dataset.s; 
                Object.keys(parts).forEach(k=>addPart(k));
            };
        });

        document.getElementById('hf3-anim-chips').querySelectorAll('.achip').forEach(c=>{
            c.onclick=()=>{ 
                document.getElementById('hf3-anim-chips').querySelectorAll('.achip').forEach(x=>x.classList.remove('on')); 
                c.classList.add('on'); 
                if(Object.keys(parts).length > 0) setAnimState(c.dataset.a);
            };
        });

        document.getElementById('hf3-color-picker').addEventListener('input', (e) => {
            window._hf3CustomColor = e.target.value;
            if (window._hf3LastPart && parts[window._hf3LastPart]) {
                parts[window._hf3LastPart].material.color.set(window._hf3CustomColor);
                syncHeroModel();
            }
        });

        document.getElementById('hf3-vfx-chips').querySelectorAll('.vchip').forEach(c=>{
            c.onclick=()=>{ 
                document.getElementById('hf3-vfx-chips').querySelectorAll('.vchip').forEach(x=>x.classList.remove('on')); 
                c.classList.add('on'); 
                vfxAuraType = c.dataset.v; 
                createVfx();
            };
        });

        document.getElementById('hf3-vfx-color-picker').addEventListener('input', (e) => {
            vfxColor = e.target.value;
            if (vfxAuraType !== 'none') {
                createVfx();
            }
        });

        keys.forEach(k=>{ 
            document.getElementById('hf3-p-'+k).onclick=function(){ 
                window._hf3LastPart = k;
                addPart(k); 
                this.classList.add('done'); 
                if (window._hf3CustomColor && window._hf3CustomColor !== '#ffffff') {
                    parts[k].material.color.set(window._hf3CustomColor);
                    syncHeroModel();
                }
            }; 
        });
        document.getElementById('hf3-fuse').onclick=fuseHero;
        document.getElementById('hf3-new').onclick=()=>resetHero(false);
        document.getElementById('hf3-reset').onclick=()=>resetHero(true);
    }

    function init(sidebar, triggerBtn) {
        if(!triggerBtn) return;
        triggerBtn.addEventListener('click',()=>{
            if(isOpen&&document.getElementById('hf3-panel')){ document.getElementById('hf3-panel').remove(); panel=null; isOpen=false; return; }
            build(); isOpen=true;
        });
    }
    return { init };
})();
