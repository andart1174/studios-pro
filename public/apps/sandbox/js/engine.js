window.MAT_ERASER = 0; window.MAT_SAND = 1; window.MAT_WALL = 2; window.MAT_WATER = 3; 
window.MAT_FIRE = 4; window.MAT_ACID = 5; window.MAT_SEED = 6; window.MAT_WOOD = 7; 
window.MAT_STEAM = 8; window.MAT_MUD = 9; window.MAT_WIRE = 10; window.MAT_SPARK = 11; window.MAT_GLASS = 12;
window.MAT_LAVA = 13; window.MAT_C4 = 14; window.MAT_ANT = 15; window.MAT_PORTAL_IN = 16; window.MAT_PORTAL_OUT = 17;
window.MAT_CLOUD = 18; window.MAT_EMITTER = 19; window.MAT_VORTEX = 20;
window.MAT_VIRUS = 21; window.MAT_REPULSOR = 22; window.MAT_PLANT = 23; window.MAT_LEAF = 24;
window.MAT_PIANO = 25; window.MAT_SNOW = 26; window.MAT_ICE = 27; window.MAT_SENSOR = 28; window.MAT_SWITCH = 29;
window.MAT_LASER = 30; window.MAT_MIRROR = 31; window.MAT_PHOTON_R = 32; window.MAT_PHOTON_U = 33;
window.MAT_FISH = 34; window.MAT_BEE = 35; window.MAT_CONVEYOR = 36; window.MAT_FAN = 37;

class SandBoxEngine {
  constructor(canvas, width, height) {
    this.canvas = canvas; this.width = width; this.height = height;
    canvas.width = width; canvas.height = height;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    this.types = new Uint8Array(width * height);
    this.colors = new Uint32Array(width * height);
    this.imgData = this.ctx.createImageData(width, height);
    this.buf32 = new Uint32Array(this.imgData.data.buffer);
    
    this.isPaused = false; this.render3D = true;
    this.gravY = 1; this.windX = 0;
    this.particlesCount = 0;
    
    this.shadowColor = this.hexToRealUint32("#000000", 100); 
    this.pOuts = []; // tracking portal exits
    this.vouts = [];
    
    this.audioCtx = null;
    this.lastPianoTime = 0;
    
    this.run = this.run.bind(this);
    requestAnimationFrame(this.run);
  }

  hexToRealUint32(hex, alpha = 255) {
    let r, g, b;
    if (hex.length >= 7) { r = parseInt(hex.slice(1, 3), 16); g = parseInt(hex.slice(3, 5), 16); b = parseInt(hex.slice(5, 7), 16); } 
    else { r=100; g=100; b=100; }
    return new Uint32Array(new Uint8Array([r, g, b, alpha]).buffer)[0];
  }

  drawCircle(cx, cy, radius, type, colorHex, isSpray = false, isSymmetry = false) {
     this._plotCircle(cx, cy, radius, type, colorHex, isSpray);
     if (isSymmetry) this._plotCircle(this.width - cx, cy, radius, type, colorHex, isSpray);
  }

