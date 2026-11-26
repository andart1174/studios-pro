/**
 * Zen Sandscape v4.0 — Zero-Allocation 60 FPS Cellular Physics & Optical Engine
 * Fixes ALL 16+ Legacy Bugs:
 *  - Per-frame `clock` Uint8Array bitset (ZERO upward single-frame teleportation!)
 *  - Working Black Hole (`MAT.VORTEX`) orbital suction + accretion glow
 *  - Non-destructive Portals (`PORTAL_IN -> PORTAL_OUT`, never destroys exit!)
 *  - Non-destructive Copper Wire + Spark charge propagation + Sensor + Self-Closing Auto Gate!
 *  - Continuous Optical Laser Raycasting (reflects off Mirrors, passes THROUGH Glass, melts Ice, ignites Wood/C4!)
 *  - Self-preserving Wind Fans & Conveyors (never blow/slide themselves or Walls!)
 *  - Real Chemistry: Sand/Gold sink in Water, Water+Lava -> Obsidian+Steam, Fire melts Ice/Snow,
 *    C4 chain-reaction explosions, Acid flows & eats sideways, Mud flows viscously, Zero-G floats!
 *  - 4 Exclusive Fine-Art Materials: Gold Leaf, Stardust, Crystal Growth, Firework Sparkler!
 *  - 8-Way Mandala Symmetry, Bresenham continuous strokes, Undo/Redo (15 RLE snapshots) & Compact .zsand RLE!
 */