  _plotCircle(cx, cy, radius, type, colorHex, isSpray) {
    const s = this;
    if (cx < 0 || cx >= s.width || cy < 0 || cy >= s.height) return;
    const u32Color = this.hexToRealUint32(colorHex);
    const rSq = Math.max(1, radius * radius);
    for (let y = -radius; y <= radius; y++) {
      for (let x = -radius; x <= radius; x++) {
        if (x * x + y * y <= rSq) {
          if (isSpray && type !== MAT_ERASER && type !== MAT_WALL && Math.random() > 0.05) continue;
          const px = Math.floor(cx + x); const py = Math.floor(cy + y);
          if (px >= 0 && px < s.width && py >= 0 && py < s.height) {
            const idx = py * s.width + px;
            if (type === MAT_ERASER) { 
               s.types[idx] = 0; s.colors[idx] = 0; 
            } 
            else if (s.types[idx] === 0 || type === MAT_WALL) { 
              if (type === MAT_SAND || type === MAT_WATER || type === MAT_ACID || type === MAT_SEED || type === MAT_C4) {
                 let r = parseInt(colorHex.slice(1, 3), 16) + (Math.random()*20-10);
                 let g = parseInt(colorHex.slice(3, 5), 16) + (Math.random()*20-10);
                 let b = parseInt(colorHex.slice(5, 7), 16) + (Math.random()*20-10);
                 r = Math.max(0,Math.min(255,r)); g = Math.max(0,Math.min(255,g)); b = Math.max(0,Math.min(255,b));
                 const ncHex = `#${Math.round(r).toString(16).padStart(2,"0")}${Math.round(g).toString(16).padStart(2,"0")}${Math.round(b).toString(16).padStart(2,"0")}`;
                 s.types[idx] = type; s.colors[idx] = this.hexToRealUint32(ncHex);
              } else if (type === MAT_FIRE) {
                 const fireColors = ['#ef4444', '#f97316', '#facc15'];
                 s.types[idx] = type; s.colors[idx] = this.hexToRealUint32(fireColors[Math.floor(Math.random()*fireColors.length)]);
              } else if (type === MAT_LAVA) {
                 const lCols = ['#ea580c', '#f97316', '#dc2626'];
                 s.types[idx] = type; s.colors[idx] = this.hexToRealUint32(lCols[Math.floor(Math.random()*lCols.length)]);
              } else if (type === MAT_ANT) {
                 s.types[idx] = type; s.colors[idx] = this.hexToRealUint32('#4c1d95'); // dark purple ant
              } else if (type === MAT_PORTAL_IN) {
                 s.types[idx] = type; s.colors[idx] = this.hexToRealUint32('#3b82f6'); 
              } else if (type === MAT_PORTAL_OUT) {
                 s.types[idx] = type; s.colors[idx] = this.hexToRealUint32('#f97316'); 
                 this.pOuts.push(idx); // register
              } else if (type === MAT_CLOUD) {
                 s.types[idx] = type; s.colors[idx] = this.hexToRealUint32('#94a3b8');
              } else if (type === MAT_EMITTER) {
                 s.types[idx] = type; s.colors[idx] = this.hexToRealUint32('#475569');
              } else if (type === MAT_VORTEX) {
                 s.types[idx] = type; s.colors[idx] = this.hexToRealUint32('#000000');
                 this.vouts.push(idx);
              } else if (type === MAT_VIRUS) {
                 s.types[idx] = type; s.colors[idx] = this.hexToRealUint32('#39ff14');
              } else if (type === MAT_REPULSOR) {
                 s.types[idx] = type; s.colors[idx] = this.hexToRealUint32('#38bdf8');
              } else if (type === MAT_PLANT) {
                 s.types[idx] = type; s.colors[idx] = this.hexToRealUint32('#22c55e');
              } else if (type === MAT_LEAF) {
                 s.types[idx] = type; s.colors[idx] = this.hexToRealUint32('#4ade80');
              } else if (type === MAT_PIANO) {
                 s.types[idx] = type; s.colors[idx] = this.hexToRealUint32('#facc15');
              } else if (type === MAT_SNOW) {
                 s.types[idx] = type; s.colors[idx] = this.hexToRealUint32('#f8fafc');
              } else if (type === MAT_ICE) {
                 s.types[idx] = type; s.colors[idx] = this.hexToRealUint32('#7dd3fc');
              } else if (type === MAT_SENSOR) {
                 s.types[idx] = type; s.colors[idx] = this.hexToRealUint32('#818cf8');
              } else if (type === MAT_SWITCH) {
                 s.types[idx] = type; s.colors[idx] = this.hexToRealUint32('#9d174d');
              } else if (type === MAT_LASER) {
                 s.types[idx] = type; s.colors[idx] = this.hexToRealUint32('#b91c1c');
              } else if (type === MAT_MIRROR) {
                 s.types[idx] = type; s.colors[idx] = this.hexToRealUint32('#bae6fd');
              } else if (type === MAT_FISH) {
                 s.types[idx] = type; s.colors[idx] = this.hexToRealUint32('#f97316');
              } else if (type === MAT_BEE) {
                 s.types[idx] = type; s.colors[idx] = this.hexToRealUint32('#facc15');
              } else if (type === MAT_CONVEYOR) {
                 s.types[idx] = type; s.colors[idx] = this.hexToRealUint32('#475569');
              } else if (type === MAT_FAN) {
                 s.types[idx] = type; s.colors[idx] = this.hexToRealUint32('#10b981');
              } else if (type === MAT_SPARK) {
                 s.types[idx] = type; s.colors[idx] = this.hexToRealUint32('#22d3ee');
              } else if (type === MAT_WIRE) {
                 s.types[idx] = type; s.colors[idx] = this.hexToRealUint32('#eab308'); 
              } else if (type === MAT_WALL) {
                 s.types[idx] = type; s.colors[idx] = u32Color;
              }
            }
          }
        }
      }
    }
  }