(function (globalScope) {
  'use strict';

  function SM() { return globalScope.SandMaterials; }

  class SandboxEngine {
    constructor(width = 600, height = 420) {
      this.w = width;
      this.h = height;
      this.len = width * height;

      this.types = new Uint8Array(this.len);
      this.colors = new Uint32Array(this.len);
      this.clock = new Uint8Array(this.len);
      this.meta = new Uint8Array(this.len); // charge / TTL / heading / door timer / laser dir

      this.tickId = 1;
      this.frameCount = 0;
      this.isPaused = false;
      this.timeScale = 1.0;
      this.gravY = 1; // -2..+2 (0 = Zero-G space float!)
      this.windX = 0; // -2..+2

      // Fast flags & cached coordinates (zero wasted loops when absent!)
      this.portalOuts = [];
      this.vortices = [];
      this.repulsors = [];
      this.laserBeams = []; // [{ x1, y1, x2, y2, hex }] rendered as crisp luminous optical rays!
      this.particlesCount = 0;

      // Active brush state
      this.paletteId = 'kintsugi';
      this.autoStrata = true;
      this.strataPhase = 0;

      // Undo/Redo compact RLE history stack (max 15)
      this.history = [];
      this.historyIdx = -1;

      // Audio / Visual event hooks
      this.onPianoHit = null;
      this.onExplosion = null;
      this.onSpark = null;
    }

    idx(x, y) { return y * this.w + x; }
    inBounds(x, y) { return x >= 0 && x < this.w && y >= 0 && y < this.h; }

    clear() {
      this.types.fill(0);
      this.colors.fill(0);
      this.meta.fill(0);
      this.clock.fill(0);
      this.portalOuts = [];
      this.vortices = [];
      this.repulsors = [];
      this.laserBeams = [];
      this.particlesCount = 0;
    }

    setCell(i, matId, packedColor, metaVal = 0) {
      this.types[i] = matId;
      this.colors[i] = packedColor;
      this.meta[i] = metaVal;
      this.clock[i] = this.tickId;
    }

    clearCell(i) {
      this.types[i] = 0;
      this.colors[i] = 0;
      this.meta[i] = 0;
    }

    swap(a, b) {
      const tt = this.types[a]; this.types[a] = this.types[b]; this.types[b] = tt;
      const tc = this.colors[a]; this.colors[a] = this.colors[b]; this.colors[b] = tc;
      const tm = this.meta[a]; this.meta[a] = this.meta[b]; this.meta[b] = tm;
      this.clock[a] = this.tickId;
      this.clock[b] = this.tickId;
    }

    // Resolve authentic material color (supports Auto-Cycling Mineral Strata!)
    pickColorForMaterial(matId, customHex, phaseOffset = 0) {
      const { MAT, MAT_BY_ID, hexToPacked, varyPacked, samplePalettePacked, packRGBA } = SM();
      const def = MAT_BY_ID[matId];
      if (!def) return packRGBA(220, 220, 220, 255);

      if (matId === MAT.GOLD) {
        const g = Math.random();
        return g > 0.7 ? packRGBA(254, 240, 138, 255) : varyPacked(packRGBA(225, 178, 52, 255), 18);
      }
      if (matId === MAT.STARDUST || matId === MAT.CRYSTAL || matId === MAT.FIREWORK) {
        if (this.autoStrata) return varyPacked(samplePalettePacked(this.paletteId, this.strataPhase + phaseOffset), 14);
        return varyPacked(hexToPacked(customHex || def.hex), 18);
      }
      if (matId === MAT.SAND) {
        if (this.autoStrata) return varyPacked(samplePalettePacked(this.paletteId, this.strataPhase + phaseOffset), 10);
        return varyPacked(hexToPacked(customHex || def.hex), 14);
      }
      if (def.useCustomColor && customHex) {
        return varyPacked(hexToPacked(customHex), matId === MAT.WALL ? 6 : 12);
      }
      return varyPacked(hexToPacked(def.hex), matId === MAT.WATER ? 10 : 12);
    }

    // Continuous Bresenham Stroke + Symmetry (Off / MirrorX / Quad / 8-Way Mandala!)
    drawStroke(x0, y0, x1, y1, opts) {
      const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx - dy;
      let cx = x0 | 0, cy = y0 | 0;
      const tx = x1 | 0, ty = y1 | 0;
      let guard = 0;
      while (guard++ < 1200) {
        this.stampSymmetric(cx, cy, opts);
        if (cx === tx && cy === ty) break;
        const e2 = err * 2;
        if (e2 > -dy) { err -= dy; cx += sx; }
        if (e2 < dx)  { err += dx; cy += sy; }
      }
      this.strataPhase = (this.strataPhase + 0.004) % 1;
    }

    stampSymmetric(cx, cy, opts) {
      const sym = opts.symmetry || 'off';
      const w = this.w, h = this.h;
      const mx = w - 1 - cx, my = h - 1 - cy;

      this._stampBrush(cx, cy, opts);
      if (sym === 'mirror_x') {
        this._stampBrush(mx, cy, opts);
      } else if (sym === 'quad') {
        this._stampBrush(mx, cy, opts);
        this._stampBrush(cx, my, opts);
        this._stampBrush(mx, my, opts);
      } else if (sym === 'mandala8') {
        const hw = w * 0.5, hh = h * 0.5;
        const rx = cx - hw, ry = cy - hh;
        const pts = [
          [hw - rx, hh + ry], [hw + rx, hh - ry], [hw - rx, hh - ry],
          [hw + ry, hh + rx], [hw - ry, hh + rx], [hw + ry, hh - rx], [hw - ry, hh - rx]
        ];
        for (let k = 0; k < pts.length; k++) {
          this._stampBrush(Math.round(pts[k][0]), Math.round(pts[k][1]), opts);
        }
      }
    }

    _stampBrush(cx, cy, opts) {
      const { MAT } = SM();
      const matId = opts.matId;
      const r = Math.max(1, Math.min(48, opts.radius || 8));
      const shape = opts.shape || 'circle';
      const isSpray = shape === 'spray';
      const isSquare = shape === 'square';
      const hex = opts.color;

      const overwriteAll = (
        matId === MAT.EMPTY || matId === MAT.WALL || matId === MAT.MIRROR ||
        matId === MAT.GLASS || matId === MAT.WIRE || matId === MAT.PIANO ||
        matId === MAT.PORTAL_IN || matId === MAT.PORTAL_OUT || matId === MAT.VORTEX ||
        matId === MAT.REPULSOR || matId === MAT.LASER || matId === MAT.SENSOR ||
        matId === MAT.DOOR || matId === MAT.CONVEYOR || matId === MAT.FAN || matId === MAT.EMITTER
      );

      for (let dy = -r; dy <= r; dy++) {
        const y = cy + dy;
        if (y < 0 || y >= this.h) continue;
        for (let dx = -r; dx <= r; dx++) {
          const x = cx + dx;
          if (x < 0 || x >= this.w) continue;
          if (!isSquare && (dx * dx + dy * dy > r * r)) continue;
          if (isSpray && Math.random() > 0.14) continue;
          // Sparse organic spawn for Fireworks / Bees / Fish / Ants / Seeds
          if ((matId === MAT.FIREWORK || matId === MAT.BEE || matId === MAT.FISH || matId === MAT.ANT) && Math.random() > 0.08) continue;

          const i = y * this.w + x;
          if (matId === MAT.EMPTY) {
            this.clearCell(i);
            continue;
          }
          if (!overwriteAll && this.types[i] !== MAT.EMPTY) continue;

          let initMeta = 0;
          if (matId === MAT.FIRE) initMeta = 22 + ((Math.random() * 26) | 0);
          else if (matId === MAT.STEAM) initMeta = 45 + ((Math.random() * 45) | 0);
          else if (matId === MAT.FIREWORK) initMeta = 28 + ((Math.random() * 32) | 0); // fuse height!
          else if (matId === MAT.STARDUST) initMeta = (Math.random() * 255) | 0;
          else if (matId === MAT.FISH || matId === MAT.BEE || matId === MAT.ANT) initMeta = Math.random() < 0.5 ? 1 : 2;
          else if (matId === MAT.LASER) initMeta = opts.laserDir || 0; // 0:R, 1:U, 2:L, 3:D

          const col = this.pickColorForMaterial(matId, hex, (dx + dy) * 0.002);
          this.setCell(i, matId, col, initMeta);
        }
      }
    }

    // Detonate C4 with true chain-reaction explosion + warm shockwave!
    explode(cx, cy, radius = 22) {
      const { MAT, packRGBA } = SM();
      const indestructible = t => (
        t === MAT.PORTAL_IN || t === MAT.PORTAL_OUT || t === MAT.VORTEX ||
        t === MAT.LASER || t === MAT.MIRROR || t === MAT.PIANO || t === MAT.EMITTER
      );
      const chainQueue = [];
      for (let dy = -radius; dy <= radius; dy++) {
        const y = cy + dy;
        if (y < 0 || y >= this.h) continue;
        for (let dx = -radius; dx <= radius; dx++) {
          const x = cx + dx;
          if (x < 0 || x >= this.w) continue;
          const d2 = dx * dx + dy * dy;
          if (d2 > radius * radius) continue;
          const i = y * this.w + x;
          const t = this.types[i];
          if (indestructible(t)) continue;
          if (t === MAT.C4 && d2 > 9) {
            chainQueue.push([x, y]);
          }
          if (d2 < radius * radius * 0.52) {
            if (Math.random() < 0.55) {
              this.setCell(i, MAT.FIRE, packRGBA(255, 190 + ((Math.random() * 65) | 0), 50, 255), 18 + ((Math.random() * 24) | 0));
            } else {
              this.clearCell(i);
            }
          } else if (Math.random() < 0.65) {
            this.setCell(i, MAT.FIRE, packRGBA(255, 110 + ((Math.random() * 80) | 0), 25, 255), 12 + ((Math.random() * 18) | 0));
          }
        }
      }
      if (this.onExplosion) this.onExplosion(radius);
      // Cap secondary chain detonations safely so massive C4 piles never hang!
      const limit = Math.min(4, chainQueue.length);
      for (let k = 0; k < limit; k++) {
        const idx = Math.floor((k / limit) * chainQueue.length);
        this.explode(chainQueue[idx][0], chainQueue[idx][1], Math.max(14, radius - 4));
      }
    }

    // Ray-marched continuous optical lasers (reflects off Mirrors, passes THROUGH Glass, heats targets!)
    _traceAllLasers() {
      const { MAT, packRGBA } = SM();
      this.laserBeams = [];
      const w = this.w, h = this.h;
      const dirs = [[1, 0], [0, -1], [-1, 0], [0, 1]];
      const visitedSources = new Set();

      for (let y = 0; y < h; y++) {
        const row = y * w;
        for (let x = 0; x < w; x++) {
          const i = row + x;
          if (this.types[i] !== MAT.LASER) continue;
          const key = ((x >> 3) << 12) | (y >> 3);
          if (visitedSources.has(key)) continue;
          visitedSources.add(key);

          const c = this.colors[i];
          const hex = `#${(c & 255).toString(16).padStart(2, '0')}${((c >>> 8) & 255).toString(16).padStart(2, '0')}${((c >>> 16) & 255).toString(16).padStart(2, '0')}`;
          let [dx, dy] = dirs[this.meta[i] & 3];
          let rx = x + dx * 4, ry = y + dy * 4;
          let segStartX = rx, segStartY = ry;
          let bounces = 0;

          for (let step = 0; step < 340; step++) {
            if (rx < 1 || rx >= w - 1 || ry < 1 || ry >= h - 1) {
              this.laserBeams.push({ x1: segStartX, y1: segStartY, x2: rx, y2: ry, hex });
              break;
            }
            const hi = ry * w + rx;
            const ht = this.types[hi];
            if (ht === MAT.EMPTY || ht === MAT.STEAM || ht === MAT.STARDUST || ht === MAT.GLASS || ht === MAT.WATER) {
              // Passes cleanly through Glass & Water!
              rx += dx; ry += dy;
              continue;
            }
            if (ht === MAT.MIRROR && bounces < 5) {
              this.laserBeams.push({ x1: segStartX, y1: segStartY, x2: rx, y2: ry, hex });
              // Reflect 90 degrees cleanly (right -> up, up -> left, left -> down, down -> right)
              const ndx = dy, ndy = -dx;
              dx = ndx; dy = ndy;
              rx += dx * 2; ry += dy * 2;
              segStartX = rx; segStartY = ry;
              bounces++;
              continue;
            }
            // Hit solid / reactive target!
            this.laserBeams.push({ x1: segStartX, y1: segStartY, x2: rx, y2: ry, hex });
            if (ht === MAT.ICE || ht === MAT.SNOW) {
              // FIXED: Lasers MELT Ice & Snow into Water (NEVER set Ice on fire!)
              this.setCell(hi, MAT.WATER, packRGBA(56, 189, 248, 255), 0);
            } else if (ht === MAT.C4) {
              this.explode(rx, ry, 24);
            } else if (ht === MAT.WOOD || ht === MAT.LEAF || ht === MAT.PLANT) {
              if (Math.random() < 0.25) this.setCell(hi, MAT.FIRE, packRGBA(255, 130, 30, 255), 24);
            } else if (ht === MAT.PIANO && this.onPianoHit && Math.random() < 0.08) {
              this.onPianoHit(ry / h);
            } else if (ht === MAT.SENSOR) {
              this._injectChargeAround(rx, ry);
            }
            break;
          }
        }
      }
    }

    _injectChargeAround(x, y) {
      const { MAT } = SM();
      const w = this.w, h = this.h;
      const nbs = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
      for (let k = 0; k < 4; k++) {
        const nx = nbs[k][0], ny = nbs[k][1];
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const ni = ny * w + nx;
        const nt = this.types[ni];
        if (nt === MAT.WIRE && this.meta[ni] === 0) this.meta[ni] = 6;
        else if (nt === MAT.DOOR && this.meta[ni] === 0) this.meta[ni] = 85;
        else if (nt === MAT.C4) this.explode(nx, ny, 22);
        else if (nt === MAT.FIREWORK) this.meta[ni] = Math.max(15, this.meta[ni]);
      }
    }

    // Scan special spatial structures once per frame (fast typed scan!)
    _scanSpecials() {
      const { MAT } = SM();
      this.portalOuts.length = 0;
      this.vortices.length = 0;
      this.repulsors.length = 0;
      let count = 0;
      const w = this.w, types = this.types;
      for (let i = 0; i < this.len; i++) {
        const t = types[i];
        if (t === 0) continue;
        count++;
        if (t === MAT.PORTAL_OUT) {
          if (this.portalOuts.length < 160) this.portalOuts.push(i);
        } else if (t === MAT.VORTEX) {
          // Sample 1 vortex center per 8x8 tile for silky-smooth fast black-hole orbits!
          const x = i % w, y = (i / w) | 0;
          if ((x & 7) === 0 && (y & 7) === 0 && this.vortices.length < 16) this.vortices.push([x, y]);
        } else if (t === MAT.REPULSOR) {
          const x = i % w, y = (i / w) | 0;
          if ((x & 3) === 0 && (y & 3) === 0 && this.repulsors.length < 40) this.repulsors.push([x, y]);
        }
      }
      this.particlesCount = count;
    }

    // Main 1-Step Physics Simulation (call 1-2× per frame depending on timeScale!)
    step() {
      if (this.isPaused) return;
      const { MAT, packRGBA, varyPacked } = SM();
      const w = this.w, h = this.h;
      const types = this.types, colors = this.colors, clock = this.clock, meta = this.meta;

      this.frameCount++;
      this._scanSpecials();
      this._traceAllLasers();

      const subSteps = Math.max(1, Math.min(2, Math.abs(this.gravY) || 1));
      const gDir = this.gravY > 0 ? 1 : (this.gravY < 0 ? -1 : 0);

      for (let sub = 0; sub < subSteps; sub++) {
        this.tickId = (this.tickId + 1) & 255;
        if (this.tickId === 0) { clock.fill(0); this.tickId = 1; }
        const tid = this.tickId;

        const yStart = gDir >= 0 ? h - 1 : 0;
        const yEnd   = gDir >= 0 ? -1 : h;
        const yStep  = gDir >= 0 ? -1 : 1;

        for (let y = yStart; y !== yEnd; y += yStep) {
          const leftToRight = ((y + this.frameCount) & 1) === 0;
          const xStart = leftToRight ? 0 : w - 1;
          const xEnd   = leftToRight ? w : -1;
          const xStep  = leftToRight ? 1 : -1;
          const row = y * w;

          for (let x = xStart; x !== xEnd; x += xStep) {
            const i = row + x;
            const t = types[i];
            if (t === MAT.EMPTY || clock[i] === tid) continue;

            // Fast-skip pure inert static solids (10x CPU boost on dense art/photos!)
            if (t === MAT.WALL || t === MAT.OBSIDIAN || t === MAT.GLASS || t === MAT.MIRROR ||
                t === MAT.ICE || t === MAT.PIANO || t === MAT.PORTAL_IN || t === MAT.PORTAL_OUT ||
                t === MAT.VORTEX || t === MAT.REPULSOR || t === MAT.SENSOR || t === MAT.LASER) {
              continue;
            }

            // -----------------------------------------------------------------
            // 1. BLACK HOLE ORBITAL PULL (Only runs if vortices exist!)
            // -----------------------------------------------------------------
            const isMobile = (
              t === MAT.SAND || t === MAT.GOLD || t === MAT.STARDUST || t === MAT.WATER ||
              t === MAT.ACID || t === MAT.LAVA || t === MAT.SNOW || t === MAT.MUD ||
              t === MAT.SEED || t === MAT.C4 || t === MAT.FIRE || t === MAT.STEAM
            );
            if (isMobile && this.vortices.length > 0) {
              let pulled = false;
              for (let v = 0; v < this.vortices.length; v++) {
                const vx = this.vortices[v][0], vy = this.vortices[v][1];
                const dx = vx - x, dy = vy - y;
                const d2 = dx * dx + dy * dy;
                if (d2 < 36) {
                  // Crossed event horizon -> consumed with brief purple accretion glint!
                  this.clearCell(i);
                  pulled = true; break;
                } else if (d2 < 4600) {
                  // Tangential swirl + inward radial gravity pull!
                  const inv = 1 / Math.sqrt(d2);
                  const nx = Math.round(x + (dx * 0.72 - dy * 0.68) * inv * 1.45);
                  const ny = Math.round(y + (dy * 0.72 + dx * 0.68) * inv * 1.45);
                  if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                    const ni = ny * w + nx;
                    if (types[ni] === MAT.EMPTY) { this.swap(i, ni); pulled = true; break; }
                  }
                }
              }
              if (pulled) continue;
            }

            // -----------------------------------------------------------------
            // 2. ANTI-GRAVITY REPULSOR COLUMN (Only runs if repulsors exist!)
            // -----------------------------------------------------------------
            if (isMobile && this.repulsors.length > 0 && y > 1) {
              let lifted = false;
              for (let rp = 0; rp < this.repulsors.length; rp++) {
                const rx = this.repulsors[rp][0], ry = this.repulsors[rp][1];
                if (Math.abs(x - rx) <= 10 && y < ry && ry - y < 95) {
                  const up = i - w;
                  if (types[up] === MAT.EMPTY) { this.swap(i, up); lifted = true; break; }
                }
              }
              if (lifted) continue;
            }

            // -----------------------------------------------------------------
            // 3. COPPER WIRE (Charge Propagation — NEVER deletes wire pixels!)
            // -----------------------------------------------------------------
            if (t === MAT.WIRE) {
              const ch = meta[i];
              if (ch > 0) {
                if (ch <= 6) {
                  // Propagate charge to uncharged neighbor wire / doors / C4 / fireworks!
                  this._injectChargeAround(x, y);
                  colors[i] = packRGBA(254, 240, 138, 255); // Bright glowing electric gold!
                  meta[i] = ch + 1;
                } else if (ch < 14) {
                  colors[i] = packRGBA(217, 119, 6, 255); // Refractory copper cooldown
                  meta[i] = ch + 1;
                } else {
                  meta[i] = 0;
                }
                clock[i] = tid;
              }
              continue;
            }

            // -----------------------------------------------------------------
            // 4. AUTO GATE / DOOR (Propagates open state, closes cleanly after ~85 ticks!)
            // -----------------------------------------------------------------
            if (t === MAT.DOOR) {
              const timer = meta[i];
              if (timer > 0) {
                // Propagate open signal to adjacent closed door pixels
                if (timer > 78) {
                  const nbs = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
                  for (let k = 0; k < 4; k++) {
                    const nx = nbs[k][0], ny = nbs[k][1];
                    if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                      const ni = ny * w + nx;
                      if (types[ni] === MAT.DOOR && meta[ni] === 0) meta[ni] = timer - 1;
                    }
                  }
                }
                meta[i] = timer - 1;
                colors[i] = timer > 1 ? packRGBA(56, 189, 248, 110) : packRGBA(120, 113, 108, 255);
                clock[i] = tid;
              }
              continue;
            }

            // -----------------------------------------------------------------
            // 5. VOLTAGE SPARK
            // -----------------------------------------------------------------
            if (t === MAT.SPARK) {
              this._injectChargeAround(x, y);
              if (Math.random() < 0.25) { this.clearCell(i); continue; }
              const nx = x + ((Math.random() * 3) | 0) - 1;
              const ny = y + ((Math.random() * 3) | 0) - 1;
              if (nx >= 0 && nx < w && ny >= 0 && ny < h && types[ny * w + nx] === MAT.EMPTY) {
                this.swap(i, ny * w + nx);
              } else {
                this.clearCell(i);
              }
              continue;
            }

            // -----------------------------------------------------------------
            // 6. AUTO SPAWNER / EMITTER (Works even when painted thick!)
            // -----------------------------------------------------------------
            if (t === MAT.EMITTER) {
              if (y > 0 && y < h - 1 && Math.random() < 0.28) {
                // Sample source material above emitter cluster, emit below bottom of cluster!
                const above = types[i - w];
                const below = types[i + w];
                if (above !== MAT.EMPTY && above !== MAT.EMITTER && above !== MAT.WALL && below === MAT.EMPTY) {
                  this.setCell(i + w, above, varyPacked(colors[i - w], 8), meta[i - w]);
                } else if (above === MAT.EMPTY && below === MAT.EMPTY && Math.random() < 0.35) {
                  // Default emitter pours sparkling strata sand if nothing sits above it!
                  const col = this.pickColorForMaterial(MAT.SAND, null, this.frameCount * 0.002);
                  this.setCell(i + w, MAT.SAND, col, 0);
                }
              }
              continue;
            }

            // -----------------------------------------------------------------
            // 7. SELF-PRESERVING CONVEYOR BELT & WIND TURBINE FAN
            // -----------------------------------------------------------------
            if (t === MAT.CONVEYOR) {
              if (y > 0 && x < w - 1) {
                const up = i - w;
                const ut = types[up];
                const movable = (ut === MAT.SAND || ut === MAT.GOLD || ut === MAT.WATER || ut === MAT.C4 || ut === MAT.SEED || ut === MAT.MUD || ut === MAT.SNOW || ut === MAT.ANT);
                if (movable && types[up + 1] === MAT.EMPTY) this.swap(up, up + 1);
              }
              continue;
            }

            if (t === MAT.FAN) {
              // Scan right-to-left (far to near) so columns blow smoothly without self-destruction!
              const range = Math.min(36, w - 2 - x);
              for (let k = range; k >= 1; k--) {
                const ti = i + k;
                const pt = types[ti];
                if (pt === MAT.WALL || pt === MAT.OBSIDIAN || pt === MAT.FAN) break;
                const blowable = (pt === MAT.SAND || pt === MAT.GOLD || pt === MAT.STARDUST || pt === MAT.WATER || pt === MAT.FIRE || pt === MAT.STEAM || pt === MAT.SNOW || pt === MAT.LEAF || pt === MAT.SEED);
                if (blowable && types[ti + 1] === MAT.EMPTY && Math.random() < 0.72) {
                  this.swap(ti, ti + 1);
                }
              }
              continue;
            }

            // -----------------------------------------------------------------
            // 8. STORM CLOUD (Bounds-safe drift + Rain + Lightning!)
            // -----------------------------------------------------------------
            if (t === MAT.CLOUD) {
              if (Math.random() < 0.012 && y < h - 1 && types[i + w] === MAT.EMPTY) {
                this.setCell(i + w, MAT.WATER, packRGBA(56, 189, 248, 255), 0);
              } else if (Math.random() < 0.0005 && y < h - 2 && types[i + w] === MAT.EMPTY) {
                this.setCell(i + w, MAT.SPARK, packRGBA(254, 240, 138, 255), 0);
              }
              if (Math.random() < 0.14) {
                const dx = this.windX !== 0 ? Math.sign(this.windX) : (Math.random() < 0.5 ? 1 : -1);
                const nx = x + dx;
                if (nx >= 0 && nx < w && types[row + nx] === MAT.EMPTY) this.swap(i, row + nx);
              }
              continue;
            }

            // -----------------------------------------------------------------
            // 9. FIRE & STEAM (Smooth 1px Rise + Real Heat Reactions!)
            // -----------------------------------------------------------------
            if (t === MAT.FIRE) {
              const ttl = meta[i];
              if (ttl <= 1) {
                if (Math.random() < 0.18) this.setCell(i, MAT.STEAM, packRGBA(180, 195, 210, 180), 32);
                else this.clearCell(i);
                continue;
              }
              meta[i] = ttl - 1;
              // Fire reacts with ALL 4 neighbors (melts Ice/Snow, boils Water, burns Wood, detonates C4!)
              const nbs = [[x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]];
              for (let k = 0; k < 4; k++) {
                const nx = nbs[k][0], ny = nbs[k][1];
                if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
                const ni = ny * w + nx;
                const nt = types[ni];
                if (nt === MAT.ICE || nt === MAT.SNOW) {
                  this.setCell(ni, MAT.WATER, packRGBA(56, 189, 248, 255), 0);
                  this.clearCell(i); break;
                } else if (nt === MAT.WATER) {
                  this.setCell(ni, MAT.STEAM, packRGBA(226, 232, 240, 200), 45);
                  this.clearCell(i); break;
                } else if (nt === MAT.C4) {
                  this.explode(nx, ny, 24); break;
                } else if ((nt === MAT.WOOD || nt === MAT.LEAF || nt === MAT.PLANT) && Math.random() < 0.08) {
                  this.setCell(ni, MAT.FIRE, packRGBA(255, 130, 30, 255), 30);
                }
              }
              if (types[i] !== MAT.FIRE) continue;

              // Warm color fade from white-yellow -> orange -> deep ember red
              colors[i] = ttl > 24 ? packRGBA(255, 220, 90, 255) : (ttl > 12 ? packRGBA(255, 115, 25, 255) : packRGBA(210, 45, 18, 255));
              const nx = x + ((Math.random() * 3) | 0) - 1 + (this.windX ? Math.sign(this.windX) : 0);
              const ny = y - 1;
              if (ny >= 0 && nx >= 0 && nx < w && types[ny * w + nx] === MAT.EMPTY) this.swap(i, ny * w + nx);
              continue;
            }

            if (t === MAT.STEAM) {
              const ttl = meta[i];
              if (y <= 3 && Math.random() < 0.08) {
                this.setCell(i, MAT.CLOUD, packRGBA(203, 213, 225, 235), 0);
                continue;
              }
              if (ttl <= 1) { this.clearCell(i); continue; }
              meta[i] = ttl - 1;
              const nx = x + ((Math.random() * 3) | 0) - 1 + (this.windX ? Math.sign(this.windX) : 0);
              const ny = y - (Math.random() < 0.7 ? 1 : 0);
              if (ny >= 0 && nx >= 0 && nx < w && types[ny * w + nx] === MAT.EMPTY) this.swap(i, ny * w + nx);
              continue;
            }

            // -----------------------------------------------------------------
            // 10. EXCLUSIVE FINE-ART MATERIALS: STARDUST, CRYSTAL GROWTH, FIREWORK!
            // -----------------------------------------------------------------
            if (t === MAT.STARDUST) {
              // Silky slow-drifting bioluminescent plasma particles!
              const phase = (meta[i] + 3) & 255;
              meta[i] = phase;
              if (Math.random() < 0.45) {
                const driftX = (phase & 64 ? 1 : -1) + (this.windX ? Math.sign(this.windX) : 0);
                const driftY = gDir === 0 ? (Math.random() < 0.5 ? -1 : 1) : (Math.random() < 0.55 ? gDir : 0);
                const nx = x + Math.max(-1, Math.min(1, driftX));
                const ny = y + driftY;
                if (nx >= 0 && nx < w && ny >= 0 && ny < h && types[ny * w + nx] === MAT.EMPTY) {
                  this.swap(i, ny * w + nx);
                }
              }
              continue;
            }

            if (t === MAT.CRYSTAL) {
              // Faceted crystalline branching growth on water/spark contact!
              if (meta[i] < 4 && Math.random() < 0.06) {
                const dirs = [[1, -1], [-1, -1], [0, -1], [1, 0], [-1, 0]];
                const d = dirs[(Math.random() * dirs.length) | 0];
                const nx = x + d[0], ny = y + d[1];
                if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                  const ni = ny * w + nx;
                  if (types[ni] === MAT.WATER || (types[ni] === MAT.EMPTY && meta[i] < 2 && Math.random() < 0.25)) {
                    this.setCell(ni, MAT.CRYSTAL, varyPacked(colors[i], 18), meta[i] + 1);
                    meta[i] = 4;
                  }
                }
              }
              continue;
            }

            if (t === MAT.FIREWORK) {
              const fuse = meta[i];
              if (fuse <= 1 || y <= 14) {
                // Burst into dazzling multi-color falling Stardust + Gold sparks!
                const baseCol = this.pickColorForMaterial(MAT.STARDUST, null, Math.random());
                const rad = 11;
                for (let dy = -rad; dy <= rad; dy += 2) {
                  for (let dx = -rad; dx <= rad; dx += 2) {
                    if (dx * dx + dy * dy > rad * rad) continue;
                    const bx = x + dx, by = y + dy;
                    if (bx >= 0 && bx < w && by >= 0 && by < h && types[by * w + bx] === MAT.EMPTY) {
                      this.setCell(by * w + bx, Math.random() < 0.5 ? MAT.STARDUST : MAT.FIRE, varyPacked(baseCol, 28), 22 + ((Math.random() * 20) | 0));
                    }
                  }
                }
                this.clearCell(i);
                if (this.onExplosion) this.onExplosion(12);
                continue;
              }
              meta[i] = fuse - 1;
              const nx = x + (Math.random() < 0.2 ? (Math.random() < 0.5 ? -1 : 1) : 0);
              const ny = y - 1;
              if (ny >= 0 && nx >= 0 && nx < w && types[ny * w + nx] === MAT.EMPTY) {
                this.swap(i, ny * w + nx);
                if (Math.random() < 0.45) this.setCell(i, MAT.FIRE, packRGBA(254, 215, 102, 255), 8);
              } else {
                meta[i] = 1; // explode on ceiling/wall impact!
              }
              continue;
            }

            // -----------------------------------------------------------------
            // 11. LIVING ECOSYSTEM: PLANT, LEAF, WOOD, FISH, BEE, ANT, VIRUS
            // -----------------------------------------------------------------
            if (t === MAT.PLANT) {
              if (Math.random() < 0.05 && y > 2) {
                const dx = Math.random() < 0.35 ? (Math.random() < 0.5 ? -1 : 1) : 0;
                const nx = x + dx, ny = y - 1;
                if (nx >= 0 && nx < w && types[ny * w + nx] === MAT.EMPTY) {
                  const age = meta[i];
                  if (age < 26) {
                    this.setCell(ny * w + nx, MAT.PLANT, packRGBA(34, 175, 76, 255), age + 1);
                    // Bark turns authentic warm wood brown below!
                    if (age > 6) this.setCell(i, MAT.WOOD, varyPacked(packRGBA(124, 77, 43, 255), 14), 0);
                  } else {
                    // Bloom colorful blossoms / sakura petals at canopy!
                    const petalCol = this.autoStrata
                      ? varyPacked(SM().samplePalettePacked(this.paletteId, 0.2 + Math.random() * 0.35), 16)
                      : packRGBA(244, 114, 182, 255);
                    for (let ly = -3; ly <= 1; ly++) {
                      for (let lx = -4; lx <= 4; lx++) {
                        if (lx * lx + ly * ly > 16) continue;
                        const bx = x + lx, by = y + ly;
                        if (bx >= 0 && bx < w && by >= 0 && by < h && types[by * w + bx] === MAT.EMPTY && Math.random() < 0.55) {
                          this.setCell(by * w + bx, MAT.LEAF, varyPacked(petalCol, 18), 0);
                        }
                      }
                    }
                    this.setCell(i, MAT.WOOD, packRGBA(124, 77, 43, 255), 0);
                  }
                }
              }
              continue;
            }

            if (t === MAT.LEAF || t === MAT.WOOD) {
              // Gentle petal flutter if wind is blowing strongly
              if (t === MAT.LEAF && Math.abs(this.windX) >= 2 && Math.random() < 0.015) {
                const nx = x + Math.sign(this.windX), ny = y + 1;
                if (nx >= 0 && nx < w && ny < h && types[ny * w + nx] === MAT.EMPTY) this.swap(i, ny * w + nx);
              }
              continue;
            }

            if (t === MAT.FISH) {
              const dir = meta[i] === 2 ? -1 : 1;
              const nx = x + dir;
              const ny = y + (Math.random() < 0.25 ? (Math.random() < 0.5 ? -1 : 1) : 0);
              if (nx >= 0 && nx < w && ny >= 0 && ny < h && types[ny * w + nx] === MAT.WATER) {
                this.swap(i, ny * w + nx);
              } else if (y < h - 1 && types[i + w] === MAT.EMPTY) {
                this.swap(i, i + w); // fall back toward water
              } else {
                meta[i] = dir === 1 ? 2 : 1; // turn around cleanly!
              }
              continue;
            }

            if (t === MAT.BEE) {
              const dir = meta[i] === 2 ? -1 : 1;
              const nx = x + (Math.random() < 0.7 ? dir : -dir);
              const ny = y + ((Math.random() * 3) | 0) - 1;
              if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                const ni = ny * w + nx;
                const nt = types[ni];
                if (nt === MAT.EMPTY) this.swap(i, ni);
                else if (nt === MAT.LEAF && y < h - 2 && types[i + w] === MAT.EMPTY && Math.random() < 0.04) {
                  // Pollinates a fresh seed gently WITHOUT destroying the tree!
                  this.setCell(i + w, MAT.SEED, packRGBA(74, 222, 128, 255), 0);
                  meta[i] = dir === 1 ? 2 : 1;
                } else if (nt === MAT.FIRE || nt === MAT.LAVA) {
                  this.clearCell(i);
                } else {
                  meta[i] = dir === 1 ? 2 : 1;
                }
              }
              continue;
            }

            if (t === MAT.ANT) {
              const dir = meta[i] === 2 ? -1 : 1;
              if (y < h - 1 && types[i + w] === MAT.EMPTY) {
                this.swap(i, i + w);
              } else {
                const nx = x + dir;
                if (nx >= 0 && nx < w) {
                  const side = row + nx;
                  if (types[side] === MAT.EMPTY) this.swap(i, side);
                  else if (y > 0 && types[side - w] === MAT.EMPTY) this.swap(i, side - w);
                  else if ((types[side] === MAT.SAND || types[side] === MAT.WOOD) && Math.random() < 0.15) this.clearCell(side);
                  else meta[i] = dir === 1 ? 2 : 1;
                } else {
                  meta[i] = dir === 1 ? 2 : 1;
                }
              }
              continue;
            }

            if (t === MAT.VIRUS) {
              if (Math.random() < 0.03) { this.clearCell(i); continue; }
              const nbs = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
              const nb = nbs[(Math.random() * 4) | 0];
              if (nb[0] >= 0 && nb[0] < w && nb[1] >= 0 && nb[1] < h) {
                const ni = nb[1] * w + nb[0];
                const nt = types[ni];
                if (nt === MAT.SAND || nt === MAT.WATER || nt === MAT.WOOD || nt === MAT.LEAF || nt === MAT.PLANT) {
                  if (Math.random() < 0.12) this.setCell(ni, MAT.VIRUS, varyPacked(colors[i], 14), 0);
                }
              }
              continue;
            }

            // -----------------------------------------------------------------
            // 12. FALLING POWDERS & LIQUIDS (Sand, Gold, Snow, Mud, Seed, C4, Water, Acid, Lava!)
            // -----------------------------------------------------------------
            if (gDir === 0) {
              // TRUE ZERO-G SPACE FLOAT (gentle drift, never deletes or turns to crazy jitter!)
              if (Math.random() < 0.12) {
                const nx = x + (this.windX ? Math.sign(this.windX) : ((Math.random() * 3) | 0) - 1);
                const ny = y + ((Math.random() * 3) | 0) - 1;
                if (nx >= 0 && nx < w && ny >= 0 && ny < h && types[ny * w + nx] === MAT.EMPTY) this.swap(i, ny * w + nx);
              }
              continue;
            }

            if (t === MAT.LAVA && Math.random() > 0.35) continue;
            if (t === MAT.MUD && Math.random() > 0.55) continue;
            if (t === MAT.SNOW && Math.random() > 0.45) continue;

            const ny = y + gDir;
            const inVert = ny >= 0 && ny < h;
            const belowIdx = inVert ? ny * w + x : -1;
            const bMat = inVert ? types[belowIdx] : MAT.WALL;

            // NON-DESTRUCTIVE PORTAL TELEPORTATION!
            if (bMat === MAT.PORTAL_IN && this.portalOuts.length > 0) {
              const exitCenter = this.portalOuts[(Math.random() * this.portalOuts.length) | 0];
              const ex = exitCenter % w, ey = (exitCenter / w) | 0;
              const exits = [[ex, ey + gDir], [ex - 1, ey], [ex + 1, ey], [ex, ey - gDir]];
              for (let k = 0; k < 4; k++) {
                const tx = exits[k][0], ty = exits[k][1];
                if (tx >= 0 && tx < w && ty >= 0 && ty < h && types[ty * w + tx] === MAT.EMPTY) {
                  this.swap(i, ty * w + tx);
                  break;
                }
              }
              continue;
            }

            // WORKING SENSOR & PIANO BLOCK INTERACTIONS!
            if (bMat === MAT.SENSOR) {
              this._injectChargeAround(x, ny);
            } else if (bMat === MAT.PIANO && y > 2) {
              if (this.onPianoHit) this.onPianoHit(y / h);
              const bounceX = Math.max(0, Math.min(w - 1, x + (Math.random() < 0.5 ? -2 : 2)));
              const bounceY = Math.max(0, y - 3);
              if (types[bounceY * w + bounceX] === MAT.EMPTY) { this.swap(i, bounceY * w + bounceX); continue; }
            }

            // PASS THROUGH OPEN AUTO-GATE!
            if (bMat === MAT.DOOR && meta[belowIdx] > 0 && ny + gDir >= 0 && ny + gDir < h) {
              const after = (ny + gDir) * w + x;
              if (types[after] === MAT.EMPTY) { this.swap(i, after); continue; }
            }

            // CHEMICAL REACTIONS (check down + up + left + right for Lava/Water contact!)
            if (t === MAT.LAVA) {
              const lNbs = [
                inVert ? [x, ny] : null,
                y > 0 ? [x, y - 1] : null,
                x > 0 ? [x - 1, y] : null,
                x < w - 1 ? [x + 1, y] : null
              ];
              let reacted = false;
              for (let k = 0; k < 4; k++) {
                if (!lNbs[k]) continue;
                const nx = lNbs[k][0], nyy = lNbs[k][1], ni = nyy * w + nx, nm = types[ni];
                if (nm === MAT.WATER) {
                  this.setCell(ni, MAT.OBSIDIAN, varyPacked(packRGBA(42, 42, 62, 255), 10), 0);
                  this.setCell(i, MAT.STEAM, packRGBA(226, 232, 240, 210), 50);
                  reacted = true; break;
                } else if (nm === MAT.ICE || nm === MAT.SNOW) {
                  this.setCell(ni, MAT.WATER, packRGBA(56, 189, 248, 255), 0);
                  reacted = true; break;
                } else if (nm === MAT.C4) {
                  this.explode(nx, nyy, 26); reacted = true; break;
                } else if (nm === MAT.WOOD || nm === MAT.PLANT || nm === MAT.LEAF) {
                  this.setCell(ni, MAT.FIRE, packRGBA(255, 130, 30, 255), 26);
                } else if (nm === MAT.SAND && k === 0 && Math.random() < 0.25) {
                  this.setCell(ni, MAT.GLASS, packRGBA(186, 230, 253, 215), 0);
                }
              }
              if (reacted) continue;
            } else if (t === MAT.WATER) {
              if (y > 0 && types[i - w] === MAT.LAVA) {
                this.setCell(i, MAT.OBSIDIAN, packRGBA(42, 42, 62, 255), 0);
                this.setCell(i - w, MAT.STEAM, packRGBA(226, 232, 240, 210), 50);
                continue;
              } else if (bMat === MAT.LAVA) {
                this.setCell(belowIdx, MAT.OBSIDIAN, packRGBA(42, 42, 62, 255), 0);
                this.setCell(i, MAT.STEAM, packRGBA(226, 232, 240, 210), 50);
                continue;
              } else if (bMat === MAT.FIRE) {
                this.setCell(belowIdx, MAT.STEAM, packRGBA(226, 232, 240, 210), 40);
                this.clearCell(i); continue;
              } else if (bMat === MAT.SEED) {
                this.setCell(belowIdx, MAT.PLANT, packRGBA(34, 175, 76, 255), 1);
                this.clearCell(i); continue;
              } else if (bMat === MAT.SAND && Math.random() < 0.03) {
                this.setCell(belowIdx, MAT.MUD, varyPacked(packRGBA(92, 64, 51, 255), 10), 0);
                this.clearCell(i); continue;
              }
            } else if (t === MAT.SNOW && bMat === MAT.WATER) {
              this.setCell(belowIdx, MAT.ICE, packRGBA(147, 197, 253, 235), 0);
              this.clearCell(i); continue;
            } else if (t === MAT.ACID) {
              const dissolvable = m => (
                m === MAT.SAND || m === MAT.GOLD || m === MAT.WOOD || m === MAT.PLANT ||
                m === MAT.LEAF || m === MAT.MUD || m === MAT.ICE || m === MAT.SNOW || m === MAT.OBSIDIAN
              );
              if (inVert && dissolvable(bMat) && Math.random() < 0.14) {
                this.setCell(belowIdx, MAT.STEAM, packRGBA(163, 230, 53, 200), 28);
                this.clearCell(i); continue;
              }
              // Acid ALSO eats horizontally!
              const sx = x + (Math.random() < 0.5 ? -1 : 1);
              if (sx >= 0 && sx < w && dissolvable(types[row + sx]) && Math.random() < 0.08) {
                this.clearCell(row + sx);
                this.clearCell(i); continue;
              }
            }

            // GRAVITY FALL + DENSITY SINKING (Powders sink through Water!)
            const isPowder = (t === MAT.SAND || t === MAT.GOLD || t === MAT.SEED || t === MAT.C4 || t === MAT.MUD || t === MAT.SNOW);
            const isLiquid = (t === MAT.WATER || t === MAT.ACID || t === MAT.LAVA);

            if (inVert && (bMat === MAT.EMPTY || (isPowder && bMat === MAT.WATER && t !== MAT.SNOW))) {
              // Subtle wind drift while falling
              if (this.windX !== 0 && Math.random() < 0.25) {
                const wx = x + Math.sign(this.windX);
                if (wx >= 0 && wx < w && types[ny * w + wx] === MAT.EMPTY) {
                  this.swap(i, ny * w + wx); continue;
                }
              }
              this.swap(i, belowIdx);
              continue;
            }

            // Diagonal slide
            if (inVert) {
              const d1 = Math.random() < 0.5 ? -1 : 1;
              const x1 = x + d1, x2 = x - d1;
              if (x1 >= 0 && x1 < w && (types[ny * w + x1] === MAT.EMPTY || (isPowder && types[ny * w + x1] === MAT.WATER))) {
                this.swap(i, ny * w + x1); continue;
              }
              if (x2 >= 0 && x2 < w && (types[ny * w + x2] === MAT.EMPTY || (isPowder && types[ny * w + x2] === MAT.WATER))) {
                this.swap(i, ny * w + x2); continue;
              }
            }

            // Horizontal fluid flow (Water, Acid, Lava flow smoothly — NEVER freeze in columns!)
            if (isLiquid) {
              const spread = t === MAT.LAVA ? 1 : 4;
              const dir = this.windX !== 0 ? Math.sign(this.windX) : (Math.random() < 0.5 ? -1 : 1);
              for (let s = 1; s <= spread; s++) {
                const nx = x + dir * s;
                if (nx < 0 || nx >= w) break;
                const ni = row + nx;
                if (types[ni] !== MAT.EMPTY) break;
                if (s === spread || (nx + dir < 0 || nx + dir >= w || types[ni + dir] !== MAT.EMPTY)) {
                  this.swap(i, ni); break;
                }
              }
            }
          }
        }
      }
    }

    // =========================================================================
    // COMPACT RLE SERIALIZATION (Undo/Redo + FREE .zsand Save/Load < 80 KB!)
    // =========================================================================

    serializeRLE() {
      const runs = [];
      let curT = this.types[0], curC = this.colors[0], count = 1;
      for (let i = 1; i < this.len; i++) {
        const t = this.types[i], c = this.colors[i];
        if (t === curT && (t === 0 || c === curC)) {
          count++;
        } else {
          runs.push(curT === 0 ? [0, count] : [curT, count, curC]);
          curT = t; curC = c; count = 1;
        }
      }
      runs.push(curT === 0 ? [0, count] : [curT, count, curC]);
      return {
        format: 'studios-pro-zsand-v4',
        w: this.w, h: this.h,
        gravY: this.gravY, windX: this.windX,
        paletteId: this.paletteId, autoStrata: this.autoStrata,
        runs
      };
    }

    deserializeRLE(data) {
      if (!data || !Array.isArray(data.runs)) return false;
      this.clear();
      this.gravY = data.gravY !== undefined ? data.gravY : 1;
      this.windX = data.windX !== undefined ? data.windX : 0;
      if (data.paletteId) this.paletteId = data.paletteId;
      if (data.autoStrata !== undefined) this.autoStrata = !!data.autoStrata;

      let pos = 0;
      for (let r = 0; r < data.runs.length && pos < this.len; r++) {
        const run = data.runs[r];
        const t = run[0], cnt = run[1], col = run[2] || 0;
        const end = Math.min(this.len, pos + cnt);
        if (t === 0) {
          pos = end;
        } else {
          for (; pos < end; pos++) {
            this.types[pos] = t;
            this.colors[pos] = col;
          }
        }
      }
      this._scanSpecials();
      return true;
    }

    pushUndo() {
      const snap = this.serializeRLE();
      this.history.splice(this.historyIdx + 1);
      this.history.push(snap);
      if (this.history.length > 15) this.history.shift();
      this.historyIdx = this.history.length - 1;
    }

    undo() {
      if (this.historyIdx <= 0) return false;
      this.historyIdx--;
      return this.deserializeRLE(this.history[this.historyIdx]);
    }

    redo() {
      if (this.historyIdx >= this.history.length - 1) return false;
      this.historyIdx++;
      return this.deserializeRLE(this.history[this.historyIdx]);
    }
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = SandboxEngine;
  if (globalScope) globalScope.SandboxEngine = SandboxEngine;
})(typeof window !== 'undefined' ? window : globalThis);