  clearCanvas() { this.types.fill(0); this.colors.fill(0); this.pOuts = []; this.vouts = []; }

  playPianoNote(yRatio) {
      if (!this.audioCtx) {
          try { this.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } 
          catch(e) { return; }
      }
      let now = performance.now();
      if (now - this.lastPianoTime < 40) return; // limit notes
      this.lastPianoTime = now;
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
      
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = "sine";
      
      const pentatonic = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00];
      let bucket = Math.floor(yRatio * pentatonic.length);
      bucket = Math.max(0, Math.min(pentatonic.length-1, bucket));
      
      osc.frequency.setValueAtTime(pentatonic[bucket], this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.5, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.5);
      
      osc.connect(gain); gain.connect(this.audioCtx.destination);
      osc.start(); osc.stop(this.audioCtx.currentTime + 0.5);
  }

  isEmpty(idx) { return this.types[idx] === 0 || this.types[idx] === MAT_FIRE || this.types[idx] === MAT_STEAM; }
  swap(a, b) {
     const t = this.types[a], c = this.colors[a];
     this.types[a] = this.types[b]; this.colors[a] = this.colors[b];
     this.types[b] = t; this.colors[b] = c;
  }
  setMat(i, t, hex) { this.types[i] = t; this.colors[i] = this.hexToRealUint32(hex); }
  rm(i) { this.types[i] = 0; this.colors[i] = 0; }
  
  explode(centerIdx, radius) {
     const w = this.width; const h = this.height;
     const cx = centerIdx % w; const cy = Math.floor(centerIdx / w);
     const rSq = radius*radius;
     const fireCols = ['#ef4444', '#f97316', '#facc15'];
     for(let y=-radius; y<=radius; y++) {
        for(let x=-radius; x<=radius; x++) {
           if(x*x + y*y <= rSq) {
              const nx = cx+x; const ny = cy+y;
              if (nx>=0 && nx<w && ny>=0 && ny<h) {
                 const id = ny*w + nx;
                 const t = this.types[id];
                 if (t !== MAT_PORTAL_IN && t !== MAT_PORTAL_OUT) {
                    if (Math.random() < 0.2) this.setMat(id, MAT_FIRE, fireCols[Math.floor(Math.random()*fireCols.length)]);
                    else this.rm(id);
                 }
              }
           }
        }
     }
  }

  run() {
    if (!this.isPaused) {
      const types = this.types; const colors = this.colors;
      const w = this.width; const h = this.height;
      let pCount = 0;
      const grav = this.gravY; const wind = this.windX;
      let rStart = grav >= 0 ? h - 2 : 1; let rEnd = grav >= 0 ? -1 : h; let rStep = grav >= 0 ? -1 : 1;
      const fireColors = ['#ef4444', '#f97316', '#facc15'];
      
      // Keep portal exits clean lazily
      let validOuts = [];
      for(let o of this.pOuts) { if(types[o] === MAT_PORTAL_OUT) validOuts.push(o); }
      this.pOuts = validOuts;

      let validVx = [];
      for(let o of this.vouts) { if(types[o] === MAT_VORTEX) validVx.push(o); }
      this.vouts = validVx;

      for (let r = rStart; r !== rEnd; r += rStep) {
        const dir = Math.random() > 0.5 ? 1 : -1;
        const startCol = dir === 1 ? 0 : w - 1;
        const endCol = dir === 1 ? w : -1;
        for (let c = startCol; c !== endCol; c += dir) {
          const i = r * w + c;
          const t = types[i];
          if(t === 0 || t === MAT_PORTAL_IN || t === MAT_PORTAL_OUT || t === MAT_VORTEX || t === MAT_REPULSOR || t === MAT_PIANO || t === MAT_ICE || t === MAT_SENSOR || t === MAT_MIRROR) continue;
          pCount++;
          
          let windOff = 0;
          if (wind !== 0 && Math.random() < 0.3 * Math.abs(wind)) windOff = Math.sign(wind);

          // STEAM CONDENSATION (Weather system)
          if (t === MAT_STEAM && r < 5) { this.setMat(i, MAT_CLOUD, "#94a3b8"); continue; }

          // CLOUD LOGIC
          if (t === MAT_CLOUD) {
              if (Math.random() < 0.05) { this.swap(i, i + (Math.random() > 0.5 ? 1 : -1)); } // drift
              if (Math.random() < 0.005 && r < h - 5) { // rain
                 if (this.isEmpty(i+w)) this.setMat(i+w, MAT_WATER, "#3b82f6");
              }
              if (Math.random() < 0.0002 && r < h - 10) { // lightning
                 if (this.isEmpty(i+w)) this.setMat(i+w, MAT_SPARK, "#22d3ee");
              }
              continue;
          }

          // EMITTER LOGIC
          if (t === MAT_EMITTER) {
              if (r > 0 && r < h - 1 && Math.random() < 0.3) {
                  const src = i - w;
                  const st = types[src];
                  if (st !== 0 && st !== MAT_VORTEX && st !== MAT_PORTAL_OUT && st !== MAT_PORTAL_IN && st !== MAT_EMITTER && st !== MAT_REPULSOR && st !== MAT_VIRUS) {
                      if (this.isEmpty(i + w)) {
                          types[i+w] = st; colors[i+w] = colors[src];
                      }
                  }
              }
              continue;
          }

          // GEN 5 LOGICS
          if (t === MAT_LASER) {
              if (c < w - 1) {
                  let tr = i + 1;
                  if (this.isEmpty(tr)) this.setMat(tr, MAT_PHOTON_R, '#ef4444');
              }
              continue; // static
          }
          if (t === MAT_PHOTON_R) {
              let tr = i + 1;
              if (c < w - 1) {
                  let tTr = types[tr];
                  if (this.isEmpty(tr)) { this.swap(i, tr); }
                  else if (tTr === MAT_MIRROR) {
                      this.rm(i);
                      if (r > 0 && this.isEmpty(i - w)) this.setMat(i - w, MAT_PHOTON_U, '#f87171');
                  } else {
                      if (tTr === MAT_WOOD || tTr === MAT_C4 || tTr === MAT_ICE || tTr === MAT_PLANT || tTr === MAT_LAVA || tTr === MAT_BEE || tTr === MAT_FISH) this.setMat(tr, MAT_FIRE, fireColors[0]);
                      this.rm(i);
                  }
              } else this.rm(i);
              continue;
          }
          if (t === MAT_PHOTON_U) {
              let tu = i - w;
              if (r > 0) {
                  let tTu = types[tu];
                  if (this.isEmpty(tu)) { this.swap(i, tu); }
                  else if (tTu === MAT_MIRROR) {
                      this.rm(i);
                      if (c < w - 1 && this.isEmpty(i + 1)) this.setMat(i + 1, MAT_PHOTON_R, '#ef4444');
                  } else {
                      if (tTu === MAT_WOOD || tTu === MAT_C4 || tTu === MAT_ICE || tTu === MAT_PLANT || tTu === MAT_LAVA || tTu === MAT_BEE || tTu === MAT_FISH) this.setMat(tu, MAT_FIRE, fireColors[0]);
                      this.rm(i);
                  }
              } else this.rm(i);
              continue;
          }
          if (t === MAT_FAN) {
              for(let k=1; k<15; k++) {
                  if (c+k >= w) break;
                  let idx = i+k; let st = types[idx];
                  if (st === MAT_WALL || st === MAT_MIRROR || st === MAT_CONVEYOR) break;
                  if (st !== 0 && st !== MAT_PORTAL_IN && st !== MAT_PORTAL_OUT && st !== MAT_VORTEX && st !== MAT_LASER) {
                      if (c+k+1 < w && this.isEmpty(idx+1)) this.swap(idx, idx+1);
                  }
              }
              continue;
          }
          if (t === MAT_CONVEYOR) {
              if (r > 0) {
                  let up = i - w; let ut = types[up];
                  if (ut !== 0 && ut !== MAT_PORTAL_IN && ut !== MAT_PORTAL_OUT && ut !== MAT_VORTEX && ut !== MAT_FAN) {
                      if (c < w - 1 && this.isEmpty(up + 1)) this.swap(up, up + 1);
                  }
              }
              continue;
          }
          if (t === MAT_BEE) {
             const dirs = [i-1, i+1, i-w, i+w, i-w-1, i-w+1];
             const tr = dirs[Math.floor(Math.random()*dirs.length)];
             if (tr>=0 && tr<w*h) {
                 if (this.isEmpty(tr)) this.swap(i, tr);
                 else if (types[tr] === MAT_LEAF || types[tr] === MAT_PLANT) {
                     if (Math.random()<0.3) this.setMat(tr, MAT_SEED, '#84cc16');
                 } else if (types[tr] === MAT_WATER || types[tr] === MAT_LAVA || types[tr] === MAT_FIRE) this.rm(i);
             }
             continue;
          }
          if (t === MAT_FISH) {
              const adjs = [i-1, i+1, i-w, i+w]; let inWater = false;
              for(let n of adjs) { if(n>=0 && n<w*h && types[n] === MAT_WATER) inWater = true; }
              if (!inWater) { 
                 const tgtR = r+grav; 
                 if(tgtR<h && this.isEmpty(i+w)) this.swap(i, i+w);
                 else if (Math.random()<0.05) this.rm(i);
              } else {
                 if (Math.random()<0.4) {
                     const tryI = adjs[Math.floor(Math.random()*4)];
                     if(tryI>=0 && tryI<w*h && types[tryI]===MAT_WATER) this.swap(i, tryI);
                 }
              }
              continue;
          }

          // AUTO DOOR SWITCH LOGIC
          if (t === MAT_SWITCH) {
             let hasS = false;
             for (let nk of [i-1, i+1, i-w, i+w]) { 
                 if (nk>=0 && nk<w*h && types[nk] === MAT_SPARK) hasS=true; 
             }
             if (hasS) this.rm(i); // Open the door!
             continue;
          }

          // SNOW LOGIC
          if (t === MAT_SNOW) {
             const tgtR = r + (Math.random() < 0.6 ? 1 : 0); // slow fall
             if (tgtR < h) {
                let cOff = c;
                if(Math.random()<0.4) cOff += Math.random()>0.5?1:-1;
                if(cOff>=0 && cOff<w) {
                   const below = tgtR*w + cOff;
                   if (types[below] === MAT_WATER) {
                      this.setMat(below, MAT_ICE, '#7dd3fc'); this.rm(i); continue;
                   }
                   if (this.isEmpty(below)) { this.swap(i, below); }
                }
             } else { this.rm(i); }
             continue;
          }

          // FLORA (PLANTS & LEAVES)
          if (t === MAT_PLANT) {
              if (Math.random() < 0.1) {
                  if (r > 0) {
                      const up = i - w;
                      if (this.isEmpty(up)) {
                          this.setMat(up, MAT_PLANT, "#22c55e");
                          if (Math.random() < 0.3) {
                             const sr = Math.random() > 0.5 ? 1 : -1;
                             const side = up + sr;
                             if (c+sr>=0 && c+sr<w && this.isEmpty(side)) this.setMat(side, MAT_PLANT, "#16a34a");
                          }
                      } else {
                          if (c>0 && this.isEmpty(i-w-1)) this.setMat(i-w-1, MAT_LEAF, "#4ade80");
                          if (c<w-1 && this.isEmpty(i-w+1)) this.setMat(i-w+1, MAT_LEAF, "#4ade80");
                          this.types[i] = MAT_WOOD; 
                      }
                  }
              }
              if (Math.random() < 0.005) this.types[i] = MAT_WOOD; 
              continue;
          }
          if (t === MAT_LEAF) {
             const fireAdjs = [i-1, i+1, i-w, i+w];
             let isFire = false; let attached = false;
             for(let a of fireAdjs) { 
                 if(a>=0 && a<w*h) {
                     if(types[a] === MAT_FIRE || types[a] === MAT_LAVA) isFire = true; 
                     if(types[a] === MAT_WOOD || types[a] === MAT_PLANT || types[a] === MAT_LEAF) attached = true;
                 }
             }
             if (isFire) { this.setMat(i, MAT_FIRE, fireColors[0]); continue; }
             if (!attached && r < h - 1) {
                 const down = i + w;
                 if (this.isEmpty(down)) { 
                    const s = down + (Math.random() > 0.5 ? 1 : -1);
                    if (this.isEmpty(s)) this.swap(i, s);
                    else this.swap(i, down);
                 }
             }
             continue; 
          }

          // VIRUS NANOBOTS (Gray Goo)
          if (t === MAT_VIRUS) {
              const adjs = [i-1, i+1, i-w, i+w];
              for(let n of adjs) {
                  if(n>=0 && n<w*h) {
                      let ta = types[n];
                      if (ta !== 0 && ta !== MAT_VORTEX && ta !== MAT_PORTAL_IN && ta !== MAT_PORTAL_OUT && ta !== MAT_EMITTER && ta !== MAT_VIRUS && ta !== MAT_REPULSOR) {
                          if (Math.random() < 0.08) this.setMat(n, MAT_VIRUS, "#39ff14");
                      }
                  }
              }
              if (Math.random() < 0.03) this.rm(i); // Decay
              continue;
          }

          // FIRE & STEAM RISES
          if (t === MAT_FIRE || t === MAT_STEAM) {
             if (t === MAT_FIRE && Math.random() < 0.08) { this.rm(i); continue; }
             if (t === MAT_STEAM && Math.random() < 0.04) { this.rm(i); continue; }
             const riseY = grav === 0 ? -1 : -grav; 
             const tgtR = r + riseY;
             if (tgtR >= 0 && tgtR < h) {
                const tryUp = tgtR * w + c + windOff;
                // PORTAL CHECK
                if (types[tryUp] === MAT_PORTAL_IN && this.pOuts.length > 0) {
                   const dest = this.pOuts[Math.floor(Math.random()*this.pOuts.length)];
                   this.swap(i, dest); continue;
                }
                if (c+windOff>=0 && c+windOff<w && types[tryUp] === 0) { this.swap(i, tryUp); }
                else {
                   const uL = c > 0 && types[tgtR*w+c-1] === 0; const uR = c < w - 1 && types[tgtR*w+c+1] === 0;
                   if (uL && uR) this.swap(i, Math.random()>0.5 ? tgtR*w+c-1 : tgtR*w+c+1);
                   else if(uL) this.swap(i, tgtR*w+c-1); else if(uR) this.swap(i, tgtR*w+c+1);
                }
             } else this.rm(i);
             continue;
          }

          // SPARKS MOVE ON WIRE
          if (t === MAT_SPARK) {
             if (Math.random() < 0.1) { this.rm(i); continue; }
             const adjs = [];
             if(c>0) adjs.push(i-1); if(c<w-1) adjs.push(i+1);
             if(r>0) adjs.push(i-w); if(r<h-1) adjs.push(i+w);
             let wFound = false;
             for(let n of adjs) {
                if(types[n] === MAT_WIRE) { this.swap(i, n); wFound = true; break; } 
                else if(types[n] === MAT_WOOD) { this.setMat(n, MAT_FIRE, fireColors[0]); }
                else if(types[n] === MAT_C4) { this.explode(n, 20); wFound=true; break; }
             }
             if(!wFound) this.rm(i); 
             continue;
          }

          // ANTS BUGS logic
          if (t === MAT_ANT) {
              const tgtR = grav === 0 ? r+1 : r + grav;
              let moved = false;
              if (tgtR >= 0 && tgtR < h) {
                 const below = tgtR*w + c;
                 if (this.isEmpty(below)) { this.swap(i, below); moved = true; } // falls
              }
              if (!moved) {
                 // walk randomly
                 const wDir = Math.random()>0.5?1:-1;
                 const tryC = c + wDir;
                 if (tryC>=0 && tryC<w) {
                    const adj = r*w + tryC;
                    if (this.isEmpty(adj)) { this.swap(i, adj); }
                    else if (types[adj] === MAT_WOOD || types[adj] === MAT_SEED) { this.rm(adj); this.swap(i, adj); } // eat
                    else {
                       // try climb 1 step
                       const upR = r - grav;
                       if (upR>=0 && upR<h) {
                          const climb = upR*w + tryC;
                          if (this.isEmpty(climb)) this.swap(i, climb);
                       }
                    }
                 }
              }
              continue;
          }

          // FALLING SOLIDS/LIQUIDS
          if (t === MAT_SAND || t === MAT_WATER || t === MAT_ACID || t === MAT_SEED || t === MAT_LAVA || t === MAT_C4) {
             
            // Lava moves extremely slowly
            if (t === MAT_LAVA && Math.random() > 0.1) continue; 
              
            const tgtR = grav === 0 ? r : r + grav;
            if (tgtR < 0 || tgtR >= h) { this.rm(i); continue; }
            const trgC = c + windOff;
            if (trgC < 0 || trgC >= w) continue;
            
            const below = tgtR * w + trgC;
            const bMat = types[below];

            // PORTAL COLLISION
            if (bMat === MAT_PORTAL_IN && this.pOuts.length > 0) {
               const dest = this.pOuts[Math.floor(Math.random()*this.pOuts.length)];
               this.swap(i, dest); continue;
            }



            // REPULSOR ANTI-GRAVITY BEAM
            let repulsed = false;
            for(let ky=1; ky<35; ky++) {
                if (r+ky >= h) break;
                if (types[i + ky*w] === MAT_REPULSOR) {
                   if (r > 1) {
                      let upPos = i - w;
                      if (this.isEmpty(upPos)) { this.swap(i, upPos); repulsed = true; break; }
                      else {
                          let cShift = Math.random()>0.5?1:-1;
                          if (c+cShift>=0 && c+cShift<w) {
                             let sUp = upPos + cShift;
                             if (this.isEmpty(sUp)) { this.swap(i, sUp); repulsed = true; break; }
                          }
                      }
                   }
                }
            }
            if (repulsed) continue;

            // LAVA REACTIONS
            if (t === MAT_LAVA) {
               if (bMat === MAT_WATER) { this.setMat(below, MAT_STEAM, '#e2e8f0'); this.setMat(i, MAT_WALL, '#4b5563'); continue; }
               if (bMat === MAT_ICE || bMat === MAT_SNOW) { this.setMat(below, MAT_WATER, '#3b82f6'); this.rm(i); continue; }
               if (bMat === MAT_WOOD) { this.setMat(below, MAT_FIRE, fireColors[0]); }
               if (bMat === MAT_SAND) { this.setMat(below, MAT_GLASS, '#bae6fd'); }
               if (bMat === MAT_C4) { this.explode(below, 25); continue; }
            }

            // C4 REACTIONS
            if (t === MAT_C4 || bMat === MAT_C4) {
               if (bMat === MAT_FIRE || t === MAT_FIRE) { this.explode(i, 20); continue; }
            }

            // WATER REACTIONS
            if (t === MAT_WATER && bMat === MAT_FIRE) { this.rm(below); this.swap(i, below); this.setMat(below, MAT_STEAM, '#e2e8f0'); continue; }
            if (t === MAT_WATER && bMat === MAT_SAND) { this.setMat(below, MAT_MUD, '#78350f'); this.rm(i); continue; }
            if (t === MAT_WATER && bMat === MAT_SNOW) { this.setMat(below, MAT_ICE, '#7dd3fc'); this.rm(i); continue; }
            if ((t === MAT_WATER && bMat === MAT_SEED) || (t === MAT_SEED && bMat === MAT_WATER)) { 
                 this.setMat(below, MAT_PLANT, '#22c55e'); this.rm(i); continue; 
            }
            if (t === MAT_WATER && bMat === MAT_WOOD) { 
               const rndY = r - grav;
               if (rndY>=0 && rndY<h && types[rndY*w+c]===0) { this.setMat(rndY*w+c, MAT_WOOD, '#15803d'); }
               this.rm(i); continue; 
            }
            if (t === MAT_ACID && bMat !== 0 && bMat !== MAT_ACID && bMat !== MAT_WIRE && bMat !== MAT_PORTAL_IN && bMat !== MAT_PORTAL_OUT) {
               if (Math.random() < 0.08) { this.rm(below); this.setMat(i, MAT_STEAM, '#86efac');  }
               continue;
            }

            // NORMAL MOTION
            if (this.isEmpty(below)) { this.swap(i, below); } 
            else {
              if (bMat === MAT_PIANO) {
                  this.playPianoNote( 1.0 - (r / h) );
                  if (r>2 && this.isEmpty(i-w*2)) { this.swap(i, i-w*2); continue; } // bounce check
              }
              if (bMat === MAT_SENSOR && t !== MAT_SPARK) {
                  if (r>0 && this.isEmpty(i-w)) this.setMat(i-w, MAT_SPARK, '#22d3ee');
              }

              const fL = c > 0 && this.isEmpty(tgtR * w + c - 1);
              const fR = c < w - 1 && this.isEmpty(tgtR * w + c + 1);
              if (fL && fR) this.swap(i, Math.random() > 0.5 ? tgtR * w + c - 1 : tgtR * w + c + 1);
              else if (fL) this.swap(i, tgtR * w + c - 1);
              else if (fR) this.swap(i, tgtR * w + c + 1);
              else if (t === MAT_WATER || t === MAT_ACID || t === MAT_LAVA) {
                // FLUID DISPERSAL
                const oL = c > 0 && this.isEmpty(i - 1);
                const oR = c < w - 1 && this.isEmpty(i + 1);
                let dT = i;
                if (oL && oR) {
                   const sD = Math.random() > 0.5 ? -1 : 1;
                   if (sD === -1 && c>1 && this.isEmpty(i-2)) dT = i-2;
                   else if (sD === 1 && c<w-2 && this.isEmpty(i+2)) dT = i+2;
                   else dT = i+sD;
                } else if (oL) { dT = (c>1 && this.isEmpty(i-2)) ? i-2 : i-1; }
                  else if (oR) { dT = (c<w-2 && this.isEmpty(i+2)) ? i+2 : i+1; }
                if (dT !== i) this.swap(i, dT);
              }
            }
          } 
          // STATIC WOOD COMBUSTION
          else if (t === MAT_WOOD) {
             const adjs = [i-1, i+1, i-w, i+w];
             for(let n of adjs) {
                if(n>=0 && n<h*w && types[n] === MAT_FIRE && Math.random()<0.05) {
                   this.setMat(i, MAT_FIRE, fireColors[1]); break;
                }
             }
          }
        }
      }
      this.particlesCount = pCount;
    }
    
    // 3D RENDERING
    if (this.render3D) {
       this.buf32.set(this.colors); 
       const t = this.types; const w = this.width; const h = this.height;
       for (let i = 0; i < t.length; i++) {
          if (t[i] !== 0 && t[i] !== MAT_FIRE && t[i] !== MAT_STEAM && t[i] !== MAT_SPARK && t[i] !== MAT_PORTAL_IN && t[i] !== MAT_PORTAL_OUT && t[i] !== MAT_PHOTON_R && t[i] !== MAT_PHOTON_U) {
             if (i + 1 < t.length && t[i + 1] === 0) this.buf32[i + 1] = this.shadowColor;
             if (i + w + 1 < t.length && t[i + w + 1] === 0) this.buf32[i + w + 1] = this.shadowColor;
          }
       }
    } else {
       this.buf32.set(this.colors);
    }
    
    this.ctx.putImageData(this.imgData, 0, 0);
    requestAnimationFrame(this.run);
  }
}
window.SandBoxEngine = SandBoxEngine;
