/**
 * PolyMorph 3D Studio - 2D to 3D Generative Engines & Parametric CAD
 */
class ModelGenerators {
  /**
   * High-Precision Computer Vision Depth Processor (CLAHE + Multi-Scale Micro-Sculpting + BG Removal)
   * Converts any 2D photo into a deeply sculpted, high-dynamic-range heightmap
   * @param {HTMLImageElement|HTMLCanvasElement} img 
   * @param {Object} options 
   * @returns {{heights: Float32Array, colors: Float32Array, bgMask: Uint8Array, width: number, height: number, aspect: number, depthCanvas: HTMLCanvasElement}}
   */
  static processImageDepth(img, options = {}) {
    const {
      resolution = 220,
      invert = false,
      detailBoost = 0.55,
      contrastLimit = 2.8,
      smoothing = 1,
      removeBgStrength = 0,
      // Enhanced studio controls
      contrast = 0,
      brightness = 0,
      gamma = 1.0,
      depthCurve = 'linear',
      filterType = 'bilateral',
      frameShape = 'rect',
      edgeFalloff = 'none'
    } = options;

    const aspect = (img.naturalWidth || img.width) / (img.naturalHeight || img.height) || 1;
    const w = Math.max(32, Math.round(resolution * (aspect >= 1 ? 1 : aspect)));
    const h = Math.max(32, Math.round(resolution / (aspect >= 1 ? aspect : 1)));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // 1. Sample Background Color from Corners & Border Perimeter
    let bgR = 0, bgG = 0, bgB = 0, bgCount = 0;
    const samplePx = (x, y) => {
      const idx = (y * w + x) * 4;
      bgR += data[idx];
      bgG += data[idx + 1];
      bgB += data[idx + 2];
      bgCount++;
    };

    samplePx(0, 0);
    samplePx(w - 1, 0);
    samplePx(0, h - 1);
    samplePx(w - 1, h - 1);

    for (let x = 0; x < w; x += Math.max(1, Math.floor(w / 10))) {
      samplePx(x, 0);
      samplePx(x, h - 1);
    }
    for (let y = 0; y < h; y += Math.max(1, Math.floor(h / 10))) {
      samplePx(0, y);
      samplePx(w - 1, y);
    }

    const avgBgR = (bgR / (bgCount || 1)) / 255.0;
    const avgBgG = (bgG / (bgCount || 1)) / 255.0;
    const avgBgB = (bgB / (bgCount || 1)) / 255.0;
    const avgBgLum = 0.2126 * avgBgR + 0.7152 * avgBgG + 0.0722 * avgBgB;

    // 2. Base Perceptual Luminance + Tone (Contrast, Brightness, Gamma)
    const luma = new Float32Array(w * h);
    const colors = new Float32Array(w * h * 3);
    const bgMask = new Uint8Array(w * h);
    const bgWeight = new Float32Array(w * h);
    const bgThreshold = removeBgStrength / 100.0;

    const contrastFactor = (contrast === 0) ? 1.0 : Math.tan(((contrast + 100) * Math.PI) / 400);
    const brightOffset = (brightness || 0) / 100.0;
    const gammaExp = 1.0 / Math.max(0.2, (gamma || 1.0));

    for (let i = 0; i < w * h; i++) {
      const idx = i * 4;
      const r = data[idx] / 255.0;
      const g = data[idx + 1] / 255.0;
      const b = data[idx + 2] / 255.0;
      const a = data[idx + 3] / 255.0;

      let lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

      // Brightness & Contrast
      lum += brightOffset;
      lum = (lum - 0.5) * contrastFactor + 0.5;
      lum = Math.max(0.0, Math.min(1.0, lum));

      // Gamma curve
      if (gammaExp !== 1.0) {
        lum = Math.pow(lum, gammaExp);
      }
      lum *= a;

      luma[i] = lum;
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;

      if (a < 0.15) {
        bgMask[i] = 0;
        bgWeight[i] = 0.0;
      } else if (removeBgStrength > 0) {
        const colorDist = Math.sqrt((r - avgBgR) ** 2 + (g - avgBgG) ** 2 + (b - avgBgB) ** 2) / 1.732;
        const lumDist = Math.abs(lum - avgBgLum);
        const dist = Math.min(colorDist, lumDist * 1.15);

        if (dist <= bgThreshold) {
          bgMask[i] = 0;
          bgWeight[i] = 0.0;
        } else {
          const feather = Math.min(1.0, (dist - bgThreshold) / 0.06);
          bgWeight[i] = feather;
          bgMask[i] = (feather > 0.15) ? 1 : 0;
        }
      } else {
        bgMask[i] = 1;
        bgWeight[i] = 1.0;
      }
    }

    // 3. CLAHE (Contrast-Limited Adaptive Histogram Equalization) in an 8x8 Grid
    const tilesX = 8;
    const tilesY = 8;
    const tileW = w / tilesX;
    const tileH = h / tilesY;
    const cdfs = [];

    for (let ty = 0; ty < tilesY; ty++) {
      for (let tx = 0; tx < tilesX; tx++) {
        const hist = new Int32Array(256);
        const xStart = Math.floor(tx * tileW);
        const xEnd = Math.min(w, Math.floor((tx + 1) * tileW));
        const yStart = Math.floor(ty * tileH);
        const yEnd = Math.min(h, Math.floor((ty + 1) * tileH));
        const tilePixelCount = (xEnd - xStart) * (yEnd - yStart) || 1;

        for (let y = yStart; y < yEnd; y++) {
          for (let x = xStart; x < xEnd; x++) {
            const val = Math.min(255, Math.max(0, Math.floor(luma[y * w + x] * 255)));
            hist[val]++;
          }
        }

        const clipVal = Math.max(1, Math.floor((contrastLimit * tilePixelCount) / 256));
        let excess = 0;
        for (let b = 0; b < 256; b++) {
          if (hist[b] > clipVal) {
            excess += hist[b] - clipVal;
            hist[b] = clipVal;
          }
        }

        const bonus = Math.floor(excess / 256);
        for (let b = 0; b < 256; b++) hist[b] += bonus;

        const cdf = new Float32Array(256);
        let sum = 0;
        for (let b = 0; b < 256; b++) {
          sum += hist[b];
          cdf[b] = sum / tilePixelCount;
        }
        cdfs.push(cdf);
      }
    }

    // Bilinear Interpolation of Tile CDFs
    const claheLuma = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      const ty = (y / h) * tilesY - 0.5;
      const ty0 = Math.max(0, Math.min(tilesY - 1, Math.floor(ty)));
      const ty1 = Math.max(0, Math.min(tilesY - 1, ty0 + 1));
      const fy = Math.max(0, Math.min(1, ty - ty0));

      for (let x = 0; x < w; x++) {
        const tx = (x / w) * tilesX - 0.5;
        const tx0 = Math.max(0, Math.min(tilesX - 1, Math.floor(tx)));
        const tx1 = Math.max(0, Math.min(tilesX - 1, tx0 + 1));
        const fx = Math.max(0, Math.min(1, tx - tx0));

        const bin = Math.min(255, Math.max(0, Math.floor(luma[y * w + x] * 255)));

        const c00 = cdfs[ty0 * tilesX + tx0][bin];
        const c10 = cdfs[ty0 * tilesX + tx1][bin];
        const c01 = cdfs[ty1 * tilesX + tx0][bin];
        const c11 = cdfs[ty1 * tilesX + tx1][bin];

        const top = (1 - fx) * c00 + fx * c10;
        const bot = (1 - fx) * c01 + fx * c11;
        claheLuma[y * w + x] = (1 - fy) * top + fy * bot;
      }
    }

    // 4. Noise Filtering (Bilateral Edge-Preserving, Gaussian, or Raw)
    const filtered = new Float32Array(claheLuma);
    if (filterType === 'bilateral' && smoothing > 0) {
      // 5x5 Bilateral Filter: preserves high-contrast contour edges while smoothing flat noise
      const sigmaS2 = 3.0 * 3.0 * 2;
      const sigmaR2 = 0.12 * 0.12 * 2;
      for (let p = 0; p < smoothing; p++) {
        const src = (p === 0) ? claheLuma : new Float32Array(filtered);
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const centerVal = src[y * w + x];
            let wSum = 0;
            let valSum = 0;

            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const nVal = src[(y + dy) * w + (x + dx)];
                const spatialDist2 = dx * dx + dy * dy;
                const rangeDist2 = (centerVal - nVal) * (centerVal - nVal);
                const weight = Math.exp(-spatialDist2 / sigmaS2 - rangeDist2 / sigmaR2);
                wSum += weight;
                valSum += nVal * weight;
              }
            }
            filtered[y * w + x] = valSum / (wSum || 1.0);
          }
        }
      }
    } else if (filterType === 'gaussian' && smoothing > 0) {
      // Classical Gaussian blur
      for (let p = 0; p < smoothing; p++) {
        const src = (p === 0) ? claheLuma : new Float32Array(filtered);
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const sum =
              src[(y - 1) * w + (x - 1)] * 0.0625 + src[(y - 1) * w + x] * 0.125 + src[(y - 1) * w + (x + 1)] * 0.0625 +
              src[y * w + (x - 1)] * 0.125 + src[y * w + x] * 0.25 + src[y * w + (x + 1)] * 0.125 +
              src[(y + 1) * w + (x - 1)] * 0.0625 + src[(y + 1) * w + x] * 0.125 + src[(y + 1) * w + (x + 1)] * 0.0625;
            filtered[y * w + x] = sum;
          }
        }
      }
    }

    // 5. Multi-Scale Detail Boost (Unsharp Masking) + Depth Response Curves
    const heights = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const highFreq = claheLuma[i] - filtered[i];
      let sculpted = filtered[i] + highFreq * (1.0 + detailBoost * 1.8);
      sculpted = Math.max(0.0, Math.min(1.0, sculpted));

      // Depth Curve Sculpting
      let val = sculpted;
      if (depthCurve === 'sigmoid') {
        // High-contrast bas-relief S-curve
        val = 1.0 / (1.0 + Math.exp(-9.0 * (sculpted - 0.46)));
      } else if (depthCurve === 'dome') {
        // Convex spherical dome volume: ideal for coins, medals, and portraits
        val = Math.sqrt(Math.max(0.0, 1.0 - Math.pow(1.0 - sculpted, 2.0)));
      } else if (depthCurve === 'ridge') {
        // Ridge and crest accentuation: sharp heraldic and architectural lines
        val = Math.pow(sculpted, 0.68) * (1.0 + 0.25 * Math.sin(sculpted * Math.PI));
      } else if (depthCurve === 'logarithmic') {
        // Shadow lift curve
        val = Math.log(1.0 + 9.0 * sculpted) / Math.log(10.0);
      }

      val = Math.max(0.0, Math.min(1.0, val));
      if (invert) val = 1.0 - val;
      heights[i] = val * bgWeight[i];
    }

    // 6. Frame Shape & Edge Boundary Falloff
    for (let y = 0; y < h; y++) {
      const ny = (y / (h - 1)) * 2 - 1;
      for (let x = 0; x < w; x++) {
        const nx = (x / (w - 1)) * 2 - 1;
        const i = y * w + x;

        if (frameShape === 'medallion') {
          const r = Math.sqrt(nx * nx + ny * ny);
          if (r > 1.0) {
            heights[i] = 0.0;
            bgMask[i] = 0;
            bgWeight[i] = 0.0;
          } else if (r >= 0.90 && r <= 0.98) {
            // Raised numismatic coin protective rim!
            heights[i] = Math.max(heights[i], 0.5);
          }
        } else if (frameShape === 'oval') {
          const r = Math.sqrt(nx * nx + (ny * 1.18) ** 2);
          if (r > 1.0) {
            heights[i] = 0.0;
            bgMask[i] = 0;
            bgWeight[i] = 0.0;
          }
        }

        // Edge falloff / taper
        if (frameShape === 'tapered' || edgeFalloff === 'cosine' || edgeFalloff === 'chamfer') {
          const borderDist = Math.min(x, w - 1 - x, y, h - 1 - y) / Math.max(1, Math.min(w, h) * 0.08);
          if (borderDist < 1.0) {
            let taper = borderDist;
            if (edgeFalloff === 'cosine' || frameShape === 'tapered') {
              taper = 0.5 - 0.5 * Math.cos(Math.PI * borderDist);
            }
            heights[i] *= taper;
          }
        }
      }
    }

    // 7. Render 2D Depth Preview Canvas
    const depthCanvas = document.createElement('canvas');
    depthCanvas.width = w;
    depthCanvas.height = h;
    const depthCtx = depthCanvas.getContext('2d');
    const depthImgData = depthCtx.createImageData(w, h);

    for (let i = 0; i < w * h; i++) {
      const val = Math.round(heights[i] * 255);
      const idx = i * 4;
      depthImgData.data[idx] = val;
      depthImgData.data[idx + 1] = val;
      depthImgData.data[idx + 2] = val;
      depthImgData.data[idx + 3] = (bgWeight[i] > 0.05) ? 255 : 0;
    }
    depthCtx.putImageData(depthImgData, 0, 0);

    return { heights, colors, bgMask, width: w, height: h, aspect, depthCanvas };
  }

  /**
   * Generates a 3D Heightmap / Bas-Relief mesh with high-contrast sculpting, framing, and PBR materials
   * @param {HTMLImageElement} img 
   * @param {Object} options 
   * @returns {THREE.Mesh|THREE.Group}
   */
  static generateHeightmap(img, options = {}) {
    const {
      reliefDepth = 14,
      baseThickness = 3,
      resolution = 200,
      smoothing = 1,
      invert = false,
      removeBgStrength = 0,
      // Enhanced studio options
      contrast = 0,
      brightness = 0,
      gamma = 1.0,
      depthCurve = 'linear',
      filterType = 'bilateral',
      detailBoost = 0.55,
      frameShape = 'rect',
      materialPreset = 'photo',
      textureMode = 'photo',
      cavityAO = 0.5,
      edgeFalloff = 'none',
      noBasePlate = false
    } = options;

    const { heights, colors, bgMask, width: w, height: h, aspect, depthCanvas } = ModelGenerators.processImageDepth(img, {
      resolution,
      invert,
      smoothing,
      removeBgStrength,
      contrast,
      brightness,
      gamma,
      depthCurve,
      filterType,
      detailBoost,
      frameShape,
      edgeFalloff
    });

    const physWidth = 60 * aspect;
    const physHeight = 60;
    const dx = physWidth / (w - 1);
    const dy = physHeight / (h - 1);

    const positions = [];
    const uvs = [];
    const vertColors = [];
    const indices = [];

    // Precalculate Cavity / Crevice Ambient Occlusion (Laplacian curvature)
    const cavity = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const cVal = heights[i];
        const up = (y > 0) ? heights[(y - 1) * w + x] : cVal;
        const down = (y < h - 1) ? heights[(y + 1) * w + x] : cVal;
        const left = (x > 0) ? heights[y * w + (x - 1)] : cVal;
        const right = (x < w - 1) ? heights[y * w + (x + 1)] : cVal;

        const lap = (4 * cVal - (up + down + left + right));
        const aoFactor = Math.max(0.18, Math.min(1.25, 1.0 + lap * (cavityAO * 4.0)));
        cavity[i] = aoFactor;
      }
    }

    // Palette generator for sculpted materials
    const getSculptedColor = (preset, cav) => {
      let r, g, b;
      switch (preset) {
        case 'marble':
          r = 0.94 * cav;
          g = 0.93 * cav;
          b = 0.91 * cav;
          break;
        case 'bronze':
          if (cav < 0.78) {
            r = 0.22 * cav + 0.06;
            g = 0.26 * cav + 0.12;
            b = 0.21 * cav + 0.08;
          } else {
            r = 0.68 * cav;
            g = 0.46 * cav;
            b = 0.25 * cav;
          }
          break;
        case 'gold':
          r = 0.98 * cav;
          g = 0.80 * cav;
          b = 0.24 * cav;
          break;
        case 'porcelain':
          r = 0.98 * cav;
          g = 0.96 * cav;
          b = 0.92 * cav;
          break;
        case 'obsidian':
          r = 0.12 * cav;
          g = 0.13 * cav;
          b = 0.16 * cav;
          break;
        case 'terracotta':
          r = 0.78 * cav;
          g = 0.44 * cav;
          b = 0.29 * cav;
          break;
        case 'jade':
          r = 0.16 * cav;
          g = 0.74 * cav;
          b = 0.46 * cav;
          break;
        default:
          r = cav;
          g = cav;
          b = cav;
      }
      return [Math.min(1.0, Math.max(0, r)), Math.min(1.0, Math.max(0, g)), Math.min(1.0, Math.max(0, b))];
    };

    // 1. Top Sculpted Relief Surface
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const px = x * dx - physWidth / 2;
        const py = baseThickness + heights[i] * reliefDepth;
        const pz = y * dy - physHeight / 2;

        positions.push(px, py, pz);
        uvs.push(x / (w - 1), 1 - y / (h - 1));

        const cav = cavity[i];
        if (textureMode === 'sculpted') {
          const [sr, sg, sb] = getSculptedColor(materialPreset, cav);
          vertColors.push(sr, sg, sb);
        } else {
          // Photo mode: project original photo colors modulated by cavity AO
          vertColors.push(
            Math.min(1.0, colors[i * 3] * cav),
            Math.min(1.0, colors[i * 3 + 1] * cav),
            Math.min(1.0, colors[i * 3 + 2] * cav)
          );
        }
      }
    }

    for (let y = 0; y < h - 1; y++) {
      for (let x = 0; x < w - 1; x++) {
        const a = y * w + x;
        const b = y * w + (x + 1);
        const c = (y + 1) * w + x;
        const d = (y + 1) * w + (x + 1);

        if (noBasePlate && removeBgStrength > 0) {
          if (!bgMask[a] && !bgMask[b] && !bgMask[c] && !bgMask[d]) continue;
        }
        if (frameShape === 'medallion') {
          const rA = Math.hypot((x / (w - 1)) * 2 - 1, (y / (h - 1)) * 2 - 1);
          const rB = Math.hypot(((x + 1) / (w - 1)) * 2 - 1, (y / (h - 1)) * 2 - 1);
          const rC = Math.hypot((x / (w - 1)) * 2 - 1, ((y + 1) / (h - 1)) * 2 - 1);
          const rD = Math.hypot(((x + 1) / (w - 1)) * 2 - 1, ((y + 1) / (h - 1)) * 2 - 1);
          if (rA > 1.0 && rB > 1.0 && rC > 1.0 && rD > 1.0) continue;
        }

        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    // 2. Solid Watertight Base Plate & Sides
    if (!noBasePlate) {
      const botOffset = positions.length / 3;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          const px = x * dx - physWidth / 2;
          const py = 0;
          const pz = y * dy - physHeight / 2;

          positions.push(px, py, pz);
          uvs.push(x / (w - 1), 1 - y / (h - 1));

          if (textureMode === 'sculpted') {
            const [sr, sg, sb] = getSculptedColor(materialPreset, 0.72);
            vertColors.push(sr * 0.85, sg * 0.85, sb * 0.85);
          } else {
            vertColors.push(colors[i * 3] * 0.75, colors[i * 3 + 1] * 0.75, colors[i * 3 + 2] * 0.75);
          }
        }
      }

      for (let y = 0; y < h - 1; y++) {
        for (let x = 0; x < w - 1; x++) {
          const a = botOffset + y * w + x;
          const b = botOffset + y * w + (x + 1);
          const c = botOffset + (y + 1) * w + x;
          const d = botOffset + (y + 1) * w + (x + 1);

          if (frameShape === 'medallion') {
            const rA = Math.hypot((x / (w - 1)) * 2 - 1, (y / (h - 1)) * 2 - 1);
            const rB = Math.hypot(((x + 1) / (w - 1)) * 2 - 1, (y / (h - 1)) * 2 - 1);
            const rC = Math.hypot((x / (w - 1)) * 2 - 1, ((y + 1) / (h - 1)) * 2 - 1);
            const rD = Math.hypot(((x + 1) / (w - 1)) * 2 - 1, ((y + 1) / (h - 1)) * 2 - 1);
            if (rA > 1.0 && rB > 1.0 && rC > 1.0 && rD > 1.0) continue;
          }

          indices.push(a, b, c);
          indices.push(b, d, c);
        }
      }

      const addSideQuad = (top1, top2, bot1, bot2) => {
        indices.push(top1, bot1, top2);
        indices.push(top2, bot1, bot2);
      };

      for (let x = 0; x < w - 1; x++) {
        addSideQuad(x, x + 1, botOffset + x, botOffset + x + 1);
        const topA = (h - 1) * w + x;
        const topB = (h - 1) * w + (x + 1);
        addSideQuad(topB, topA, botOffset + topB, botOffset + topA);
      }
      for (let y = 0; y < h - 1; y++) {
        const topA = y * w;
        const topB = (y + 1) * w;
        addSideQuad(topB, topA, botOffset + topB, botOffset + topA);
        const topC = y * w + (w - 1);
        const topD = (y + 1) * w + (w - 1);
        addSideQuad(topC, topD, botOffset + topC, botOffset + topD);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertColors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    // Material Configuration
    let material;
    if (textureMode === 'photo') {
      const texture = new THREE.CanvasTexture(img);
      if ('colorSpace' in texture && THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
      else if (THREE.sRGBEncoding) texture.encoding = THREE.sRGBEncoding;

      material = new THREE.MeshStandardMaterial({
        map: texture,
        vertexColors: cavityAO > 0.05,
        roughness: 0.38,
        metalness: 0.05,
        side: THREE.DoubleSide
      });
    } else {
      const baseMatOptions = {
        vertexColors: true,
        side: THREE.DoubleSide
      };
      switch (materialPreset) {
        case 'marble':
          material = new THREE.MeshStandardMaterial({
            ...baseMatOptions,
            roughness: 0.28,
            metalness: 0.02
          });
          break;
        case 'bronze':
          material = new THREE.MeshStandardMaterial({
            ...baseMatOptions,
            roughness: 0.32,
            metalness: 0.82
          });
          break;
        case 'gold':
          material = new THREE.MeshStandardMaterial({
            ...baseMatOptions,
            roughness: 0.22,
            metalness: 0.94
          });
          break;
        case 'porcelain':
          material = new THREE.MeshPhysicalMaterial({
            ...baseMatOptions,
            roughness: 0.18,
            transmission: 0.4,
            thickness: 1.2,
            ior: 1.5
          });
          break;
        case 'obsidian':
          material = new THREE.MeshStandardMaterial({
            ...baseMatOptions,
            roughness: 0.1,
            metalness: 0.25
          });
          break;
        case 'terracotta':
          material = new THREE.MeshStandardMaterial({
            ...baseMatOptions,
            roughness: 0.88,
            metalness: 0.0
          });
          break;
        case 'jade':
          material = new THREE.MeshPhysicalMaterial({
            ...baseMatOptions,
            roughness: 0.22,
            transmission: 0.55,
            thickness: 1.5,
            ior: 1.6
          });
          break;
        default:
          material = new THREE.MeshStandardMaterial({
            ...baseMatOptions,
            roughness: 0.4,
            metalness: 0.1
          });
      }
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "Heightmap_Relief";
    mesh.userData.sourceImage = img;
    mesh.userData.depthCanvas = depthCanvas;

    // Architectural Moulding Frame assembly if selected
    if (frameShape === 'framed' && !noBasePlate) {
      const frameBorderWidth = 3.8;
      const fWidth = physWidth + frameBorderWidth * 2;
      const fHeight = physHeight + frameBorderWidth * 2;
      const fDepth = baseThickness + reliefDepth * 0.92;

      const outerBox = new THREE.BoxGeometry(fWidth, fDepth, fHeight);
      const frameMat = (textureMode === 'sculpted') ? material.clone() : new THREE.MeshStandardMaterial({
        color: (materialPreset === 'gold') ? 0xd4af37 : (materialPreset === 'bronze' ? 0x4a3622 : 0x222222),
        roughness: 0.35,
        metalness: (materialPreset === 'gold' || materialPreset === 'bronze') ? 0.8 : 0.2
      });
      const frameMesh = new THREE.Mesh(outerBox, frameMat);
      frameMesh.position.y = fDepth / 2 - 0.2;
      frameMesh.name = "Architectural_Moulding_Frame";

      const group = new THREE.Group();
      group.add(frameMesh);
      group.add(mesh);
      group.name = "Heightmap_Framed_Plaque";
      group.userData.sourceImage = img;
      group.userData.depthCanvas = depthCanvas;
      return group;
    }

    return mesh;
  }

  /**
   * Generates Clean 2D Multi-Tone Vector Contours (SVG) directly from a source image
   * @param {HTMLImageElement|HTMLCanvasElement} img 
   * @param {Object} options 
   * @returns {string}
   */
  static generateImageSVGContours(img, options = {}) {
    const {
      levels = 4,
      resolution = 240
    } = options;

    const aspect = (img.naturalWidth || img.width) / (img.naturalHeight || img.height) || 1;
    const w = Math.round(resolution * (aspect >= 1 ? 1 : aspect));
    const h = Math.round(resolution / (aspect >= 1 ? aspect : 1));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;

    const luma = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const idx = i * 4;
      luma[i] = (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114) / 255.0;
    }

    const canvasW = 800;
    const canvasH = Math.round(800 / aspect);
    const paths = [];

    // Extract multi-level tonal contour outlines
    for (let lvl = 1; lvl <= levels; lvl++) {
      const threshold = lvl / (levels + 1);
      const color = (lvl % 2 === 0) ? '#00f0ff' : '#38bdf8';
      let pathD = '';

      for (let y = 0; y < h - 1; y += 2) {
        for (let x = 0; x < w - 1; x += 2) {
          const val = luma[y * w + x];
          const valRight = luma[y * w + (x + 1)];
          const valDown = luma[(y + 1) * w + x];

          // Check for edge boundary crossing threshold
          if ((val >= threshold && valRight < threshold) || (val < threshold && valRight >= threshold) ||
              (val >= threshold && valDown < threshold) || (val < threshold && valDown >= threshold)) {
            const sx = ((x / w) * canvasW).toFixed(1);
            const sy = ((y / h) * canvasH).toFixed(1);
            pathD += `M ${sx} ${sy} l 2.5 0 `;
          }
        }
      }

      if (pathD.length > 0) {
        paths.push(`<path d="${pathD}" fill="none" stroke="${color}" stroke-width="1.2" stroke-opacity="${(0.4 + lvl * 0.15).toFixed(2)}" />`);
      }
    }

    return `<?xml version="1.0" standalone="no"?>
<svg width="${canvasW}px" height="${canvasH}px" viewBox="0 0 ${canvasW} ${canvasH}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#0b0f19" rx="8" />
  <g stroke-linecap="round" stroke-linejoin="round">
    ${paths.join('\n    ')}
  </g>
</svg>`;
  }

  /**
   * Generates a 3D Printable Lithophane with light transmission properties
   * @param {HTMLImageElement} img 
   * @param {Object} options 
   * @returns {THREE.Mesh}
   */
  static generateLithophane(img, options = {}) {
    const {
      shape = 'curved', // 'flat', 'curved', 'cylinder'
      minThickness = 0.8,
      maxThickness = 3.2,
      resolution = 160,
      width = 80,
      frameBorder = 2.0,
      lithoPreset = 'white',
      invert = false
    } = options;

    const canvas = document.createElement('canvas');
    const aspect = (img.naturalWidth || img.width) / (img.naturalHeight || img.height) || 1;
    const w = Math.round(resolution);
    const h = Math.max(16, Math.round(resolution / aspect));

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h).data;

    const positions = [];
    const indices = [];
    const uvs = [];

    const height = width / aspect;
    const arcAngle = (shape === 'cylinder') ? Math.PI * 2 : (shape === 'curved' ? (Math.PI * 2 / 3) : 0);
    const radius = width / (arcAngle || 1);

    const borderPixelsX = Math.round((frameBorder / width) * w);
    const borderPixelsY = Math.round((frameBorder / height) * h);

    // Front (Inner/Outer) and Back Grid
    for (let y = 0; y < h; y++) {
      const v = y / (h - 1);
      const py = (1 - v) * height;

      for (let x = 0; x < w; x++) {
        const u = x / (w - 1);
        const idx = (y * w + x) * 4;
        let lum = (imgData[idx] * 0.299 + imgData[idx + 1] * 0.587 + imgData[idx + 2] * 0.114) / 255.0;
        if (invert) lum = 1.0 - lum;

        // In Lithophane: Darker pixel -> Thicker plastic
        let thick = minThickness + (1.0 - lum) * (maxThickness - minThickness);

        // Solid reinforcement border frame
        if (frameBorder > 0 && (x < borderPixelsX || x >= w - borderPixelsX || y < borderPixelsY || y >= h - borderPixelsY)) {
          thick = Math.max(thick, maxThickness + 0.4);
        }

        let fx, fz;
        if (shape === 'flat') {
          fx = (u - 0.5) * width;
          fz = thick;
        } else {
          const angle = (u - 0.5) * arcAngle;
          fx = (radius + thick) * Math.sin(angle);
          fz = (radius + thick) * Math.cos(angle) - radius;
        }

        positions.push(fx, py, fz); // Front
        uvs.push(u, 1 - v);
      }
    }

    const backOffset = positions.length / 3;

    for (let y = 0; y < h; y++) {
      const v = y / (h - 1);
      const py = (1 - v) * height;

      for (let x = 0; x < w; x++) {
        const u = x / (w - 1);
        let bx, bz;
        if (shape === 'flat') {
          bx = (u - 0.5) * width;
          bz = 0;
        } else {
          const angle = (u - 0.5) * arcAngle;
          bx = radius * Math.sin(angle);
          bz = radius * Math.cos(angle) - radius;
        }
        positions.push(bx, py, bz); // Back
        uvs.push(u, 1 - v);
      }
    }

    // Indices for front surface
    for (let y = 0; y < h - 1; y++) {
      for (let x = 0; x < w - 1; x++) {
        const a = y * w + x;
        const b = y * w + (x + 1);
        const c = (y + 1) * w + x;
        const d = (y + 1) * w + (x + 1);
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    // Indices for back surface
    for (let y = 0; y < h - 1; y++) {
      for (let x = 0; x < w - 1; x++) {
        const a = backOffset + y * w + x;
        const b = backOffset + y * w + (x + 1);
        const c = backOffset + (y + 1) * w + x;
        const d = backOffset + (y + 1) * w + (x + 1);
        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }

    // Side border caps
    const addBorder = (f1, f2, b1, b2) => {
      indices.push(f1, b1, f2);
      indices.push(f2, b1, b2);
    };

    for (let x = 0; x < w - 1; x++) {
      addBorder(x + 1, x, backOffset + x + 1, backOffset + x);
      const topA = (h - 1) * w + x;
      const topB = (h - 1) * w + (x + 1);
      addBorder(topA, topB, backOffset + topA, backOffset + topB);
    }

    if (shape !== 'cylinder') {
      for (let y = 0; y < h - 1; y++) {
        const a = y * w;
        const b = (y + 1) * w;
        addBorder(a, b, backOffset + a, backOffset + b);
        const c = y * w + (w - 1);
        const d = (y + 1) * w + (w - 1);
        addBorder(d, c, backOffset + d, backOffset + c);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    // Preset color
    let matColor = 0xffffff;
    let matRough = 0.32;
    let matTrans = 0.65;
    if (lithoPreset === 'warm') {
      matColor = 0xfff3e0;
      matTrans = 0.68;
    } else if (lithoPreset === 'amber') {
      matColor = 0xffd8a8;
      matTrans = 0.6;
    } else if (lithoPreset === 'cool') {
      matColor = 0xe8f4f8;
      matTrans = 0.64;
    }

    const material = new THREE.MeshPhysicalMaterial({
      color: matColor,
      roughness: matRough,
      transmission: matTrans,
      thickness: 1.6,
      ior: 1.48,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "Lithophane_3D";
    mesh.userData.sourceImage = img;
    return mesh;
  }

  /**
   * Extrudes 2D Alpha/Silhouette logo into a sharp 3D model
   * @param {HTMLImageElement} img 
   * @param {Object} options 
   * @returns {THREE.Mesh}
   */
  static generateExtrudedSilhouette(img, options = {}) {
    const {
      depth = 8,
      bevelThickness = 1,
      bevelSize = 0.8,
      threshold = 128,
      invert = false,
      finish = 'cyan'
    } = options;

    const canvas = document.createElement('canvas');
    const w = 160;
    const h = 160;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h).data;

    const shape = new THREE.Shape();
    const points = [];
    const totalRays = 120;

    for (let step = 0; step < totalRays; step++) {
      const rad = (step / totalRays) * Math.PI * 2;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      let found = false;

      for (let r = 74; r > 3; r--) {
        const px = Math.round(80 + r * cos);
        const py = Math.round(80 + r * sin);
        if (px >= 0 && px < w && py >= 0 && py < h) {
          const idx = (py * w + px) * 4;
          const a = imgData[idx + 3];
          const lum = imgData[idx] * 0.299 + imgData[idx + 1] * 0.587 + imgData[idx + 2] * 0.114;

          const isFilled = (a > 60) && (invert ? lum >= threshold : lum < threshold);
          if (isFilled) {
            points.push(new THREE.Vector2((px - 80) * 0.45, (80 - py) * 0.45));
            found = true;
            break;
          }
        }
      }
      if (!found) {
        points.push(new THREE.Vector2(cos * 4, sin * 4));
      }
    }

    // Smooth contour points
    const smoothed = [];
    const len = points.length;
    for (let i = 0; i < len; i++) {
      const prev = points[(i - 1 + len) % len];
      const cur = points[i];
      const next = points[(i + 1) % len];
      smoothed.push(new THREE.Vector2(
        prev.x * 0.25 + cur.x * 0.5 + next.x * 0.25,
        prev.y * 0.25 + cur.y * 0.5 + next.y * 0.25
      ));
    }

    if (smoothed.length > 2) {
      shape.moveTo(smoothed[0].x, smoothed[0].y);
      for (let i = 1; i < smoothed.length; i++) {
        shape.lineTo(smoothed[i].x, smoothed[i].y);
      }
      shape.closePath();
    } else {
      shape.moveTo(-16, -16);
      shape.lineTo(16, -16);
      shape.lineTo(16, 12);
      shape.lineTo(0, 22);
      shape.lineTo(-16, 12);
      shape.closePath();
    }

    const extrudeSettings = {
      steps: 2,
      depth: depth,
      bevelEnabled: bevelThickness > 0,
      bevelThickness: bevelThickness,
      bevelSize: bevelSize,
      bevelSegments: 4
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.center();
    geometry.computeVertexNormals();

    let matColor = 0x00f0ff;
    let matMetal = 0.7;
    let matRough = 0.2;

    switch (finish) {
      case 'chrome':
        matColor = 0xeeeeee;
        matMetal = 0.95;
        matRough = 0.08;
        break;
      case 'gold':
        matColor = 0xd4af37;
        matMetal = 0.88;
        matRough = 0.22;
        break;
      case 'matte':
        matColor = 0x24272e;
        matMetal = 0.1;
        matRough = 0.75;
        break;
      default:
        matColor = 0x00f0ff;
        matMetal = 0.65;
        matRough = 0.22;
    }

    const material = new THREE.MeshStandardMaterial({
      color: matColor,
      metalness: matMetal,
      roughness: matRough
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "Extruded_Logo_3D";
    mesh.userData.sourceImage = img;
    return mesh;
  }

  /**
   * Generates Parametric CAD Shapes & 3D Typography
   * @param {string} shapeType 
   * @param {Object} params 
   * @returns {THREE.Mesh}
   */
  static generateParametric(shapeType, params = {}) {
    let geometry;

    switch (shapeType) {
      case 'box':
        geometry = new THREE.BoxGeometry(30, 30, 30);
        break;
      case 'sphere':
        geometry = new THREE.SphereGeometry(20, 32, 24);
        break;
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(15, 15, 35, 32);
        break;
      case 'torus':
        geometry = new THREE.TorusGeometry(18, 6, 24, 48);
        break;
      case 'gear': {
        const numTeeth = params.teeth || 16;
        const outerR = 25;
        const innerR = 20;
        const toothH = 4;
        const shape = new THREE.Shape();
        const delta = (Math.PI * 2) / numTeeth;

        for (let i = 0; i < numTeeth; i++) {
          const a0 = i * delta;
          const a1 = a0 + delta * 0.25;
          const a2 = a0 + delta * 0.5;
          const a3 = a0 + delta * 0.75;

          const p0 = new THREE.Vector2(Math.cos(a0) * innerR, Math.sin(a0) * innerR);
          const p1 = new THREE.Vector2(Math.cos(a1) * (outerR + toothH), Math.sin(a1) * (outerR + toothH));
          const p2 = new THREE.Vector2(Math.cos(a2) * (outerR + toothH), Math.sin(a2) * (outerR + toothH));
          const p3 = new THREE.Vector2(Math.cos(a3) * innerR, Math.sin(a3) * innerR);

          if (i === 0) shape.moveTo(p0.x, p0.y);
          else shape.lineTo(p0.x, p0.y);
          shape.lineTo(p1.x, p1.y);
          shape.lineTo(p2.x, p2.y);
          shape.lineTo(p3.x, p3.y);
        }
        shape.closePath();

        // Center axle hole
        const hole = new THREE.Path();
        hole.absarc(0, 0, 8, 0, Math.PI * 2, true);
        shape.holes.push(hole);

        geometry = new THREE.ExtrudeGeometry(shape, {
          depth: 10,
          bevelEnabled: true,
          bevelThickness: 0.8,
          bevelSize: 0.8,
          bevelSegments: 2
        });
        break;
      }
      case 'knot': {
        geometry = new THREE.TorusKnotGeometry(16, 5, 128, 32);
        break;
      }
      case 'vase': {
        const points = [];
        for (let i = 0; i <= 20; i++) {
          const t = i / 20;
          const r = 8 + Math.sin(t * Math.PI * 2) * 5 + t * 6;
          const y = (t - 0.5) * 40;
          points.push(new THREE.Vector2(r, y));
        }
        geometry = new THREE.LatheGeometry(points, 32);
        break;
      }
      default:
        geometry = new THREE.BoxGeometry(25, 25, 25);
    }

    geometry.center();
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      roughness: 0.3,
      metalness: 0.4
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `CAD_${shapeType.toUpperCase()}`;
    return mesh;
  }

  /**
   * Procedural Carbon Fiber Weave Texture Generator
   * @returns {THREE.CanvasTexture}
   */
  static createCarbonFiberTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#18181c';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#26262e';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillRect(32, 32, 32, 32);
    ctx.fillStyle = '#363640';
    for (let i = 0; i < 64; i += 4) {
      ctx.fillRect(i, 0, 1, 64);
      ctx.fillRect(0, i, 64, 1);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);
    return tex;
  }

  /**
   * Procedural Directional Tire Tread Bump Texture
   * @returns {THREE.CanvasTexture}
   */
  static createTireTreadTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#333333';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 5;
    for (let x = -32; x < 160; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 14, 64);
      ctx.lineTo(x, 128);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 1);
    return tex;
  }

  /**
   * Procedural Reptilian / Dragon Scale Bump Texture
   * @returns {THREE.CanvasTexture}
   */
  static createScaleBumpTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#666666';
    ctx.fillRect(0, 0, 128, 128);
    const r = 8;
    for (let y = 0; y <= 128; y += r * 1.5) {
      const row = Math.floor(y / (r * 1.5));
      for (let x = 0; x <= 128; x += r * 2) {
        const cx = (row % 2 === 0) ? x : x + r;
        const grad = ctx.createRadialGradient(cx, y, 1, cx, y, r);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.7, '#888888');
        grad.addColorStop(1, '#222222');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
    return tex;
  }

  /**
   * Generates Hyper-Realistic, Non-Existent 3D Sample Models with Realistic PBR & Sculpted Details
   * @param {string} sampleType 
   * @returns {THREE.Group|THREE.Mesh}
   */
  static generateUniqueSample3D(sampleType) {
    const group = new THREE.Group();
    group.name = `Sample_${sampleType}`;

    const createPbr = (color, roughness = 0.35, metalness = 0.4, emissive = null, emissiveIntensity = 0.5, bumpTex = null, bumpScale = 0.05) => {
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness,
        metalness,
        side: THREE.DoubleSide
      });
      if (emissive) {
        mat.emissive = new THREE.Color(emissive);
        mat.emissiveIntensity = emissiveIntensity;
      }
      if (bumpTex) {
        mat.bumpMap = bumpTex;
        mat.bumpScale = bumpScale;
      }
      return mat;
    };

    switch (sampleType) {
      // ----------------------------------------------------
      // 1. APEX LE MANS CYBER HYPERCAR (Hyper-Realistic)
      // ----------------------------------------------------
      case 'car_cyber': {
        const carPaint = createPbr('#0ea5e9', 0.12, 0.9); // Electric Metallic Blue
        const carbonMat = createPbr('#18181b', 0.4, 0.7, null, 0, ModelGenerators.createCarbonFiberTexture(), 0.08);
        const glassMat = createPbr('#030712', 0.05, 0.95);
        const tireMat = createPbr('#1c1917', 0.65, 0.05, null, 0, ModelGenerators.createTireTreadTexture(), 0.1);
        const bronzeRimMat = createPbr('#d97706', 0.18, 0.95);
        const brakeRotorMat = createPbr('#94a3b8', 0.25, 0.95);
        const caliperMat = createPbr('#ef4444', 0.2, 0.6);
        const ledMat = createPbr('#00f0ff', 0.1, 0.1, '#00f0ff', 1.0);
        const tailLedMat = createPbr('#ff0033', 0.1, 0.1, '#ff0033', 1.0);

        // 1. Aerodynamic Monocoque Chassis
        const monocoqueGeo = new THREE.BoxGeometry(28, 8, 64);
        const monocoque = new THREE.Mesh(monocoqueGeo, carPaint);
        monocoque.position.set(0, 9, 0);
        group.add(monocoque);

        // 2. Sculpted Front Nose & Hood with Air Extractor Vents
        const noseGeo = new THREE.ConeGeometry(14, 20, 4);
        noseGeo.scale(1.0, 0.35, 1.0);
        noseGeo.rotateX(Math.PI / 2);
        noseGeo.rotateY(Math.PI / 4);
        const nose = new THREE.Mesh(noseGeo, carPaint);
        nose.position.set(0, 8.5, 34);
        group.add(nose);

        // Front Carbon Fiber Splitter & Dive Planes
        const splitterGeo = new THREE.BoxGeometry(32, 1.2, 16);
        const splitter = new THREE.Mesh(splitterGeo, carbonMat);
        splitter.position.set(0, 4.2, 36);
        group.add(splitter);

        // Matrix LED Projector Headlights
        const ledGeo = new THREE.BoxGeometry(10, 1.2, 2);
        const ledLeft = new THREE.Mesh(ledGeo, ledMat);
        ledLeft.rotation.y = -0.25;
        ledLeft.position.set(-10, 9.5, 36);
        const ledRight = new THREE.Mesh(ledGeo, ledMat);
        ledRight.rotation.y = 0.25;
        ledRight.position.set(10, 9.5, 36);
        group.add(ledLeft, ledRight);

        // 3. Teardrop Cockpit Canopy with Roof Scoop
        const canopyGeo = new THREE.SphereGeometry(10, 32, 16);
        canopyGeo.scale(0.95, 0.7, 2.2);
        const canopy = new THREE.Mesh(canopyGeo, glassMat);
        canopy.position.set(0, 15, -2);
        group.add(canopy);

        // Roof Air Scoop
        const scoopGeo = new THREE.ConeGeometry(3, 14, 16);
        scoopGeo.scale(1.2, 0.5, 1.0);
        scoopGeo.rotateX(Math.PI / 2);
        const scoop = new THREE.Mesh(scoopGeo, carbonMat);
        scoop.position.set(0, 20.5, -4);
        group.add(scoop);

        // Side Mirrors
        const mirrorGeo = new THREE.BoxGeometry(4, 1.5, 3);
        const mLeft = new THREE.Mesh(mirrorGeo, carbonMat);
        mLeft.position.set(-13, 15, 6);
        const mRight = new THREE.Mesh(mirrorGeo, carbonMat);
        mRight.position.set(13, 15, 6);
        group.add(mLeft, mRight);

        // 4. Side Radiator Intakes & Carbon Skirts
        const skirtGeo = new THREE.BoxGeometry(31, 1.2, 44);
        const skirt = new THREE.Mesh(skirtGeo, carbonMat);
        skirt.position.set(0, 4.2, 0);
        group.add(skirt);

        // 5. Rear Engine Bay, Louvers & Quad Titanium Exhausts
        const rearDeckGeo = new THREE.BoxGeometry(26, 6, 20);
        const rearDeck = new THREE.Mesh(rearDeckGeo, carbonMat);
        rearDeck.position.set(0, 10, -22);
        group.add(rearDeck);

        for (let i = 0; i < 4; i++) {
          const exGeo = new THREE.CylinderGeometry(1.6, 1.6, 6, 16);
          exGeo.rotateX(Math.PI / 2);
          const ex = new THREE.Mesh(exGeo, bronzeRimMat);
          ex.position.set(-4.5 + i * 3, 9, -33);
          group.add(ex);
        }

        // Continuous OLED Rear Light Bar
        const tailLightGeo = new THREE.BoxGeometry(28, 1.4, 1.5);
        const tailLight = new THREE.Mesh(tailLightGeo, tailLedMat);
        tailLight.position.set(0, 11, -32.5);
        group.add(tailLight);

        // Rear Carbon Diffuser
        const diffGeo = new THREE.BoxGeometry(28, 4, 8);
        const diffuser = new THREE.Mesh(diffGeo, carbonMat);
        diffuser.position.set(0, 5.5, -31);
        group.add(diffuser);

        // Swan-Neck High-Downforce GT Wing
        const pylonGeo = new THREE.BoxGeometry(1, 8, 5);
        const p1 = new THREE.Mesh(pylonGeo, carbonMat);
        p1.position.set(-8, 16, -26);
        const p2 = new THREE.Mesh(pylonGeo, carbonMat);
        p2.position.set(8, 16, -26);
        const wingBladeGeo = new THREE.BoxGeometry(34, 1.2, 9);
        const wingBlade = new THREE.Mesh(wingBladeGeo, carbonMat);
        wingBlade.position.set(0, 20, -28);
        group.add(p1, p2, wingBlade);

        // 6. 4 Realistic Wheels (Treaded Rubber, Forged 10-Spoke Rims, Drilled Rotors, Brembo Calipers)
        const wheelPositions = [
          [-15.5, 7.5, 20],
          [15.5, 7.5, 20],
          [-15.5, 7.5, -18],
          [15.5, 7.5, -18]
        ];

        wheelPositions.forEach((pos, idx) => {
          const wG = new THREE.Group();
          wG.position.set(...pos);

          // Tire
          const tGeo = new THREE.CylinderGeometry(7.5, 7.5, 5.5, 32);
          tGeo.rotateZ(Math.PI / 2);
          const tire = new THREE.Mesh(tGeo, tireMat);
          wG.add(tire);

          // Bronze Forged Rim
          const rGeo = new THREE.CylinderGeometry(5.2, 5.2, 5.6, 20);
          rGeo.rotateZ(Math.PI / 2);
          const rim = new THREE.Mesh(rGeo, bronzeRimMat);
          wG.add(rim);

          // Drilled Brake Rotor
          const rotGeo = new THREE.CylinderGeometry(4.0, 4.0, 1.0, 24);
          rotGeo.rotateZ(Math.PI / 2);
          const rot = new THREE.Mesh(rotGeo, brakeRotorMat);
          wG.add(rot);

          // Red Caliper
          const calGeo = new THREE.BoxGeometry(2.5, 3.2, 2.0);
          const cal = new THREE.Mesh(calGeo, caliperMat);
          cal.position.set(0, 2.8, 0);
          wG.add(cal);

          group.add(wG);
        });
        break;
      }

      // ----------------------------------------------------
      // 2. QUANTUM PHANTOM STEALTH STARFIGHTER
      // ----------------------------------------------------
      case 'ship_fighter': {
        const stealthHull = createPbr('#1e293b', 0.25, 0.85, null, 0, ModelGenerators.createCarbonFiberTexture(), 0.05);
        const goldCanopyMat = createPbr('#f59e0b', 0.08, 0.95, '#d97706', 0.2);
        const plasmaMat = createPbr('#00f0ff', 0.1, 0.1, '#00f0ff', 1.0);
        const nozzleMat = createPbr('#0f172a', 0.3, 0.9);

        // 1. Faceted Radar-Deflecting Stealth Fuselage
        const fuseGeo = new THREE.ConeGeometry(10, 68, 6);
        fuseGeo.scale(1.4, 0.5, 1.0);
        fuseGeo.rotateX(Math.PI / 2);
        const fuse = new THREE.Mesh(fuseGeo, stealthHull);
        fuse.position.set(0, 10, 4);
        group.add(fuse);

        // 2. Gold-Coated Radar-Absorbent Canopy
        const canGeo = new THREE.SphereGeometry(4.5, 24, 16);
        canGeo.scale(0.8, 0.65, 3.2);
        const can = new THREE.Mesh(canGeo, goldCanopyMat);
        can.position.set(0, 14, 10);
        group.add(can);

        // 3. Forward-Swept Delta Wings with Wingtip Cannons
        const wShape = new THREE.Shape();
        wShape.moveTo(0, 0);
        wShape.lineTo(44, -12);
        wShape.lineTo(42, -28);
        wShape.lineTo(12, -20);
        wShape.lineTo(0, -16);
        wShape.closePath();

        const wGeo = new THREE.ExtrudeGeometry(wShape, { depth: 1.4, bevelEnabled: true, bevelThickness: 0.4, bevelSize: 0.4 });
        const leftW = new THREE.Mesh(wGeo, stealthHull);
        leftW.rotation.x = Math.PI / 2;
        leftW.position.set(0, 10, 4);
        const rightW = new THREE.Mesh(wGeo, stealthHull);
        rightW.rotation.x = Math.PI / 2;
        rightW.scale.set(-1, 1, 1);
        rightW.position.set(0, 10, 4);
        group.add(leftW, rightW);

        // Wingtip Plasma Cannons
        [-43, 43].forEach(x => {
          const canG = new THREE.CylinderGeometry(1.2, 1.2, 18, 12);
          canG.rotateX(Math.PI / 2);
          const cMesh = new THREE.Mesh(canG, nozzleMat);
          cMesh.position.set(x, 10, -10);
          group.add(cMesh);
        });

        // 4. Twin Variable-Geometry Supersonic Engine Nacelles
        [-11, 11].forEach(x => {
          const nacGeo = new THREE.CylinderGeometry(4.5, 5.5, 28, 16);
          nacGeo.rotateX(Math.PI / 2);
          const nac = new THREE.Mesh(nacGeo, stealthHull);
          nac.position.set(x, 10, -18);
          group.add(nac);

          // Vectoring Nozzle
          const nozGeo = new THREE.CylinderGeometry(4.2, 3.8, 6, 16);
          nozGeo.rotateX(Math.PI / 2);
          const noz = new THREE.Mesh(nozGeo, nozzleMat);
          noz.position.set(x, 10, -34);
          group.add(noz);

          // Glowing Plasma Core
          const flameGeo = new THREE.ConeGeometry(3.2, 14, 16);
          flameGeo.rotateX(-Math.PI / 2);
          const flame = new THREE.Mesh(flameGeo, plasmaMat);
          flame.position.set(x, 10, -42);
          group.add(flame);
        });
        break;
      }

      // ----------------------------------------------------
      // 3. XENON BIOLUMINESCENT EXTRATERRESTRIAL (Realistic Anatomy)
      // ----------------------------------------------------
      case 'alien_grey': {
        const alienSkin = createPbr('#38bdf8', 0.28, 0.25, '#0284c7', 0.15, ModelGenerators.createScaleBumpTexture(), 0.04);
        const corneaMat = createPbr('#030712', 0.02, 0.98);
        const irisMat = createPbr('#00f0ff', 0.1, 0.1, '#00f0ff', 0.95);
        const armorMat = createPbr('#0f172a', 0.2, 0.85, null, 0, ModelGenerators.createCarbonFiberTexture(), 0.06);

        // 1. High-Detail Sculpted Cranium with Occipital Lobe
        const craniumGeo = new THREE.SphereGeometry(15, 36, 28);
        craniumGeo.scale(1.0, 1.45, 1.3);
        const cranium = new THREE.Mesh(craniumGeo, alienSkin);
        cranium.position.set(0, 52, -2);
        group.add(cranium);

        // 2. Sculpted Facial Features (Zygomatic Arches, Slit Nose, Mandibles, Chin)
        const faceGeo = new THREE.ConeGeometry(11, 20, 16);
        faceGeo.scale(0.9, 1.0, 0.65);
        faceGeo.rotateX(Math.PI);
        const face = new THREE.Mesh(faceGeo, alienSkin);
        face.position.set(0, 43, 8);
        group.add(face);

        // Realistic Almond Alien Eyes with Depth & Luminous Pupils
        const eyeBaseGeo = new THREE.SphereGeometry(5.2, 24, 24);
        eyeBaseGeo.scale(1.25, 0.7, 0.45);

        const makeEye = (x, rotZ) => {
          const eGroup = new THREE.Group();
          eGroup.position.set(x, 50, 9);
          eGroup.rotation.set(0.12, x > 0 ? 0.35 : -0.35, rotZ);

          const cornea = new THREE.Mesh(eyeBaseGeo, corneaMat);
          const pupilGeo = new THREE.SphereGeometry(2.5, 16, 16);
          pupilGeo.scale(0.3, 1.2, 0.5);
          const pupil = new THREE.Mesh(pupilGeo, irisMat);
          pupil.position.set(0, 0, 1.8);

          eGroup.add(cornea, pupil);
          return eGroup;
        };

        group.add(makeEye(-7.5, -0.28), makeEye(7.5, 0.28));

        // 3. Anatomical Cervical Spine & Muscular Neck
        const neckGeo = new THREE.CylinderGeometry(4.5, 6.0, 16, 24);
        const neck = new THREE.Mesh(neckGeo, alienSkin);
        neck.position.set(0, 32, -1);
        group.add(neck);

        // Visible Spinal Vertebrae Discs
        for (let i = 0; i < 5; i++) {
          const vertGeo = new THREE.TorusGeometry(5.2, 0.8, 12, 24);
          const vert = new THREE.Mesh(vertGeo, armorMat);
          vert.rotation.x = Math.PI / 2;
          vert.position.set(0, 26 + i * 2.8, -1.8);
          group.add(vert);
        }

        // 4. Clavicles & Bio-Nanotech Torso Armor
        const chestGeo = new THREE.CylinderGeometry(9, 7, 24, 20);
        chestGeo.scale(1.2, 1.0, 0.75);
        const chest = new THREE.Mesh(chestGeo, armorMat);
        chest.position.set(0, 14, 0);
        group.add(chest);

        // Glowing Bioluminescent Circuit Inlays
        const coreLightGeo = new THREE.SphereGeometry(2.5, 16, 16);
        const coreLight = new THREE.Mesh(coreLightGeo, irisMat);
        coreLight.position.set(0, 18, 6.5);
        group.add(coreLight);
        break;
      }

      // ----------------------------------------------------
      // 4. IMPERIAL WYVERN DRAGON (Realistic Mythical Beast)
      // ----------------------------------------------------
      case 'animal_dragon': {
        const dragonSkin = createPbr('#b91c1c', 0.32, 0.35, null, 0, ModelGenerators.createScaleBumpTexture(), 0.12);
        const wingMembraneMat = createPbr('#7f1d1d', 0.45, 0.15);
        const hornMat = createPbr('#f59e0b', 0.2, 0.9);
        const eyeMat = createPbr('#fbbf24', 0.05, 0.1, '#f59e0b', 0.9);
        const fangMat = createPbr('#fef3c7', 0.15, 0.1);

        // 1. S-Curved Muscular Serpent Body
        const bodyGeo = new THREE.ConeGeometry(13, 40, 16);
        bodyGeo.rotateX(Math.PI / 2);
        const body = new THREE.Mesh(bodyGeo, dragonSkin);
        body.position.set(0, 24, 2);
        group.add(body);

        // Sinuous Arched Neck
        const neckGeo = new THREE.CylinderGeometry(5.5, 9.0, 26, 16);
        neckGeo.rotateX(-Math.PI / 3.5);
        const neck = new THREE.Mesh(neckGeo, dragonSkin);
        neck.position.set(0, 36, 14);
        group.add(neck);

        // 2. Sculpted Dragon Skull with Snout, Nostrils & Fangs
        const headGeo = new THREE.ConeGeometry(7, 18, 12);
        headGeo.scale(1.2, 0.75, 1.0);
        headGeo.rotateX(Math.PI / 2);
        const head = new THREE.Mesh(headGeo, dragonSkin);
        head.position.set(0, 48, 24);
        group.add(head);

        // Spiral Horns
        const hornGeo = new THREE.ConeGeometry(2.4, 18, 8);
        const hLeft = new THREE.Mesh(hornGeo, hornMat);
        hLeft.rotation.set(-Math.PI / 3, 0, -Math.PI / 5);
        hLeft.position.set(-5, 55, 18);
        const hRight = new THREE.Mesh(hornGeo, hornMat);
        hRight.rotation.set(-Math.PI / 3, 0, Math.PI / 5);
        hRight.position.set(5, 55, 18);
        group.add(hLeft, hRight);

        // Amber Slit Eyes
        const eyeGeo = new THREE.SphereGeometry(1.5, 12, 12);
        const eL = new THREE.Mesh(eyeGeo, eyeMat);
        eL.position.set(-4.2, 50, 26);
        const eR = new THREE.Mesh(eyeGeo, eyeMat);
        eR.position.set(4.2, 50, 26);
        group.add(eL, eR);

        // Ivory Fangs
        for (let i = 0; i < 4; i++) {
          const fangGeo = new THREE.ConeGeometry(0.8, 4, 6);
          fangGeo.rotateX(Math.PI);
          const f = new THREE.Mesh(fangGeo, fangMat);
          f.position.set(-3 + i * 2, 45, 30);
          group.add(f);
        }

        // Dorsal Ridge Spines
        for (let i = 0; i < 9; i++) {
          const spineGeo = new THREE.ConeGeometry(1.8, 6, 4);
          const sp = new THREE.Mesh(spineGeo, hornMat);
          sp.position.set(0, 30 + (i < 4 ? i * 4 : 16 - (i - 4) * 3), 18 - i * 6);
          group.add(sp);
        }

        // 3. Huge Articulated Bat-like Wings
        const wShape = new THREE.Shape();
        wShape.moveTo(0, 0);
        wShape.lineTo(48, 26);
        wShape.lineTo(54, 8);
        wShape.lineTo(36, -14);
        wShape.lineTo(18, -10);
        wShape.lineTo(0, -6);
        wShape.closePath();

        const wGeo = new THREE.ExtrudeGeometry(wShape, { depth: 1.2, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.3 });
        const leftWing = new THREE.Mesh(wGeo, wingMembraneMat);
        leftWing.position.set(-6, 28, 4);
        leftWing.rotation.y = -Math.PI / 5;
        const rightWing = new THREE.Mesh(wGeo, wingMembraneMat);
        rightWing.position.set(6, 28, 4);
        rightWing.scale.set(-1, 1, 1);
        rightWing.rotation.y = Math.PI / 5;
        group.add(leftWing, rightWing);

        // 4. Muscular Hindquarters with Talon Claws
        [-9, 9].forEach(x => {
          const legGeo = new THREE.CylinderGeometry(3.5, 2.0, 20, 12);
          const leg = new THREE.Mesh(legGeo, dragonSkin);
          leg.position.set(x, 10, -2);
          group.add(leg);

          // 3 Claws
          for (let c = -1; c <= 1; c++) {
            const clawGeo = new THREE.ConeGeometry(1, 6, 6);
            clawGeo.rotateX(Math.PI / 2);
            const cl = new THREE.Mesh(clawGeo, hornMat);
            cl.position.set(x + c * 2, 1, 4);
            group.add(cl);
          }
        });

        // 5. Sinuous Tail with Arrowhead Stinger
        const tailGeo = new THREE.CylinderGeometry(2, 6, 42, 12);
        tailGeo.rotateX(Math.PI / 2);
        const tail = new THREE.Mesh(tailGeo, dragonSkin);
        tail.position.set(0, 18, -28);
        group.add(tail);

        const stingerGeo = new THREE.ConeGeometry(5, 12, 4);
        stingerGeo.rotateX(-Math.PI / 2);
        const stinger = new THREE.Mesh(stingerGeo, hornMat);
        stinger.position.set(0, 18, -52);
        group.add(stinger);
        break;
      }

      // ----------------------------------------------------
      // 5. APEX SOARING IMPERIAL EAGLE (High-Detail Avian)
      // ----------------------------------------------------
      case 'bird_eagle': {
        const featherMat = createPbr('#451a03', 0.5, 0.05, null, 0, ModelGenerators.createScaleBumpTexture(), 0.06);
        const whiteHeadMat = createPbr('#f8fafc', 0.4, 0.02);
        const goldBeakMat = createPbr('#f59e0b', 0.18, 0.3);
        const eyeMat = createPbr('#18181b', 0.05, 0.9, '#f59e0b', 0.4);
        const talonMat = createPbr('#09090b', 0.1, 0.8);

        // 1. Aerodynamic Keel Body
        const bodyGeo = new THREE.ConeGeometry(9, 32, 16);
        bodyGeo.rotateX(Math.PI / 2.8);
        const body = new THREE.Mesh(bodyGeo, featherMat);
        body.position.set(0, 26, 0);
        group.add(body);

        // 2. Sculpted White Head with Supraorbital Brow
        const headGeo = new THREE.SphereGeometry(6.5, 24, 20);
        headGeo.scale(0.85, 0.95, 1.35);
        const head = new THREE.Mesh(headGeo, whiteHeadMat);
        head.position.set(0, 34, 14);
        group.add(head);

        // Hooked Raptor Beak
        const beakGeo = new THREE.ConeGeometry(2.8, 10, 8);
        beakGeo.rotateX(Math.PI / 1.8);
        const beak = new THREE.Mesh(beakGeo, goldBeakMat);
        beak.position.set(0, 31, 22);
        group.add(beak);

        // Fierce Eagle Eyes
        [-3.8, 3.8].forEach(x => {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 12), eyeMat);
          eye.position.set(x, 35, 18);
          group.add(eye);
        });

        // 3. Wide Soaring Layered Wings (Anatomical Primaries & Secondaries)
        const wShape = new THREE.Shape();
        wShape.moveTo(0, 0);
        wShape.lineTo(48, 8);
        wShape.lineTo(46, -14);
        wShape.lineTo(24, -12);
        wShape.lineTo(0, -10);
        wShape.closePath();

        const wGeo = new THREE.ExtrudeGeometry(wShape, { depth: 1.2, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.3 });
        const leftWing = new THREE.Mesh(wGeo, featherMat);
        leftWing.rotation.x = Math.PI / 2;
        leftWing.position.set(0, 29, 6);
        const rightWing = new THREE.Mesh(wGeo, featherMat);
        rightWing.rotation.x = Math.PI / 2;
        rightWing.scale.set(-1, 1, 1);
        rightWing.position.set(0, 29, 6);
        group.add(leftWing, rightWing);

        // 4. White Fan Tail Feathers
        const tailGeo = new THREE.BoxGeometry(22, 1.2, 18);
        const tail = new THREE.Mesh(tailGeo, whiteHeadMat);
        tail.position.set(0, 22, -18);
        group.add(tail);

        // 5. Yellow Talons with Curled Black Claws
        [-4, 4].forEach(x => {
          const tLeg = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 8, 12), goldBeakMat);
          tLeg.position.set(x, 18, -4);
          group.add(tLeg);

          for (let c = -1; c <= 1; c++) {
            const claw = new THREE.Mesh(new THREE.ConeGeometry(0.8, 4, 6), talonMat);
            claw.rotation.x = Math.PI / 1.5;
            claw.position.set(x + c * 1.5, 14, -2);
            group.add(claw);
          }
        });
        break;
      }

      // ----------------------------------------------------
      // 6. NEO-GENESIS CYBERNETIC ANDROID BUST
      // ----------------------------------------------------
      case 'figure_cyborg': {
        const porcelainSkin = createPbr('#f8fafc', 0.18, 0.05);
        const chromeMat = createPbr('#e2e8f0', 0.08, 0.95);
        const carbonMat = createPbr('#0f172a', 0.3, 0.85, null, 0, ModelGenerators.createCarbonFiberTexture(), 0.05);
        const visorMat = createPbr('#00f0ff', 0.1, 0.1, '#00f0ff', 1.0);
        const pedMat = createPbr('#020617', 0.2, 0.9);

        // Studio Gallery Pedestal
        const pedGeo = new THREE.CylinderGeometry(16, 18, 8, 32);
        const ped = new THREE.Mesh(pedGeo, pedMat);
        ped.position.set(0, 4, 0);
        group.add(ped);

        // Shoulders & Collarbone Deck
        const chestGeo = new THREE.BoxGeometry(28, 14, 16);
        const chest = new THREE.Mesh(chestGeo, carbonMat);
        chest.position.set(0, 16, 0);
        group.add(chest);

        // Titanium Vertebrae Neck with Hydraulic Pistons
        const neckGeo = new THREE.CylinderGeometry(4.5, 5.5, 10, 20);
        const neck = new THREE.Mesh(neckGeo, chromeMat);
        neck.position.set(0, 26, 0);
        group.add(neck);

        // Hydraulic Neck Dampers
        [-3.5, 3.5].forEach(x => {
          const piston = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 10, 12), chromeMat);
          piston.position.set(x, 26, 2);
          group.add(piston);
        });

        // Anatomically Proportioned Android Face (Lips, Nose, Jaw, Cheekbones)
        const faceGeo = new THREE.SphereGeometry(10, 32, 24);
        faceGeo.scale(0.9, 1.2, 1.05);
        const face = new THREE.Mesh(faceGeo, porcelainSkin);
        face.position.set(0, 38, 0);
        group.add(face);

        // Chrome Skull Plate (Left Side Cybernetic Exposure)
        const skullPlateGeo = new THREE.SphereGeometry(10.2, 24, 20, 0, Math.PI, 0, Math.PI / 2);
        const skullPlate = new THREE.Mesh(skullPlateGeo, chromeMat);
        skullPlate.position.set(0, 38, 0);
        group.add(skullPlate);

        // Glowing Cyan Cyber Visor with Data Reticle
        const visorGeo = new THREE.BoxGeometry(16, 3, 4);
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.position.set(0, 40, 9.5);
        group.add(visor);
        break;
      }

      // ----------------------------------------------------
      // 7. GRAVITON ALIEN SAUCER (Hyper-Detailed UFO)
      // ----------------------------------------------------
      case 'ufo_saucer': {
        const ufoHull = createPbr('#334155', 0.2, 0.9, null, 0, ModelGenerators.createCarbonFiberTexture(), 0.05);
        const glowFieldMat = createPbr('#00ffcc', 0.1, 0.1, '#00ffcc', 1.0);
        const domeMat = createPbr('#0284c7', 0.05, 0.95, '#0ea5e9', 0.3);
        const chromeRing = createPbr('#f8fafc', 0.1, 0.95);

        // Multi-Tiered Hull
        const hullGeo = new THREE.CylinderGeometry(32, 32, 6, 48);
        const hull = new THREE.Mesh(hullGeo, ufoHull);
        hull.position.set(0, 20, 0);
        group.add(hull);

        const edgeTorus = new THREE.Mesh(new THREE.TorusGeometry(32, 3.5, 20, 64), chromeRing);
        edgeTorus.rotation.x = Math.PI / 2;
        edgeTorus.position.set(0, 20, 0);
        group.add(edgeTorus);

        // 16 Glowing Magnetic Containment Nodes
        for (let i = 0; i < 16; i++) {
          const ang = (i / 16) * Math.PI * 2;
          const nodeGeo = new THREE.SphereGeometry(2, 16, 16);
          const node = new THREE.Mesh(nodeGeo, glowFieldMat);
          node.position.set(Math.cos(ang) * 28, 19, Math.sin(ang) * 28);
          group.add(node);
        }

        // Panoramic Command Bridge Dome
        const domeGeo = new THREE.SphereGeometry(14, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2);
        const dome = new THREE.Mesh(domeGeo, domeMat);
        dome.position.set(0, 23, 0);
        group.add(dome);

        // Lower Graviton Lens
        const lensGeo = new THREE.CylinderGeometry(10, 4, 5, 24);
        const lens = new THREE.Mesh(lensGeo, glowFieldMat);
        lens.position.set(0, 15, 0);
        group.add(lens);
        break;
      }

      // ----------------------------------------------------
      // 8. APEX CYBER PREDATOR / WOLF
      // ----------------------------------------------------
      case 'animal_wolf': {
        const cyberFur = createPbr('#1e293b', 0.3, 0.6, null, 0, ModelGenerators.createCarbonFiberTexture(), 0.05);
        const armorPlateMat = createPbr('#0f172a', 0.2, 0.9);
        const eyeGlowMat = createPbr('#f59e0b', 0.05, 0.1, '#f59e0b', 1.0);
        const clawMat = createPbr('#e2e8f0', 0.1, 0.95);

        // Muscular Torso & Ribcage
        const chestGeo = new THREE.BoxGeometry(16, 18, 38);
        const chest = new THREE.Mesh(chestGeo, cyberFur);
        chest.position.set(0, 24, 0);
        group.add(chest);

        // Sculpted Wolf Head & Jaws
        const headGeo = new THREE.ConeGeometry(8, 18, 8);
        headGeo.rotateX(Math.PI / 2);
        const head = new THREE.Mesh(headGeo, cyberFur);
        head.position.set(0, 32, 22);
        group.add(head);

        // Ears
        const earGeo = new THREE.ConeGeometry(3, 8, 4);
        const eL = new THREE.Mesh(earGeo, armorPlateMat);
        eL.position.set(-4.5, 40, 18);
        const eR = new THREE.Mesh(earGeo, armorPlateMat);
        eR.position.set(4.5, 40, 18);
        group.add(eL, eR);

        // Amber Glowing Eyes
        const eyeGeo = new THREE.SphereGeometry(1.2, 12, 12);
        const eyeL = new THREE.Mesh(eyeGeo, eyeGlowMat);
        eyeL.position.set(-3.5, 33, 26);
        const eyeR = new THREE.Mesh(eyeGeo, eyeGlowMat);
        eyeR.position.set(3.5, 33, 26);
        group.add(eyeL, eyeR);

        // 4 Articulated Muscular Legs
        const legPositions = [
          [-7, 11, 14],
          [7, 11, 14],
          [-7, 11, -14],
          [7, 11, -14]
        ];

        legPositions.forEach(p => {
          const lMesh = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 2.5, 22, 12), cyberFur);
          lMesh.position.set(...p);
          group.add(lMesh);

          // Claws
          for (let c = -1; c <= 1; c++) {
            const cl = new THREE.Mesh(new THREE.ConeGeometry(0.8, 3.5, 6), clawMat);
            cl.rotateX(Math.PI / 2);
            cl.position.set(p[0] + c * 1.5, 1, p[2] + 4);
            group.add(cl);
          }
        });

        // Bushy Articulated Tail
        const tailGeo = new THREE.CylinderGeometry(2, 4.5, 22, 8);
        tailGeo.rotateX(Math.PI / 3);
        const tail = new THREE.Mesh(tailGeo, cyberFur);
        tail.position.set(0, 24, -26);
        group.add(tail);
        break;
      }


      // ----------------------------------------------------
      // AIRCRAFT & AEROSPACE
      // ----------------------------------------------------
      case 'aircraft_jet': {
        // F-22 Raptor stealth fighter
        const stealthMat = createPbr('#2a2a35', 0.3, 0.6);
        const cockpitMat = createPbr('#061020', 0.05, 0.9);
        const thrustMat = createPbr('#ef4444', 0.1, 0.1, '#ff6600', 1.4);
        const leadEdgeMat = createPbr('#1a1a22', 0.2, 0.75);

        // Main fuselage - diamond cross-section for stealth
        const fuseGeo = new THREE.CylinderGeometry(0, 8, 80, 6);
        fuseGeo.rotateX(Math.PI / 2);
        const fuse = new THREE.Mesh(fuseGeo, stealthMat);
        fuse.scale.set(1, 0.55, 1);
        fuse.position.set(0, 6, 0);
        group.add(fuse);

        // Forward nose section
        const noseGeo = new THREE.ConeGeometry(3, 30, 4);
        noseGeo.rotateX(Math.PI / 2);
        const nose = new THREE.Mesh(noseGeo, leadEdgeMat);
        nose.position.set(0, 6, 55);
        group.add(nose);

        // Delta wings with serrated trailing edge
        const wingGeo = new THREE.BufferGeometry();
        const wingVerts = new Float32Array([
          0, 6, 20,   -55, 2, -35,  -55, 2, -28,  // Left wing
          0, 6, 20,   55, 2, -28,   55, 2, -35,   // Right wing
        ]);
        wingGeo.setAttribute('position', new THREE.BufferAttribute(wingVerts, 3));
        wingGeo.setIndex([0,1,2, 3,4,5]);
        wingGeo.computeVertexNormals();
        const wings = new THREE.Mesh(wingGeo, stealthMat);
        group.add(wings);

        // V-tail fins
        for (const s of [-1, 1]) {
          const tailGeo = new THREE.BufferGeometry();
          const tv = new Float32Array([
            0, 6, -30,   s * 3, 6, -30,   s * 16, 30, -42,
            0, 6, -38,   s * 3, 6, -38,   s * 16, 30, -42
          ]);
          tailGeo.setAttribute('position', new THREE.BufferAttribute(tv, 3));
          tailGeo.setIndex([0,1,2, 3,4,5]);
          tailGeo.computeVertexNormals();
          group.add(new THREE.Mesh(tailGeo, leadEdgeMat));
        }

        // Bubble canopy
        const canGeo = new THREE.SphereGeometry(6, 24, 16);
        canGeo.scale(0.7, 0.45, 1.2);
        const can = new THREE.Mesh(canGeo, cockpitMat);
        can.position.set(0, 12, 18);
        group.add(can);

        // Twin Pratt & Whitney F119 afterburning exhaust nozzles
        for (const ex of [-5, 5]) {
          const nozGeo = new THREE.CylinderGeometry(3.5, 4.5, 14, 18);
          nozGeo.rotateX(Math.PI / 2);
          const noz = new THREE.Mesh(nozGeo, stealthMat);
          noz.position.set(ex, 6, -46);
          group.add(noz);
          const flamGeo = new THREE.ConeGeometry(2.8, 18, 18);
          flamGeo.rotateX(-Math.PI / 2);
          const flam = new THREE.Mesh(flamGeo, thrustMat);
          flam.position.set(ex, 6, -62);
          group.add(flam);
        }
        break;
      }

      case 'aircraft_heli': {
        // AH-64 Apache attack helicopter
        const hullMat = createPbr('#3d4a25', 0.55, 0.15);
        const glassMat = createPbr('#0d2038', 0.05, 0.8);
        const metalMat = createPbr('#505050', 0.3, 0.75);

        // Main fuselage
        const hFuseGeo = new THREE.CylinderGeometry(7, 9, 48, 12);
        hFuseGeo.rotateZ(Math.PI / 2);
        const hFuse = new THREE.Mesh(hFuseGeo, hullMat);
        hFuse.position.set(0, 12, 0);
        group.add(hFuse);

        // Nose sensor / TADS turret
        const noseSen = new THREE.Mesh(new THREE.SphereGeometry(5.5, 16, 12), glassMat);
        noseSen.scale.set(1, 0.8, 1.4);
        noseSen.position.set(0, 10, 28);
        group.add(noseSen);

        // Cockpit greenhouse glass
        const cockGeo = new THREE.SphereGeometry(8, 20, 12);
        cockGeo.scale(0.85, 0.7, 1.1);
        const cockMesh = new THREE.Mesh(cockGeo, glassMat);
        cockMesh.position.set(0, 17, 8);
        group.add(cockMesh);

        // Tail boom
        const tBoomGeo = new THREE.CylinderGeometry(2.5, 7, 55, 10);
        tBoomGeo.rotateZ(Math.PI / 2);
        const tBoom = new THREE.Mesh(tBoomGeo, hullMat);
        tBoom.position.set(-40, 14, 0);
        group.add(tBoom);

        // Tail rotor
        for (let i = 0; i < 4; i++) {
          const trGeo = new THREE.BoxGeometry(3, 0.8, 18);
          const tr = new THREE.Mesh(trGeo, metalMat);
          tr.position.set(-70, 18, 0);
          tr.rotation.z = (i * Math.PI) / 2;
          group.add(tr);
        }

        // Main 4-blade rotor system
        const hubGeo = new THREE.CylinderGeometry(2.5, 2.5, 4, 16);
        const hub = new THREE.Mesh(hubGeo, metalMat);
        hub.position.set(0, 28, 0);
        group.add(hub);
        for (let i = 0; i < 4; i++) {
          const bladeGeo = new THREE.BoxGeometry(75, 0.8, 5);
          const blade = new THREE.Mesh(bladeGeo, hullMat);
          blade.position.set(0, 30, 0);
          blade.rotation.y = (i * Math.PI) / 2;
          group.add(blade);
        }

        // Stub wings with Hellfire missile rails
        for (const s of [-1, 1]) {
          const wingGeo = new THREE.BoxGeometry(20, 2.5, 6);
          const wing = new THREE.Mesh(wingGeo, hullMat);
          wing.position.set(s * 18, 10, 4);
          group.add(wing);
          for (let m = 0; m < 4; m++) {
            const mGeo = new THREE.CylinderGeometry(1.2, 1.2, 10, 8);
            mGeo.rotateZ(Math.PI / 2);
            const mis = new THREE.Mesh(mGeo, metalMat);
            mis.position.set(s * (22 + m * 2), 8, 2 + m * 2);
            group.add(mis);
          }
        }

        // Landing skids
        for (const s of [-1, 1]) {
          const skidGeo = new THREE.CylinderGeometry(1, 1, 40, 8);
          skidGeo.rotateZ(Math.PI / 2);
          const skid = new THREE.Mesh(skidGeo, metalMat);
          skid.position.set(0, 1, s * 8);
          group.add(skid);
          for (const x of [-14, 14]) {
            const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 12, 6), metalMat);
            strut.position.set(x, 7, s * 8);
            group.add(strut);
          }
        }
        break;
      }

      case 'aircraft_drone': {
        // MQ-9 Reaper surveillance / strike drone
        const droneMat = createPbr('#8e9a7f', 0.5, 0.1);
        const darkMat = createPbr('#1c2010', 0.55, 0.1);
        const sensorMat = createPbr('#080e1a', 0.05, 0.3);

        // Fuselage
        const dFuseGeo = new THREE.CylinderGeometry(4, 5, 70, 10);
        dFuseGeo.rotateZ(Math.PI / 2);
        const dFuse = new THREE.Mesh(dFuseGeo, droneMat);
        dFuse.position.set(0, 8, 0);
        group.add(dFuse);

        // Inverted V-tail
        for (const s of [-1, 1]) {
          const tailGeo = new THREE.BoxGeometry(1.5, 18, 12);
          const tail = new THREE.Mesh(tailGeo, droneMat);
          tail.rotation.z = s * 0.45;
          tail.position.set(s * 8, 12, -38);
          group.add(tail);
        }

        // High-aspect-ratio gull wings
        const dWingGeo = new THREE.BoxGeometry(140, 2, 18);
        const dWing = new THREE.Mesh(dWingGeo, droneMat);
        dWing.position.set(0, 9, 5);
        group.add(dWing);

        // Turboprop engine & pusher prop
        const engGeo = new THREE.CylinderGeometry(3.5, 4.5, 18, 12);
        engGeo.rotateZ(Math.PI / 2);
        const engMesh = new THREE.Mesh(engGeo, darkMat);
        engMesh.position.set(0, 8, -40);
        group.add(engMesh);

        for (let i = 0; i < 3; i++) {
          const propGeo = new THREE.BoxGeometry(30, 1.5, 4);
          const prop = new THREE.Mesh(propGeo, darkMat);
          prop.position.set(0, 8, -50);
          prop.rotation.z = (i * Math.PI * 2) / 3;
          group.add(prop);
        }

        // Multi-spectral sensor ball
        const ballGeo = new THREE.SphereGeometry(5, 24, 16);
        const ball = new THREE.Mesh(ballGeo, sensorMat);
        ball.position.set(0, 2, 22);
        group.add(ball);

        // GBU-12 Paveway II laser-guided bombs
        for (const s of [-1, 1]) {
          for (const p of [-10, 10]) {
            const bGeo = new THREE.CylinderGeometry(1.5, 1.5, 14, 10);
            bGeo.rotateZ(Math.PI / 2);
            const bMesh = new THREE.Mesh(bGeo, darkMat);
            bMesh.position.set(s * 45, 6, p);
            group.add(bMesh);
          }
        }
        break;
      }

      case 'aircraft_rocket': {
        // SpaceX Falcon 9 launch vehicle
        const rocketMat = createPbr('#f0f0f0', 0.2, 0.3);
        const darkBand = createPbr('#111118', 0.3, 0.6);
        const thrusterMat = createPbr('#c87941', 0.2, 0.8);
        const flameMat = createPbr('#ff6600', 0.1, 0.05, '#ff3300', 1.8);

        // S1 & S2 bodies stacked
        const s1Geo = new THREE.CylinderGeometry(9.5, 9.5, 120, 24);
        const s1 = new THREE.Mesh(s1Geo, rocketMat);
        s1.position.set(0, 60, 0);
        group.add(s1);

        const s2Geo = new THREE.CylinderGeometry(9.5, 9.5, 60, 24);
        const s2 = new THREE.Mesh(s2Geo, rocketMat);
        s2.position.set(0, 150, 0);
        group.add(s2);

        // Fairing
        const fairGeo = new THREE.ConeGeometry(9.5, 35, 24);
        const fair = new THREE.Mesh(fairGeo, rocketMat);
        fair.position.set(0, 197, 0);
        group.add(fair);

        // Interstage dark band
        const bandGeo = new THREE.CylinderGeometry(9.8, 9.8, 6, 24);
        const band = new THREE.Mesh(bandGeo, darkBand);
        band.position.set(0, 123, 0);
        group.add(band);

        // Merlin engine cluster (3x3 grid)
        const eng9Positions = [[-16,0,0],[0,0,0],[16,0,0],[-16,0,16],[0,0,16],[16,0,16],[-16,0,-16],[0,0,-16],[16,0,-16]];
        eng9Positions.forEach(([x,y,z]) => {
          const eGeo = new THREE.CylinderGeometry(3.5, 2, 14, 12);
          const eMesh = new THREE.Mesh(eGeo, thrusterMat);
          eMesh.position.set(x, 0, z);
          eMesh.rotation.x = Math.PI;
          group.add(eMesh);
          const fGeo = new THREE.ConeGeometry(2.5, 20, 12);
          const fMesh = new THREE.Mesh(fGeo, flameMat);
          fMesh.position.set(x, -22, z);
          fMesh.rotation.x = Math.PI;
          group.add(fMesh);
        });

        // Landing legs (4 deployed grid fins)
        for (let i = 0; i < 4; i++) {
          const ang = (i * Math.PI) / 2;
          const legGeo = new THREE.BoxGeometry(2, 28, 1.5);
          const leg = new THREE.Mesh(legGeo, darkBand);
          leg.position.set(Math.cos(ang) * 14, 14, Math.sin(ang) * 14);
          leg.rotation.y = ang;
          leg.rotation.z = -0.25;
          group.add(leg);
        }
        break;
      }

      // ----------------------------------------------------
      // MORE SHIPS
      // ----------------------------------------------------
      case 'ship_destroyer': {
        // Star Destroyer wedge dreadnought
        const hullMat = createPbr('#b0b8c8', 0.35, 0.5);
        const darkPanelMat = createPbr('#3a3f50', 0.4, 0.4);
        const glowBlueMat = createPbr('#00aaff', 0.1, 0.1, '#0088ff', 1.2);

        // Main triangular hull
        const hullGeo = new THREE.BufferGeometry();
        const hVerts = new Float32Array([
          -80, 0, -100,  80, 0, -100,  0, 0, 100,
          -80, 20, -100, 80, 20, -100, 0, 20, 100,
          -80, 0, -100, -80, 20, -100, 0, 0, 100,
          0, 0, 100,  -80, 20, -100,  0, 20, 100,
          80, 0, -100, 80, 20, -100, -80, 0, -100,
          -80, 0, -100, 80, 20, -100, -80, 20, -100,
        ]);
        hullGeo.setAttribute('position', new THREE.BufferAttribute(hVerts, 3));
        hullGeo.computeVertexNormals();
        group.add(new THREE.Mesh(hullGeo, hullMat));

        // Command tower superstructure
        const towerGeo = new THREE.BoxGeometry(20, 40, 16);
        const tower = new THREE.Mesh(towerGeo, darkPanelMat);
        tower.position.set(0, 30, -40);
        group.add(tower);

        // Communication dishes
        const dishGeo = new THREE.CylinderGeometry(8, 0, 3, 16, 1, false);
        const dish = new THREE.Mesh(dishGeo, hullMat);
        dish.position.set(0, 52, -40);
        group.add(dish);

        // Tractor beam projectors in triangular array
        for (let i = 0; i < 6; i++) {
          const tbGeo = new THREE.CylinderGeometry(1.5, 3, 4, 8);
          const tb = new THREE.Mesh(tbGeo, glowBlueMat);
          tb.position.set((i % 3 - 1) * 25, 22, -55 + Math.floor(i / 3) * 12);
          group.add(tb);
        }

        // Engine quad array
        for (let e = 0; e < 4; e++) {
          const engGeo = new THREE.CylinderGeometry(9, 12, 20, 16);
          const eng = new THREE.Mesh(engGeo, darkPanelMat);
          eng.position.set(-28 + e * 19, 10, -108);
          eng.rotation.x = Math.PI / 2;
          group.add(eng);
          const glowRing = new THREE.Mesh(new THREE.TorusGeometry(8, 2, 8, 24), glowBlueMat);
          glowRing.position.set(-28 + e * 19, 10, -116);
          glowRing.rotation.x = Math.PI / 2;
          group.add(glowRing);
        }
        break;
      }

      case 'ship_freighter': {
        const freightMat = createPbr('#5a6575', 0.55, 0.3);
        const rustyMat = createPbr('#7a3a2a', 0.8, 0.1);
        const glowMat = createPbr('#00ff88', 0.1, 0.1, '#00ff88', 0.8);

        // Main hull - elongated cylindrical body
        const fHullGeo = new THREE.CylinderGeometry(14, 14, 120, 16);
        fHullGeo.rotateZ(Math.PI / 2);
        const fHull = new THREE.Mesh(fHullGeo, freightMat);
        fHull.position.set(0, 14, 0);
        group.add(fHull);

        // Forward command section
        const cmdGeo = new THREE.CylinderGeometry(16, 14, 20, 14);
        cmdGeo.rotateZ(Math.PI / 2);
        const cmd = new THREE.Mesh(cmdGeo, freightMat);
        cmd.position.set(60, 14, 0);
        group.add(cmd);

        // Cargo pods (6 arranged in ring)
        for (let i = 0; i < 6; i++) {
          const ang = (i * Math.PI * 2) / 6;
          const podGeo = new THREE.CylinderGeometry(6, 6, 80, 10);
          podGeo.rotateZ(Math.PI / 2);
          const pod = new THREE.Mesh(podGeo, rustyMat);
          pod.position.set(0, 14 + Math.sin(ang) * 22, Math.cos(ang) * 22);
          group.add(pod);
        }

        // Engine cluster - 3 large ion drives
        for (const s of [-15, 0, 15]) {
          const engGeo = new THREE.CylinderGeometry(8, 11, 24, 14);
          engGeo.rotateZ(Math.PI / 2);
          const eng = new THREE.Mesh(engGeo, freightMat);
          eng.position.set(-78, 14, s);
          group.add(eng);
          const glowDisk = new THREE.Mesh(new THREE.CircleGeometry(8, 20), glowMat);
          glowDisk.position.set(-91, 14, s);
          glowDisk.rotation.y = Math.PI / 2;
          group.add(glowDisk);
        }
        break;
      }

      case 'ship_shuttle': {
        const shuttleMat = createPbr('#dde0e8', 0.25, 0.2);
        const heatTile = createPbr('#1a1a1a', 0.7, 0.05);
        const winMat = createPbr('#050d1a', 0.05, 0.6);

        // Orbiter fuselage
        const sHullGeo = new THREE.CylinderGeometry(8, 10, 65, 16);
        sHullGeo.rotateZ(Math.PI / 2);
        const sHull = new THREE.Mesh(sHullGeo, shuttleMat);
        sHull.position.set(0, 10, 0);
        group.add(sHull);

        // Nose
        const sNoseGeo = new THREE.ConeGeometry(10, 22, 16);
        sNoseGeo.rotateZ(Math.PI / 2);
        const sNose = new THREE.Mesh(sNoseGeo, shuttleMat);
        sNose.position.set(43, 10, 0);
        group.add(sNose);

        // Heat shield belly tiles
        const bellyGeo = new THREE.BoxGeometry(55, 1.5, 20);
        const belly = new THREE.Mesh(bellyGeo, heatTile);
        belly.position.set(0, 1.5, 0);
        group.add(belly);

        // Delta wings
        for (const s of [-1, 1]) {
          const sWingGeo = new THREE.BufferGeometry();
          const swv = new Float32Array([
            0, 10, s*10,  0, 10, s*12,  -36, 4, s*46,
            -18, 8, s*12, -36, 4, s*44, -36, 4, s*46
          ]);
          sWingGeo.setAttribute('position', new THREE.BufferAttribute(swv, 3));
          sWingGeo.computeVertexNormals();
          group.add(new THREE.Mesh(sWingGeo, shuttleMat));
          const wingUnder = new THREE.Mesh(new THREE.BoxGeometry(40, 1.2, 18), heatTile);
          wingUnder.position.set(-18, 3.5, s * 30);
          group.add(wingUnder);
        }

        // Vertical stabilizer
        const stabGeo = new THREE.BufferGeometry();
        const stv = new Float32Array([
          -8, 10, 0,  -20, 10, 0, -28, 30, 0,
          -8, 10, 2,  -20, 10, 2, -28, 30, 2
        ]);
        stabGeo.setAttribute('position', new THREE.BufferAttribute(stv, 3));
        stabGeo.setIndex([0,1,2, 3,5,4]);
        stabGeo.computeVertexNormals();
        group.add(new THREE.Mesh(stabGeo, shuttleMat));

        // 3 OMS engines
        for (const o of [-6, 0, 6]) {
          const omsGeo = new THREE.CylinderGeometry(2.5, 4, 10, 12);
          omsGeo.rotateZ(Math.PI / 2);
          const oms = new THREE.Mesh(omsGeo, heatTile);
          oms.position.set(-40, 10, o);
          group.add(oms);
        }

        // Payload bay doors
        const bayGeo = new THREE.BoxGeometry(30, 0.8, 18);
        const bayL = new THREE.Mesh(bayGeo, shuttleMat);
        bayL.position.set(5, 17, 0);
        group.add(bayL);

        // Windshield
        const windGeo = new THREE.BoxGeometry(6, 4, 14);
        const wind = new THREE.Mesh(windGeo, winMat);
        wind.position.set(36, 14, 0);
        wind.rotation.z = 0.4;
        group.add(wind);
        break;
      }

      // ----------------------------------------------------
      // MORE ANIMALS
      // ----------------------------------------------------
      case 'animal_shark': {
        // Great White Shark
        const sharkMat = createPbr('#b0b8c8', 0.35, 0.05);
        const bellyMat = createPbr('#f0f2f5', 0.3, 0.05);
        const eyeMat = createPbr('#000000', 0.05, 0.9, '#000020', 0.1);

        // Main body - torpedo shape
        const bodyGeo = new THREE.CylinderGeometry(8, 3, 80, 20);
        bodyGeo.rotateZ(Math.PI / 2);
        const body = new THREE.Mesh(bodyGeo, sharkMat);
        body.position.set(0, 10, 0);
        group.add(body);

        // Head - slightly flattened
        const headGeo = new THREE.SphereGeometry(9, 20, 16);
        headGeo.scale(1.4, 0.8, 1.0);
        const head = new THREE.Mesh(headGeo, sharkMat);
        head.position.set(40, 10, 0);
        group.add(head);

        // Snout
        const snoutGeo = new THREE.ConeGeometry(4, 20, 14);
        snoutGeo.rotateZ(Math.PI / 2);
        const snout = new THREE.Mesh(snoutGeo, sharkMat);
        snout.position.set(56, 10, 0);
        group.add(snout);

        // White belly counter-shading
        const sbellyGeo = new THREE.CylinderGeometry(7.5, 2.5, 78, 20);
        sbellyGeo.rotateZ(Math.PI / 2);
        const sbelly = new THREE.Mesh(sbellyGeo, bellyMat);
        sbelly.position.set(0, 6, 0);
        sbelly.scale.set(1, 0.35, 0.9);
        group.add(sbelly);

        // Dorsal fin
        const dFin = new THREE.Mesh(new THREE.ConeGeometry(4, 22, 8), sharkMat);
        dFin.position.set(0, 28, 0);
        dFin.rotation.z = -0.2;
        group.add(dFin);

        // Pectoral fins
        for (const s of [-1, 1]) {
          const pecGeo = new THREE.BufferGeometry();
          const pv = new Float32Array([
            20, 10, s*8,  -10, 10, s*8,  5, 8, s*44,
            20, 8, s*8,   -10, 8, s*8,   5, 6, s*42
          ]);
          pecGeo.setAttribute('position', new THREE.BufferAttribute(pv, 3));
          pecGeo.setIndex([0,2,1, 3,4,5]);
          pecGeo.computeVertexNormals();
          group.add(new THREE.Mesh(pecGeo, sharkMat));
        }

        // Caudal (tail) fin - lunate shape
        const tailFinGeo = new THREE.BufferGeometry();
        const tfv = new Float32Array([
          -38, 10, 0,  -50, 28, 0,  -55, 14, 0,
          -38, 10, 0,  -55, -4, 0,  -50, -8, 0,
        ]);
        tailFinGeo.setAttribute('position', new THREE.BufferAttribute(tfv, 3));
        tailFinGeo.computeVertexNormals();
        group.add(new THREE.Mesh(tailFinGeo, sharkMat));

        // Black eyes
        for (const s of [-1, 1]) {
          const eyeGeo = new THREE.SphereGeometry(2, 12, 12);
          const eye = new THREE.Mesh(eyeGeo, eyeMat);
          eye.position.set(42, 15, s * 8);
          group.add(eye);
        }
        break;
      }

      case 'animal_lion': {
        const furMat = createPbr('#c8892a', 0.7, 0.02);
        const maneMat = createPbr('#5c2d08', 0.85, 0.01);
        const noseMat = createPbr('#b05040', 0.5, 0.02);

        // Body
        const lBodyGeo = new THREE.SphereGeometry(14, 20, 14);
        lBodyGeo.scale(1.4, 1.0, 1.7);
        const lBody = new THREE.Mesh(lBodyGeo, furMat);
        lBody.position.set(0, 18, 0);
        group.add(lBody);

        // Chest
        const chestGeo = new THREE.SphereGeometry(11, 16, 12);
        chestGeo.scale(1.0, 1.1, 0.9);
        const chest = new THREE.Mesh(chestGeo, furMat);
        chest.position.set(0, 18, 16);
        group.add(chest);

        // Neck
        const neckGeo = new THREE.CylinderGeometry(7, 8, 10, 14);
        const neck = new THREE.Mesh(neckGeo, furMat);
        neck.position.set(0, 22, 22);
        group.add(neck);

        // Massive mane sphere
        const maneGeo = new THREE.SphereGeometry(14, 20, 14);
        const mane = new THREE.Mesh(maneGeo, maneMat);
        mane.position.set(0, 28, 28);
        group.add(mane);

        // Head inside mane
        const lHeadGeo = new THREE.SphereGeometry(10, 20, 14);
        lHeadGeo.scale(1.1, 0.9, 1.0);
        const lHead = new THREE.Mesh(lHeadGeo, furMat);
        lHead.position.set(0, 29, 30);
        group.add(lHead);

        // Snout
        const lSnoutGeo = new THREE.SphereGeometry(5, 12, 10);
        lSnoutGeo.scale(1.0, 0.7, 1.0);
        const lSnout = new THREE.Mesh(lSnoutGeo, furMat);
        lSnout.position.set(0, 26, 39);
        group.add(lSnout);

        // Nose leather
        const lNose = new THREE.Mesh(new THREE.SphereGeometry(1.8, 8, 8), noseMat);
        lNose.position.set(0, 27.5, 43.5);
        group.add(lNose);

        // Ears
        for (const s of [-1, 1]) {
          const earGeo = new THREE.ConeGeometry(3.5, 6, 8);
          const ear = new THREE.Mesh(earGeo, furMat);
          ear.position.set(s * 10, 38, 27);
          group.add(ear);
        }

        // 4 Legs
        const legPos = [[-9, 9, -8], [9, 9, -8], [-9, 9, 10], [9, 9, 10]];
        legPos.forEach(([lx, ly, lz]) => {
          const lgGeo = new THREE.CylinderGeometry(3.5, 3, 18, 12);
          const lg = new THREE.Mesh(lgGeo, furMat);
          lg.position.set(lx, ly, lz);
          group.add(lg);
          const paw = new THREE.Mesh(new THREE.SphereGeometry(4, 10, 8), furMat);
          paw.scale.set(1.1, 0.5, 1.2);
          paw.position.set(lx, 0.5, lz + 2);
          group.add(paw);
        });

        // Tail with tuft
        const tGeo = new THREE.CylinderGeometry(1.5, 1, 30, 8);
        tGeo.rotateX(0.6);
        const tMesh = new THREE.Mesh(tGeo, furMat);
        tMesh.position.set(0, 20, -28);
        group.add(tMesh);
        const tuft = new THREE.Mesh(new THREE.SphereGeometry(4.5, 10, 8), maneMat);
        tuft.position.set(0, 28, -45);
        group.add(tuft);
        break;
      }

      case 'animal_elephant': {
        const eleSkin = createPbr('#5c5548', 0.8, 0.02);
        const tuskMat = createPbr('#ede0c0', 0.25, 0.05);

        // Massive body
        const eBGeo = new THREE.SphereGeometry(22, 18, 14);
        eBGeo.scale(1.2, 1.0, 1.5);
        const eBody = new THREE.Mesh(eBGeo, eleSkin);
        eBody.position.set(0, 28, 0);
        group.add(eBody);

        // Rump
        const eRumpGeo = new THREE.SphereGeometry(20, 16, 12);
        const eRump = new THREE.Mesh(eRumpGeo, eleSkin);
        eRump.position.set(0, 26, -18);
        group.add(eRump);

        // Neck & head
        const eNeck = new THREE.Mesh(new THREE.CylinderGeometry(10, 12, 14, 14), eleSkin);
        eNeck.position.set(0, 36, 20);
        group.add(eNeck);

        const eHeadGeo = new THREE.SphereGeometry(14, 20, 14);
        eHeadGeo.scale(1.0, 1.1, 1.0);
        const eHead = new THREE.Mesh(eHeadGeo, eleSkin);
        eHead.position.set(0, 42, 28);
        group.add(eHead);

        // Trunk (segmented)
        const trunkPoints = [0,38,38, 0,32,46, -4,22,52, -8,12,50, -12,4,46];
        for (let i = 0; i < 4; i++) {
          const r = 4.5 - i * 0.6;
          const tSeg = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.7, 12, 12), eleSkin);
          tSeg.position.set(trunkPoints[i*3], trunkPoints[i*3+1], trunkPoints[i*3+2]);
          tSeg.rotation.x = 0.5 - i * 0.15;
          group.add(tSeg);
        }

        // Tusks
        for (const s of [-1, 1]) {
          const tuskGeo = new THREE.CylinderGeometry(0.5, 2.5, 28, 12);
          const tusk = new THREE.Mesh(tuskGeo, tuskMat);
          tusk.position.set(s * 7, 34, 36);
          tusk.rotation.z = s * 0.25;
          tusk.rotation.x = -0.4;
          group.add(tusk);
        }

        // Ears (large flaps)
        for (const s of [-1, 1]) {
          const earGeo = new THREE.SphereGeometry(16, 14, 10);
          earGeo.scale(0.15, 0.75, 0.9);
          const ear = new THREE.Mesh(earGeo, eleSkin);
          ear.position.set(s * 24, 42, 26);
          group.add(ear);
        }

        // 4 Pillar Legs
        [[-12,0,-14],[12,0,-14],[-12,0,8],[12,0,8]].forEach(([lx,,lz]) => {
          const legGeo = new THREE.CylinderGeometry(7, 8, 28, 14);
          const leg = new THREE.Mesh(legGeo, eleSkin);
          leg.position.set(lx, 14, lz);
          group.add(leg);
          const foot = new THREE.Mesh(new THREE.CylinderGeometry(9, 9.5, 6, 14), eleSkin);
          foot.position.set(lx, 3, lz);
          group.add(foot);
        });

        // Tail
        const eTail = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.5, 20, 8), eleSkin);
        eTail.position.set(0, 22, -34);
        eTail.rotation.x = -0.5;
        group.add(eTail);
        break;
      }

      case 'animal_dinosaur': {
        // T-Rex
        const dexMat = createPbr('#4a6b3a', 0.65, 0.02);
        const bellyDinMat = createPbr('#8a9a70', 0.5, 0.02);
        const teethMat = createPbr('#fffde8', 0.2, 0.05);
        const eyeDinMat = createPbr('#ffaa00', 0.2, 0.3, '#ff8800', 0.3);

        // Massive body
        const tBGeo = new THREE.SphereGeometry(18, 16, 12);
        tBGeo.scale(1.0, 0.85, 1.6);
        const tBody = new THREE.Mesh(tBGeo, dexMat);
        tBody.position.set(0, 32, 0);
        group.add(tBody);

        // Neck
        const tNGeo = new THREE.CylinderGeometry(7, 10, 20, 12);
        tNGeo.rotateX(0.5);
        const tNeck = new THREE.Mesh(tNGeo, dexMat);
        tNeck.position.set(0, 44, 16);
        group.add(tNeck);

        // Head - large skull
        const tHGeo = new THREE.SphereGeometry(13, 18, 12);
        tHGeo.scale(1.5, 0.75, 1.0);
        const tHead = new THREE.Mesh(tHGeo, dexMat);
        tHead.position.set(0, 54, 28);
        group.add(tHead);

        // Lower jaw
        const tJawGeo = new THREE.BoxGeometry(18, 4, 22);
        const tJaw = new THREE.Mesh(tJawGeo, dexMat);
        tJaw.position.set(0, 46, 32);
        group.add(tJaw);

        // Teeth rows
        for (let i = 0; i < 6; i++) {
          const tth = new THREE.Mesh(new THREE.ConeGeometry(1.2, 4, 6), teethMat);
          tth.position.set(-10 + i * 4, 49, 42);
          tth.rotation.x = Math.PI;
          group.add(tth);
          const tthl = new THREE.Mesh(new THREE.ConeGeometry(1.2, 3.5, 6), teethMat);
          tthl.position.set(-10 + i * 4, 46, 42);
          group.add(tthl);
        }

        // Tiny vestigial arms
        for (const s of [-1, 1]) {
          const armGeo = new THREE.CylinderGeometry(2, 2.5, 10, 8);
          const arm = new THREE.Mesh(armGeo, dexMat);
          arm.position.set(s * 16, 42, 14);
          arm.rotation.z = s * 0.8;
          arm.rotation.x = -0.5;
          group.add(arm);
          const handGeo = new THREE.SphereGeometry(3, 8, 6);
          const hand = new THREE.Mesh(handGeo, dexMat);
          hand.position.set(s * 22, 37, 18);
          group.add(hand);
        }

        // Eyes
        for (const s of [-1, 1]) {
          const eyeG = new THREE.SphereGeometry(2.5, 12, 10);
          const eyeM = new THREE.Mesh(eyeG, eyeDinMat);
          eyeM.position.set(s * 10, 57, 28);
          group.add(eyeM);
        }

        // Powerful hind legs
        [[-10, 0], [10, 0]].forEach(([lx]) => {
          const thighGeo = new THREE.CylinderGeometry(7, 6, 22, 12);
          const thigh = new THREE.Mesh(thighGeo, dexMat);
          thigh.position.set(lx, 22, -4);
          thigh.rotation.x = -0.2;
          group.add(thigh);
          const shinGeo = new THREE.CylinderGeometry(4.5, 3.5, 20, 10);
          const shin = new THREE.Mesh(shinGeo, dexMat);
          shin.position.set(lx, 8, 6);
          shin.rotation.x = 0.4;
          group.add(shin);
          const footGeo = new THREE.SphereGeometry(6, 10, 8);
          footGeo.scale(1.2, 0.55, 1.8);
          const foot = new THREE.Mesh(footGeo, dexMat);
          foot.position.set(lx, 1.5, 14);
          group.add(foot);
        });

        // Long counterbalancing tail
        const tSegments = [[0,24,-22], [0,20,-38], [0,17,-52], [0,14,-64]];
        const tRadii = [10, 7, 4.5, 2.5];
        tSegments.forEach(([tx,ty,tz], i) => {
          const tsGeo = new THREE.CylinderGeometry(tRadii[i], tRadii[i > 0 ? i-1 : 0] + 1, 16, 10);
          tsGeo.rotateX(0.15);
          const ts = new THREE.Mesh(tsGeo, dexMat);
          ts.position.set(tx, ty, tz);
          group.add(ts);
        });
        break;
      }

      // ----------------------------------------------------
      // BIRDS
      // ----------------------------------------------------
      case 'bird_phoenix': {
        const flameMat1 = createPbr('#ff4400', 0.2, 0.05, '#ff2200', 1.5);
        const flameMat2 = createPbr('#ffaa00', 0.15, 0.05, '#ffcc00', 1.0);
        const goldMat = createPbr('#d4af37', 0.2, 0.9);

        // Body core
        const phBodyGeo = new THREE.SphereGeometry(10, 18, 14);
        phBodyGeo.scale(0.8, 1.0, 1.4);
        const phBody = new THREE.Mesh(phBodyGeo, flameMat1);
        phBody.position.set(0, 22, 0);
        group.add(phBody);

        // Head
        const phHeadGeo = new THREE.SphereGeometry(7, 16, 12);
        const phHead = new THREE.Mesh(phHeadGeo, flameMat2);
        phHead.position.set(0, 34, 12);
        group.add(phHead);

        // Flame crown plumes
        for (let i = 0; i < 5; i++) {
          const ang = (i - 2) * 0.4;
          const plumeGeo = new THREE.ConeGeometry(2, 14 + i * 2, 6);
          const plume = new THREE.Mesh(plumeGeo, i % 2 === 0 ? flameMat1 : flameMat2);
          plume.position.set(Math.sin(ang) * 6, 44 + i * 2, 12);
          group.add(plume);
        }

        // Beak
        const beakGeo = new THREE.ConeGeometry(1.5, 8, 8);
        const beak = new THREE.Mesh(beakGeo, goldMat);
        beak.position.set(0, 33, 20);
        beak.rotation.x = Math.PI / 2;
        group.add(beak);

        // Wings spread dramatically
        for (const s of [-1, 1]) {
          // Primary feather spread
          const wingGeo = new THREE.BufferGeometry();
          const wv = new Float32Array([
            0, 22, 0,   s*18, 32, 8,  s*45, 28, 4,
            0, 20, 0,   s*40, 24, 2,  s*70, 18, -4,
            0, 18, -4,  s*50, 16, -8, s*75, 10, -14,
          ]);
          wingGeo.setAttribute('position', new THREE.BufferAttribute(wv, 3));
          wingGeo.setIndex([0,1,2, 3,4,5, 6,7,8]);
          wingGeo.computeVertexNormals();
          group.add(new THREE.Mesh(wingGeo, s === -1 ? flameMat1 : flameMat2));

          // Flame trailing edges
          for (let f = 0; f < 6; f++) {
            const fGeo = new THREE.ConeGeometry(1.2, 12 + f * 2, 6);
            const fMesh = new THREE.Mesh(fGeo, flameMat1);
            fMesh.position.set(s * (30 + f * 8), 18 - f, -8 - f * 2);
            fMesh.rotation.z = s * (0.6 + f * 0.1);
            group.add(fMesh);
          }
        }

        // Tail plumes
        for (let t = 0; t < 5; t++) {
          const tGeo = new THREE.ConeGeometry(1.5, 28 + t * 4, 6);
          const tMesh = new THREE.Mesh(tGeo, t % 2 === 0 ? flameMat1 : flameMat2);
          tMesh.position.set((t - 2) * 4, 14, -18);
          tMesh.rotation.x = -0.6 - t * 0.08;
          group.add(tMesh);
        }

        // Talons
        for (const s of [-1, 1]) {
          const talGeo = new THREE.CylinderGeometry(1.5, 1, 12, 8);
          const tal = new THREE.Mesh(talGeo, goldMat);
          tal.position.set(s * 5, 5, 4);
          group.add(tal);
          for (let c = 0; c < 3; c++) {
            const clawG = new THREE.ConeGeometry(0.6, 5, 5);
            const claw = new THREE.Mesh(clawG, goldMat);
            claw.position.set(s * (5 + (c - 1) * 2), 0.5, 8 + c * 1.5);
            claw.rotation.x = Math.PI / 2;
            group.add(claw);
          }
        }
        break;
      }

      case 'bird_owl': {
        const owlMat = createPbr('#5c4a2c', 0.65, 0.02);
        const owlLight = createPbr('#c8b090', 0.6, 0.02);
        const owlEye = createPbr('#ff9900', 0.1, 0.1, '#ffaa00', 0.6);
        const beakOwl = createPbr('#d4a835', 0.3, 0.1);

        // Round body
        const oBGeo = new THREE.SphereGeometry(12, 16, 14);
        oBGeo.scale(0.85, 1.15, 0.75);
        const oBody = new THREE.Mesh(oBGeo, owlMat);
        oBody.position.set(0, 18, 0);
        group.add(oBody);

        // Light breast
        const breastGeo = new THREE.SphereGeometry(9, 14, 12);
        breastGeo.scale(0.8, 1.0, 0.5);
        const breast = new THREE.Mesh(breastGeo, owlLight);
        breast.position.set(0, 18, 8);
        group.add(breast);

        // Round head
        const oHGeo = new THREE.SphereGeometry(10, 18, 14);
        const oHead = new THREE.Mesh(oHGeo, owlMat);
        oHead.position.set(0, 34, 0);
        group.add(oHead);

        // Facial disc
        const discGeo = new THREE.SphereGeometry(8, 16, 12);
        discGeo.scale(0.9, 0.8, 0.3);
        const disc = new THREE.Mesh(discGeo, owlLight);
        disc.position.set(0, 34, 8);
        group.add(disc);

        // Large forward-facing eyes
        for (const s of [-1, 1]) {
          const eyeOuter = new THREE.Mesh(new THREE.CircleGeometry(3.5, 20), owlLight);
          eyeOuter.position.set(s * 5, 36, 9);
          group.add(eyeOuter);
          const iris = new THREE.Mesh(new THREE.CircleGeometry(3, 18), owlEye);
          iris.position.set(s * 5, 36, 9.1);
          group.add(iris);
          const pupil = new THREE.Mesh(new THREE.CircleGeometry(1.5, 12), new THREE.MeshBasicMaterial({ color: 0x000000 }));
          pupil.position.set(s * 5, 36, 9.2);
          group.add(pupil);
        }

        // Hooked beak
        const oBeak = new THREE.Mesh(new THREE.ConeGeometry(1.5, 5, 8), beakOwl);
        oBeak.position.set(0, 33, 11);
        oBeak.rotation.x = -Math.PI / 2.5;
        group.add(oBeak);

        // Ear tufts
        for (const s of [-1, 1]) {
          const tuftGeo = new THREE.ConeGeometry(1.5, 7, 6);
          const tuft = new THREE.Mesh(tuftGeo, owlMat);
          tuft.position.set(s * 7, 43, 0);
          tuft.rotation.z = s * 0.3;
          group.add(tuft);
        }

        // Wings (closed, hugging body)
        for (const s of [-1, 1]) {
          const wGeo = new THREE.BoxGeometry(10, 24, 3);
          const wing = new THREE.Mesh(wGeo, owlMat);
          wing.position.set(s * 13, 18, 0);
          wing.rotation.z = s * 0.15;
          group.add(wing);
          // Wing feather striping
          for (let f = 0; f < 4; f++) {
            const stripe = new THREE.Mesh(new THREE.BoxGeometry(9, 0.8, 3.1), owlLight);
            stripe.position.set(s * 13, 26 - f * 5, 0);
            group.add(stripe);
          }
        }

        // Talons on branch
        const branchGeo = new THREE.CylinderGeometry(2.5, 3, 38, 10);
        branchGeo.rotateZ(Math.PI / 2);
        const branch = new THREE.Mesh(branchGeo, createPbr('#3c2010', 0.8, 0.02));
        branch.position.set(0, 4, 0);
        group.add(branch);
        for (const s of [-1, 1]) {
          for (let t = 0; t < 3; t++) {
            const talGeo = new THREE.CylinderGeometry(0.7, 0.3, 9, 6);
            const tal = new THREE.Mesh(talGeo, createPbr('#1a1a1a', 0.3, 0.2));
            tal.position.set(s * 8 + (t - 1) * 2, 4, t * 2);
            tal.rotation.z = s * (0.4 + t * 0.1);
            group.add(tal);
          }
        }
        break;
      }

      // ----------------------------------------------------
      // NEW ALIENS
      // ----------------------------------------------------
      case 'alien_insectoid': {
        const chitin = createPbr('#1a3a0a', 0.25, 0.6);
        const glow = createPbr('#00ff44', 0.1, 0.1, '#00ff44', 1.5);
        const joint = createPbr('#0d1f06', 0.4, 0.3);

        // Thorax
        const thGeo = new THREE.SphereGeometry(10, 14, 12);
        thGeo.scale(0.85, 0.7, 1.4);
        const thorax = new THREE.Mesh(thGeo, chitin);
        thorax.position.set(0, 18, 0);
        group.add(thorax);

        // Abdomen
        const abdGeo = new THREE.SphereGeometry(12, 14, 12);
        abdGeo.scale(0.75, 0.8, 1.6);
        const abd = new THREE.Mesh(abdGeo, chitin);
        abd.position.set(0, 16, -22);
        group.add(abd);

        // Head
        const hGeo = new THREE.SphereGeometry(8, 14, 12);
        hGeo.scale(1.1, 0.9, 1.0);
        const insHead = new THREE.Mesh(hGeo, chitin);
        insHead.position.set(0, 22, 14);
        group.add(insHead);

        // Compound eyes (multifacet)
        for (const s of [-1, 1]) {
          const eyeGeo = new THREE.SphereGeometry(3.5, 14, 10);
          eyeGeo.scale(1.0, 0.8, 0.5);
          const eyeM = new THREE.Mesh(eyeGeo, glow);
          eyeM.position.set(s * 7, 24, 20);
          group.add(eyeM);
        }

        // Mandibles
        for (const s of [-1, 1]) {
          const mandGeo = new THREE.CylinderGeometry(1, 0.3, 14, 6);
          const mand = new THREE.Mesh(mandGeo, chitin);
          mand.position.set(s * 5, 19, 21);
          mand.rotation.z = s * 0.5;
          mand.rotation.x = 0.3;
          group.add(mand);
        }

        // Antennae
        for (const s of [-1, 1]) {
          const antGeo = new THREE.CylinderGeometry(0.4, 0.8, 24, 6);
          const ant = new THREE.Mesh(antGeo, chitin);
          ant.position.set(s * 6, 32, 14);
          ant.rotation.z = s * 0.5;
          ant.rotation.x = -0.4;
          group.add(ant);
          const ball = new THREE.Mesh(new THREE.SphereGeometry(1.8, 8, 6), glow);
          ball.position.set(s * 14, 44, 8);
          group.add(ball);
        }

        // 6 Arthropod legs
        for (let i = 0; i < 3; i++) {
          for (const s of [-1, 1]) {
            const legSegGeo = new THREE.CylinderGeometry(1.2, 1.8, 16, 8);
            const legSeg = new THREE.Mesh(legSegGeo, chitin);
            const zPos = -4 + i * 6;
            legSeg.position.set(s * 12, 14, zPos);
            legSeg.rotation.z = s * (0.6 + i * 0.1);
            legSeg.rotation.x = -0.3;
            group.add(legSeg);
            const lowerGeo = new THREE.CylinderGeometry(0.7, 1, 14, 6);
            const lower = new THREE.Mesh(lowerGeo, joint);
            lower.position.set(s * 22, 7, zPos + 4);
            lower.rotation.z = s * 0.4;
            lower.rotation.x = 0.5;
            group.add(lower);
          }
        }

        // Wings (4 translucent)
        for (const s of [-1, 1]) {
          for (let w = 0; w < 2; w++) {
            const wGeo = new THREE.BufferGeometry();
            const wv = new Float32Array([
              0, 20, 0,  s*35, 32+w*6, -4-w*8,  s*28, 20, -8-w*10
            ]);
            wGeo.setAttribute('position', new THREE.BufferAttribute(wv, 3));
            wGeo.computeVertexNormals();
            group.add(new THREE.Mesh(wGeo, glow));
          }
        }
        break;
      }

      case 'alien_jellyfish': {
        const jBellMat = createPbr('#6600cc', 0.15, 0.1, '#aa00ff', 0.8);
        const jTentMat = createPbr('#cc00ff', 0.1, 0.05, '#ff00ff', 1.2);
        const jCoreMat = createPbr('#ffffff', 0.05, 0.1, '#88ffff', 1.5);

        // Bell/Umbrella
        const bellGeo = new THREE.SphereGeometry(18, 24, 16);
        bellGeo.scale(1.0, 0.55, 1.0);
        const bell = new THREE.Mesh(bellGeo, jBellMat);
        bell.position.set(0, 28, 0);
        group.add(bell);

        // Inner glow core
        const coreGeo = new THREE.SphereGeometry(8, 16, 12);
        coreGeo.scale(1.0, 0.5, 1.0);
        const core = new THREE.Mesh(coreGeo, jCoreMat);
        core.position.set(0, 26, 0);
        group.add(core);

        // Oral arms (4 thick)
        for (let i = 0; i < 4; i++) {
          const ang = (i * Math.PI) / 2;
          const oaGeo = new THREE.CylinderGeometry(2.5, 0.5, 24, 8);
          const oa = new THREE.Mesh(oaGeo, jBellMat);
          oa.position.set(Math.cos(ang) * 6, 12, Math.sin(ang) * 6);
          group.add(oa);
        }

        // Tentacles (16 trailing)
        for (let t = 0; t < 16; t++) {
          const tang = (t * Math.PI * 2) / 16;
          const tLen = 25 + Math.sin(t * 1.7) * 15;
          const tentGeo = new THREE.CylinderGeometry(0.4, 0.1, tLen, 6);
          const tent = new THREE.Mesh(tentGeo, jTentMat);
          tent.position.set(Math.cos(tang) * 16, 20 - tLen / 2, Math.sin(tang) * 16);
          group.add(tent);
          // Bioluminescent nodes
          for (let n = 0; n < 4; n++) {
            const node = new THREE.Mesh(new THREE.SphereGeometry(0.7, 6, 6), jCoreMat);
            node.position.set(Math.cos(tang) * 16, 28 - n * tLen / 4, Math.sin(tang) * 16);
            group.add(node);
          }
        }

        // Sub-umbrella ripple rings
        for (let r = 1; r <= 3; r++) {
          const ringGeo = new THREE.TorusGeometry(r * 5, 0.5, 6, 32);
          const ring = new THREE.Mesh(ringGeo, jTentMat);
          ring.position.set(0, 20, 0);
          group.add(ring);
        }
        break;
      }

      // ----------------------------------------------------
      // VEHICLES
      // ----------------------------------------------------
      case 'car_muscle': {
        const muscleMat = createPbr('#b91c1c', 0.12, 0.88); // Deep crimson
        const darkMat = createPbr('#111111', 0.3, 0.6);
        const chromeMat = createPbr('#e0e8ef', 0.1, 0.98);
        const glassM = createPbr('#050b14', 0.05, 0.8);

        // Main body - classic muscle car fastback
        const mBGeo = new THREE.BoxGeometry(30, 10, 70);
        const mBody = new THREE.Mesh(mBGeo, muscleMat);
        mBody.position.set(0, 10, 0);
        group.add(mBody);

        // Hood with bulge
        const hoodGeo = new THREE.BoxGeometry(28, 4, 30);
        const hood = new THREE.Mesh(hoodGeo, muscleMat);
        hood.position.set(0, 17, 25);
        hood.rotation.x = -0.12;
        group.add(hood);

        // Hood power bulge
        const bulgeGeo = new THREE.SphereGeometry(5, 12, 8);
        bulgeGeo.scale(1.4, 0.4, 2.0);
        const bulge = new THREE.Mesh(bulgeGeo, muscleMat);
        bulge.position.set(0, 20.5, 22);
        group.add(bulge);

        // Fastback roofline
        const roofGeo = new THREE.BoxGeometry(26, 5, 34);
        const roof = new THREE.Mesh(roofGeo, muscleMat);
        roof.position.set(0, 18, -6);
        group.add(roof);

        // Windshield
        const wshieldGeo = new THREE.BoxGeometry(24, 8, 1.5);
        const wshield = new THREE.Mesh(wshieldGeo, glassM);
        wshield.position.set(0, 21, 10);
        wshield.rotation.x = 0.45;
        group.add(wshield);

        // Grille - stacked horizontal bars
        for (let g = 0; g < 4; g++) {
          const gBar = new THREE.Mesh(new THREE.BoxGeometry(22, 1.2, 1.5), darkMat);
          gBar.position.set(0, 7 + g * 2.5, 37);
          group.add(gBar);
        }

        // Chrome bumpers
        const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(32, 3, 2), chromeMat);
        frontBumper.position.set(0, 5.5, 37.5);
        group.add(frontBumper);
        const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(32, 3, 2), chromeMat);
        rearBumper.position.set(0, 5.5, -37.5);
        group.add(rearBumper);

        // Round headlights (classic dual)
        for (const s of [-1, 1]) {
          for (const h of [-7, -3]) {
            const hlGeo = new THREE.CylinderGeometry(3, 3, 1.5, 20);
            hlGeo.rotateX(Math.PI / 2);
            const hl = new THREE.Mesh(hlGeo, createPbr('#fffde8', 0.1, 0.05, '#ffff88', 1.0));
            hl.position.set(s * h, 10, 37.5);
            group.add(hl);
            const hlRing = new THREE.Mesh(new THREE.TorusGeometry(3, 0.5, 6, 20), chromeMat);
            hlRing.position.set(s * h, 10, 37.5);
            hlRing.rotation.x = Math.PI / 2;
            group.add(hlRing);
          }
        }

        // Dual quad exhausts
        for (const s of [-1, 1]) {
          for (const e of [-4, -1]) {
            const exGeo = new THREE.CylinderGeometry(2, 2, 6, 14);
            exGeo.rotateX(Math.PI / 2);
            const ex = new THREE.Mesh(exGeo, chromeMat);
            ex.position.set(s * 11, e, -40);
            group.add(ex);
          }
        }

        // Tires & wheels
        [[-14,0,-25],[14,0,-25],[-14,0,25],[14,0,25]].forEach(([wx,,wz]) => {
          const tireGeo = new THREE.TorusGeometry(9, 4, 12, 24);
          const tire = new THREE.Mesh(tireGeo, darkMat);
          tire.position.set(wx, 9, wz);
          tire.rotation.y = Math.PI / 2;
          group.add(tire);
          const rimGeo = new THREE.CylinderGeometry(7.5, 7.5, 3, 5); // 5-spoke
          const rim = new THREE.Mesh(rimGeo, chromeMat);
          rim.position.set(wx, 9, wz);
          rim.rotation.z = Math.PI / 2;
          group.add(rim);
        });
        break;
      }

      case 'car_formula': {
        const f1Mat = createPbr('#dc2626', 0.15, 0.05); // Ferrari red
        const carbonMat2 = createPbr('#111115', 0.35, 0.75);
        const goldMat2 = createPbr('#ca8a04', 0.2, 0.95);
        const rubberMat = createPbr('#111111', 0.7, 0.02);

        // Monocoque tub
        const monGeo = new THREE.CylinderGeometry(3, 6, 65, 12);
        monGeo.rotateZ(Math.PI / 2);
        const monocoque = new THREE.Mesh(monGeo, f1Mat);
        monocoque.position.set(0, 8, 0);
        group.add(monocoque);

        // Long nose cone
        const f1NoseGeo = new THREE.ConeGeometry(2.5, 30, 10);
        f1NoseGeo.rotateZ(Math.PI / 2);
        const f1Nose = new THREE.Mesh(f1NoseGeo, carbonMat2);
        f1Nose.position.set(47, 8, 0);
        group.add(f1Nose);

        // Open cockpit
        const cockGeo2 = new THREE.CylinderGeometry(4, 4, 6, 14, 1, true);
        const cock = new THREE.Mesh(cockGeo2, carbonMat2);
        cock.position.set(-5, 13, 0);
        cock.rotation.z = Math.PI / 2;
        group.add(cock);

        // Halo driver protection device
        const haloGeo = new THREE.TorusGeometry(5, 0.8, 6, 24, Math.PI * 1.5);
        const halo = new THREE.Mesh(haloGeo, goldMat2);
        halo.position.set(-5, 16, 0);
        halo.rotation.x = Math.PI / 2;
        group.add(halo);

        // Large front wing
        const fWingGeo = new THREE.BoxGeometry(55, 1, 12);
        const fWing = new THREE.Mesh(fWingGeo, carbonMat2);
        fWing.position.set(32, 4, 0);
        group.add(fWing);
        // Front wing elements
        for (let e = 0; e < 3; e++) {
          const wEl = new THREE.Mesh(new THREE.BoxGeometry(55, 0.8, 4), f1Mat);
          wEl.position.set(32, 5 + e * 2, -2 - e * 3.5);
          wEl.rotation.x = 0.1 * e;
          group.add(wEl);
        }

        // Rear wing
        const rWingGeo = new THREE.BoxGeometry(40, 1, 14);
        const rWing = new THREE.Mesh(rWingGeo, f1Mat);
        rWing.position.set(-32, 20, 0);
        group.add(rWing);
        // DRS wing beam
        const rWEl = new THREE.Mesh(new THREE.BoxGeometry(40, 0.8, 6), carbonMat2);
        rWEl.position.set(-32, 18, 6);
        group.add(rWEl);

        // Rear wing endplates
        for (const s of [-1, 1]) {
          const ep = new THREE.Mesh(new THREE.BoxGeometry(1.5, 12, 14), carbonMat2);
          ep.position.set(s * 21, 17, 0);
          group.add(ep);
        }

        // Floor board & diffuser
        const floorGeo = new THREE.BoxGeometry(45, 1, 14);
        const floor = new THREE.Mesh(floorGeo, carbonMat2);
        floor.position.set(-3, 2, 0);
        group.add(floor);

        // Bargeboard aerodynamic vanes
        for (let v = 0; v < 3; v++) {
          const vGeo = new THREE.BoxGeometry(8, 5, 0.8);
          for (const s of [-1, 1]) {
            const vane = new THREE.Mesh(vGeo, carbonMat2);
            vane.position.set(10, 7, s * (8 + v * 3));
            vane.rotation.y = s * 0.15;
            group.add(vane);
          }
        }

        // 4 slick tires
        const f1TirePositions = [[-28, 0, -24], [28, 0, -24], [-20, 0, 22], [20, 0, 22]];
        const f1TireRadii = [9, 9, 11, 11];
        f1TirePositions.forEach(([tx, , tz], i) => {
          const tGeo = new THREE.TorusGeometry(f1TireRadii[i], f1TireRadii[i] * 0.38, 14, 24);
          const tire = new THREE.Mesh(tGeo, rubberMat);
          tire.position.set(tx, f1TireRadii[i], tz);
          tire.rotation.y = Math.PI / 2;
          group.add(tire);
          const rimG = new THREE.CylinderGeometry(f1TireRadii[i] * 0.72, f1TireRadii[i] * 0.72, f1TireRadii[i] * 0.76, 5);
          const rim = new THREE.Mesh(rimG, goldMat2);
          rim.position.set(tx, f1TireRadii[i], tz);
          rim.rotation.z = Math.PI / 2;
          group.add(rim);
        });

        // Turbo exhaust
        const exGeo2 = new THREE.CylinderGeometry(2, 3, 5, 12);
        exGeo2.rotateX(Math.PI / 2);
        const f1Ex = new THREE.Mesh(exGeo2, goldMat2);
        f1Ex.position.set(0, 12, -34);
        group.add(f1Ex);
        break;
      }

      case 'car_suv': {
        const suvMat = createPbr('#1c4a2a', 0.3, 0.25); // Military green
        const darkSuv = createPbr('#0a0a0a', 0.4, 0.3);
        const suvChrome = createPbr('#c0c8d0', 0.15, 0.85);

        // Boxy body with high ground clearance
        const sBGeo = new THREE.BoxGeometry(34, 16, 68);
        const sBody = new THREE.Mesh(sBGeo, suvMat);
        sBody.position.set(0, 18, 0);
        group.add(sBody);

        // Cab roof
        const sRoofGeo = new THREE.BoxGeometry(32, 4, 48);
        const sRoof = new THREE.Mesh(sRoofGeo, suvMat);
        sRoof.position.set(0, 28, -2);
        group.add(sRoof);

        // Front light bar + roof rack
        const rackGeo = new THREE.BoxGeometry(34, 1, 4);
        const rack = new THREE.Mesh(rackGeo, suvChrome);
        rack.position.set(0, 31, -2);
        group.add(rack);
        const lBar = new THREE.Mesh(new THREE.BoxGeometry(34, 2.5, 3), createPbr('#fffde0', 0.05, 0.1, '#ffff88', 1.0));
        lBar.position.set(0, 33, -2);
        group.add(lBar);

        // Steel bumpers with recovery points
        const sFrontBump = new THREE.Mesh(new THREE.BoxGeometry(38, 6, 3), suvChrome);
        sFrontBump.position.set(0, 10, 37);
        group.add(sFrontBump);
        const sRearBump = new THREE.Mesh(new THREE.BoxGeometry(38, 6, 3), suvChrome);
        sRearBump.position.set(0, 10, -37);
        group.add(sRearBump);

        // Winch
        const winchGeo = new THREE.CylinderGeometry(2.5, 2.5, 14, 12);
        winchGeo.rotateZ(Math.PI / 2);
        const winch = new THREE.Mesh(winchGeo, suvChrome);
        winch.position.set(0, 11, 42);
        group.add(winch);

        // Grille
        for (let g = 0; g < 5; g++) {
          const gBar = new THREE.Mesh(new THREE.BoxGeometry(24, 1.2, 1.5), darkSuv);
          gBar.position.set(0, 14 + g * 2.2, 36.5);
          group.add(gBar);
        }

        // Headlights (square LED)
        for (const s of [-1, 1]) {
          const hl = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 1.5), createPbr('#e8f0ff', 0.05, 0.1, '#8888ff', 0.8));
          hl.position.set(s * 10, 18, 37);
          group.add(hl);
        }

        // Massive off-road tires
        [[-17,0,-24],[17,0,-24],[-17,0,24],[17,0,24]].forEach(([wx,,wz]) => {
          const otGeo = new THREE.TorusGeometry(12, 5.5, 12, 20);
          const oTire = new THREE.Mesh(otGeo, darkSuv);
          oTire.position.set(wx, 12, wz);
          oTire.rotation.y = Math.PI / 2;
          group.add(oTire);
          const oRim = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 6, 6), suvChrome);
          oRim.position.set(wx, 12, wz);
          oRim.rotation.z = Math.PI / 2;
          group.add(oRim);
        });

        // Spare tire mounted on back
        const spareTire = new THREE.Mesh(new THREE.TorusGeometry(11, 5, 12, 20), darkSuv);
        spareTire.position.set(0, 20, -42);
        group.add(spareTire);
        break;
      }

      case 'vehicle_tank': {
        const armorMat = createPbr('#4a5a30', 0.55, 0.15); // Woodland camo
        const darkArmor = createPbr('#1a2010', 0.6, 0.1);
        const steelMat = createPbr('#606878', 0.3, 0.55);

        // Lower hull
        const lHullGeo = new THREE.BoxGeometry(36, 10, 72);
        const lHull = new THREE.Mesh(lHullGeo, armorMat);
        lHull.position.set(0, 10, 0);
        group.add(lHull);

        // Upper hull with sloped composite armor
        const uHullGeo = new THREE.BoxGeometry(34, 8, 60);
        const uHull = new THREE.Mesh(uHullGeo, armorMat);
        uHull.position.set(0, 18, 0);
        group.add(uHull);

        // Sloped front glacis plate
        const glacisGeo = new THREE.BoxGeometry(36, 12, 16);
        const glacis = new THREE.Mesh(glacisGeo, armorMat);
        glacis.position.set(0, 15, 38);
        glacis.rotation.x = -0.55;
        group.add(glacis);

        // Composite turret (Leopard 2 style)
        const turretGeo = new THREE.BoxGeometry(28, 10, 30);
        const turret = new THREE.Mesh(turretGeo, armorMat);
        turret.position.set(0, 28, 8);
        group.add(turret);

        // Turret composite modules
        for (const s of [-1, 1]) {
          const mod = new THREE.Mesh(new THREE.BoxGeometry(4, 9, 28), darkArmor);
          mod.position.set(s * 16, 28, 8);
          group.add(mod);
        }

        // 120mm smoothbore gun barrel
        const barrelGeo = new THREE.CylinderGeometry(2.5, 3, 70, 14);
        barrelGeo.rotateZ(Math.PI / 2);
        const barrel = new THREE.Mesh(barrelGeo, steelMat);
        barrel.position.set(35, 30, 8);
        group.add(barrel);

        // Thermal sleeve
        const sleeveGeo = new THREE.CylinderGeometry(3.5, 3.5, 40, 12);
        sleeveGeo.rotateZ(Math.PI / 2);
        const sleeve = new THREE.Mesh(sleeveGeo, armorMat);
        sleeve.position.set(20, 30, 8);
        group.add(sleeve);

        // Muzzle brake
        const muzzleGeo = new THREE.CylinderGeometry(4, 4, 6, 12);
        muzzleGeo.rotateZ(Math.PI / 2);
        const muzzle = new THREE.Mesh(muzzleGeo, steelMat);
        muzzle.position.set(70, 30, 8);
        group.add(muzzle);

        // Coaxial MG
        const coaxGeo = new THREE.CylinderGeometry(0.8, 0.8, 45, 8);
        coaxGeo.rotateZ(Math.PI / 2);
        const coax = new THREE.Mesh(coaxGeo, steelMat);
        coax.position.set(22, 27, 14);
        group.add(coax);

        // Commander's RCWS machine gun
        const rcwsGeo = new THREE.CylinderGeometry(3, 4, 6, 12);
        const rcws = new THREE.Mesh(rcwsGeo, darkArmor);
        rcws.position.set(0, 36, 0);
        group.add(rcws);

        // Smoke grenade launchers
        for (const s of [-1, 1]) {
          for (let i = 0; i < 3; i++) {
            const sGeo = new THREE.CylinderGeometry(1.5, 1.5, 5, 8);
            sGeo.rotateZ(Math.PI / 2);
            const sm = new THREE.Mesh(sGeo, steelMat);
            sm.position.set(s * 16, 30, 18 + i * 3.5);
            group.add(sm);
          }
        }

        // Steel track links
        for (let t = 0; t < 12; t++) {
          for (const s of [-1, 1]) {
            const tLinkGeo = new THREE.BoxGeometry(4, 5, 6);
            const tLink = new THREE.Mesh(tLinkGeo, darkArmor);
            tLink.position.set(s * 20, 4, -30 + t * 6);
            group.add(tLink);
          }
        }

        // Road wheels
        for (let w = 0; w < 6; w++) {
          for (const s of [-1, 1]) {
            const wGeo = new THREE.TorusGeometry(6, 2, 8, 16);
            const wheel = new THREE.Mesh(wGeo, steelMat);
            wheel.position.set(s * 20, 6, -24 + w * 10);
            wheel.rotation.y = Math.PI / 2;
            group.add(wheel);
          }
        }
        break;
      }

      case 'vehicle_moto': {
        const motoBMat = createPbr('#18181b', 0.12, 0.8); // Matte black
        const motoAccent = createPbr('#22d3ee', 0.1, 0.2, '#00ffff', 1.2); // Cyan neon
        const motorMat = createPbr('#9ca3af', 0.25, 0.85);

        // Main frame tube
        const frameGeo = new THREE.CylinderGeometry(2, 2, 40, 8);
        frameGeo.rotateZ(Math.PI / 2);
        const frame = new THREE.Mesh(frameGeo, motoBMat);
        frame.position.set(0, 18, 0);
        group.add(frame);

        // Engine block
        const engBGeo = new THREE.BoxGeometry(12, 14, 18);
        const engB = new THREE.Mesh(engBGeo, motorMat);
        engB.position.set(0, 14, 0);
        group.add(engB);

        // Sleek fairing body
        const fairGeo2 = new THREE.SphereGeometry(14, 18, 14);
        fairGeo2.scale(0.6, 0.75, 1.4);
        const fairing = new THREE.Mesh(fairGeo2, motoBMat);
        fairing.position.set(0, 20, 5);
        group.add(fairing);

        // Neon LED racing accent strip
        const accentGeo = new THREE.BoxGeometry(1, 1, 26);
        for (const s of [-1, 1]) {
          const acc = new THREE.Mesh(accentGeo, motoAccent);
          acc.position.set(s * 7, 16, 5);
          group.add(acc);
        }

        // Front forks
        for (const s of [-1, 1]) {
          const forkGeo = new THREE.CylinderGeometry(1.5, 1.5, 28, 8);
          const fork = new THREE.Mesh(forkGeo, motorMat);
          fork.position.set(s * 4, 14, 22);
          fork.rotation.x = 0.2;
          group.add(fork);
        }

        // Handlebars
        const hbarGeo = new THREE.CylinderGeometry(1, 1, 24, 8);
        hbarGeo.rotateZ(Math.PI / 2);
        const hbar = new THREE.Mesh(hbarGeo, motorMat);
        hbar.position.set(0, 26, 14);
        group.add(hbar);

        // Seat
        const seatGeo = new THREE.BoxGeometry(14, 2.5, 22);
        const seat = new THREE.Mesh(seatGeo, createPbr('#0f0f0f', 0.9, 0.05));
        seat.position.set(0, 24, -8);
        group.add(seat);

        // Exhaust pipes (twin)
        for (const s of [-1, 1]) {
          const exGeo3 = new THREE.CylinderGeometry(2.5, 2, 24, 10);
          exGeo3.rotateX(-0.3);
          const ex = new THREE.Mesh(exGeo3, motorMat);
          ex.position.set(s * 7, 12, -22);
          group.add(ex);
        }

        // Wheels
        for (const wz of [-22, 22]) {
          const motoTireGeo = new THREE.TorusGeometry(10, 3.5, 12, 24);
          const motoTire = new THREE.Mesh(motoTireGeo, motoBMat);
          motoTire.position.set(0, 10, wz);
          motoTire.rotation.y = Math.PI / 2;
          group.add(motoTire);
          const motoRimGeo = new THREE.CylinderGeometry(8, 8, 1.5, 5); // 5-spoke
          const motoRim = new THREE.Mesh(motoRimGeo, motorMat);
          motoRim.position.set(0, 10, wz);
          motoRim.rotation.z = Math.PI / 2;
          group.add(motoRim);
          // Brake disc
          const discMoto = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 0.8, 20), createPbr('#707888', 0.2, 0.85));
          discMoto.position.set(0, 10, wz);
          discMoto.rotation.z = Math.PI / 2;
          group.add(discMoto);
        }
        break;
      }

      // ----------------------------------------------------
      // ROBOTS
      // ----------------------------------------------------
      case 'robot_mech': {
        const mechMat = createPbr('#2a3040', 0.3, 0.7);
        const mechAccent = createPbr('#ff6600', 0.15, 0.5, '#ff4400', 0.8);
        const mechPlate = createPbr('#1a2030', 0.4, 0.6);
        const mechGlow = createPbr('#00ffff', 0.1, 0.1, '#00ffff', 1.5);

        // Central torso - heavy armored
        const torsoGeo = new THREE.BoxGeometry(30, 26, 18);
        const torso = new THREE.Mesh(torsoGeo, mechMat);
        torso.position.set(0, 46, 0);
        group.add(torso);

        // Shoulders pauldrons
        for (const s of [-1, 1]) {
          const shoulderGeo = new THREE.SphereGeometry(11, 14, 10);
          shoulderGeo.scale(1.0, 0.85, 0.7);
          const shoulder = new THREE.Mesh(shoulderGeo, mechPlate);
          shoulder.position.set(s * 22, 58, 0);
          group.add(shoulder);
        }

        // Arms - upper
        for (const s of [-1, 1]) {
          const uArmGeo = new THREE.CylinderGeometry(5, 4, 24, 10);
          const uArm = new THREE.Mesh(uArmGeo, mechMat);
          uArm.position.set(s * 22, 44, 0);
          uArm.rotation.z = s * 0.2;
          group.add(uArm);

          // Forearm
          const lArmGeo = new THREE.CylinderGeometry(4, 4.5, 22, 10);
          const lArm = new THREE.Mesh(lArmGeo, mechPlate);
          lArm.position.set(s * 26, 28, 0);
          lArm.rotation.z = s * 0.35;
          group.add(lArm);

          // Weapon hand - left: rotary cannon, right: plasma fist
          if (s === -1) {
            const canGeo = new THREE.CylinderGeometry(5.5, 5.5, 6, 14);
            const can = new THREE.Mesh(canGeo, mechMat);
            can.position.set(-32, 16, 0);
            group.add(can);
            for (let b = 0; b < 6; b++) {
              const ang2 = (b * Math.PI * 2) / 6;
              const barrel2 = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 16, 8), mechPlate);
              barrel2.position.set(-32 + Math.cos(ang2) * 3.5, 16, Math.sin(ang2) * 3.5);
              group.add(barrel2);
            }
          } else {
            const fistGeo = new THREE.BoxGeometry(10, 12, 10);
            const fist = new THREE.Mesh(fistGeo, mechMat);
            fist.position.set(32, 16, 0);
            group.add(fist);
            // Plasma knuckles
            for (let k = 0; k < 4; k++) {
              const knuckle = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 2), mechGlow);
              knuckle.position.set(32, 13, -6 + k * 4);
              group.add(knuckle);
            }
          }
        }

        // Head - heavily armored
        const headG = new THREE.BoxGeometry(16, 14, 14);
        const head = new THREE.Mesh(headG, mechMat);
        head.position.set(0, 68, 0);
        group.add(head);

        // Visor slit
        const visorGeo = new THREE.BoxGeometry(12, 3.5, 1.5);
        const visor = new THREE.Mesh(visorGeo, mechGlow);
        visor.position.set(0, 68, 7.5);
        group.add(visor);

        // Antenna
        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 10, 6), mechMat);
        ant.position.set(6, 78, 0);
        group.add(ant);

        // Chest reactor core
        const reactorGeo = new THREE.CylinderGeometry(4, 4, 3, 16);
        const reactor = new THREE.Mesh(reactorGeo, mechGlow);
        reactor.position.set(0, 50, 9.5);
        group.add(reactor);

        // Hip joints
        const hipGeo = new THREE.BoxGeometry(36, 8, 16);
        const hips = new THREE.Mesh(hipGeo, mechPlate);
        hips.position.set(0, 34, 0);
        group.add(hips);

        // Legs - heavy pillar
        for (const s of [-1, 1]) {
          const thighG = new THREE.CylinderGeometry(7, 6, 22, 12);
          const thigh = new THREE.Mesh(thighG, mechMat);
          thigh.position.set(s * 12, 20, 0);
          group.add(thigh);

          const shinG = new THREE.CylinderGeometry(5.5, 7, 20, 12);
          const shin = new THREE.Mesh(shinG, mechPlate);
          shin.position.set(s * 12, 6, 2);
          group.add(shin);

          // Foot - large platform
          const footG = new THREE.BoxGeometry(14, 5, 22);
          const foot = new THREE.Mesh(footG, mechMat);
          foot.position.set(s * 12, -3, 4);
          group.add(foot);

          // Knee joint
          const kneeG = new THREE.SphereGeometry(5.5, 10, 8);
          const knee = new THREE.Mesh(kneeG, mechAccent);
          knee.position.set(s * 12, 11, 2);
          group.add(knee);
        }

        // Backpack exhaust/jets
        for (const s of [-1, 1]) {
          const jetGeo = new THREE.CylinderGeometry(4, 5.5, 16, 12);
          const jet = new THREE.Mesh(jetGeo, mechPlate);
          jet.position.set(s * 10, 52, -12);
          group.add(jet);
          const jetNoz = new THREE.Mesh(new THREE.ConeGeometry(5, 8, 12), mechAccent);
          jetNoz.position.set(s * 10, 42, -14);
          jetNoz.rotation.x = Math.PI;
          group.add(jetNoz);
        }
        break;
      }

      case 'robot_spider': {
        const spiderMat = createPbr('#1a1a2a', 0.25, 0.75);
        const spiderGlow = createPbr('#ff0022', 0.1, 0.05, '#ff0000', 1.5);
        const jointMat = createPbr('#3a3a50', 0.3, 0.6);

        // Central body hull
        const spBodyGeo = new THREE.SphereGeometry(14, 16, 12);
        spBodyGeo.scale(1.2, 0.6, 1.4);
        const spBody = new THREE.Mesh(spBodyGeo, spiderMat);
        spBody.position.set(0, 22, 0);
        group.add(spBody);

        // Head module with sensor array
        const spHeadGeo = new THREE.SphereGeometry(8, 14, 10);
        spHeadGeo.scale(1.1, 0.75, 0.9);
        const spHead = new THREE.Mesh(spHeadGeo, spiderMat);
        spHead.position.set(0, 26, 16);
        group.add(spHead);

        // Sensor eyes (quad cluster)
        for (const s of [-1, 1]) {
          for (const v of [-1, 1]) {
            const eyeG = new THREE.SphereGeometry(2, 10, 8);
            const eyeM = new THREE.Mesh(eyeG, spiderGlow);
            eyeM.position.set(s * 5, 28 + v * 2.5, 23);
            group.add(eyeM);
          }
        }

        // 6 Articulated legs
        for (let i = 0; i < 6; i++) {
          const ang = (i * Math.PI) / 3 + (i < 3 ? 0.3 : -0.3);
          const side = i < 3 ? 1 : -1;
          const baseX = Math.cos(ang) * 14;
          const baseZ = Math.sin(ang) * 14;

          // Hip segment
          const hipG = new THREE.CylinderGeometry(2.5, 2.5, 12, 8);
          const hip = new THREE.Mesh(hipG, spiderMat);
          hip.position.set(baseX, 22, baseZ);
          hip.rotation.z = Math.cos(ang) * 0.8;
          hip.rotation.x = Math.sin(ang) * 0.8;
          group.add(hip);

          // Femur
          const femX = baseX + Math.cos(ang) * 18;
          const femZ = baseZ + Math.sin(ang) * 18;
          const femG = new THREE.CylinderGeometry(1.8, 1.8, 20, 8);
          const fem = new THREE.Mesh(femG, jointMat);
          fem.position.set(femX, 16, femZ);
          fem.rotation.z = Math.cos(ang) * 0.6;
          fem.rotation.x = Math.sin(ang) * 0.6;
          group.add(fem);

          // Tibia
          const tibX = femX + Math.cos(ang) * 16;
          const tibZ = femZ + Math.sin(ang) * 16;
          const tibG = new THREE.CylinderGeometry(1.2, 0.8, 18, 6);
          const tib = new THREE.Mesh(tibG, spiderMat);
          tib.position.set(tibX, 6, tibZ);
          tib.rotation.z = Math.cos(ang) * 0.5;
          tib.rotation.x = Math.sin(ang) * 0.5;
          group.add(tib);

          // Joint spheres
          [hip.position, fem.position].forEach(pos => {
            const jG = new THREE.SphereGeometry(2.8, 8, 6);
            const jMesh = new THREE.Mesh(jG, spiderGlow);
            jMesh.position.copy(pos);
            group.add(jMesh);
          });
        }

        // Autocannon turret on back
        const turGeo = new THREE.CylinderGeometry(4, 4, 6, 10);
        const tur = new THREE.Mesh(turGeo, spiderMat);
        tur.position.set(0, 28, -6);
        group.add(tur);
        const canBarrel = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 20, 8), jointMat);
        canBarrel.position.set(0, 32, -14);
        canBarrel.rotation.x = -0.4;
        group.add(canBarrel);
        break;
      }

      case 'robot_humanoid': {
        const atlasMat = createPbr('#d0d8e8', 0.2, 0.4);
        const atlasAccent = createPbr('#1a66aa', 0.2, 0.6);
        const atlasJoint = createPbr('#606878', 0.3, 0.7);
        const atlasGlow = createPbr('#40a8ff', 0.05, 0.1, '#40a8ff', 1.0);

        // Torso
        const aTorsoGeo = new THREE.BoxGeometry(18, 22, 12);
        const aTorso = new THREE.Mesh(aTorsoGeo, atlasMat);
        aTorso.position.set(0, 46, 0);
        group.add(aTorso);

        // Chest accent panel
        const chestAcc = new THREE.Mesh(new THREE.BoxGeometry(14, 16, 1.5), atlasAccent);
        chestAcc.position.set(0, 47, 6.5);
        group.add(chestAcc);

        // LED sternum
        const sternumGeo = new THREE.BoxGeometry(3, 14, 1.8);
        const sternum = new THREE.Mesh(sternumGeo, atlasGlow);
        sternum.position.set(0, 47, 7);
        group.add(sternum);

        // Head - rounded robot
        const aHeadGeo = new THREE.SphereGeometry(9, 18, 14);
        aHeadGeo.scale(0.9, 1.0, 0.85);
        const aHead = new THREE.Mesh(aHeadGeo, atlasMat);
        aHead.position.set(0, 64, 0);
        group.add(aHead);

        // Visor
        const aVisorGeo = new THREE.BoxGeometry(12, 4.5, 2);
        const aVisor = new THREE.Mesh(aVisorGeo, atlasGlow);
        aVisor.position.set(0, 65, 7.5);
        group.add(aVisor);

        // Hips
        const aHipGeo = new THREE.BoxGeometry(20, 6, 12);
        const aHips = new THREE.Mesh(aHipGeo, atlasMat);
        aHips.position.set(0, 32, 0);
        group.add(aHips);

        // Arms with elbow & wrist joints
        for (const s of [-1, 1]) {
          // Shoulder
          const aShoulderGeo = new THREE.SphereGeometry(7, 12, 10);
          const aShoulder = new THREE.Mesh(aShoulderGeo, atlasJoint);
          aShoulder.position.set(s * 15, 57, 0);
          group.add(aShoulder);

          const uAG = new THREE.CylinderGeometry(4, 3.5, 20, 10);
          const uA = new THREE.Mesh(uAG, atlasMat);
          uA.position.set(s * 18, 46, 0);
          group.add(uA);

          const elbGeo = new THREE.SphereGeometry(4.5, 10, 8);
          const elbow = new THREE.Mesh(elbGeo, atlasJoint);
          elbow.position.set(s * 22, 35, 0);
          group.add(elbow);

          const lAG = new THREE.CylinderGeometry(3.5, 3, 18, 10);
          const lA = new THREE.Mesh(lAG, atlasMat);
          lA.position.set(s * 26, 25, 0);
          group.add(lA);

          // Hand with fingers
          const handG = new THREE.SphereGeometry(4.5, 10, 8);
          const hand = new THREE.Mesh(handG, atlasMat);
          hand.position.set(s * 30, 16, 0);
          group.add(hand);
          for (let f = 0; f < 4; f++) {
            const fingG = new THREE.CylinderGeometry(0.7, 0.5, 5, 6);
            const fing = new THREE.Mesh(fingG, atlasAccent);
            fing.position.set(s * 30, 10, (f - 1.5) * 2.2);
            group.add(fing);
          }
        }

        // Legs - precisely articulated
        for (const s of [-1, 1]) {
          const aHipBallGeo = new THREE.SphereGeometry(6, 10, 8);
          const aHipBall = new THREE.Mesh(aHipBallGeo, atlasJoint);
          aHipBall.position.set(s * 7, 30, 0);
          group.add(aHipBall);

          const aThighGeo = new THREE.CylinderGeometry(5, 4.5, 18, 12);
          const aThigh = new THREE.Mesh(aThighGeo, atlasMat);
          aThigh.position.set(s * 7, 20, 0);
          group.add(aThigh);

          const aKneeGeo = new THREE.SphereGeometry(5, 10, 8);
          const aKnee = new THREE.Mesh(aKneeGeo, atlasJoint);
          aKnee.position.set(s * 7, 11, 0);
          group.add(aKnee);

          const aShinGeo = new THREE.CylinderGeometry(4, 3.5, 16, 10);
          const aShin = new THREE.Mesh(aShinGeo, atlasMat);
          aShin.position.set(s * 7, 3, 0);
          group.add(aShin);

          const aFootGeo = new THREE.BoxGeometry(9, 4, 18);
          const aFoot = new THREE.Mesh(aFootGeo, atlasAccent);
          aFoot.position.set(s * 7, -4, 4);
          group.add(aFoot);
        }
        break;
      }

      // ----------------------------------------------------
      // ARCHITECTURE
      // ----------------------------------------------------
      case 'arch_gothic': {
        const stoneMat = createPbr('#8a8278', 0.7, 0.05);
        const darkStone = createPbr('#3c3830', 0.75, 0.04);
        const glassPaneMat = createPbr('#1a3050', 0.08, 0.3, '#2244aa', 0.3);

        // Main nave
        const naveGeo = new THREE.BoxGeometry(30, 60, 80);
        const nave = new THREE.Mesh(naveGeo, stoneMat);
        nave.position.set(0, 30, 0);
        group.add(nave);

        // Nave roof - pointed barrel vault
        const roofGeo = new THREE.CylinderGeometry(0, 18, 25, 4);
        roofGeo.rotateX(Math.PI / 2);
        roofGeo.rotateY(Math.PI / 4);
        const roof = new THREE.Mesh(roofGeo, darkStone);
        roof.position.set(0, 72.5, 0);
        group.add(roof);

        // Twin bell towers
        for (const s of [-1, 1]) {
          const towerGeo2 = new THREE.CylinderGeometry(8, 9, 90, 8);
          const tower2 = new THREE.Mesh(towerGeo2, stoneMat);
          tower2.position.set(s * 22, 45, 44);
          group.add(tower2);

          // Tower spire
          const spireGeo = new THREE.ConeGeometry(8, 50, 8);
          const spire = new THREE.Mesh(spireGeo, darkStone);
          spire.position.set(s * 22, 115, 44);
          group.add(spire);

          // Lancet windows on towers
          for (let w = 0; w < 4; w++) {
            const lWinGeo = new THREE.BoxGeometry(3, 10, 1.5);
            const lWin = new THREE.Mesh(lWinGeo, glassPaneMat);
            lWin.position.set(s * 22, 55 + w * 10, 53 + w * 0.5);
            group.add(lWin);
          }
        }

        // Rose window (round with tracery)
        const roseGeo = new THREE.CircleGeometry(10, 24);
        const rose = new THREE.Mesh(roseGeo, glassPaneMat);
        rose.position.set(0, 52, 41);
        group.add(rose);
        for (let r = 0; r < 8; r++) {
          const ang = (r * Math.PI * 2) / 8;
          const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.8, 9, 1), stoneMat);
          spoke.position.set(Math.cos(ang) * 4.5, 52 + Math.sin(ang) * 4.5, 41.5);
          group.add(spoke);
        }

        // Flying buttresses
        for (let b = 0; b < 4; b++) {
          for (const s of [-1, 1]) {
            const butGeo = new THREE.CylinderGeometry(1.5, 2, 28, 8);
            const but = new THREE.Mesh(butGeo, stoneMat);
            but.position.set(s * 26, 42, -20 + b * 14);
            but.rotation.z = s * 0.55;
            group.add(but);
          }
        }

        // Pointed arch doorway
        const doorGeo = new THREE.BoxGeometry(12, 20, 2);
        const door = new THREE.Mesh(doorGeo, darkStone);
        door.position.set(0, 20, 41);
        group.add(door);
        const archGeo = new THREE.TorusGeometry(6, 1.5, 8, 16, Math.PI);
        const arch = new THREE.Mesh(archGeo, stoneMat);
        arch.position.set(0, 30, 41);
        group.add(arch);
        break;
      }

      case 'arch_tower': {
        const glassFacade = createPbr('#0e2035', 0.08, 0.85, '#0033aa', 0.2);
        const structMat = createPbr('#2a3040', 0.35, 0.6);
        const ledFacade = createPbr('#00aaff', 0.05, 0.1, '#0088ff', 0.8);

        // Parametric tapering tower
        const segments = 12;
        for (let i = 0; i < segments; i++) {
          const t = i / segments;
          const r = 18 - t * 10;
          const h = 16;
          const segGeo = new THREE.CylinderGeometry(r - 0.5 / segments, r, h, 4);
          const seg = new THREE.Mesh(segGeo, i % 2 === 0 ? glassFacade : structMat);
          seg.position.set(0, i * h + h / 2, 0);
          seg.rotation.y = (i * Math.PI) / 8;
          group.add(seg);

          // LED band every 2 floors
          if (i % 3 === 0) {
            const ledBand = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.5, r + 0.5, 1, 4), ledFacade);
            ledBand.position.set(0, i * h + h, 0);
            ledBand.rotation.y = (i * Math.PI) / 8;
            group.add(ledBand);
          }
        }

        // Crown / spire
        const crownGeo = new THREE.ConeGeometry(10, 40, 4);
        const crown = new THREE.Mesh(crownGeo, structMat);
        crown.position.set(0, 220, 0);
        group.add(crown);

        // Antenna mast
        const mastGeo = new THREE.CylinderGeometry(0.8, 0.8, 30, 6);
        const mast = new THREE.Mesh(mastGeo, createPbr('#e0e0e0', 0.2, 0.9));
        mast.position.set(0, 255, 0);
        group.add(mast);

        // Sky bridge observation deck
        const deckGeo = new THREE.CylinderGeometry(22, 22, 5, 4);
        const deck = new THREE.Mesh(deckGeo, glassFacade);
        deck.position.set(0, 160, 0);
        group.add(deck);

        // Base plaza
        const plazaGeo = new THREE.BoxGeometry(80, 4, 80);
        const plaza = new THREE.Mesh(plazaGeo, structMat);
        plaza.position.set(0, 2, 0);
        group.add(plaza);
        break;
      }

      case 'arch_colosseum': {
        const marbleMat = createPbr('#c8c0a8', 0.45, 0.08);
        const shadowMat = createPbr('#4a4438', 0.7, 0.05);
        const archMatCol = createPbr('#a09580', 0.5, 0.06);

        // Build 3 tiers of arched facade
        const tiers = [{ rInner: 52, rOuter: 60, h: 22 }, { rInner: 55, rOuter: 62, h: 22 }, { rInner: 58, rOuter: 64, h: 18 }];
        tiers.forEach((tier, ti) => {
          const tierGeo = new THREE.CylinderGeometry(tier.rOuter, tier.rOuter, tier.h, 40, 1, true);
          const tierMesh = new THREE.Mesh(tierGeo, ti % 2 === 0 ? marbleMat : archMatCol);
          tierMesh.position.set(0, ti * 22 + tier.h / 2, 0);
          group.add(tierMesh);

          // Arcade openings
          for (let a = 0; a < 40; a++) {
            const aAng = (a * Math.PI * 2) / 40;
            const openGeo = new THREE.BoxGeometry(4, tier.h - 4, 6);
            const opening = new THREE.Mesh(openGeo, shadowMat);
            opening.position.set(Math.cos(aAng) * tier.rOuter, ti * 22 + tier.h / 2, Math.sin(aAng) * tier.rOuter);
            opening.rotation.y = aAng;
            group.add(opening);
          }
        });

        // Attic story (solid)
        const atticGeo = new THREE.CylinderGeometry(62, 62, 12, 40, 1, true);
        const attic = new THREE.Mesh(atticGeo, marbleMat);
        attic.position.set(0, 71, 0);
        group.add(attic);

        // Arena floor
        const arenaGeo = new THREE.CylinderGeometry(48, 48, 2, 36);
        const arena = new THREE.Mesh(arenaGeo, createPbr('#d4c090', 0.7, 0.02));
        arena.position.set(0, 1, 0);
        group.add(arena);

        // Hypogeum underground structure
        const hypoGeo = new THREE.CylinderGeometry(46, 46, 8, 36, 1, true);
        const hypo = new THREE.Mesh(hypoGeo, shadowMat);
        hypo.position.set(0, -3, 0);
        group.add(hypo);

        // Velarium anchor posts
        for (let p = 0; p < 20; p++) {
          const pAng = (p * Math.PI * 2) / 20;
          const postGeo = new THREE.CylinderGeometry(0.8, 0.8, 8, 6);
          const post = new THREE.Mesh(postGeo, marbleMat);
          post.position.set(Math.cos(pAng) * 63, 82, Math.sin(pAng) * 63);
          group.add(post);
        }
        break;
      }

      case 'arch_pyramid': {
        const sandstone = createPbr('#c8a870', 0.55, 0.08);
        const limestone = createPbr('#e8d8b0', 0.45, 0.06);
        const goldCapMat = createPbr('#d4af37', 0.18, 0.92);

        // Main pyramid body with horizontal course layers
        const layers = 20;
        for (let l = 0; l < layers; l++) {
          const t = l / layers;
          const size = 90 - t * 88;
          const layerGeo = new THREE.BoxGeometry(size, 4.5, size);
          const layer = new THREE.Mesh(layerGeo, l % 2 === 0 ? sandstone : limestone);
          layer.position.set(0, l * 4.5 + 2.25, 0);
          group.add(layer);
        }

        // Electrum pyramidion cap
        const capGeo = new THREE.ConeGeometry(6, 12, 4);
        const cap = new THREE.Mesh(capGeo, goldCapMat);
        cap.position.set(0, 96, 0);
        cap.rotation.y = Math.PI / 4;
        group.add(cap);

        // Grand entrance mastaba (porch)
        const entranceGeo = new THREE.BoxGeometry(30, 16, 24);
        const entrance = new THREE.Mesh(entranceGeo, limestone);
        entrance.position.set(0, 8, 58);
        group.add(entrance);

        // Dromos sphinx avenue (simplified)
        for (let s = 0; s < 4; s++) {
          const sBase = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 18), sandstone);
          sBase.position.set((s % 2 === 0 ? -25 : 25), 2.5, 80 + Math.floor(s / 2) * 20);
          group.add(sBase);
        }

        // Mortuary temple
        const templeGeo = new THREE.BoxGeometry(40, 12, 28);
        const temple = new THREE.Mesh(templeGeo, limestone);
        temple.position.set(0, 6, -65);
        group.add(temple);
        break;
      }

      case 'arch_lighthouse': {
        const towMat = createPbr('#f0ece0', 0.35, 0.06);
        const towBand = createPbr('#c0302a', 0.3, 0.08);
        const glassBMat = createPbr('#88ccff', 0.05, 0.3, '#aaddff', 0.5);
        const metalLH = createPbr('#708090', 0.25, 0.75);

        // Tower shaft (tapering)
        const shaftGeo = new THREE.CylinderGeometry(5, 12, 80, 18);
        const shaft = new THREE.Mesh(shaftGeo, towMat);
        shaft.position.set(0, 40, 0);
        group.add(shaft);

        // Red stripe bands
        for (let b = 0; b < 3; b++) {
          const bandGeo = new THREE.CylinderGeometry(11.2 - b * 1.4, 11.5 - b * 1.4, 6, 18);
          const band2 = new THREE.Mesh(bandGeo, towBand);
          band2.position.set(0, 18 + b * 22, 0);
          group.add(band2);
        }

        // Service gallery (walkway)
        const gallGeo = new THREE.TorusGeometry(9, 1.5, 8, 24);
        const gall = new THREE.Mesh(gallGeo, metalLH);
        gall.position.set(0, 82, 0);
        group.add(gall);

        // Lantern room
        const lanternGeo = new THREE.CylinderGeometry(7, 8, 14, 10);
        const lantern = new THREE.Mesh(lanternGeo, metalLH);
        lantern.position.set(0, 90, 0);
        group.add(lantern);

        // Glass panels (10)
        for (let g = 0; g < 10; g++) {
          const gAng = (g * Math.PI * 2) / 10;
          const glPanel = new THREE.Mesh(new THREE.BoxGeometry(3.5, 12, 0.8), glassBMat);
          glPanel.position.set(Math.cos(gAng) * 7.5, 90, Math.sin(gAng) * 7.5);
          glPanel.rotation.y = gAng;
          group.add(glPanel);
        }

        // Light source beacon
        const beaconGeo = new THREE.SphereGeometry(4, 16, 12);
        const beacon = new THREE.Mesh(beaconGeo, createPbr('#ffffff', 0.05, 0.1, '#ffffff', 2.5));
        beacon.position.set(0, 90, 0);
        group.add(beacon);

        // Dome cap
        const domeGeo = new THREE.SphereGeometry(7.5, 14, 10);
        domeGeo.scale(1.0, 0.5, 1.0);
        const dome = new THREE.Mesh(domeGeo, metalLH);
        dome.position.set(0, 99, 0);
        group.add(dome);

        // Weathervane
        const wvGeo = new THREE.CylinderGeometry(0.4, 0.4, 12, 5);
        const wv = new THREE.Mesh(wvGeo, metalLH);
        wv.position.set(0, 108, 0);
        group.add(wv);

        // Base cliff rocks
        const baseGeo = new THREE.CylinderGeometry(22, 28, 10, 12);
        const base = new THREE.Mesh(baseGeo, createPbr('#5a5048', 0.85, 0.04));
        base.position.set(0, 0, 0);
        group.add(base);

        // Keeper's cottage
        const cottageGeo = new THREE.BoxGeometry(26, 12, 18);
        const cottage = new THREE.Mesh(cottageGeo, towMat);
        cottage.position.set(-22, 6, 8);
        group.add(cottage);
        const cottRoof = new THREE.Mesh(new THREE.ConeGeometry(17, 8, 4), towBand);
        cottRoof.position.set(-22, 16, 8);
        cottRoof.rotation.y = Math.PI / 4;
        group.add(cottRoof);
        break;
      }

      // ----------------------------------------------------
      // WEAPONS
      // ----------------------------------------------------
      case 'weapon_sword': {
        const bladeMat = createPbr('#d0d8e8', 0.08, 0.95);
        const edgeMat = createPbr('#f0f5ff', 0.05, 0.98);
        const guardMat = createPbr('#d4af37', 0.15, 0.95); // Gold
        const gripMat = createPbr('#4a2c14', 0.7, 0.05);
        const pommelMat = createPbr('#b8960c', 0.12, 0.92);

        // Blade (tapering)
        const bladeGeo = new THREE.BoxGeometry(2.5, 80, 0.6);
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.position.set(0, 50, 0);
        group.add(blade);

        // Edge bevels
        for (const s of [-1, 1]) {
          const bevelGeo = new THREE.BoxGeometry(0.3, 78, 0.5);
          const bevel = new THREE.Mesh(bevelGeo, edgeMat);
          bevel.position.set(s * 1.3, 50, 0);
          group.add(bevel);
        }

        // Blood groove / fuller
        const fullerGeo = new THREE.BoxGeometry(0.6, 70, 0.2);
        const fuller = new THREE.Mesh(fullerGeo, createPbr('#b0b8c8', 0.1, 0.92));
        fuller.position.set(0, 50, 0.35);
        group.add(fuller);

        // Crossguard (quillons)
        const guardGeo = new THREE.BoxGeometry(22, 3.5, 3);
        const guard = new THREE.Mesh(guardGeo, guardMat);
        guard.position.set(0, 9, 0);
        group.add(guard);
        // Quillon tips
        for (const s of [-1, 1]) {
          const qtGeo = new THREE.SphereGeometry(2.5, 10, 8);
          const qt = new THREE.Mesh(qtGeo, pommelMat);
          qt.position.set(s * 12, 9, 0);
          group.add(qt);
        }

        // Grip with wrapped leather
        for (let w = 0; w < 8; w++) {
          const wGeo = new THREE.TorusGeometry(2, 0.6, 6, 16);
          const wrap = new THREE.Mesh(wGeo, w % 2 === 0 ? gripMat : pommelMat);
          wrap.position.set(0, -2 - w * 3, 0);
          group.add(wrap);
        }

        // Grip core
        const gripGeo = new THREE.CylinderGeometry(1.5, 1.5, 24, 8);
        const grip = new THREE.Mesh(gripGeo, gripMat);
        grip.position.set(0, -14, 0);
        group.add(grip);

        // Pommel
        const pommelGeo = new THREE.SphereGeometry(5, 14, 10);
        pommelGeo.scale(1.0, 0.7, 0.6);
        const pommel = new THREE.Mesh(pommelGeo, pommelMat);
        pommel.position.set(0, -28, 0);
        group.add(pommel);
        break;
      }

      case 'weapon_shield': {
        const shieldMat = createPbr('#8b4513', 0.5, 0.05); // Oak wood
        const ironRimMat = createPbr('#707888', 0.25, 0.8);
        const ironBossMat = createPbr('#909aa0', 0.2, 0.85);
        const knotMat = createPbr('#d4af37', 0.2, 0.9); // Norse gold knotwork

        // Shield body - kite shape
        const shieldGeo = new THREE.BufferGeometry();
        const shV = new Float32Array([
          -28, 30, 0,  28, 30, 0,  34, 0, 0,  28, -30, 0,  0, -55, 0,  -28, -30, 0,  -34, 0, 0,
        ]);
        const shIdx = [0,1,2, 0,2,6, 2,3,5, 2,5,6, 3,4,5];
        shieldGeo.setAttribute('position', new THREE.BufferAttribute(shV, 3));
        shieldGeo.setIndex(shIdx);
        shieldGeo.computeVertexNormals();
        group.add(new THREE.Mesh(shieldGeo, shieldMat));

        // Iron rim around edge
        const rimPoints = [];
        const rimAngles = [Math.atan2(30, -28), Math.atan2(30, 28), Math.atan2(0, 34), Math.atan2(-30, 28), Math.atan2(-55, 0), Math.atan2(-30, -28), Math.atan2(0, -34)];
        for (let i = 0; i < 7; i++) {
          rimPoints.push(new THREE.Vector3(shV[i * 3], shV[i * 3 + 1], 0));
        }
        const rimCurve = new THREE.CatmullRomCurve3(rimPoints, true);
        const rimGeo = new THREE.TubeGeometry(rimCurve, 40, 1.5, 6, true);
        group.add(new THREE.Mesh(rimGeo, ironRimMat));

        // Central iron boss
        const bossGeo = new THREE.SphereGeometry(10, 16, 12);
        bossGeo.scale(1.0, 1.0, 0.5);
        const boss = new THREE.Mesh(bossGeo, ironBossMat);
        boss.position.set(0, 0, 3);
        group.add(boss);

        // Norse knotwork ring
        const knotRing = new THREE.Mesh(new THREE.TorusGeometry(16, 1.2, 6, 30), knotMat);
        knotRing.position.set(0, 0, 1.5);
        group.add(knotRing);

        // Planks detail (horizontal lines)
        for (let p = -4; p <= 4; p++) {
          const plankGeo = new THREE.BoxGeometry(60, 0.5, 0.8);
          const plank = new THREE.Mesh(plankGeo, createPbr('#6b3410', 0.55, 0.03));
          plank.position.set(0, p * 7, 0.5);
          group.add(plank);
        }
        break;
      }

      case 'weapon_pistol': {
        const gunMetal = createPbr('#2c2c30', 0.3, 0.75);
        const steelPistol = createPbr('#8090a0', 0.18, 0.9);
        const gripPistol = createPbr('#111118', 0.6, 0.3);
        const redDot = createPbr('#ff0000', 0.05, 0.05, '#ff0000', 2.0);

        // Slide (top)
        const slideGeo = new THREE.BoxGeometry(9, 8, 30);
        const slide = new THREE.Mesh(slideGeo, steelPistol);
        slide.position.set(0, 10, 5);
        group.add(slide);

        // Ejection port cutout
        const ejGeo = new THREE.BoxGeometry(6, 4, 12);
        const ej = new THREE.Mesh(ejGeo, gunMetal);
        ej.position.set(2.5, 12, 4);
        group.add(ej);

        // Frame / receiver
        const frameGeo2 = new THREE.BoxGeometry(9, 6, 26);
        const frame2 = new THREE.Mesh(frameGeo2, gunMetal);
        frame2.position.set(0, 4, 4);
        group.add(frame2);

        // Barrel
        const barelGeo = new THREE.CylinderGeometry(2.5, 2.5, 30, 14);
        barelGeo.rotateZ(Math.PI / 2);
        const barel = new THREE.Mesh(barelGeo, steelPistol);
        barel.position.set(10, 10, 5);
        group.add(barel);

        // Muzzle
        const mGeo = new THREE.CylinderGeometry(2.8, 2.8, 4, 14);
        mGeo.rotateZ(Math.PI / 2);
        const muz = new THREE.Mesh(mGeo, steelPistol);
        muz.position.set(26, 10, 5);
        group.add(muz);

        // Trigger guard
        const tgGeo = new THREE.TorusGeometry(5, 1, 6, 16, Math.PI);
        const tg = new THREE.Mesh(tgGeo, gunMetal);
        tg.position.set(0, 1, 10);
        tg.rotation.x = Math.PI / 2;
        group.add(tg);

        // Trigger
        const trigGeo = new THREE.BoxGeometry(1.2, 5, 1.5);
        const trig = new THREE.Mesh(trigGeo, steelPistol);
        trig.position.set(0, 3, 10);
        group.add(trig);

        // Magazine grip (textured)
        const magGripGeo = new THREE.BoxGeometry(8, 22, 14);
        const magGrip = new THREE.Mesh(magGripGeo, gripPistol);
        magGrip.position.set(0, -8, 0);
        group.add(magGrip);

        // Picatinny rail
        const railGeo = new THREE.BoxGeometry(8, 2, 22);
        const rail = new THREE.Mesh(railGeo, gunMetal);
        rail.position.set(0, 0.5, 4);
        group.add(rail);

        // Red dot sight
        const rdMount = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 9), gunMetal);
        rdMount.position.set(0, 15, 2);
        group.add(rdMount);
        const rdWindow = new THREE.Mesh(new THREE.BoxGeometry(4, 2.5, 1), createPbr('#0a1520', 0.05, 0.5));
        rdWindow.position.set(0, 15.5, 7);
        group.add(rdWindow);
        const rdDot = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 6), redDot);
        rdDot.position.set(0, 15.5, 7);
        group.add(rdDot);

        // Magazine base plate
        const magBase = new THREE.Mesh(new THREE.BoxGeometry(8, 1.5, 14), steelPistol);
        magBase.position.set(0, -20, 0);
        group.add(magBase);
        break;
      }

      case 'weapon_axe': {
        const axeBlMat = createPbr('#a0a8b8', 0.12, 0.88);
        const axeEdge = createPbr('#e0e8f0', 0.06, 0.96);
        const axeHaft = createPbr('#5c3210', 0.65, 0.04);
        const axeBand = createPbr('#888090', 0.2, 0.75);

        // Haft (handle)
        const haftGeo = new THREE.CylinderGeometry(1.8, 2.5, 70, 10);
        const haft = new THREE.Mesh(haftGeo, axeHaft);
        haft.position.set(0, 30, 0);
        group.add(haft);

        // Iron bands on haft
        for (const b of [10, 35, 60]) {
          const hBand = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 2.5, 12), axeBand);
          hBand.position.set(0, b, 0);
          group.add(hBand);
        }

        // Axe head - large bearded blade
        const axeHeadGeo = new THREE.BufferGeometry();
        const ahV = new Float32Array([
          // Main blade outline
          0, 62, 0,   20, 78, 0,   28, 70, 0,
          0, 62, 0,   28, 70, 0,   26, 60, 0,
          0, 62, 0,   26, 60, 0,   18, 44, 0,
          0, 62, 0,   18, 44, 0,   0, 55, 0,
          // Beard (lower extension)
          0, 55, 0,   18, 44, 0,   12, 36, 0,
          0, 55, 0,   12, 36, 0,   0, 48, 0,
          // Eye socket
          -4, 64, 0,  -8, 68, 0,   0, 78, 0,
          -4, 64, 0,  0, 78, 0,    0, 62, 0,
        ]);
        axeHeadGeo.setAttribute('position', new THREE.BufferAttribute(ahV, 3));
        axeHeadGeo.computeVertexNormals();
        group.add(new THREE.Mesh(axeHeadGeo, axeBlMat));

        // Polished edge highlight
        const edgeGeo = new THREE.BufferGeometry();
        const eV = new Float32Array([
          20, 78, 0,  28, 70, 0,  18, 44, 0,
          20, 78, 0,  18, 44, 0,  12, 36, 0,
        ]);
        edgeGeo.setAttribute('position', new THREE.BufferAttribute(eV, 3));
        edgeGeo.computeVertexNormals();
        group.add(new THREE.Mesh(edgeGeo, axeEdge));

        // Pommel spike
        const pomSpike = new THREE.Mesh(new THREE.ConeGeometry(2, 8, 6), axeBlMat);
        pomSpike.position.set(0, -4, 0);
        pomSpike.rotation.x = Math.PI;
        group.add(pomSpike);
        break;
      }

      case 'weapon_bow': {
        const bowLimb = createPbr('#8b5e3c', 0.5, 0.05); // Yew wood
        const bowString = createPbr('#f0f0e0', 0.3, 0.05);
        const bowRiser = createPbr('#3c2810', 0.45, 0.08);
        const arrowMat = createPbr('#8c7a4a', 0.45, 0.1);

        // Riser (central grip)
        const riserGeo = new THREE.CylinderGeometry(2.5, 2.5, 22, 10);
        const riser = new THREE.Mesh(riserGeo, bowRiser);
        riser.position.set(0, 0, 0);
        group.add(riser);

        // Upper limb (recurve)
        const createLimb = (isUpper) => {
          const sign = isUpper ? 1 : -1;
          // Straight section
          const limb1Geo = new THREE.CylinderGeometry(1.5, 2, 25, 8);
          const limb1 = new THREE.Mesh(limb1Geo, bowLimb);
          limb1.position.set(0, sign * 20, 0);
          group.add(limb1);
          // Recurved tip section (curved outward)
          const limb2Geo = new THREE.CylinderGeometry(0.8, 1.5, 20, 8);
          const limb2 = new THREE.Mesh(limb2Geo, bowLimb);
          limb2.position.set(sign * 10, sign * 34, 0);
          limb2.rotation.z = sign * 0.65;
          group.add(limb2);
          // Tip
          const tipGeo = new THREE.ConeGeometry(0.8, 5, 6);
          const tip = new THREE.Mesh(tipGeo, bowLimb);
          tip.position.set(sign * 18, sign * 46, 0);
          tip.rotation.z = sign * Math.PI / 2;
          group.add(tip);
        };
        createLimb(true);
        createLimb(false);

        // Bow string
        const stringCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(18, 46, 0),
          new THREE.Vector3(8, 20, -6), // Brace (bent back)
          new THREE.Vector3(0, 0, -6),
          new THREE.Vector3(-8, -20, -6),
          new THREE.Vector3(-18, -46, 0)
        ]);
        const stringGeo = new THREE.TubeGeometry(stringCurve, 16, 0.3, 5, false);
        group.add(new THREE.Mesh(stringGeo, bowString));

        // Arrow nocked
        const arrowShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 60, 8), arrowMat);
        arrowShaft.position.set(4, 0, -6);
        group.add(arrowShaft);
        const arrowHead = new THREE.Mesh(new THREE.ConeGeometry(1.5, 8, 6), createPbr('#909aa0', 0.15, 0.88));
        arrowHead.position.set(4, 34, -6);
        group.add(arrowHead);
        // Fletching
        for (let f = 0; f < 3; f++) {
          const fAng = (f * Math.PI * 2) / 3;
          const fletchGeo = new THREE.BufferGeometry();
          const fv = new Float32Array([
            4, -28, -6,  4 + Math.cos(fAng) * 5, -18, -6 + Math.sin(fAng) * 5,  4, -28, -6
          ]);
          fletchGeo.setAttribute('position', new THREE.BufferAttribute(fv, 3));
          fletchGeo.computeVertexNormals();
          group.add(new THREE.Mesh(fletchGeo, createPbr('#cc4422', 0.4, 0.02)));
        }
        break;
      }

      // ----------------------------------------------------
      // NATURE
      // ----------------------------------------------------
      case 'nature_tree': {
        const barkMat = createPbr('#3c2510', 0.75, 0.03);
        const leafMat = createPbr('#2d5a1e', 0.7, 0.02);
        const mossGeo2 = createPbr('#4a6b2a', 0.8, 0.01);

        // Root base
        for (let r = 0; r < 5; r++) {
          const rootAng = (r * Math.PI * 2) / 5;
          const rootGeo = new THREE.CylinderGeometry(1.5, 3, 12, 8);
          const root = new THREE.Mesh(rootGeo, barkMat);
          root.position.set(Math.cos(rootAng) * 10, -1, Math.sin(rootAng) * 10);
          root.rotation.z = Math.cos(rootAng) * 0.35;
          root.rotation.x = Math.sin(rootAng) * 0.35;
          group.add(root);
        }

        // Main trunk
        const trunkGeo = new THREE.CylinderGeometry(5, 9, 45, 14);
        const trunk = new THREE.Mesh(trunkGeo, barkMat);
        trunk.position.set(0, 22, 0);
        group.add(trunk);

        // Major limbs
        const limbData = [[12, 36, 8, 0.4, -0.3], [-10, 38, 6, -0.5, 0.2], [4, 42, -8, 0.2, 0.5]];
        limbData.forEach(([lx, ly, lz, rz, rx]) => {
          const lGeo = new THREE.CylinderGeometry(2.5, 4, 24, 10);
          const limb = new THREE.Mesh(lGeo, barkMat);
          limb.position.set(lx, ly, lz);
          limb.rotation.z = rz;
          limb.rotation.x = rx;
          group.add(limb);
        });

        // Canopy layers (5 overlapping sphere clusters)
        const canopyData = [
          [0, 65, 0, 22], [-14, 58, -8, 18], [16, 60, 10, 20],
          [-8, 72, 12, 16], [12, 70, -14, 17], [0, 78, 0, 14]
        ];
        canopyData.forEach(([cx, cy, cz, cr]) => {
          const cGeo = new THREE.SphereGeometry(cr, 12, 10);
          const c = new THREE.Mesh(cGeo, leafMat);
          c.position.set(cx, cy, cz);
          group.add(c);
        });

        // Moss patches on trunk
        for (let m = 0; m < 6; m++) {
          const mAng = Math.random() * Math.PI * 2;
          const mGeo = new THREE.SphereGeometry(3.5, 8, 6);
          mGeo.scale(1.4, 0.3, 1.0);
          const moss = new THREE.Mesh(mGeo, mossGeo2);
          moss.position.set(Math.cos(mAng) * 7.5, 8 + m * 5, Math.sin(mAng) * 7.5);
          group.add(moss);
        }
        break;
      }

      case 'nature_crystal': {
        const crystalMat = createPbr('#9b59b6', 0.08, 0.3, '#cc44ff', 0.4);
        const crystalLight = createPbr('#c39bd3', 0.05, 0.4, '#ff88ff', 0.3);
        const rockMat = createPbr('#4a4050', 0.8, 0.05);

        // Base rock matrix
        const rockGeo = new THREE.SphereGeometry(18, 12, 8);
        rockGeo.scale(1.4, 0.5, 1.2);
        const rock = new THREE.Mesh(rockGeo, rockMat);
        rock.position.set(0, 4, 0);
        group.add(rock);

        // Crystal cluster (25 varying size spires)
        const crystalPlacements = [
          [0, 0, 0, 4, 32, 0],
          [-8, 2, 0, 3.5, 26, 0.2],
          [8, 0, -4, 3, 24, -0.15],
          [-4, 1, 8, 3, 22, 0.25],
          [5, -1, -8, 2.5, 20, -0.2],
          [12, 0, 4, 2.5, 18, 0.3],
          [-12, 1, -2, 2, 16, -0.25],
          [2, 2, 12, 2, 15, 0.3],
          [-6, 0, -12, 2, 14, 0.1],
          [14, -1, -6, 1.8, 12, -0.1],
          [-14, 0, 6, 1.5, 10, 0.2],
          [6, 3, -14, 1.5, 11, 0.15],
          [-10, -1, 10, 1.2, 9, -0.15],
          [16, 0, 0, 1.2, 8, 0.1],
          [-16, 1, -4, 1.0, 8, 0.0],
        ];

        crystalPlacements.forEach(([cx, cy, cz, r, h, tilt], i) => {
          const cryGeo = new THREE.ConeGeometry(r, h, 6);
          const cry = new THREE.Mesh(cryGeo, i % 3 === 0 ? crystalLight : crystalMat);
          cry.position.set(cx, cy + h / 2 + 4, cz);
          cry.rotation.z = tilt;
          cry.rotation.x = (i % 2 === 0 ? -1 : 1) * tilt * 0.5;
          group.add(cry);
        });
        break;
      }

      case 'nature_mushroom': {
        const capMat = createPbr('#cc3300', 0.4, 0.05);
        const spotMat = createPbr('#f5f5f0', 0.3, 0.05);
        const stemMat = createPbr('#e8e0d0', 0.4, 0.03);
        const gillMat = createPbr('#f0e8d8', 0.45, 0.02);
        const glowBiolum = createPbr('#00ffaa', 0.05, 0.05, '#00ff88', 1.2);

        // Stem
        const stemGeo = new THREE.CylinderGeometry(4.5, 6, 28, 14);
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.set(0, 14, 0);
        group.add(stem);

        // Skirt ring
        const skirtGeo = new THREE.CylinderGeometry(8, 6, 2, 14, 1, true);
        const skirt = new THREE.Mesh(skirtGeo, gillMat);
        skirt.position.set(0, 24, 0);
        group.add(skirt);

        // Main cap (classic Amanita / fly agaric)
        const capGeo = new THREE.SphereGeometry(22, 20, 14);
        capGeo.scale(1.0, 0.5, 1.0);
        const cap = new THREE.Mesh(capGeo, capMat);
        cap.position.set(0, 32, 0);
        group.add(cap);

        // Gills under cap
        for (let g = 0; g < 12; g++) {
          const gAng = (g * Math.PI * 2) / 12;
          const gillGeo = new THREE.BoxGeometry(0.5, 3, 16);
          const gill = new THREE.Mesh(gillGeo, gillMat);
          gill.position.set(Math.cos(gAng) * 8, 29, Math.sin(gAng) * 8);
          gill.rotation.y = gAng;
          group.add(gill);
        }

        // White spots (polka dots)
        const spotPositions = [[0, 36, 0, 3.5], [-10, 34, 8, 2.5], [12, 33, -6, 2.8], [-6, 34, -12, 2.2], [14, 33, 10, 2], [-14, 33, 4, 2.2], [4, 33, 14, 1.8]];
        spotPositions.forEach(([sx, sy, sz, sr]) => {
          const spotGeo = new THREE.SphereGeometry(sr, 8, 6);
          spotGeo.scale(1.0, 0.3, 1.0);
          const spot = new THREE.Mesh(spotGeo, spotMat);
          spot.position.set(sx, sy, sz);
          group.add(spot);
        });

        // Bioluminescent spore caps
        for (let s = 0; s < 4; s++) {
          const sAng = (s * Math.PI * 2) / 4 + 0.3;
          const miniGeo = new THREE.SphereGeometry(5, 10, 8);
          miniGeo.scale(1.0, 0.5, 1.0);
          const mini = new THREE.Mesh(miniGeo, glowBiolum);
          mini.position.set(Math.cos(sAng) * 28, 14, Math.sin(sAng) * 28);
          group.add(mini);
          const miniStem = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2, 12, 8), stemMat);
          miniStem.position.set(Math.cos(sAng) * 28, 8, Math.sin(sAng) * 28);
          group.add(miniStem);
        }
        break;
      }

      case 'nature_volcano': {
        const lavaMat = createPbr('#ff4400', 0.2, 0.1, '#ff2200', 1.5);
        const ashMat = createPbr('#3a3028', 0.85, 0.04);
        const basaltMat = createPbr('#1a1a1a', 0.8, 0.04);

        // Mountain base
        const baseGeo = new THREE.CylinderGeometry(5, 90, 20, 20);
        const baseM = new THREE.Mesh(baseGeo, ashMat);
        baseM.position.set(0, 10, 0);
        group.add(baseM);

        // Main cone
        const coneGeo = new THREE.ConeGeometry(60, 120, 20);
        const cone = new THREE.Mesh(coneGeo, ashMat);
        cone.position.set(0, 80, 0);
        group.add(cone);

        // Inner lava-filled crater rim
        const craterGeo = new THREE.CylinderGeometry(5, 12, 12, 20, 1, true);
        const crater = new THREE.Mesh(craterGeo, basaltMat);
        crater.position.set(0, 143, 0);
        group.add(crater);

        // Lava pool
        const lavaPool = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 2, 20), lavaMat);
        lavaPool.position.set(0, 140, 0);
        group.add(lavaPool);

        // Lava flows down flanks
        for (let f = 0; f < 4; f++) {
          const fAng = (f * Math.PI * 2) / 4;
          const flowGeo = new THREE.CylinderGeometry(2, 5, 60, 8);
          const flow = new THREE.Mesh(flowGeo, lavaMat);
          flow.position.set(Math.cos(fAng) * 30, 100, Math.sin(fAng) * 30);
          flow.rotation.z = Math.cos(fAng) * 0.5;
          flow.rotation.x = Math.sin(fAng) * 0.5;
          group.add(flow);
        }

        // Smoke plume rings
        for (let p = 0; p < 5; p++) {
          const plumeGeo = new THREE.TorusGeometry(6 + p * 5, 2 + p * 0.5, 6, 20);
          const plume = new THREE.Mesh(plumeGeo, createPbr('#808080', 0.9, 0.0, '#404040', 0.2));
          plume.position.set(0, 148 + p * 14, 0);
          group.add(plume);
        }

        // Rocky outcrop base
        for (let r = 0; r < 8; r++) {
          const rAng = (r * Math.PI * 2) / 8;
          const rockSize = 8 + (r % 3) * 6;
          const rGeo = new THREE.SphereGeometry(rockSize, 6, 5);
          const rMesh = new THREE.Mesh(rGeo, basaltMat);
          rMesh.position.set(Math.cos(rAng) * 80, 5, Math.sin(rAng) * 80);
          rMesh.scale.set(1.5, 0.6, 1.2);
          group.add(rMesh);
        }
        break;
      }

      case 'nature_coral': {
        const coralMat1 = createPbr('#ff6b6b', 0.45, 0.05);
        const coralMat2 = createPbr('#ff9f43', 0.4, 0.04);
        const fanMat = createPbr('#ff7eb3', 0.35, 0.04);
        const algaeMat = createPbr('#2ecc71', 0.5, 0.02);
        const sandMat = createPbr('#f0d090', 0.7, 0.02);

        // Sandy seafloor
        const sandGeo = new THREE.CylinderGeometry(75, 75, 3, 24);
        const sand = new THREE.Mesh(sandGeo, sandMat);
        sand.position.set(0, 1.5, 0);
        group.add(sand);

        // Brain coral (dome with grooves)
        const brainGeo = new THREE.SphereGeometry(16, 20, 14);
        const brain = new THREE.Mesh(brainGeo, coralMat1);
        brain.position.set(-20, 19, -10);
        group.add(brain);
        for (let g = 0; g < 8; g++) {
          const gAng = (g * Math.PI * 2) / 8;
          const groove = new THREE.Mesh(new THREE.TorusGeometry(12 - g * 1.2, 0.6, 4, 20), createPbr('#cc3333', 0.4, 0.04));
          groove.position.set(-20, 20, -10);
          groove.rotation.x = gAng;
          group.add(groove);
        }

        // Branching coral colonies
        const branchCoral = (baseX, baseZ, mat) => {
          const trunk2 = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 4, 18, 8), mat);
          trunk2.position.set(baseX, 12, baseZ);
          group.add(trunk2);
          for (let b = 0; b < 5; b++) {
            const bAng = (b * Math.PI * 2) / 5 + b * 0.1;
            const bLen = 10 + b * 3;
            const br = new THREE.Mesh(new THREE.CylinderGeometry(1, 2, bLen, 6), mat);
            br.position.set(baseX + Math.cos(bAng) * 8, 20 + b * 2, baseZ + Math.sin(bAng) * 8);
            br.rotation.z = Math.cos(bAng) * 0.4;
            br.rotation.x = Math.sin(bAng) * 0.4;
            group.add(br);
          }
        };
        branchCoral(15, 20, coralMat2);
        branchCoral(-30, 25, coralMat1);
        branchCoral(30, -15, coralMat2);

        // Sea fan (flat branching)
        const fanGeo = new THREE.SphereGeometry(18, 18, 14);
        fanGeo.scale(0.06, 1.0, 0.9);
        const fan = new THREE.Mesh(fanGeo, fanMat);
        fan.position.set(0, 26, 30);
        group.add(fan);
        const fanStem = new THREE.Mesh(new THREE.CylinderGeometry(1, 2, 10, 8), fanMat);
        fanStem.position.set(0, 8, 30);
        group.add(fanStem);

        // Kelp strands
        for (let k = 0; k < 6; k++) {
          const kAng = (k * Math.PI * 2) / 6;
          const kelpGeo = new THREE.CylinderGeometry(0.8, 1.2, 30 + k * 5, 6);
          const kelp = new THREE.Mesh(kelpGeo, algaeMat);
          kelp.position.set(Math.cos(kAng) * 40, 18, Math.sin(kAng) * 40);
          kelp.rotation.z = (kAng % 1 - 0.5) * 0.4;
          group.add(kelp);
        }
        break;
      }

      // ----------------------------------------------------
      // JEWELRY & DECORATIVE
      // ----------------------------------------------------
      case 'jewelry_ring': {
        const whitGoldMat = createPbr('#e8e0d0', 0.1, 0.98);
        const diamondMat = createPbr('#c8e8f8', 0.02, 0.98, '#aaddff', 0.5);
        const prong = createPbr('#e0d8c8', 0.12, 0.96);

        // Ring band
        const ringGeo = new THREE.TorusGeometry(14, 3, 14, 48);
        const ring = new THREE.Mesh(ringGeo, whitGoldMat);
        ring.position.set(0, 4, 0);
        group.add(ring);

        // Cathedral setting (raised shoulders)
        for (const s of [-1, 1]) {
          const setGeo = new THREE.BoxGeometry(4, 8, 3);
          const setting = new THREE.Mesh(setGeo, whitGoldMat);
          setting.position.set(s * 6, 10, 0);
          setting.rotation.z = s * 0.25;
          group.add(setting);
        }

        // Diamond (brilliant cut approx)
        const topGeo = new THREE.CylinderGeometry(6, 8, 3, 8);
        const top = new THREE.Mesh(topGeo, diamondMat);
        top.position.set(0, 16, 0);
        group.add(top);

        const crownGeo2 = new THREE.ConeGeometry(8, 6, 8);
        crownGeo2.rotateX(Math.PI);
        const crown2 = new THREE.Mesh(crownGeo2, diamondMat);
        crown2.position.set(0, 19, 0);
        group.add(crown2);

        const pavilion = new THREE.Mesh(new THREE.ConeGeometry(8, 10, 8), diamondMat);
        pavilion.position.set(0, 10, 0);
        group.add(pavilion);

        // 4 Prongs holding diamond
        for (let i = 0; i < 4; i++) {
          const pAng = (i * Math.PI) / 2 + Math.PI / 4;
          const pG = new THREE.CylinderGeometry(0.8, 0.8, 9, 6);
          const p2 = new THREE.Mesh(pG, prong);
          p2.position.set(Math.cos(pAng) * 7, 14, Math.sin(pAng) * 7);
          group.add(p2);
          const pTip = new THREE.Mesh(new THREE.SphereGeometry(1.2, 6, 6), prong);
          pTip.position.set(Math.cos(pAng) * 7, 19, Math.sin(pAng) * 7);
          group.add(pTip);
        }

        // Pavé diamonds on band
        for (let d = 0; d < 20; d++) {
          const dAng = (d * Math.PI * 2) / 20;
          const pave = new THREE.Mesh(new THREE.SphereGeometry(1.2, 6, 5), diamondMat);
          pave.position.set(Math.cos(dAng) * 14, 4 + Math.sin(dAng) * 3, Math.sin(dAng) * 14);
          group.add(pave);
        }
        break;
      }

      case 'jewelry_crown': {
        const goldCrown = createPbr('#d4af37', 0.15, 0.95);
        const rubyMat = createPbr('#cc0022', 0.1, 0.3, '#ff0033', 0.3);
        const sapMat = createPbr('#0033cc', 0.1, 0.3, '#0055ff', 0.3);
        const emerMat = createPbr('#007744', 0.1, 0.3, '#00ff88', 0.3);
        const pearMat = createPbr('#f8f0e8', 0.08, 0.4);

        // Crown base band
        const bandGeo = new THREE.CylinderGeometry(22, 22, 10, 32, 1, true);
        const bandMesh = new THREE.Mesh(bandGeo, goldCrown);
        bandMesh.position.set(0, 5, 0);
        group.add(bandMesh);

        // Inner liner
        const linerGeo = new THREE.CylinderGeometry(21, 21, 10, 32, 1, true);
        const liner = new THREE.Mesh(linerGeo, createPbr('#b22222', 0.8, 0.02));
        liner.position.set(0, 5, 0);
        group.add(liner);

        // 7 pointed arches / fleurs
        for (let p = 0; p < 7; p++) {
          const pAng = (p * Math.PI * 2) / 7;
          const px = Math.cos(pAng) * 22;
          const pz = Math.sin(pAng) * 22;

          // Main cross point
          const pointGeo = new THREE.BoxGeometry(4, 18, 4);
          const point = new THREE.Mesh(pointGeo, goldCrown);
          point.position.set(px, 19, pz);
          point.rotation.y = pAng;
          group.add(point);

          // Top sphere finial
          const finial = new THREE.Mesh(new THREE.SphereGeometry(3.5, 12, 10), goldCrown);
          finial.position.set(px, 31, pz);
          group.add(finial);

          // Alternate left/right smaller points
          for (const s of [-1, 1]) {
            const sAng2 = pAng + s * (Math.PI / 7);
            const sp = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2, 12, 8), goldCrown);
            sp.position.set(Math.cos(sAng2) * 22, 16, Math.sin(sAng2) * 22);
            group.add(sp);
          }

          // Set gem stones alternating
          const gemMats = [rubyMat, sapMat, emerMat, rubyMat, sapMat, emerMat, rubyMat];
          const gemGeo = new THREE.SphereGeometry(3, 12, 10);
          const gem = new THREE.Mesh(gemGeo, gemMats[p]);
          gem.position.set(px, 12, pz);
          group.add(gem);
        }

        // Pearl rope accent
        for (let pr = 0; pr < 32; pr++) {
          const prAng = (pr * Math.PI * 2) / 32;
          const pearl = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 6), pearMat);
          pearl.position.set(Math.cos(prAng) * 22, 3, Math.sin(prAng) * 22);
          group.add(pearl);
        }
        break;
      }

      case 'jewelry_trophy': {
        const goldTrophy = createPbr('#d4af37', 0.12, 0.95);
        const darkBase = createPbr('#1a1008', 0.6, 0.1);
        const plateMat = createPbr('#e0e8f0', 0.15, 0.88);

        // Plinth (stepped base)
        const plinth3 = new THREE.Mesh(new THREE.BoxGeometry(40, 5, 28), darkBase);
        plinth3.position.set(0, 2.5, 0);
        group.add(plinth3);
        const plinth2 = new THREE.Mesh(new THREE.BoxGeometry(35, 4, 24), darkBase);
        plinth2.position.set(0, 7, 0);
        group.add(plinth2);
        const plinth1 = new THREE.Mesh(new THREE.BoxGeometry(28, 3, 18), goldTrophy);
        plinth1.position.set(0, 10.5, 0);
        group.add(plinth1);

        // Column stem
        const stemGeoT = new THREE.CylinderGeometry(4.5, 7, 28, 14);
        const stemT = new THREE.Mesh(stemGeoT, goldTrophy);
        stemT.position.set(0, 26, 0);
        group.add(stemT);

        // Trophy body (goblet shape)
        const bodyGeoT = new THREE.LatheGeometry(
          [new THREE.Vector2(0, 0), new THREE.Vector2(3, 2), new THREE.Vector2(8, 8), new THREE.Vector2(14, 18), new THREE.Vector2(16, 30), new THREE.Vector2(14, 38), new THREE.Vector2(8, 42)],
          20
        );
        const bodyT = new THREE.Mesh(bodyGeoT, goldTrophy);
        bodyT.position.set(0, 40, 0);
        group.add(bodyT);

        // Cup rim
        const cupRim = new THREE.Mesh(new THREE.TorusGeometry(14, 1.5, 8, 28), goldTrophy);
        cupRim.position.set(0, 82, 0);
        group.add(cupRim);

        // Handles
        for (const s of [-1, 1]) {
          const handleGeo = new THREE.TorusGeometry(8, 1.8, 8, 20, Math.PI * 1.2);
          const handle = new THREE.Mesh(handleGeo, goldTrophy);
          handle.position.set(s * 18, 68, 0);
          handle.rotation.z = s * Math.PI / 2;
          handle.rotation.x = Math.PI / 2;
          group.add(handle);
        }

        // Championship star on cup
        const starPoints = 5;
        for (let sp = 0; sp < starPoints; sp++) {
          const sAng = (sp * Math.PI * 2) / starPoints - Math.PI / 2;
          const sPt = new THREE.Mesh(new THREE.ConeGeometry(2, 5, 4), plateMat);
          sPt.position.set(Math.cos(sAng) * 9, 65, Math.sin(sAng) * 9);
          sPt.rotation.z = -sAng;
          group.add(sPt);
        }

        // Gold laurel wreath on body
        for (let l = 0; l < 16; l++) {
          const lAng = (l * Math.PI * 2) / 16;
          const leaf = new THREE.Mesh(new THREE.SphereGeometry(2.5, 6, 5), goldTrophy);
          leaf.scale.set(0.4, 0.8, 1.2);
          leaf.position.set(Math.cos(lAng) * 15, 58, Math.sin(lAng) * 15);
          leaf.rotation.y = lAng;
          group.add(leaf);
        }
        break;
      }

      case 'jewelry_chess': {
        const chessMat = createPbr('#1a1008', 0.25, 0.5);
        const ivoryMat = createPbr('#f5f0e8', 0.3, 0.1);

        // Base (stepped)
        for (let b = 0; b < 3; b++) {
          const bR = 14 - b * 2;
          const baseG = new THREE.CylinderGeometry(bR, bR + 1, 3, 20);
          const base = new THREE.Mesh(baseG, chessMat);
          base.position.set(0, b * 3, 0);
          group.add(base);
        }

        // Column (bulge)
        const colGeo = new THREE.LatheGeometry(
          [new THREE.Vector2(0, 0), new THREE.Vector2(5, 2), new THREE.Vector2(6, 6), new THREE.Vector2(4, 10), new THREE.Vector2(6, 14), new THREE.Vector2(5, 20)],
          16
        );
        const col = new THREE.Mesh(colGeo, chessMat);
        col.position.set(0, 10, 0);
        group.add(col);

        // Neck
        const neckG = new THREE.CylinderGeometry(4, 5, 10, 14);
        const neck2 = new THREE.Mesh(neckG, chessMat);
        neck2.position.set(0, 33, 0);
        group.add(neck2);

        // Head sphere
        const headS = new THREE.Mesh(new THREE.SphereGeometry(9, 16, 12), chessMat);
        headS.position.set(0, 46, 0);
        group.add(headS);

        // Crown points (5 with cross)
        for (let c = 0; c < 5; c++) {
          const cAng = (c * Math.PI * 2) / 5;
          const cPt = new THREE.Mesh(new THREE.SphereGeometry(1.8, 8, 6), chessMat);
          cPt.position.set(Math.cos(cAng) * 8, 54, Math.sin(cAng) * 8);
          group.add(cPt);
        }

        // Cross on top
        const crossH = new THREE.Mesh(new THREE.BoxGeometry(5, 1.5, 1.5), chessMat);
        crossH.position.set(0, 58, 0);
        group.add(crossH);
        const crossV = new THREE.Mesh(new THREE.BoxGeometry(1.5, 6, 1.5), chessMat);
        crossV.position.set(0, 60, 0);
        group.add(crossV);
        break;
      }

      // ----------------------------------------------------
      // FIGURES & SCULPTURES
      // ----------------------------------------------------
      case 'figure_skull': {
        const boneMat = createPbr('#f5f0e8', 0.35, 0.05);
        const eyeSocket = createPbr('#0a0808', 0.8, 0.02);
        const flowerMat = [
          createPbr('#ff6b9d', 0.3, 0.02),
          createPbr('#ffd700', 0.25, 0.02),
          createPbr('#ff4444', 0.3, 0.02),
        ];

        // Cranium
        const cranGeo = new THREE.SphereGeometry(16, 20, 16);
        cranGeo.scale(1.0, 1.1, 0.9);
        const cran = new THREE.Mesh(cranGeo, boneMat);
        cran.position.set(0, 26, 0);
        group.add(cran);

        // Zygomatic (cheekbones)
        for (const s of [-1, 1]) {
          const zygGeo = new THREE.SphereGeometry(6, 10, 8);
          zygGeo.scale(1.4, 0.6, 0.7);
          const zyg = new THREE.Mesh(zygGeo, boneMat);
          zyg.position.set(s * 14, 18, 7);
          group.add(zyg);
        }

        // Mandible (lower jaw)
        const jawGeo = new THREE.BoxGeometry(22, 7, 14);
        jawGeo.rotateX(0.15);
        const jaw = new THREE.Mesh(jawGeo, boneMat);
        jaw.position.set(0, 8, 3);
        group.add(jaw);

        // Teeth
        for (let t = 0; t < 6; t++) {
          for (const s of [-1, 1]) {
            const toothGeo = new THREE.BoxGeometry(2.8, 4, 2.5);
            const tooth = new THREE.Mesh(toothGeo, boneMat);
            tooth.position.set(s * (2 + t * 3), 12, 8);
            group.add(tooth);
            const lowerT = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.5, 2.5), boneMat);
            lowerT.position.set(s * (2 + t * 3), 7, 7.5);
            group.add(lowerT);
          }
        }

        // Eye sockets
        for (const s of [-1, 1]) {
          const sockGeo = new THREE.SphereGeometry(7, 14, 10);
          sockGeo.scale(1.0, 0.85, 0.5);
          const sock = new THREE.Mesh(sockGeo, eyeSocket);
          sock.position.set(s * 9, 26, 10);
          group.add(sock);
          const brow = new THREE.Mesh(new THREE.TorusGeometry(7, 1, 6, 20, Math.PI), boneMat);
          brow.position.set(s * 9, 31, 10);
          group.add(brow);
        }

        // Nose cavity
        const noseGeo2 = new THREE.SphereGeometry(3.5, 10, 8);
        noseGeo2.scale(0.8, 1.0, 0.4);
        const nose2 = new THREE.Mesh(noseGeo2, eyeSocket);
        nose2.position.set(0, 17, 13);
        group.add(nose2);

        // Decorative sugar skull flowers
        for (let f = 0; f < 3; f++) {
          const fAng = (f * Math.PI * 2) / 3 + 0.3;
          const fMat = flowerMat[f];
          for (let p = 0; p < 6; p++) {
            const pAng = (p * Math.PI * 2) / 6;
            const petal = new THREE.Mesh(new THREE.SphereGeometry(2.5, 8, 6), fMat);
            petal.scale.set(0.5, 0.5, 1.0);
            const fRad = 8 - f * 2.5;
            petal.position.set(Math.cos(fAng) * 14 + Math.cos(pAng) * 3, 32 + Math.sin(fAng) * 10, Math.sin(fAng) * 14 + Math.sin(pAng) * 3);
            group.add(petal);
          }
          const fCenter = new THREE.Mesh(new THREE.SphereGeometry(1.8, 8, 6), createPbr('#ffcc00', 0.2, 0.3));
          fCenter.position.set(Math.cos(fAng) * 14, 32 + Math.sin(fAng) * 10, Math.sin(fAng) * 14);
          group.add(fCenter);
        }
        break;
      }

      case 'figure_warrior': {
        const helmetMat = createPbr('#b87030', 0.15, 0.88); // Polished bronze
        const crestMat = createPbr('#cc2222', 0.45, 0.05); // Red horsehair crest
        const visorMetalMat = createPbr('#906020', 0.18, 0.85);

        // Skull cap
        const skullGeo = new THREE.SphereGeometry(16, 20, 16);
        skullGeo.scale(0.95, 0.75, 1.0);
        const skull = new THREE.Mesh(skullGeo, helmetMat);
        skull.position.set(0, 36, 0);
        group.add(skull);

        // Cheek guards
        for (const s of [-1, 1]) {
          const chkGeo = new THREE.SphereGeometry(10, 14, 10);
          chkGeo.scale(0.5, 0.9, 0.6);
          const chk = new THREE.Mesh(chkGeo, helmetMat);
          chk.position.set(s * 14, 22, 3);
          group.add(chk);
        }

        // Nose guard (nasal)
        const nasalGeo = new THREE.BoxGeometry(3, 18, 2.5);
        const nasal = new THREE.Mesh(nasalGeo, visorMetalMat);
        nasal.position.set(0, 26, 14);
        group.add(nasal);

        // Eye openings
        for (const s of [-1, 1]) {
          const eyeOpenGeo = new THREE.SphereGeometry(5, 10, 7);
          eyeOpenGeo.scale(1.0, 0.5, 0.3);
          const eyeOpen = new THREE.Mesh(eyeOpenGeo, createPbr('#111111', 0.9, 0.05));
          eyeOpen.position.set(s * 8, 34, 13);
          group.add(eyeOpen);
        }

        // Neck guard (nape)
        const napeGeo = new THREE.CylinderGeometry(10, 12, 6, 14, 1, false, Math.PI, Math.PI);
        const nape = new THREE.Mesh(napeGeo, helmetMat);
        nape.position.set(0, 20, -2);
        group.add(nape);

        // Horsehair crest (Corinthian helmet)
        const crestBaseGeo = new THREE.CylinderGeometry(2, 2, 30, 10);
        const crestBase = new THREE.Mesh(crestBaseGeo, visorMetalMat);
        crestBase.position.set(0, 52, 0);
        group.add(crestBase);

        // Horsehair plume
        for (let h = 0; h < 16; h++) {
          const hAng = (h - 7.5) * 0.08;
          const hairGeo = new THREE.CylinderGeometry(0.4, 0.8, 18 + Math.sin(h * 0.8) * 5, 4);
          const hair = new THREE.Mesh(hairGeo, crestMat);
          hair.position.set(Math.sin(hAng) * 3, 55 + h * 0.5, 0);
          hair.rotation.z = hAng * 0.5;
          group.add(hair);
        }

        // Engraved cheek boss
        for (const s of [-1, 1]) {
          const boss2 = new THREE.Mesh(new THREE.TorusGeometry(4, 0.8, 6, 20), visorMetalMat);
          boss2.position.set(s * 14, 30, 8);
          group.add(boss2);
        }
        break;
      }

      case 'figure_mask': {
        const oniMat = createPbr('#cc2200', 0.35, 0.08); // Demon red
        const hornMat = createPbr('#1a1208', 0.3, 0.1);
        const toothMat = createPbr('#fdf8e8', 0.25, 0.06);
        const goldOni = createPbr('#d4af37', 0.15, 0.88);

        // Main face
        const faceGeo = new THREE.SphereGeometry(18, 20, 16);
        faceGeo.scale(1.0, 0.95, 0.7);
        const face = new THREE.Mesh(faceGeo, oniMat);
        face.position.set(0, 22, 0);
        group.add(face);

        // Forehead wrinkles / brow ridge
        const browGeo = new THREE.SphereGeometry(8, 12, 8);
        browGeo.scale(1.8, 0.4, 0.8);
        const brow2 = new THREE.Mesh(browGeo, oniMat);
        brow2.position.set(0, 30, 8);
        group.add(brow2);

        // Sunken menacing eyes with gold iris
        for (const s of [-1, 1]) {
          const eyeOrb = new THREE.Mesh(new THREE.SphereGeometry(4.5, 14, 10), createPbr('#ffffcc', 0.1, 0.1, '#ffff44', 0.4));
          eyeOrb.position.set(s * 9, 28, 10);
          group.add(eyeOrb);
          const pupil2 = new THREE.Mesh(new THREE.SphereGeometry(2.5, 10, 8), createPbr('#000000', 0.9, 0.02));
          pupil2.position.set(s * 9, 28, 13.5);
          group.add(pupil2);
          const eyeBrow2 = new THREE.Mesh(new THREE.BoxGeometry(10, 2, 1.5), createPbr('#880000', 0.4, 0.05));
          eyeBrow2.position.set(s * 9, 33, 11);
          eyeBrow2.rotation.z = s * 0.4;
          group.add(eyeBrow2);
        }

        // Wide gaping mouth with fangs
        const mouthGeo = new THREE.SphereGeometry(10, 14, 10);
        mouthGeo.scale(1.2, 0.5, 0.4);
        const mouth = new THREE.Mesh(mouthGeo, createPbr('#1a0505', 0.9, 0.02));
        mouth.position.set(0, 13, 11);
        group.add(mouth);

        // Fangs (large outer)
        for (const s of [-1, 1]) {
          const fangGeo = new THREE.ConeGeometry(2, 9, 6);
          const fang = new THREE.Mesh(fangGeo, toothMat);
          fang.position.set(s * 7, 17, 12);
          fang.rotation.x = Math.PI;
          fang.rotation.z = s * 0.2;
          group.add(fang);
          const lowerFang = new THREE.Mesh(new THREE.ConeGeometry(1.5, 7, 6), toothMat);
          lowerFang.position.set(s * 5, 10, 12);
          group.add(lowerFang);
        }

        // Teeth (inner)
        for (let t = -2; t <= 2; t++) {
          const tG = new THREE.Mesh(new THREE.BoxGeometry(2.5, 4, 1.5), toothMat);
          tG.position.set(t * 3, 16, 12);
          group.add(tG);
        }

        // Horns (classic oni)
        for (const s of [-1, 1]) {
          const hornGeo = new THREE.ConeGeometry(4, 24, 8);
          const horn = new THREE.Mesh(hornGeo, hornMat);
          horn.position.set(s * 13, 40, 0);
          horn.rotation.z = s * 0.25;
          group.add(horn);
          // Gold horn bands
          for (const b of [4, 12]) {
            const hornBand = new THREE.Mesh(new THREE.TorusGeometry(4 - b * 0.1, 0.8, 6, 16), goldOni);
            hornBand.position.set(s * 13, 32 + b, 0);
            group.add(hornBand);
          }
        }

        // Nose (wide flat)
        const noseOni = new THREE.Mesh(new THREE.SphereGeometry(5, 10, 8), oniMat);
        noseOni.scale.set(1.2, 0.5, 0.6);
        noseOni.position.set(0, 20, 13);
        group.add(noseOni);

        // Nostrils
        for (const s of [-1, 1]) {
          const nG = new THREE.Mesh(new THREE.SphereGeometry(1.8, 8, 6), createPbr('#881111', 0.5, 0.05));
          nG.position.set(s * 3, 19, 16);
          group.add(nG);
        }
        break;
      }

      // ----------------------------------------------------
      // PRECISION CAD
      // ----------------------------------------------------
      case 'gear': {
        return ModelGenerators.generateParametric('gear', { teeth: 18 });
      }
      case 'knot': {
        return ModelGenerators.generateParametric('knot');
      }
      case 'vase': {
        return ModelGenerators.generateParametric('vase');
      }

      case 'cad_spring': {
        const springMat = createPbr('#88a0b8', 0.18, 0.88);
        const turns = 8;
        const points = [];
        for (let i = 0; i <= turns * 40; i++) {
          const t = i / 40;
          const ang = t * Math.PI * 2;
          points.push(new THREE.Vector3(Math.cos(ang) * 18, t * 5, Math.sin(ang) * 18));
        }
        const springPath = new THREE.CatmullRomCurve3(points);
        const springGeo = new THREE.TubeGeometry(springPath, turns * 40, 2.2, 12, false);
        group.add(new THREE.Mesh(springGeo, springMat));

        // End plates
        for (const y of [0, turns * 5]) {
          const plate = new THREE.Mesh(new THREE.CylinderGeometry(20, 20, 2, 24), springMat);
          plate.position.set(0, y, 0);
          group.add(plate);
        }
        break;
      }

      case 'cad_bolt': {
        const boltMat = createPbr('#808898', 0.2, 0.88);
        const boltAccent = createPbr('#6070a0', 0.15, 0.92);

        // Hex head
        const hexGeo = new THREE.CylinderGeometry(12, 12, 8, 6);
        const hexHead = new THREE.Mesh(hexGeo, boltMat);
        hexHead.position.set(0, 4, 0);
        group.add(hexHead);

        // Flange under head
        const flange = new THREE.Mesh(new THREE.CylinderGeometry(13.5, 13.5, 2, 24), boltMat);
        flange.position.set(0, -1, 0);
        group.add(flange);

        // Shank
        const shankGeo = new THREE.CylinderGeometry(6, 6, 50, 20);
        const shank = new THREE.Mesh(shankGeo, boltMat);
        shank.position.set(0, -30, 0);
        group.add(shank);

        // Thread helix on shank
        const threadPts = [];
        for (let i = 0; i <= 15 * 20; i++) {
          const t = i / 20;
          const ang = t * Math.PI * 2;
          threadPts.push(new THREE.Vector3(Math.cos(ang) * 6.5, -t * 3.2 - 3, Math.sin(ang) * 6.5));
        }
        const threadPath = new THREE.CatmullRomCurve3(threadPts);
        const threadGeo = new THREE.TubeGeometry(threadPath, 15 * 20, 0.8, 6, false);
        group.add(new THREE.Mesh(threadGeo, boltAccent));

        // Hex nut
        const nutGeo = new THREE.CylinderGeometry(11, 11, 7, 6);
        const nut = new THREE.Mesh(nutGeo, boltMat);
        nut.position.set(0, -38, 0);
        group.add(nut);
        // Nut chamfer rings
        for (const y of [-34.5, -41.5]) {
          const cham = new THREE.Mesh(new THREE.TorusGeometry(10.5, 1, 6, 20), boltAccent);
          cham.position.set(0, y, 0);
          group.add(cham);
        }
        break;
      }

      case 'cad_turbine': {
        // Jet engine turbine blade assembly
        const turbMat = createPbr('#9090a8', 0.15, 0.85);
        const diskMat = createPbr('#7080a0', 0.2, 0.8);
        const tipMat = createPbr('#d0d8e8', 0.1, 0.9, '#8888ff', 0.1);

        // Hub disk
        const diskGeo = new THREE.CylinderGeometry(20, 22, 8, 20);
        const disk = new THREE.Mesh(diskGeo, diskMat);
        disk.position.set(0, 4, 0);
        group.add(disk);

        // Bore hole
        const boreGeo = new THREE.CylinderGeometry(8, 8, 9, 16);
        const bore = new THREE.Mesh(boreGeo, createPbr('#404050', 0.4, 0.5));
        bore.position.set(0, 4, 0);
        group.add(bore);

        // 20 turbine blades with airfoil profile
        const bladeCount = 20;
        for (let b = 0; b < bladeCount; b++) {
          const bAng = (b * Math.PI * 2) / bladeCount;

          // Airfoil blade using LatheGeometry substitute
          const bladeProfilePts = [
            [0, 0], [0.6, 1], [0.9, 2], [1.0, 4], [0.95, 8], [0.8, 14], [0.5, 20], [0.2, 26], [0, 30]
          ];
          const bladeProfile = bladeProfilePts.map(([x, y]) => new THREE.Vector2(x * 5, y));
          const bladeGeo = new THREE.LatheGeometry(bladeProfile, 4, 0, Math.PI);
          const blade2 = new THREE.Mesh(bladeGeo, turbMat);

          blade2.rotation.y = bAng;
          blade2.position.set(Math.cos(bAng) * 21, 4, Math.sin(bAng) * 21);

          // Twist the blade
          const pos = blade2.geometry.attributes.position;
          for (let v = 0; v < pos.count; v++) {
            const twist = pos.getY(v) / 30 * 0.5;
            const vx = pos.getX(v);
            const vz = pos.getZ(v);
            pos.setX(v, vx * Math.cos(twist) - vz * Math.sin(twist));
            pos.setZ(v, vx * Math.sin(twist) + vz * Math.cos(twist));
          }
          pos.needsUpdate = true;
          blade2.geometry.computeVertexNormals();
          group.add(blade2);

          // Blade tip cap
          const tipGeo = new THREE.SphereGeometry(2, 8, 6);
          const tipMesh = new THREE.Mesh(tipGeo, tipMat);
          tipMesh.position.set(Math.cos(bAng) * 50, 4, Math.sin(bAng) * 50);
          group.add(tipMesh);
        }

        // Platform fillet at root
        const filetGeo = new THREE.TorusGeometry(21, 3, 6, 20);
        const filet = new THREE.Mesh(filetGeo, diskMat);
        filet.position.set(0, 4, 0);
        group.add(filet);

        // Shaft stub
        const shaftStub = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 7.5, 22, 16), diskMat);
        shaftStub.position.set(0, 15, 0);
        group.add(shaftStub);
        break;
      }

      // =========================================================================
      // 1. 🤖 ROBOTS (TITAN MECH, CYBORG NINJA, SPOT DOG, INDUSTRIAL ARM, MANTIS)
      // =========================================================================
      case 'robot_mech_titan': {
        const armorMat = createPbr('#1e293b', 0.35, 0.75);
        const frameMat = createPbr('#0f172a', 0.25, 0.9);
        const hazardMat = createPbr('#eab308', 0.4, 0.2);
        const glowVisor = createPbr('#00f0ff', 0.1, 0.1, '#00f0ff', 2.0);
        const redGlow = createPbr('#ef4444', 0.1, 0.1, '#ef4444', 1.8);

        // Heavy Torso Chassis
        const torso = new THREE.Mesh(new THREE.BoxGeometry(26, 22, 20), armorMat);
        torso.position.set(0, 52, 0);
        group.add(torso);

        // Slanted Chest Armor Plate
        const chestGeo = new THREE.BoxGeometry(28, 14, 8);
        const chest = new THREE.Mesh(chestGeo, hazardMat);
        chest.position.set(0, 56, 11);
        chest.rotation.x = -0.3;
        group.add(chest);

        // Core Fusion Reactor
        const core = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 4, 24), glowVisor);
        core.rotateX(Math.PI / 2);
        core.position.set(0, 50, 11.5);
        group.add(core);

        // Armored Cockpit Head
        const head = new THREE.Mesh(new THREE.BoxGeometry(12, 9, 14), frameMat);
        head.position.set(0, 67, 2);
        group.add(head);
        const visor = new THREE.Mesh(new THREE.BoxGeometry(10, 2.5, 2), glowVisor);
        visor.position.set(0, 67, 9);
        group.add(visor);

        // Twin Shoulder Missile Pods
        for (const s of [-1, 1]) {
          const pod = new THREE.Mesh(new THREE.BoxGeometry(12, 10, 18), armorMat);
          pod.position.set(s * 20, 66, -2);
          group.add(pod);
          // Missile tubes
          for (let row = -1; row <= 1; row += 2) {
            for (let col = -1; col <= 1; col += 2) {
              const tube = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 3, 12), redGlow);
              tube.rotateX(Math.PI / 2);
              tube.position.set(s * 20 + col * 2.8, 66 + row * 2.5, 7.5);
              group.add(tube);
            }
          }
        }

        // Heavy Arm Cannon (Right) & Power Fist (Left)
        // Right Rotary Plasma Gatling
        const rShoulder = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 12), frameMat);
        rShoulder.position.set(18, 52, 0);
        group.add(rShoulder);
        const rUpper = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 16, 12), armorMat);
        rUpper.position.set(24, 42, 0);
        group.add(rUpper);
        const rGatling = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 8, 16), frameMat);
        rGatling.rotateX(Math.PI / 2);
        rGatling.position.set(24, 30, 4);
        group.add(rGatling);
        for (let b = 0; b < 6; b++) {
          const ang = (b * Math.PI * 2) / 6;
          const bar = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 24, 8), frameMat);
          bar.rotateX(Math.PI / 2);
          bar.position.set(24 + Math.cos(ang) * 3.5, 30 + Math.sin(ang) * 3.5, 16);
          group.add(bar);
        }

        // Left Hydraulic Claw
        const lShoulder = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 12), frameMat);
        lShoulder.position.set(-18, 52, 0);
        group.add(lShoulder);
        const lUpper = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 16, 12), armorMat);
        lUpper.position.set(-24, 42, 0);
        group.add(lUpper);
        const lHand = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 10), frameMat);
        lHand.position.set(-24, 30, 2);
        group.add(lHand);
        for (let c = -1; c <= 1; c += 2) {
          const claw = new THREE.Mesh(new THREE.ConeGeometry(2, 10, 4), hazardMat);
          claw.rotateX(Math.PI / 2);
          claw.position.set(-24 + c * 3, 30, 11);
          group.add(claw);
        }

        // Waist & Hydraulic Legs
        const pelvis = new THREE.Mesh(new THREE.BoxGeometry(20, 8, 16), frameMat);
        pelvis.position.set(0, 38, 0);
        group.add(pelvis);

        for (const s of [-1, 1]) {
          const hip = new THREE.Mesh(new THREE.SphereGeometry(5, 12, 12), frameMat);
          hip.position.set(s * 10, 34, 0);
          group.add(hip);
          const thigh = new THREE.Mesh(new THREE.BoxGeometry(8, 18, 10), armorMat);
          thigh.position.set(s * 11, 23, -2);
          thigh.rotation.x = 0.2;
          group.add(thigh);
          const knee = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 7, 12), frameMat);
          knee.rotateZ(Math.PI / 2);
          knee.position.set(s * 11, 14, 2);
          group.add(knee);
          const shin = new THREE.Mesh(new THREE.BoxGeometry(9, 18, 12), armorMat);
          shin.position.set(s * 11, 6, 0);
          shin.rotation.x = -0.15;
          group.add(shin);
          // Heavy foot
          const foot = new THREE.Mesh(new THREE.BoxGeometry(14, 5, 22), frameMat);
          foot.position.set(s * 11, -1, 3);
          group.add(foot);
        }
        break;
      }

      case 'robot_cyborg_ninja': {
        const carbonBody = createPbr('#111827', 0.25, 0.85);
        const chromeMat = createPbr('#e2e8f0', 0.1, 0.95);
        const neonCyan = createPbr('#00f0ff', 0.1, 0.05, '#00f0ff', 2.2);

        // Athletic Torso & Cybernetic Spine
        const torso = new THREE.Mesh(new THREE.CylinderGeometry(8, 6, 26, 12), carbonBody);
        torso.position.set(0, 48, 0);
        group.add(torso);
        for (let sp = 0; sp < 6; sp++) {
          const vert = new THREE.Mesh(new THREE.BoxGeometry(4, 2.5, 3), chromeMat);
          vert.position.set(0, 38 + sp * 4, -4.5);
          group.add(vert);
        }

        // Armored Cyber Head & Visor
        const head = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 14), carbonBody);
        head.scale.set(0.9, 1.1, 1.0);
        head.position.set(0, 66, 0);
        group.add(head);
        const vBand = new THREE.Mesh(new THREE.BoxGeometry(9, 2.2, 4), neonCyan);
        vBand.position.set(0, 67, 4);
        group.add(vBand);

        // Arms in Katana Stance
        const rArm = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2, 24, 10), chromeMat);
        rArm.position.set(10, 50, 4);
        rArm.rotation.x = 0.5;
        group.add(rArm);
        const lArm = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2, 24, 10), chromeMat);
        lArm.position.set(-8, 52, 10);
        lArm.rotation.x = 1.0;
        lArm.rotation.y = 0.4;
        group.add(lArm);

        // High-Frequency Neon Katana Blade
        const blade = new THREE.Mesh(new THREE.BoxGeometry(1.2, 54, 3.5), neonCyan);
        blade.position.set(2, 60, 22);
        blade.rotation.x = 0.6;
        blade.rotation.z = -0.4;
        group.add(blade);
        const hilt = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 16, 8), carbonBody);
        hilt.position.set(6, 42, 12);
        hilt.rotation.x = 0.6;
        hilt.rotation.z = -0.4;
        group.add(hilt);

        // Athletic Cyber Legs
        for (const s of [-1, 1]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 2.5, 34, 10), carbonBody);
          leg.position.set(s * 6, 18, 0);
          group.add(leg);
          const foot = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 11), chromeMat);
          foot.position.set(s * 6, 1, 2);
          group.add(foot);
        }
        break;
      }

      case 'robot_spot_dog': {
        const yellowChassis = createPbr('#eab308', 0.35, 0.3);
        const darkFrame = createPbr('#1f2937', 0.3, 0.7);
        const sensorGlass = createPbr('#000000', 0.1, 0.9, '#00f0ff', 0.8);

        // Main Torso Body
        const body = new THREE.Mesh(new THREE.BoxGeometry(16, 12, 38), yellowChassis);
        body.position.set(0, 26, 0);
        group.add(body);

        // 360° LIDAR Scanner Dome on Top
        const lidarBase = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 3, 20), darkFrame);
        lidarBase.position.set(0, 33.5, 2);
        group.add(lidarBase);
        const lidarDome = new THREE.Mesh(new THREE.SphereGeometry(3.5, 16, 12), sensorGlass);
        lidarDome.position.set(0, 35, 2);
        group.add(lidarDome);

        // Front Sensor Face
        const face = new THREE.Mesh(new THREE.BoxGeometry(12, 8, 4), darkFrame);
        face.position.set(0, 26, 20);
        group.add(face);
        for (const c of [-3, 3]) {
          const cam = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 2, 12), sensorGlass);
          cam.rotateX(Math.PI / 2);
          cam.position.set(c, 26, 22.5);
          group.add(cam);
        }

        // 4 Articulated 3-Segment Robotic Legs
        const legOffsets = [[-9, 14], [9, 14], [-9, -14], [9, -14]];
        legOffsets.forEach(([lx, lz]) => {
          const hip = new THREE.Mesh(new THREE.SphereGeometry(3.5, 12, 12), darkFrame);
          hip.position.set(lx, 26, lz);
          group.add(hip);

          // Upper Thigh
          const thigh = new THREE.Mesh(new THREE.CylinderGeometry(2, 1.6, 16, 10), yellowChassis);
          thigh.position.set(lx * 1.15, 18, lz + 2);
          thigh.rotation.x = 0.3;
          group.add(thigh);

          // Knee Joint
          const knee = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 4, 10), darkFrame);
          knee.rotateZ(Math.PI / 2);
          knee.position.set(lx * 1.15, 11, lz + 5);
          group.add(knee);

          // Lower Shin & Rubber Foot Pad
          const shin = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.2, 16, 10), darkFrame);
          shin.position.set(lx * 1.15, 5, lz + 2);
          shin.rotation.x = -0.3;
          group.add(shin);
          const footPad = new THREE.Mesh(new THREE.SphereGeometry(2, 10, 10), darkFrame);
          footPad.position.set(lx * 1.15, 0, lz - 1);
          group.add(footPad);
        });
        break;
      }

      case 'robot_industrial_arm': {
        const kukaOrange = createPbr('#ea580c', 0.3, 0.4);
        const jointMat = createPbr('#1e293b', 0.25, 0.85);
        const steelClaw = createPbr('#cbd5e1', 0.15, 0.95);

        // Circular Mounting Base Pedestal
        const base = new THREE.Mesh(new THREE.CylinderGeometry(18, 20, 6, 32), jointMat);
        base.position.set(0, 3, 0);
        group.add(base);

        // Turntable Swivel J1
        const j1 = new THREE.Mesh(new THREE.CylinderGeometry(12, 14, 10, 24), kukaOrange);
        j1.position.set(0, 11, 0);
        group.add(j1);

        // Lower Arm J2
        const j2Hub = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 14, 20), jointMat);
        j2Hub.rotateZ(Math.PI / 2);
        j2Hub.position.set(0, 20, 0);
        group.add(j2Hub);
        const lowerArm = new THREE.Mesh(new THREE.BoxGeometry(10, 36, 12), kukaOrange);
        lowerArm.position.set(0, 36, -4);
        lowerArm.rotation.x = -0.25;
        group.add(lowerArm);

        // Elbow J3 & Counterweight
        const j3Hub = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 12, 20), jointMat);
        j3Hub.rotateZ(Math.PI / 2);
        j3Hub.position.set(0, 52, -10);
        group.add(j3Hub);

        // Upper Forearm J4/J5
        const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(5, 4, 34, 16), kukaOrange);
        upperArm.position.set(0, 64, 2);
        upperArm.rotation.x = 0.5;
        group.add(upperArm);

        // Wrist J6 & Tool Flange
        const wrist = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 6, 16), jointMat);
        wrist.rotateX(Math.PI / 2);
        wrist.position.set(0, 74, 16);
        group.add(wrist);

        // Pneumatic Gripper End-Effector
        const gBody = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 4), jointMat);
        gBody.position.set(0, 74, 20);
        group.add(gBody);
        for (const s of [-1, 1]) {
          const claw = new THREE.Mesh(new THREE.BoxGeometry(2.5, 10, 3), steelClaw);
          claw.position.set(s * 4, 74, 26);
          group.add(claw);
        }
        break;
      }

      case 'robot_mantis': {
        const insectChassis = createPbr('#064e3b', 0.25, 0.7);
        const bladeMat = createPbr('#10b981', 0.1, 0.2, '#10b981', 1.8);
        const eyeGlow = createPbr('#ef4444', 0.1, 0.1, '#ef4444', 2.0);

        // Slender Thorax
        const thorax = new THREE.Mesh(new THREE.CylinderGeometry(4, 6, 32, 10), insectChassis);
        thorax.position.set(0, 36, 0);
        thorax.rotation.x = 0.3;
        group.add(thorax);

        // Triangular Head & Faceted Sensor Eyes
        const head = new THREE.Mesh(new THREE.ConeGeometry(6, 10, 5), insectChassis);
        head.rotateX(-Math.PI / 2);
        head.position.set(0, 54, 7);
        group.add(head);
        for (const s of [-1, 1]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(2.8, 12, 10), eyeGlow);
          eye.position.set(s * 4.5, 56, 9);
          group.add(eye);
        }

        // Dual Serrated Plasma Scythe Arms
        for (const s of [-1, 1]) {
          const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 22, 8), insectChassis);
          upperArm.position.set(s * 8, 48, 8);
          upperArm.rotation.x = 0.8;
          upperArm.rotation.z = s * 0.4;
          group.add(upperArm);

          const scytheBlade = new THREE.Mesh(new THREE.BoxGeometry(1.2, 34, 5), bladeMat);
          scytheBlade.position.set(s * 12, 36, 20);
          scytheBlade.rotation.x = -0.6;
          scytheBlade.rotation.z = s * -0.2;
          group.add(scytheBlade);
        }

        // 4 Spidery Walking Struts
        for (let i = 0; i < 4; i++) {
          const s = (i % 2 === 0) ? -1 : 1;
          const zOff = (i < 2) ? 4 : -12;
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 0.8, 30, 8), insectChassis);
          leg.position.set(s * 14, 14, zOff);
          leg.rotation.z = s * 0.5;
          leg.rotation.x = (i < 2 ? 0.3 : -0.4);
          group.add(leg);
        }
        break;
      }
      // =========================================================================
      // 1B. ?? NEW HYPER-REALISTIC ROBOTIC SAMPLE MODELS (UNIQUE & NON-REPEATING)
      // =========================================================================

      // 10. MARS EXPLORATION ROVER (Curiosity / Perseverance)
      case 'robot_mars_rover': {
        const whiteChassis = createPbr('#f8fafc', 0.25, 0.4);
        const goldFoil = createPbr('#f59e0b', 0.3, 0.85);
        const titaniumMetal = createPbr('#64748b', 0.2, 0.9);
        const wheelBlack = createPbr('#1e293b', 0.4, 0.6);
        const lensCyan = createPbr('#06b6d4', 0.1, 0.2, '#06b6d4', 1.8);
        const rtgBronze = createPbr('#78350f', 0.35, 0.7);

        // Warm Electronics Box (WEB Chassis)
        const chassis = new THREE.Mesh(new THREE.BoxGeometry(26, 14, 38), whiteChassis);
        chassis.position.set(0, 24, 0);
        group.add(chassis);

        // Gold Thermal Insulation Blanket Base
        const foilPlate = new THREE.Mesh(new THREE.BoxGeometry(26.4, 4, 38.4), goldFoil);
        foilPlate.position.set(0, 18, 0);
        group.add(foilPlate);

        // Top Solar / Equipment Deck
        const deckPlate = new THREE.Mesh(new THREE.BoxGeometry(28, 2, 40), titaniumMetal);
        deckPlate.position.set(0, 31, 0);
        group.add(deckPlate);

        // MMRTG Nuclear Power Unit at rear
        const rtg = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 14, 16), rtgBronze);
        rtg.rotateX(Math.PI / 2);
        rtg.position.set(0, 26, -24);
        group.add(rtg);
        for (let f = 0; f < 8; f++) {
          const finAng = (f * Math.PI) / 4;
          const fin = new THREE.Mesh(new THREE.BoxGeometry(0.8, 14, 14), titaniumMetal);
          fin.rotation.z = finAng;
          fin.position.set(0, 26, -24);
          group.add(fin);
        }

        // UHF High-Gain White Dish Antenna
        const dishBase = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2, 6, 12), titaniumMetal);
        dishBase.position.set(8, 34, -10);
        group.add(dishBase);
        const dish = new THREE.Mesh(new THREE.CylinderGeometry(6, 1, 3, 16), whiteChassis);
        dish.rotateX(0.4);
        dish.position.set(8, 38, -10);
        group.add(dish);

        // Remote Sensing Mast (Neck & Mastcam Head)
        const mastPole = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.5, 26, 12), titaniumMetal);
        mastPole.position.set(-8, 44, 14);
        group.add(mastPole);
        const headBox = new THREE.Mesh(new THREE.BoxGeometry(9, 7, 7), whiteChassis);
        headBox.position.set(-8, 57, 14);
        group.add(headBox);
        for (const s of [-2.5, 2.5]) {
          const lensRim = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 2.5, 16), titaniumMetal);
          lensRim.rotateX(Math.PI / 2);
          lensRim.position.set(-8 + s, 57, 18);
          group.add(lensRim);
          const lensGlass = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 1, 16), lensCyan);
          lensGlass.rotateX(Math.PI / 2);
          lensGlass.position.set(-8 + s, 57, 19.3);
          group.add(lensGlass);
        }
        const chemCam = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 4, 12), titaniumMetal);
        chemCam.rotateX(Math.PI / 2);
        chemCam.position.set(-8, 62, 14);
        group.add(chemCam);

        // Front Robotic Sample Arm (5-Axis Turret)
        const armShoulder = new THREE.Mesh(new THREE.SphereGeometry(3, 12, 10), titaniumMetal);
        armShoulder.position.set(9, 26, 20);
        group.add(armShoulder);
        const armBoom1 = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 16, 8), whiteChassis);
        armBoom1.position.set(11, 20, 26);
        armBoom1.rotation.x = 0.6;
        group.add(armBoom1);
        const armElbow = new THREE.Mesh(new THREE.SphereGeometry(2.5, 10, 10), titaniumMetal);
        armElbow.position.set(11, 14, 32);
        group.add(armElbow);
        const armBoom2 = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 14, 8), whiteChassis);
        armBoom2.position.set(9, 11, 38);
        armBoom2.rotation.x = -0.4;
        group.add(armBoom2);
        const drillTurret = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 5, 12), titaniumMetal);
        drillTurret.rotateZ(Math.PI / 2);
        drillTurret.position.set(7, 8, 44);
        group.add(drillTurret);
        const drillBit = new THREE.Mesh(new THREE.ConeGeometry(1.4, 6, 8), titaniumMetal);
        drillBit.rotateX(Math.PI / 2);
        drillBit.position.set(7, 8, 48);
        group.add(drillBit);

        // 6-Wheel Rocker-Bogie Suspension & Cleated Wheels
        const wheelCoords = [
          [-18, 8, 16], [18, 8, 16],
          [-20, 8, 0], [20, 8, 0],
          [-18, 8, -18], [18, 8, -18]
        ];
        wheelCoords.forEach(([wx, wy, wz]) => {
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 6.5, 6, 24), wheelBlack);
          wheel.rotateZ(Math.PI / 2);
          wheel.position.set(wx, wy, wz);
          group.add(wheel);
          const hub = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 6.4, 16), goldFoil);
          hub.rotateZ(Math.PI / 2);
          hub.position.set(wx, wy, wz);
          group.add(hub);
          const strut = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 14, 8), titaniumMetal);
          strut.position.set(wx * 0.7, wy + 7, wz * 0.7);
          strut.rotation.z = (wx < 0 ? -0.4 : 0.4);
          group.add(strut);
        });

        // Front Hazcam Sensors
        for (const s of [-5, 5]) {
          const hazcam = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 2), titaniumMetal);
          hazcam.position.set(s, 22, 19.5);
          group.add(hazcam);
        }
        break;
      }

      // 11. SURGICAL MEDICAL ROBOT (Da Vinci Style)
      case 'robot_surgical_davinci': {
        const medicalWhite = createPbr('#f8fafc', 0.18, 0.15);
        const stainlessSteel = createPbr('#cbd5e1', 0.1, 0.95);
        const darkBase = createPbr('#0f172a', 0.25, 0.85);
        const laserGreen = createPbr('#10b981', 0.1, 0.1, '#10b981', 2.0);

        // Weighted Hospital Base Pedestal with Casters
        const base = new THREE.Mesh(new THREE.CylinderGeometry(18, 20, 6, 32), darkBase);
        base.position.set(0, 3, 0);
        group.add(base);

        // Vertical Support Tower Column
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(6, 7, 52, 20), medicalWhite);
        tower.position.set(0, 32, 0);
        group.add(tower);

        // Surgical Status Halo Ring
        const halo = new THREE.Mesh(new THREE.TorusGeometry(12, 1.2, 8, 32), laserGreen);
        halo.rotateX(Math.PI / 2);
        halo.position.set(0, 56, 0);
        group.add(halo);

        // Overhead Boom Arch
        const boom = new THREE.Mesh(new THREE.BoxGeometry(10, 8, 28), medicalWhite);
        boom.position.set(0, 58, 8);
        group.add(boom);

        // 4 Articulated Micro-Arms with Tool End-Effectors
        const armConfigs = [
          { angle: -0.6, tool: 'forceps', xOff: -10, zOff: 18 },
          { angle: -0.2, tool: 'endoscope', xOff: -3, zOff: 24 },
          { angle: 0.2, tool: 'scalpel', xOff: 3, zOff: 24 },
          { angle: 0.6, tool: 'suture', xOff: 10, zOff: 18 }
        ];

        armConfigs.forEach((cfg) => {
          const uArm = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.4, 22, 10), medicalWhite);
          uArm.position.set(cfg.xOff, 48, cfg.zOff * 0.7);
          uArm.rotation.z = cfg.angle * 0.5;
          uArm.rotation.x = 0.5;
          group.add(uArm);

          const elbow = new THREE.Mesh(new THREE.SphereGeometry(2.2, 12, 10), stainlessSteel);
          elbow.position.set(cfg.xOff * 1.2, 38, cfg.zOff);
          group.add(elbow);

          const fArm = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 0.9, 24, 10), stainlessSteel);
          fArm.position.set(cfg.xOff * 1.1, 26, cfg.zOff * 1.2);
          fArm.rotation.x = 0.3;
          group.add(fArm);

          if (cfg.tool === 'forceps') {
            for (const f of [-0.6, 0.6]) {
              const pincer = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 1.2), stainlessSteel);
              pincer.position.set(cfg.xOff * 1.1 + f, 12, cfg.zOff * 1.2);
              pincer.rotation.z = f * 0.3;
              group.add(pincer);
            }
          } else if (cfg.tool === 'endoscope') {
            const camBody = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 5, 12), stainlessSteel);
            camBody.position.set(cfg.xOff * 1.1, 13, cfg.zOff * 1.2);
            group.add(camBody);
            const camLens = new THREE.Mesh(new THREE.SphereGeometry(1.2, 10, 8), laserGreen);
            camLens.position.set(cfg.xOff * 1.1, 10, cfg.zOff * 1.2);
            group.add(camLens);
          } else if (cfg.tool === 'scalpel') {
            const blade = new THREE.Mesh(new THREE.BoxGeometry(0.4, 8, 2), stainlessSteel);
            blade.position.set(cfg.xOff * 1.1, 11, cfg.zOff * 1.2);
            group.add(blade);
          } else {
            const needle = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.4, 6, 16, Math.PI), stainlessSteel);
            needle.position.set(cfg.xOff * 1.1, 11, cfg.zOff * 1.2);
            group.add(needle);
          }
        });
        break;
      }

      // 12. DEEP-SEA EXPLORATION ROV SUBMERSIBLE
      case 'robot_deepsea_rov': {
        const yellowFoam = createPbr('#eab308', 0.35, 0.4);
        const titaniumCage = createPbr('#475569', 0.2, 0.85);
        const pressureHull = createPbr('#0f172a', 0.08, 0.95);
        const floodlightWhite = createPbr('#ffffff', 0.1, 0.1, '#ffffff', 2.5);
        const thrusterShroudMat = createPbr('#1e293b', 0.3, 0.7);

        // Syntactic Buoyancy Foam Block (top)
        const foam = new THREE.Mesh(new THREE.BoxGeometry(34, 12, 40), yellowFoam);
        foam.position.set(0, 36, 0);
        group.add(foam);

        // Heavy Tubular Titanium Crash Cage & Skid Frame
        for (const s of [-1, 1]) {
          const skid = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 46, 12), titaniumCage);
          skid.rotateX(Math.PI / 2);
          skid.position.set(s * 17, 4, 0);
          group.add(skid);
          for (let p = -1; p <= 1; p += 2) {
            const riser = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 30, 8), titaniumCage);
            riser.position.set(s * 17, 19, p * 16);
            group.add(riser);
          }
        }

        // Spherical Acrylic Pressure Observation Sphere
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(11, 24, 18), pressureHull);
        sphere.position.set(0, 20, 2);
        group.add(sphere);

        // 4 Vector Thrusters with Kort Shrouds
        const thrusterCoords = [
          [-18, 20, -16, 0], [18, 20, -16, 0],
          [-14, 28, 8, Math.PI / 2], [14, 28, 8, Math.PI / 2]
        ];
        thrusterCoords.forEach(([tx, ty, tz, rx]) => {
          const shroud = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 8, 16, 1, true), thrusterShroudMat);
          shroud.rotation.x = rx;
          shroud.position.set(tx, ty, tz);
          group.add(shroud);
          const hub = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 8, 8), titaniumCage);
          hub.rotation.x = rx;
          hub.position.set(tx, ty, tz);
          group.add(hub);
        });

        // 6-Axis Hydraulic Manipulator Claw Arm
        const armB1 = new THREE.Mesh(new THREE.CylinderGeometry(2, 1.8, 18, 8), titaniumCage);
        armB1.position.set(-12, 14, 14);
        armB1.rotation.x = 0.5;
        group.add(armB1);
        const armB2 = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.4, 16, 8), titaniumCage);
        armB2.position.set(-12, 8, 24);
        armB2.rotation.x = -0.3;
        group.add(armB2);
        for (let c = 0; c < 3; c++) {
          const claw = new THREE.Mesh(new THREE.BoxGeometry(1, 6, 1.2), titaniumCage);
          claw.position.set(-12 + Math.cos(c * 2) * 2, 4, 30 + Math.sin(c * 2) * 2);
          group.add(claw);
        }

        // Specimen Collection Basket Tray
        const tray = new THREE.Mesh(new THREE.BoxGeometry(20, 4, 12), titaniumCage);
        tray.position.set(0, 6, 22);
        group.add(tray);

        // 4 High-Intensity Deep-Sea LED Floodlights
        const lightOffsets = [[-12, 28, 18], [12, 28, 18], [-8, 10, 18], [8, 10, 18]];
        lightOffsets.forEach(([lx, ly, lz]) => {
          const lightCan = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2, 4, 12), titaniumCage);
          lightCan.rotateX(Math.PI / 2);
          lightCan.position.set(lx, ly, lz);
          group.add(lightCan);
          const bulb = new THREE.Mesh(new THREE.SphereGeometry(1.8, 10, 8), floodlightWhite);
          bulb.position.set(lx, ly, lz + 2.2);
          group.add(bulb);
        });
        break;
      }

      // 13. HEAVY AGRICULTURAL HARVESTER BOT
      case 'robot_agri_harvester': {
        const agriGreen = createPbr('#15803d', 0.3, 0.45);
        const warningYellow = createPbr('#eab308', 0.3, 0.5);
        const rubberTrack = createPbr('#1c1917', 0.65, 0.1);
        const galvanizedSteel = createPbr('#94a3b8', 0.25, 0.85);
        const beaconAmber = createPbr('#f59e0b', 0.1, 0.1, '#f59e0b', 2.0);

        // Main Heavy Combine Harvester Body
        const body = new THREE.Mesh(new THREE.BoxGeometry(28, 20, 48), agriGreen);
        body.position.set(0, 22, 0);
        group.add(body);

        // Upper Grain Hopper Extension
        const hopper = new THREE.Mesh(new THREE.BoxGeometry(24, 8, 32), warningYellow);
        hopper.position.set(0, 34, -4);
        group.add(hopper);

        // Heavy Dual Track Undercarriage
        for (const s of [-1, 1]) {
          const track = new THREE.Mesh(new THREE.BoxGeometry(7, 12, 54), rubberTrack);
          track.position.set(s * 18, 7, 0);
          group.add(track);
          for (let w = -20; w <= 20; w += 10) {
            const wheel = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 7.5, 16), warningYellow);
            wheel.rotateZ(Math.PI / 2);
            wheel.position.set(s * 18, 6, w);
            group.add(wheel);
          }
        }

        // Front Rotary Reel Cutter Header
        const headerFrame = new THREE.Mesh(new THREE.BoxGeometry(44, 4, 14), agriGreen);
        headerFrame.position.set(0, 10, 30);
        group.add(headerFrame);
        const reel = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 42, 16), galvanizedSteel);
        reel.rotateZ(Math.PI / 2);
        reel.position.set(0, 11, 35);
        group.add(reel);
        for (let b = 0; b < 6; b++) {
          const bAng = (b * Math.PI) / 3;
          const blade = new THREE.Mesh(new THREE.BoxGeometry(42, 1.2, 1.5), warningYellow);
          blade.position.set(0, 11 + Math.sin(bAng) * 6.5, 35 + Math.cos(bAng) * 6.5);
          group.add(blade);
        }

        // Overhead Unloading Auger Tube
        const auger = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 40, 12), warningYellow);
        auger.position.set(-16, 36, -8);
        auger.rotation.z = 0.5;
        auger.rotation.y = 0.3;
        group.add(auger);

        // Autonomous Navigation RTK-GPS Domes & Amber Safety Beacon
        const gps1 = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 2, 16), galvanizedSteel);
        gps1.position.set(-8, 39, 6);
        group.add(gps1);
        const gps2 = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 2, 16), galvanizedSteel);
        gps2.position.set(8, 39, 6);
        group.add(gps2);
        const beacon = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 3.5, 12), beaconAmber);
        beacon.position.set(0, 40, 6);
        group.add(beacon);
        break;
      }

      // 14. AUTONOMOUS SECURITY PATROL ORB
      case 'robot_patrol_orb': {
        const whiteGloss = createPbr('#f8fafc', 0.1, 0.2);
        const darkGlass = createPbr('#090d16', 0.05, 0.95);
        const lidarCyan = createPbr('#00f0ff', 0.1, 0.1, '#00f0ff', 2.2);
        const beaconBlue = createPbr('#2563eb', 0.1, 0.1, '#3b82f6', 2.5);
        const aluminumTrim = createPbr('#94a3b8', 0.15, 0.9);

        // Aerodynamic Egg-Spherical Outer Hull
        const hullGeo = new THREE.SphereGeometry(18, 32, 24);
        hullGeo.scale(1.0, 1.45, 1.0);
        const hull = new THREE.Mesh(hullGeo, whiteGloss);
        hull.position.set(0, 32, 0);
        group.add(hull);

        // Weighted Gyro Drive Base
        const base = new THREE.Mesh(new THREE.CylinderGeometry(14, 16, 6, 32), darkGlass);
        base.position.set(0, 4, 0);
        group.add(base);

        // 360-Degree Recessed Horizontal LIDAR Ring
        const lidarRing = new THREE.Mesh(new THREE.TorusGeometry(18.2, 1.6, 8, 40), lidarCyan);
        lidarRing.rotateX(Math.PI / 2);
        lidarRing.position.set(0, 32, 0);
        group.add(lidarRing);

        // Panoramic Camera Sensor Array (Visor)
        const visor = new THREE.Mesh(new THREE.BoxGeometry(16, 8, 6), darkGlass);
        visor.position.set(0, 44, 15);
        group.add(visor);
        for (const s of [-4, 0, 4]) {
          const lens = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 2, 12), aluminumTrim);
          lens.rotateX(Math.PI / 2);
          lens.position.set(s, 44, 17.5);
          group.add(lens);
        }

        // Top Pulsing Emergency Security Beacon
        const beacon = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 4, 4, 20), beaconBlue);
        beacon.position.set(0, 58, 0);
        group.add(beacon);
        break;
      }

      // 15. BIPEDAL RECON SCOUT WALKER
      case 'robot_scout_walker': {
        const camoGreen = createPbr('#3f4f3f', 0.35, 0.55);
        const mechDark = createPbr('#1c221c', 0.3, 0.75);
        const chromeHydraulic = createPbr('#e2e8f0', 0.1, 0.95);
        const sensorAmber = createPbr('#f59e0b', 0.1, 0.1, '#f59e0b', 2.0);

        // Armored Angular Sensor Pod Cockpit
        const pod = new THREE.Mesh(new THREE.BoxGeometry(22, 18, 24), camoGreen);
        pod.position.set(0, 50, 0);
        group.add(pod);

        // Slanted Front Armored Canopy
        const canopy = new THREE.Mesh(new THREE.ConeGeometry(12, 14, 4), camoGreen);
        canopy.rotateX(Math.PI / 2);
        canopy.scale.set(1.0, 0.6, 1.0);
        canopy.position.set(0, 50, 16);
        group.add(canopy);

        // Chin Sensor Turret
        const chin = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 12), mechDark);
        chin.position.set(0, 39, 10);
        group.add(chin);
        for (const s of [-2, 2]) {
          const eye = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 2.5, 12), sensorAmber);
          eye.rotateX(Math.PI / 2);
          eye.position.set(s, 39, 13);
          group.add(eye);
        }

        // Roof Communication Dish & Antennas
        const dish = new THREE.Mesh(new THREE.CylinderGeometry(5, 1, 2, 16), camoGreen);
        dish.rotateX(0.5);
        dish.position.set(-6, 61, -4);
        group.add(dish);
        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 18, 8), chromeHydraulic);
        ant.position.set(6, 68, -6);
        group.add(ant);

        // Reverse-Joint Avian Digitigrade Legs (Chicken-Walker)
        for (const s of [-1, 1]) {
          const hip = new THREE.Mesh(new THREE.SphereGeometry(4.5, 14, 12), mechDark);
          hip.position.set(s * 14, 42, 0);
          group.add(hip);

          const thigh = new THREE.Mesh(new THREE.BoxGeometry(6, 20, 8), camoGreen);
          thigh.position.set(s * 15, 34, -8);
          thigh.rotation.x = -0.6;
          group.add(thigh);

          const piston = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 18, 8), chromeHydraulic);
          piston.position.set(s * 18, 32, -6);
          piston.rotation.x = -0.6;
          group.add(piston);

          const knee = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 6, 12), mechDark);
          knee.rotateZ(Math.PI / 2);
          knee.position.set(s * 15, 23, -15);
          group.add(knee);

          const shin = new THREE.Mesh(new THREE.BoxGeometry(5, 26, 7), camoGreen);
          shin.position.set(s * 15, 12, -4);
          shin.rotation.x = 0.55;
          group.add(shin);

          const foot = new THREE.Mesh(new THREE.BoxGeometry(14, 4, 18), mechDark);
          foot.position.set(s * 15, 2, 4);
          group.add(foot);
        }
        break;
      }

      // 16. MILITARY BOMB DISPOSAL EOD ROBOT
      case 'robot_eod_disposal': {
        const coyoteTan = createPbr('#78593a', 0.35, 0.45);
        const darkMetal = createPbr('#1f2421', 0.25, 0.85);
        const steelClaw = createPbr('#94a3b8', 0.15, 0.95);
        const sensorRed = createPbr('#ef4444', 0.1, 0.1, '#ef4444', 2.0);

        // Low-Profile Armored Main Chassis
        const chassis = new THREE.Mesh(new THREE.BoxGeometry(20, 10, 36), coyoteTan);
        chassis.position.set(0, 12, 0);
        group.add(chassis);

        // Dual Main Rubber Continuous Treads
        for (const s of [-1, 1]) {
          const track = new THREE.Mesh(new THREE.BoxGeometry(5, 12, 40), darkMetal);
          track.position.set(s * 13, 8, 0);
          group.add(track);

          const flipper = new THREE.Mesh(new THREE.BoxGeometry(4.5, 8, 16), darkMetal);
          flipper.position.set(s * 13, 14, 24);
          flipper.rotation.x = -0.5;
          group.add(flipper);
        }

        // 3-Stage Telescopic Articulated Manipulator Arm
        const armBase = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 6, 16), darkMetal);
        armBase.position.set(0, 18, -4);
        group.add(armBase);
        const seg1 = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 22, 10), coyoteTan);
        seg1.position.set(0, 28, 4);
        seg1.rotation.x = 0.5;
        group.add(seg1);
        const elbow = new THREE.Mesh(new THREE.SphereGeometry(3, 12, 10), darkMetal);
        elbow.position.set(0, 38, 12);
        group.add(elbow);
        const seg2 = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 20, 10), coyoteTan);
        seg2.position.set(0, 42, 22);
        seg2.rotation.x = 0.2;
        group.add(seg2);

        // Heavy Serrated Steel Gripper Claw
        const wrist = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 4, 12), darkMetal);
        wrist.rotateX(Math.PI / 2);
        wrist.position.set(0, 44, 32);
        group.add(wrist);
        for (const s of [-1.5, 1.5]) {
          const claw = new THREE.Mesh(new THREE.BoxGeometry(1.2, 8, 2.5), steelClaw);
          claw.position.set(s, 44, 37);
          group.add(claw);
        }

        // Camera Mast with PTZ Head & Antenna
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 22, 8), darkMetal);
        mast.position.set(-6, 26, -12);
        group.add(mast);
        const ptz = new THREE.Mesh(new THREE.BoxGeometry(5, 4, 5), darkMetal);
        ptz.position.set(-6, 38, -12);
        group.add(ptz);
        const irEye = new THREE.Mesh(new THREE.SphereGeometry(1.4, 10, 8), sensorRed);
        irEye.position.set(-6, 38, -9);
        group.add(irEye);
        break;
      }

      // 17. AUTONOMOUS HEAVY EXCAVATOR BOT
      case 'robot_excavator_mech': {
        const catYellow = createPbr('#eab308', 0.25, 0.45);
        const darkSteel = createPbr('#1e293b', 0.25, 0.85);
        const chromeRod = createPbr('#f1f5f9', 0.08, 0.98);
        const hazardBeacons = createPbr('#ea580c', 0.1, 0.1, '#ea580c', 2.0);

        // Heavy Tracked Undercarriage
        for (const s of [-1, 1]) {
          const track = new THREE.Mesh(new THREE.BoxGeometry(8, 12, 58), darkSteel);
          track.position.set(s * 18, 7, 0);
          group.add(track);
        }
        const carbody = new THREE.Mesh(new THREE.BoxGeometry(28, 8, 40), darkSteel);
        carbody.position.set(0, 10, 0);
        group.add(carbody);

        // 360-Degree Slew Platform & Equipment Cab
        const cab = new THREE.Mesh(new THREE.BoxGeometry(26, 18, 38), catYellow);
        cab.position.set(-2, 24, -4);
        group.add(cab);

        const counterweight = new THREE.Mesh(new THREE.BoxGeometry(28, 14, 12), darkSteel);
        counterweight.position.set(-2, 24, -26);
        group.add(counterweight);
        const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 16, 8), darkSteel);
        exhaust.position.set(8, 36, -26);
        group.add(exhaust);

        // Massive Articulated Boom Arm
        const boomBase = new THREE.Mesh(new THREE.BoxGeometry(8, 42, 10), catYellow);
        boomBase.position.set(2, 38, 14);
        boomBase.rotation.x = -0.5;
        group.add(boomBase);

        const cyl = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 26, 10), chromeRod);
        cyl.position.set(2, 34, 8);
        cyl.rotation.x = -0.4;
        group.add(cyl);

        const stick = new THREE.Mesh(new THREE.BoxGeometry(6, 32, 8), catYellow);
        stick.position.set(2, 48, 36);
        stick.rotation.x = 0.6;
        group.add(stick);

        // Excavator Heavy Trenching Bucket with Digging Teeth
        const bucket = new THREE.Mesh(new THREE.BoxGeometry(12, 10, 12), darkSteel);
        bucket.position.set(2, 36, 48);
        group.add(bucket);
        for (let t = -4; t <= 4; t += 2) {
          const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.8, 4, 4), darkSteel);
          tooth.rotateX(Math.PI / 2);
          tooth.position.set(2 + t, 32, 54);
          group.add(tooth);
        }

        const beacon = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 3, 12), hazardBeacons);
        beacon.position.set(-6, 34, 6);
        group.add(beacon);
        break;
      }

      // 18. AUTONOMOUS CARGO DELIVERY HEXACOPTER
      case 'robot_delivery_drone': {
        const carbonMat = createPbr('#18181b', 0.35, 0.7);
        const motorBlue = createPbr('#2563eb', 0.15, 0.85);
        const propMat = createPbr('#27272a', 0.3, 0.5);
        const cargoOrange = createPbr('#ea580c', 0.3, 0.4);
        const strobeGreen = createPbr('#22c55e', 0.1, 0.1, '#22c55e', 2.0);
        const strobeRed = createPbr('#ef4444', 0.1, 0.1, '#ef4444', 2.0);

        // Central Carbon-Fiber Fuselage
        const core = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, 6, 6), carbonMat);
        core.position.set(0, 28, 0);
        group.add(core);

        // 6 Radial Carbon Boom Arms & Motors
        for (let a = 0; a < 6; a++) {
          const ang = (a * Math.PI * 2) / 6;
          const armX = Math.cos(ang) * 28;
          const armZ = Math.sin(ang) * 28;

          const boom = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 28, 8), carbonMat);
          boom.position.set(armX * 0.5, 28, armZ * 0.5);
          boom.rotation.y = -ang + Math.PI / 2;
          boom.rotation.z = Math.PI / 2;
          group.add(boom);

          const motor = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 4, 16), motorBlue);
          motor.position.set(armX, 30, armZ);
          group.add(motor);

          const prop = new THREE.Mesh(new THREE.BoxGeometry(22, 0.6, 2.5), propMat);
          prop.position.set(armX, 32.5, armZ);
          prop.rotation.y = ang * 2;
          group.add(prop);

          const led = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 8), (a % 2 === 0 ? strobeGreen : strobeRed));
          led.position.set(armX * 1.06, 28, armZ * 1.06);
          group.add(led);
        }

        // Carbon Landing Gear Skids
        for (const s of [-1, 1]) {
          const skid = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 34, 8), carbonMat);
          skid.rotateX(Math.PI / 2);
          skid.position.set(s * 12, 8, 0);
          group.add(skid);
          for (const l of [-10, 10]) {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 16, 8), carbonMat);
            leg.position.set(s * 12, 18, l);
            group.add(leg);
          }
        }

        // Detachable Cargo Delivery Container Pod
        const cargo = new THREE.Mesh(new THREE.BoxGeometry(16, 12, 18), cargoOrange);
        cargo.position.set(0, 18, 0);
        group.add(cargo);
        break;
      }

      // 19. WAREHOUSE AGV MOBILE BOT
      case 'robot_warehouse_agv': {
        const agvOrange = createPbr('#ea580c', 0.25, 0.4);
        const bumperDark = createPbr('#18181b', 0.4, 0.6);
        const liftSteel = createPbr('#cbd5e1', 0.15, 0.95);
        const eStopRed = createPbr('#dc2626', 0.2, 0.3, '#dc2626', 1.5);
        const statusYellow = createPbr('#eab308', 0.1, 0.1, '#eab308', 2.0);

        // Low-Profile Main AGV Chassis
        const body = new THREE.Mesh(new THREE.BoxGeometry(32, 12, 38), agvOrange);
        body.position.set(0, 10, 0);
        group.add(body);

        // Perimeter Protective Rubber Bumper
        const bumper = new THREE.Mesh(new THREE.BoxGeometry(34, 4, 40), bumperDark);
        bumper.position.set(0, 6, 0);
        group.add(bumper);

        // Top Rotating Lift Turntable Plate
        const liftPlate = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 3, 32), liftSteel);
        liftPlate.position.set(0, 17.5, 0);
        group.add(liftPlate);

        // 4 Mecanum Wheels
        const wCoords = [[-16, 6, 12], [16, 6, 12], [-16, 6, -12], [16, 6, -12]];
        wCoords.forEach(([wx, wy, wz]) => {
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 4, 16), bumperDark);
          wheel.rotateZ(Math.PI / 2);
          wheel.position.set(wx, wy, wz);
          group.add(wheel);
        });

        // Emergency Stop Push Buttons on corners
        for (const s of [-13, 13]) {
          const eStop = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 2, 12), eStopRed);
          eStop.position.set(s, 17, 15);
          group.add(eStop);
        }

        // Directional Status LEDs
        for (const s of [-10, 10]) {
          const led = new THREE.Mesh(new THREE.BoxGeometry(2, 1.5, 1.5), statusYellow);
          led.position.set(s, 11, 19.2);
          group.add(led);
        }
        break;
      }

      // 20. HUMANOID SPACE EXPLORATION ROBOT (Valkyrie / Robonaut)
      case 'robot_space_valkyrie': {
        const nasaWhite = createPbr('#f8fafc', 0.2, 0.3);
        const goldVisor = createPbr('#f59e0b', 0.08, 0.98);
        const jointDark = createPbr('#334155', 0.2, 0.85);
        const telemetryCyan = createPbr('#00f0ff', 0.1, 0.1, '#00f0ff', 2.0);

        // NASA EVA Micro-Meteoroid Upper Torso
        const chest = new THREE.Mesh(new THREE.BoxGeometry(18, 18, 14), nasaWhite);
        chest.position.set(0, 48, 0);
        group.add(chest);

        // Glowing Chest Telemetry Emblem
        const emblem = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 1, 20), telemetryCyan);
        emblem.rotateX(Math.PI / 2);
        emblem.position.set(0, 50, 7.2);
        group.add(emblem);

        // Spherical Helmet with Reflective Gold Mirror Visor
        const helmet = new THREE.Mesh(new THREE.SphereGeometry(6.5, 20, 16), nasaWhite);
        helmet.position.set(0, 64, 0);
        group.add(helmet);
        const visor = new THREE.Mesh(new THREE.SphereGeometry(5.8, 20, 16), goldVisor);
        visor.scale.set(1.0, 0.85, 1.05);
        visor.position.set(0, 64, 1.5);
        group.add(visor);

        // Life-Support Battery Backpack with Cold-Gas Thruster Nozzles
        const backpack = new THREE.Mesh(new THREE.BoxGeometry(14, 18, 8), jointDark);
        backpack.position.set(0, 48, -10);
        group.add(backpack);
        for (const s of [-5, 5]) {
          const nozzle = new THREE.Mesh(new THREE.ConeGeometry(1.5, 3.5, 12), jointDark);
          nozzle.rotateX(-Math.PI / 2);
          nozzle.position.set(s, 56, -14);
          group.add(nozzle);
        }

        // Articulated Arms and Dexterous Robotic Hands
        for (const s of [-1, 1]) {
          const shoulder = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 10), jointDark);
          shoulder.position.set(s * 13, 52, 0);
          group.add(shoulder);

          const uArm = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.4, 16, 10), nasaWhite);
          uArm.position.set(s * 15, 42, 0);
          group.add(uArm);

          const fArm = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2, 16, 10), nasaWhite);
          fArm.position.set(s * 15, 28, 2);
          fArm.rotation.x = 0.2;
          group.add(fArm);

          const hand = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 3), jointDark);
          hand.position.set(s * 15, 18, 4);
          group.add(hand);
        }

        // Bipedal Space Legs with ISS Grapple Feet
        const pelvis = new THREE.Mesh(new THREE.BoxGeometry(14, 6, 10), jointDark);
        pelvis.position.set(0, 36, 0);
        group.add(pelvis);

        for (const s of [-1, 1]) {
          const thigh = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 2.6, 18, 10), nasaWhite);
          thigh.position.set(s * 6, 25, 0);
          group.add(thigh);

          const shin = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.2, 18, 10), nasaWhite);
          shin.position.set(s * 6, 10, 0);
          group.add(shin);

          const foot = new THREE.Mesh(new THREE.BoxGeometry(6, 3.5, 14), jointDark);
          foot.position.set(s * 6, 1.5, 2);
          group.add(foot);
        }
        break;
      }

      // 21. HEAVY PERIMETER SENTRY DEFENSE TURRET
      case 'robot_sentry_turret': {
        const gunmetal = createPbr('#334155', 0.2, 0.85);
        const parkerized = createPbr('#1e293b', 0.35, 0.75);
        const laserRed = createPbr('#ef4444', 0.1, 0.1, '#ef4444', 2.5);
        const ammoDrum = createPbr('#475569', 0.25, 0.8);

        // Heavy Cast Steel Triangular Tripod Base
        const hubBase = new THREE.Mesh(new THREE.CylinderGeometry(8, 10, 6, 16), gunmetal);
        hubBase.position.set(0, 12, 0);
        group.add(hubBase);

        for (let t = 0; t < 3; t++) {
          const tAng = (t * Math.PI * 2) / 3;
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2, 28, 8), parkerized);
          leg.position.set(Math.cos(tAng) * 14, 5, Math.sin(tAng) * 14);
          leg.rotation.z = Math.sin(tAng) * 0.7;
          leg.rotation.x = Math.cos(tAng) * 0.7;
          group.add(leg);
        }

        // 360-Degree Azimuth Turret Cupola
        const cupola = new THREE.Mesh(new THREE.CylinderGeometry(9, 11, 14, 20), gunmetal);
        cupola.position.set(0, 22, 0);
        group.add(cupola);

        // Dual Heavy 30mm Autocannons
        for (const s of [-5, 5]) {
          const barrel = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 42, 12), parkerized);
          barrel.rotateX(Math.PI / 2);
          barrel.position.set(s, 24, 20);
          group.add(barrel);

          const brake = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 6, 12), gunmetal);
          brake.rotateX(Math.PI / 2);
          brake.position.set(s, 24, 40);
          group.add(brake);
        }

        // Dual Armored Side Ammunition Drums
        for (const s of [-1, 1]) {
          const drum = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 6, 16), ammoDrum);
          drum.rotateZ(Math.PI / 2);
          drum.position.set(s * 14, 22, 0);
          group.add(drum);
        }

        // Top Target Acquisition Radar & FLIR Sensor Pod
        const radar = new THREE.Mesh(new THREE.CylinderGeometry(5, 2, 3, 16), gunmetal);
        radar.rotateX(0.4);
        radar.position.set(0, 32, -4);
        group.add(radar);

        const flir = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 6), parkerized);
        flir.position.set(0, 30, 8);
        group.add(flir);
        const laserDot = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), laserRed);
        laserDot.position.set(0, 30, 11.2);
        group.add(laserDot);
        break;
      }

      // 22. BIONIC VELOCIRAPTOR COMBAT RUNNER
      case 'robot_cyber_raptor': {
        const chromeSkel = createPbr('#e2e8f0', 0.1, 0.95);
        const carbonScale = createPbr('#18181b', 0.35, 0.7);
        const eyeRed = createPbr('#ef4444', 0.1, 0.1, '#ef4444', 2.2);

        // Sleek Predatory Raptor Skull & Jaws
        const skull = new THREE.Mesh(new THREE.ConeGeometry(5, 18, 4), carbonScale);
        skull.rotateX(-Math.PI / 2);
        skull.scale.set(1.0, 0.6, 1.0);
        skull.position.set(0, 42, 28);
        group.add(skull);

        // Crimson Predator Eyes
        for (const s of [-2.8, 2.8]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 8), eyeRed);
          eye.position.set(s, 44, 24);
          group.add(eye);
        }

        // Articulated Cybernetic Spine & Torso
        for (let v = 0; v < 8; v++) {
          const vert = new THREE.Mesh(new THREE.BoxGeometry(7 - v * 0.4, 7, 5), chromeSkel);
          vert.position.set(0, 40 - v * 1.5, 18 - v * 6);
          group.add(vert);
        }

        // Long Counterbalancing Segmented Tail
        for (let t = 0; t < 6; t++) {
          const tailSeg = new THREE.Mesh(new THREE.CylinderGeometry(2 - t * 0.25, 2.5 - t * 0.25, 9, 8), chromeSkel);
          tailSeg.rotateX(Math.PI / 2);
          tailSeg.position.set(0, 30 + t * 1.2, -32 - t * 8);
          group.add(tailSeg);
        }

        // Bipedal Running Legs with Sickle Claws
        for (const s of [-1, 1]) {
          const hip = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 10), chromeSkel);
          hip.position.set(s * 8, 34, -4);
          group.add(hip);

          const thigh = new THREE.Mesh(new THREE.BoxGeometry(4.5, 18, 6), carbonScale);
          thigh.position.set(s * 9, 26, -10);
          thigh.rotation.x = -0.5;
          group.add(thigh);

          const shin = new THREE.Mesh(new THREE.BoxGeometry(3.5, 22, 5), chromeSkel);
          shin.position.set(s * 9, 12, -2);
          shin.rotation.x = 0.5;
          group.add(shin);

          const foot = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 12), chromeSkel);
          foot.position.set(s * 9, 2, 4);
          group.add(foot);

          const sickleClaw = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.8, 6, 12, Math.PI / 2), chromeSkel);
          sickleClaw.position.set(s * 9, 5, 8);
          sickleClaw.rotation.y = Math.PI / 2;
          group.add(sickleClaw);
        }

        // Forearm Claws
        for (const s of [-1, 1]) {
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1, 12, 8), chromeSkel);
          arm.position.set(s * 6, 34, 14);
          arm.rotation.x = 0.8;
          group.add(arm);
        }
        break;
      }

      // 23. INDUSTRIAL EXOSKELETON POWER LOADER
      case 'robot_power_loader': {
        const hazardYellow = createPbr('#eab308', 0.3, 0.4);
        const frameDark = createPbr('#18181b', 0.35, 0.8);
        const chromeHyd = createPbr('#f1f5f9', 0.1, 0.95);
        const floodlightHalo = createPbr('#fef08a', 0.1, 0.1, '#fef08a', 2.0);

        // Welded Roll-Cage Protective Cabin
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(22, 26, 18), frameDark);
        cabin.position.set(0, 46, 0);
        group.add(cabin);

        // Overhead Halogen Working Floodlights
        for (const s of [-7, 7]) {
          const light = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2, 4, 12), hazardYellow);
          light.rotateX(Math.PI / 2);
          light.position.set(s, 61, 8);
          group.add(light);
          const bulb = new THREE.Mesh(new THREE.SphereGeometry(1.6, 8, 8), floodlightHalo);
          bulb.position.set(s, 61, 10);
          group.add(bulb);
        }

        // Heavy Overhead Articulated Hydraulic Lifting Arms
        for (const s of [-1, 1]) {
          const shoulder = new THREE.Mesh(new THREE.SphereGeometry(5, 12, 10), frameDark);
          shoulder.position.set(s * 16, 54, -2);
          group.add(shoulder);

          const bArm = new THREE.Mesh(new THREE.BoxGeometry(6, 26, 7), hazardYellow);
          bArm.position.set(s * 18, 42, 6);
          bArm.rotation.x = 0.4;
          group.add(bArm);

          const piston = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 20, 8), chromeHyd);
          piston.position.set(s * 22, 42, 4);
          piston.rotation.x = 0.4;
          group.add(piston);

          const wrist = new THREE.Mesh(new THREE.BoxGeometry(8, 6, 6), frameDark);
          wrist.position.set(s * 18, 26, 14);
          group.add(wrist);

          for (const c of [-3, 3]) {
            const jaw = new THREE.Mesh(new THREE.BoxGeometry(2.5, 14, 4), hazardYellow);
            jaw.position.set(s * 18 + c, 18, 20);
            group.add(jaw);
          }
        }

        // Heavy Stabilizer Biped Walker Legs
        for (const s of [-1, 1]) {
          const hip = new THREE.Mesh(new THREE.SphereGeometry(5, 12, 10), frameDark);
          hip.position.set(s * 10, 32, 0);
          group.add(hip);

          const thigh = new THREE.Mesh(new THREE.BoxGeometry(7, 20, 8), hazardYellow);
          thigh.position.set(s * 11, 22, -4);
          group.add(thigh);

          const shin = new THREE.Mesh(new THREE.BoxGeometry(8, 20, 9), hazardYellow);
          shin.position.set(s * 11, 9, 2);
          group.add(shin);

          const stompFoot = new THREE.Mesh(new THREE.BoxGeometry(14, 5, 24), frameDark);
          stompFoot.position.set(s * 11, 2, 4);
          group.add(stompFoot);
        }
        break;
      }

      // 24. AUTONOMOUS BIONIC MANTA RAY GLIDER
      case 'robot_bionic_manta': {
        const mantaBlue = createPbr('#0284c7', 0.2, 0.7);
        const titaniumEdge = createPbr('#cbd5e1', 0.15, 0.95);
        const glowOcean = createPbr('#06b6d4', 0.1, 0.1, '#06b6d4', 2.0);

        // Flattened Hydrodynamic Fuselage
        const bodyGeo = new THREE.SphereGeometry(14, 24, 16);
        bodyGeo.scale(1.2, 0.35, 2.0);
        const body = new THREE.Mesh(bodyGeo, mantaBlue);
        body.position.set(0, 18, 0);
        group.add(body);

        // Swept Bionic Delta Wings
        for (const s of [-1, 1]) {
          const wing = new THREE.Mesh(new THREE.ConeGeometry(22, 44, 4), mantaBlue);
          wing.rotateZ(s * (Math.PI / 2));
          wing.rotateX(Math.PI / 4);
          wing.scale.set(0.2, 1.0, 0.7);
          wing.position.set(s * 28, 18, -4);
          group.add(wing);

          const edge = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 42, 8), titaniumEdge);
          edge.rotateZ(s * (Math.PI / 2 - 0.2));
          edge.position.set(s * 26, 18, 4);
          group.add(edge);
        }

        // Dorsal Sonar Dome & Ventral Thruster Ducts
        const sonar = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 4.5, 3, 16), titaniumEdge);
        sonar.position.set(0, 24, 4);
        group.add(sonar);

        for (const s of [-5, 5]) {
          const jet = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 12, 12), glowOcean);
          jet.rotateX(Math.PI / 2);
          jet.position.set(s, 16, -18);
          group.add(jet);
        }

        // Slender Articulated Tail
        const tail = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 0.4, 38, 8), titaniumEdge);
        tail.rotateX(Math.PI / 2);
        tail.position.set(0, 18, -32);
        group.add(tail);
        break;
      }

      // 25. AUTONOMOUS MUNICIPAL STREET SWEEPER
      case 'robot_street_sweeper': {
        const sweeperYellow = createPbr('#facc15', 0.2, 0.3);
        const darkTrim = createPbr('#1f2937', 0.35, 0.7);
        const steelBrush = createPbr('#475569', 0.4, 0.8);
        const glassWindshield = createPbr('#030712', 0.05, 0.95);
        const amberBeacon = createPbr('#f59e0b', 0.1, 0.1, '#f59e0b', 2.5);

        // Compact Municipal Van Body
        const cab = new THREE.Mesh(new THREE.BoxGeometry(26, 20, 42), sweeperYellow);
        cab.position.set(0, 18, 0);
        group.add(cab);

        // Panoramic Glass Front Windshield
        const glass = new THREE.Mesh(new THREE.BoxGeometry(24, 10, 8), glassWindshield);
        glass.position.set(0, 22, 18);
        group.add(glass);

        // 4 Street Wheels
        const wPos = [[-14, 6, 14], [14, 6, 14], [-14, 6, -14], [14, 6, -14]];
        wPos.forEach(([wx, wy, wz]) => {
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 4, 16), darkTrim);
          wheel.rotateZ(Math.PI / 2);
          wheel.position.set(wx, wy, wz);
          group.add(wheel);
        });

        // Dual Front Rotating Wire Disc Scrubbing Brushes
        for (const s of [-1, 1]) {
          const disc = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 2.5, 20), steelBrush);
          disc.position.set(s * 12, 4, 26);
          group.add(disc);

          const arm = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 10, 8), darkTrim);
          arm.position.set(s * 9, 8, 22);
          arm.rotation.z = s * -0.5;
          group.add(arm);
        }

        // Central Vacuum Suction Nozzle Duct
        const duct = new THREE.Mesh(new THREE.BoxGeometry(14, 4, 8), darkTrim);
        duct.position.set(0, 4, 6);
        group.add(duct);

        // Roof Amber Flashing Beacon
        const beacon = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 4, 12), amberBeacon);
        beacon.position.set(0, 30, 8);
        group.add(beacon);
        break;
      }

      // 26. ORBITAL SPACE STATION CANADARM
      case 'robot_space_canadarm': {
        const mliWhite = createPbr('#f1f5f9', 0.25, 0.2);
        const titaniumJoint = createPbr('#94a3b8', 0.15, 0.95);
        const goldKapton = createPbr('#d97706', 0.1, 0.85);
        const cameraLight = createPbr('#ffffff', 0.1, 0.1, '#ffffff', 2.0);

        // ISS Orbital Truss Interface Base Mount
        const base = new THREE.Mesh(new THREE.BoxGeometry(18, 6, 18), titaniumJoint);
        base.position.set(0, 3, 0);
        group.add(base);

        // Shoulder Rotary Turntable
        const shoulderHub = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 8, 20), goldKapton);
        shoulderHub.position.set(0, 10, 0);
        group.add(shoulderHub);

        // Boom Segment 1 (MLI Wrapped)
        const boom1 = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 34, 16), mliWhite);
        boom1.position.set(0, 28, 4);
        boom1.rotation.x = 0.3;
        group.add(boom1);

        // Central Elbow Rotary Joint
        const elbow = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 8, 20), goldKapton);
        elbow.rotateZ(Math.PI / 2);
        elbow.position.set(0, 46, 10);
        group.add(elbow);

        // Boom Segment 2 (MLI Wrapped)
        const boom2 = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 36, 16), mliWhite);
        boom2.position.set(0, 58, 24);
        boom2.rotation.x = 0.7;
        group.add(boom2);

        // Wrist 3-Axis Joint
        const wrist = new THREE.Mesh(new THREE.SphereGeometry(3.8, 14, 12), titaniumJoint);
        wrist.position.set(0, 70, 38);
        group.add(wrist);

        // Latching End Effector (LEE) Snare Cylinder
        const lee = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 12, 16), titaniumJoint);
        lee.rotateX(Math.PI / 2);
        lee.position.set(0, 72, 46);
        group.add(lee);

        // Target Illumination Lamp & Camera
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), cameraLight);
        lamp.position.set(2, 74, 52);
        group.add(lamp);
        break;
      }

      // 27. VICTORIAN CLOCKWORK AUTOMATON
      case 'robot_clockwork_automaton': {
        const antiqueBrass = createPbr('#d97706', 0.2, 0.9);
        const rivetedCopper = createPbr('#b45309', 0.25, 0.85);
        const darkWood = createPbr('#451a03', 0.5, 0.1);
        const gaugeGlass = createPbr('#fef3c7', 0.1, 0.3, '#fef3c7', 0.8);

        // Polished Mahogany Pedestal Base
        const base = new THREE.Mesh(new THREE.BoxGeometry(22, 6, 22), darkWood);
        base.position.set(0, 3, 0);
        group.add(base);

        // Riveted Copper Torso with Gear Window Cutout
        const torso = new THREE.Mesh(new THREE.CylinderGeometry(9, 7, 24, 16), rivetedCopper);
        torso.position.set(0, 28, 0);
        group.add(torso);

        // Spinning Clockwork Brass Gears visible in chest
        for (let g = 0; g < 3; g++) {
          const gear = new THREE.Mesh(new THREE.CylinderGeometry(4 - g * 0.8, 4 - g * 0.8, 1.2, 16), antiqueBrass);
          gear.rotateX(Math.PI / 2);
          gear.position.set(-2 + g * 2.5, 28 + (g % 2) * 3, 7.5);
          group.add(gear);
        }

        // Head with Steam Pressure Gauge Dial
        const head = new THREE.Mesh(new THREE.SphereGeometry(5.5, 16, 12), antiqueBrass);
        head.position.set(0, 46, 0);
        group.add(head);

        const gauge = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 1.2, 12), gaugeGlass);
        gauge.rotateX(Math.PI / 2);
        gauge.position.set(0, 48, 5.2);
        group.add(gauge);

        // Clockwork Winding Key on Head
        const keyStem = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 5, 8), antiqueBrass);
        keyStem.position.set(0, 54, 0);
        group.add(keyStem);
        const keyBow = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.6, 6, 16), antiqueBrass);
        keyBow.position.set(0, 57, 0);
        group.add(keyBow);

        // Ball-and-Socket Segmented Arms
        for (const s of [-1, 1]) {
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(2, 1.6, 20, 8), antiqueBrass);
          arm.position.set(s * 12, 26, 0);
          group.add(arm);
        }
        break;
      }

      // 28. SUBTERRANEAN MINING SCORPION
      case 'robot_mining_scorpion': {
        const tungstenSteel = createPbr('#1e293b', 0.35, 0.8);
        const hazardOrange = createPbr('#ea580c', 0.25, 0.4);
        const diamondDrill = createPbr('#94a3b8', 0.15, 0.95);
        const halogenLamp = createPbr('#fef08a', 0.1, 0.1, '#fef08a', 2.0);

        // Heavy Low-Slung Armored Mining Hull
        const hull = new THREE.Mesh(new THREE.BoxGeometry(26, 12, 36), tungstenSteel);
        hull.position.set(0, 16, 0);
        group.add(hull);

        // 6 Multi-Jointed Walking Rock-Legs
        for (let l = 0; l < 6; l++) {
          const s = (l % 2 === 0 ? -1 : 1);
          const zOff = -12 + Math.floor(l / 2) * 12;
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(2, 1.2, 22, 8), tungstenSteel);
          leg.position.set(s * 18, 10, zOff);
          leg.rotation.z = s * 0.6;
          group.add(leg);
        }

        // Front Rock Shovel Pincers
        for (const s of [-1, 1]) {
          const shovel = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 12), hazardOrange);
          shovel.position.set(s * 10, 12, 24);
          group.add(shovel);
        }

        // Arched Overhead Diamond Drill Tail
        for (let t = 0; t < 5; t++) {
          const tAng = (t / 4) * Math.PI * 0.7;
          const seg = new THREE.Mesh(new THREE.BoxGeometry(6 - t * 0.6, 6 - t * 0.6, 8), tungstenSteel);
          seg.position.set(0, 24 + Math.sin(tAng) * 22, -18 + Math.cos(tAng) * 26);
          seg.rotation.x = -tAng;
          group.add(seg);
        }

        // High-Torque Rotary Conical Diamond Drill Bit
        const drill = new THREE.Mesh(new THREE.ConeGeometry(4.5, 16, 12), diamondDrill);
        drill.rotateX(Math.PI / 2);
        drill.position.set(0, 46, 12);
        group.add(drill);

        // Front Work Halogen Headlights
        for (const s of [-6, 6]) {
          const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.8, 8, 8), halogenLamp);
          lamp.position.set(s, 16, 18.5);
          group.add(lamp);
        }
        break;
      }

      // 29. TRACKED FIREFIGHTING AND HAZMAT RESCUE ROBOT
      case 'robot_fire_rescue': {
        const fireRed = createPbr('#dc2626', 0.2, 0.45);
        const darkTrack = createPbr('#18181b', 0.45, 0.6);
        const stainlessNozzle = createPbr('#cbd5e1', 0.1, 0.95);
        const flirInfrared = createPbr('#06b6d4', 0.1, 0.1, '#06b6d4', 2.0);

        // Ceramic Insulated Heavy Chassis
        const body = new THREE.Mesh(new THREE.BoxGeometry(22, 12, 38), fireRed);
        body.position.set(0, 14, 0);
        group.add(body);

        // Continuous Heavy Cleated Tank Treads
        for (const s of [-1, 1]) {
          const tread = new THREE.Mesh(new THREE.BoxGeometry(5.5, 12, 42), darkTrack);
          tread.position.set(s * 14, 8, 0);
          group.add(tread);
        }

        // Roof-Mounted Motorized Water/Foam Cannon Monitor
        const turretBase = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 4, 16), darkTrack);
        turretBase.position.set(0, 22, 2);
        group.add(turretBase);

        const cannon = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 22, 12), stainlessNozzle);
        cannon.rotateX(Math.PI / 2 - 0.3);
        cannon.position.set(0, 28, 12);
        group.add(cannon);

        // Rear Storz Fire Hose Coupling Inlets
        for (const s of [-5, 5]) {
          const coupling = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 5, 12), stainlessNozzle);
          coupling.rotateX(Math.PI / 2);
          coupling.position.set(s, 14, -20);
          group.add(coupling);
        }

        // FLIR Thermal Camera Turret
        const flir = new THREE.Mesh(new THREE.SphereGeometry(3, 12, 10), flirInfrared);
        flir.position.set(6, 24, 10);
        group.add(flir);
        break;
      }

      // 30. WHEELED BIPED DYNAMIC BALANCER (Handle Style)
      case 'robot_handle_balancer': {
        const carbonBody = createPbr('#18181b', 0.3, 0.7);
        const blueStrut = createPbr('#2563eb', 0.2, 0.85);
        const rubberTire = createPbr('#1c1917', 0.65, 0.05);
        const lidarCyan = createPbr('#00f0ff', 0.1, 0.1, '#00f0ff', 2.0);

        // Slender Upright Torso
        const torso = new THREE.Mesh(new THREE.BoxGeometry(14, 24, 10), carbonBody);
        torso.position.set(0, 48, 0);
        group.add(torso);

        // Rear Dynamic Counterweight Inertia Tail
        const tail = new THREE.Mesh(new THREE.BoxGeometry(8, 6, 26), blueStrut);
        tail.position.set(0, 44, -16);
        tail.rotation.x = -0.3;
        group.add(tail);

        // Head Sensor Block with Spinning LIDAR
        const head = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 8), carbonBody);
        head.position.set(0, 62, 2);
        group.add(head);
        const lidar = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 3, 16), lidarCyan);
        lidar.position.set(0, 66, 2);
        group.add(lidar);

        // Two Articulated Wheeled Legs
        for (const s of [-1, 1]) {
          const hip = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 10), blueStrut);
          hip.position.set(s * 10, 40, 0);
          group.add(hip);

          const thigh = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2, 26, 10), blueStrut);
          thigh.position.set(s * 10, 28, -6);
          thigh.rotation.x = -0.4;
          group.add(thigh);

          const shin = new THREE.Mesh(new THREE.CylinderGeometry(2, 1.8, 24, 10), carbonBody);
          shin.position.set(s * 10, 14, 2);
          shin.rotation.x = 0.4;
          group.add(shin);

          // Hub-Motor High-Traction Wheels
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 7.5, 5, 24), rubberTire);
          wheel.rotateZ(Math.PI / 2);
          wheel.position.set(s * 10, 7.5, 8);
          group.add(wheel);
        }
        break;
      }

      // 31. BIOMIMETIC MEDICAL NANOROBOT
      case 'robot_medical_nanobot': {
        const nanoCore = createPbr('#0284c7', 0.15, 0.85);
        const nanoGold = createPbr('#f59e0b', 0.1, 0.95);
        const nanoGlow = createPbr('#10b981', 0.1, 0.1, '#10b981', 2.2);

        // Hexagonal Buckyball Drug Delivery Capsule
        const capsule = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 16, 6), nanoCore);
        capsule.position.set(0, 28, 0);
        group.add(capsule);

        for (const p of [-8, 8]) {
          const cap = new THREE.Mesh(new THREE.SphereGeometry(6, 12, 8), nanoGold);
          cap.position.set(0, 28 + p, 0);
          group.add(cap);
        }

        // Helical Corkscrew Propulsion Flagellum
        for (let h = 0; h < 24; h++) {
          const hAng = h * 0.5;
          const hY = 16 - h * 1.5;
          const coil = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 6), nanoGlow);
          coil.position.set(Math.cos(hAng) * 4.5, hY, Math.sin(hAng) * 4.5);
          group.add(coil);
        }

        // 3 Micro-Manipulator Injector Needles
        for (let i = 0; i < 3; i++) {
          const iAng = (i * Math.PI * 2) / 3;
          const needle = new THREE.Mesh(new THREE.ConeGeometry(0.8, 12, 6), nanoGold);
          needle.position.set(Math.cos(iAng) * 6, 42, Math.sin(iAng) * 6);
          group.add(needle);
        }
        break;
      }

      // 32. HIGH-SPEED FPV RACING QUADCOPTER
      case 'robot_racing_drone': {
        const carbonX = createPbr('#18181b', 0.35, 0.65);
        const motorBell = createPbr('#2563eb', 0.15, 0.9);
        const propViolet = createPbr('#a855f7', 0.2, 0.3, '#a855f7', 1.2);
        const fpvCanopy = createPbr('#84cc16', 0.2, 0.3);
        const raceLed = createPbr('#ec4899', 0.1, 0.1, '#ec4899', 2.5);

        // 3K Carbon-Fiber Unibody X-Frame
        for (const d of [-1, 1]) {
          const spar = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 48), carbonX);
          spar.position.set(0, 10, 0);
          spar.rotation.y = d * (Math.PI / 4);
          group.add(spar);
        }

        // 4 High-KV Motors & Tri-Blade Propellers
        const mOffsets = [[-16, 16], [16, 16], [-16, -16], [16, -16]];
        mOffsets.forEach(([mx, mz]) => {
          const motor = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 4, 16), motorBell);
          motor.position.set(mx, 12, mz);
          group.add(motor);

          for (let b = 0; b < 3; b++) {
            const bAng = (b * Math.PI * 2) / 3;
            const blade = new THREE.Mesh(new THREE.BoxGeometry(11, 0.5, 2.2), propViolet);
            blade.position.set(mx + Math.cos(bAng) * 5, 14.5, mz + Math.sin(bAng) * 5);
            blade.rotation.y = bAng;
            group.add(blade);
          }
        });

        // 45-Degree Tilted Micro FPV Camera in TPU Canopy
        const canopy = new THREE.Mesh(new THREE.ConeGeometry(5, 10, 4), fpvCanopy);
        canopy.position.set(0, 15, 2);
        canopy.rotation.x = -0.7;
        group.add(canopy);

        // Rear RGB Race LED Bar & Cloverleaf Antenna
        const ledBar = new THREE.Mesh(new THREE.BoxGeometry(10, 1.5, 1.5), raceLed);
        ledBar.position.set(0, 11, -18);
        group.add(ledBar);

        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 12, 8), carbonX);
        ant.position.set(0, 18, -14);
        group.add(ant);
        break;
      }

      // 33. AUTONOMOUS AMPHIBIOUS HOVERCRAFT BOT
      case 'robot_hovercraft_bot': {
        const rescueOrange = createPbr('#ea580c', 0.25, 0.4);
        const rubberSkirt = createPbr('#111827', 0.65, 0.05);
        const alloyFan = createPbr('#cbd5e1', 0.15, 0.9);
        const marineLight = createPbr('#10b981', 0.1, 0.1, '#10b981', 2.0);

        // Flexible Perimeter Rubber Air Cushion Skirt
        const skirtGeo = new THREE.CylinderGeometry(18, 20, 8, 24);
        skirtGeo.scale(0.8, 1.0, 1.4);
        const skirt = new THREE.Mesh(skirtGeo, rubberSkirt);
        skirt.position.set(0, 4, 0);
        group.add(skirt);

        // Aerodynamic Deck Hull
        const hullGeo = new THREE.BoxGeometry(26, 8, 46);
        const hull = new THREE.Mesh(hullGeo, rescueOrange);
        hull.position.set(0, 10, 0);
        group.add(hull);

        // Dual Ducted Aft Thrust Fans with Shrouds & Rudders
        for (const s of [-8, 8]) {
          const shroud = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 8, 16, 1, true), rescueOrange);
          shroud.position.set(s, 18, -16);
          group.add(shroud);

          const fan = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 6, 8), alloyFan);
          fan.rotateX(Math.PI / 2);
          fan.position.set(s, 18, -16);
          group.add(fan);

          const rudder = new THREE.Mesh(new THREE.BoxGeometry(0.8, 10, 4), rescueOrange);
          rudder.position.set(s, 18, -22);
          group.add(rudder);
        }

        // Radar Mast & Marine Nav Lights
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 14, 8), rescueOrange);
        mast.position.set(0, 20, 6);
        group.add(mast);

        const navL = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 8), marineLight);
        navL.position.set(-12, 14, 18);
        group.add(navL);
        break;
      }

      // 34. CYBERPUNK PORCELAIN ANDROID GEISHA BUST
      case 'robot_android_geisha': {
        const porcelainWhite = createPbr('#f8fafc', 0.12, 0.05);
        const obsidianHair = createPbr('#09090b', 0.1, 0.95);
        const goldCircuits = createPbr('#f59e0b', 0.08, 0.98);
        const jadeOptics = createPbr('#10b981', 0.1, 0.1, '#10b981', 2.5);
        const lipRed = createPbr('#dc2626', 0.15, 0.1);

        // Elegant Porcelain Bust & Shoulders
        const bustGeo = new THREE.CylinderGeometry(12, 16, 18, 20);
        bustGeo.scale(1.2, 1.0, 0.8);
        const bust = new THREE.Mesh(bustGeo, porcelainWhite);
        bust.position.set(0, 18, 0);
        group.add(bust);

        // Synthetic Cervical Neck & Gold Circuit Conduits
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 5.5, 14, 16), porcelainWhite);
        neck.position.set(0, 32, 0);
        group.add(neck);
        for (let c = 0; c < 4; c++) {
          const cAng = (c * Math.PI) / 2;
          const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 14, 6), goldCircuits);
          wire.position.set(Math.cos(cAng) * 4.8, 32, Math.sin(cAng) * 4.8);
          group.add(wire);
        }

        // Head with Split Porcelain Face Plates
        const head = new THREE.Mesh(new THREE.SphereGeometry(7, 24, 16), porcelainWhite);
        head.scale.set(0.9, 1.2, 1.0);
        head.position.set(0, 48, 0);
        group.add(head);

        // Internal Gold Subdermal Circuitry Revealed by Split Plates
        for (const s of [-3, 3]) {
          const goldPlate = new THREE.Mesh(new THREE.BoxGeometry(1.5, 6, 0.5), goldCircuits);
          goldPlate.position.set(s, 48, 6.8);
          group.add(goldPlate);
        }

        // Luminous Jade Optical Sensor Eyes
        for (const s of [-2.5, 2.5]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8), jadeOptics);
          eye.position.set(s, 50, 6.5);
          group.add(eye);
        }

        // Crimson Lip Lacquer
        const lips = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.8, 1), lipRed);
        lips.position.set(0, 44, 7.2);
        group.add(lips);

        // Sculpted Traditional Obsidian Hair Coiffure
        const hairTop = new THREE.Mesh(new THREE.SphereGeometry(8.5, 20, 16), obsidianHair);
        hairTop.scale.set(1.0, 1.1, 1.15);
        hairTop.position.set(0, 52, -2);
        group.add(hairTop);

        // Gold Needle Hairpins (Kanzashi Antennas)
        for (const s of [-1, 1]) {
          const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.2, 22, 8), goldCircuits);
          pin.rotateZ(s * 0.6);
          pin.position.set(s * 10, 58, -2);
          group.add(pin);
        }
        break;
      }



      // =========================================================================
      // 2. 🏎️ CARS & VEHICLES (LAMBORGHINI, MUSCLE CHARGER, FLYING SPINNER, DAKAR, SEMI)
      // =========================================================================
      case 'car_lamborghini': {
        const paintYellow = createPbr('#eab308', 0.12, 0.45);
        const carbonFiber = createPbr('#111827', 0.35, 0.75);
        const glassDark = createPbr('#050b14', 0.05, 0.95);
        const brakeRed = createPbr('#dc2626', 0.2, 0.8);
        const wheelTire = createPbr('#1f242d', 0.65, 0.05);

        // Low-Slung Wedge Main Monocoque
        const body = new THREE.Mesh(new THREE.BoxGeometry(32, 8, 72), paintYellow);
        body.position.set(0, 8, 0);
        group.add(body);

        // Slanted Aerodynamic Nose Cone
        const nose = new THREE.Mesh(new THREE.ConeGeometry(16, 24, 4), paintYellow);
        nose.rotateX(Math.PI / 2);
        nose.scale.set(1.0, 0.35, 1.0);
        nose.position.set(0, 6, 44);
        group.add(nose);

        // Glass Cockpit Canopy
        const canopy = new THREE.Mesh(new THREE.SphereGeometry(12, 24, 16), glassDark);
        canopy.scale.set(1.0, 0.55, 2.2);
        canopy.position.set(0, 14, -2);
        group.add(canopy);

        // Carbon Front Splitter & Side Air Scoops
        const splitter = new THREE.Mesh(new THREE.BoxGeometry(34, 1.2, 12), carbonFiber);
        splitter.position.set(0, 3, 44);
        group.add(splitter);
        for (const s of [-1, 1]) {
          const scoop = new THREE.Mesh(new THREE.BoxGeometry(3, 8, 16), carbonFiber);
          scoop.position.set(s * 16.5, 9, -10);
          group.add(scoop);
        }

        // Rear Aggressive Diffuser & GT Wing
        const diffuser = new THREE.Mesh(new THREE.BoxGeometry(30, 4, 10), carbonFiber);
        diffuser.position.set(0, 5, -34);
        group.add(diffuser);
        const wing = new THREE.Mesh(new THREE.BoxGeometry(36, 1.4, 10), carbonFiber);
        wing.position.set(0, 18, -32);
        group.add(wing);
        for (const s of [-1, 1]) {
          const pylon = new THREE.Mesh(new THREE.BoxGeometry(1.2, 8, 4), carbonFiber);
          pylon.position.set(s * 10, 14, -30);
          group.add(pylon);
        }

        // 4 Low-Profile Forged Wheels with Brake Discs
        const wPos = [[-16, 18], [16, 18], [-16.5, -20], [16.5, -20]];
        wPos.forEach(([wx, wz]) => {
          const tire = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 7.5, 5, 24), wheelTire);
          tire.rotateZ(Math.PI / 2);
          tire.position.set(wx, 7.5, wz);
          group.add(tire);
          const rotor = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 5.2, 16), carbonFiber);
          rotor.rotateZ(Math.PI / 2);
          rotor.position.set(wx, 7.5, wz);
          group.add(rotor);
          const caliper = new THREE.Mesh(new THREE.BoxGeometry(2, 3.5, 2.5), brakeRed);
          caliper.position.set(wx, 10, wz);
          group.add(caliper);
        });
        break;
      }

      case 'car_muscle_charger': {
        const muscleBlack = createPbr('#09090b', 0.15, 0.9);
        const chromeShine = createPbr('#f1f5f9', 0.08, 0.98);
        const engineMetal = createPbr('#71717a', 0.25, 0.85);

        // Heavy American Muscle Body
        const body = new THREE.Mesh(new THREE.BoxGeometry(30, 12, 76), muscleBlack);
        body.position.set(0, 11, 0);
        group.add(body);

        // Fastback Roof & Pillars
        const roof = new THREE.Mesh(new THREE.BoxGeometry(26, 8, 38), muscleBlack);
        roof.position.set(0, 20, -8);
        group.add(roof);

        // Blower Supercharger Air Scoop on Hood
        const blower = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 14), chromeShine);
        blower.position.set(0, 19, 22);
        group.add(blower);
        for (let b = -1; b <= 1; b++) {
          const butter = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 2, 12), createPbr('#ef4444', 0.2, 0.1));
          butter.rotateX(Math.PI / 2);
          butter.position.set(b * 2.8, 19, 29);
          group.add(butter);
        }

        // Heavy Chrome Front Grille & Bumpers
        const fGrille = new THREE.Mesh(new THREE.BoxGeometry(28, 6, 2), createPbr('#18181b', 0.5, 0.5));
        fGrille.position.set(0, 10, 38.5);
        group.add(fGrille);
        const fChrome = new THREE.Mesh(new THREE.BoxGeometry(32, 3, 3), chromeShine);
        fChrome.position.set(0, 6, 39);
        group.add(fChrome);
        const rChrome = new THREE.Mesh(new THREE.BoxGeometry(32, 3, 3), chromeShine);
        rChrome.position.set(0, 7, -39);
        group.add(rChrome);

        // Fat Rear Drag Wheels & Front Wheels
        const wPos2 = [[-15.5, 7.5, 22, 6.5], [15.5, 7.5, 22, 6.5], [-16.5, 8.5, -20, 9.5], [16.5, 8.5, -20, 9.5]];
        wPos2.forEach(([wx, wy, wz, wr]) => {
          const tire = new THREE.Mesh(new THREE.CylinderGeometry(wr, wr, wr > 8 ? 7.5 : 5, 24), createPbr('#1c1917', 0.7, 0.05));
          tire.rotateZ(Math.PI / 2);
          tire.position.set(wx, wy, wz);
          group.add(tire);
          const rim = new THREE.Mesh(new THREE.CylinderGeometry(wr * 0.65, wr * 0.65, wr > 8 ? 7.8 : 5.3, 16), chromeShine);
          rim.rotateZ(Math.PI / 2);
          rim.position.set(wx, wy, wz);
          group.add(rim);
        });
        break;
      }

      case 'car_flying_spinner': {
        const hullMat = createPbr('#1e1b4b', 0.2, 0.8);
        const glowCyan = createPbr('#00f0ff', 0.1, 0.05, '#00f0ff', 2.0);
        const glassMat = createPbr('#020617', 0.05, 0.95);

        // Aerodynamic VTOL Hull
        const hull = new THREE.Mesh(new THREE.CylinderGeometry(8, 14, 64, 16), hullMat);
        hull.rotateX(Math.PI / 2);
        hull.scale.set(1.4, 0.5, 1.0);
        hull.position.set(0, 10, 0);
        group.add(hull);

        // Bubble Cockpit
        const canopy = new THREE.Mesh(new THREE.SphereGeometry(9, 20, 16), glassMat);
        canopy.scale.set(1.0, 0.7, 2.2);
        canopy.position.set(0, 15, 6);
        group.add(canopy);

        // 4 Rotating VTOL Ducted Hover Turbines (instead of wheels)
        const vtolPos = [[-18, 18], [18, 18], [-20, -18], [20, -18]];
        vtolPos.forEach(([vx, vz]) => {
          const pod = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 5, 20), hullMat);
          pod.position.set(vx, 8, vz);
          group.add(pod);
          const glow = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 4.8, 5.2, 16), glowCyan);
          glow.position.set(vx, 8, vz);
          group.add(glow);
        });

        // Twin Stabilizer Tail Wings
        for (const s of [-1, 1]) {
          const fin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 14, 18), hullMat);
          fin.position.set(s * 12, 18, -24);
          fin.rotation.z = s * -0.25;
          group.add(fin);
        }
        break;
      }

      case 'car_dakar_truck': {
        const sandPaint = createPbr('#d97706', 0.45, 0.1);
        const tubeChassis = createPbr('#1f2937', 0.3, 0.8);
        const offroadTire = createPbr('#111827', 0.8, 0.05);

        // Raised Trophy Truck Body
        const cab = new THREE.Mesh(new THREE.BoxGeometry(28, 14, 38), sandPaint);
        cab.position.set(0, 22, 6);
        group.add(cab);

        // Tubular Roll Cage & Bed Frame
        const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(26, 12, 34), tubeChassis);
        bedFrame.position.set(0, 19, -26);
        group.add(bedFrame);

        // Roof Rally Light Bar
        const lightBar = new THREE.Mesh(new THREE.BoxGeometry(24, 3, 4), tubeChassis);
        lightBar.position.set(0, 31, 10);
        group.add(lightBar);
        for (let l = -3; l <= 3; l += 2) {
          const pod = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 2, 12), createPbr('#fef08a', 0.1, 0.1, '#fef08a', 1.5));
          pod.rotateX(Math.PI / 2);
          pod.position.set(l * 3.2, 31, 12);
          group.add(pod);
        }

        // Dual Spare Beadlock Wheels in Bed
        for (const s of [-5, 5]) {
          const spare = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 6, 20), offroadTire);
          spare.rotateZ(Math.PI / 2);
          spare.rotateX(0.4);
          spare.position.set(s, 22, -26);
          group.add(spare);
        }

        // 4 Massive 37" Knobby Off-Road Tires with External Coilover Shocks
        const dakarWheels = [[-18, 20], [18, 20], [-18, -22], [18, -22]];
        dakarWheels.forEach(([wx, wz]) => {
          const t = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 8, 24), offroadTire);
          t.rotateZ(Math.PI / 2);
          t.position.set(wx, 11, wz);
          group.add(t);
          const shock = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 14, 8), createPbr('#ef4444', 0.2, 0.8));
          shock.position.set(wx * 0.7, 18, wz);
          group.add(shock);
        });
        break;
      }

      case 'car_semi_hauler': {
        const blueMetallic = createPbr('#1d4ed8', 0.2, 0.7);
        const chromeStacks = createPbr('#f8fafc', 0.08, 0.98);
        const chassisSteel = createPbr('#334155', 0.3, 0.8);

        // Aerodynamic Streamlined Cab & Sleeper
        const cab = new THREE.Mesh(new THREE.BoxGeometry(30, 28, 54), blueMetallic);
        cab.position.set(0, 24, 8);
        group.add(cab);

        // Slanted Windshield & Roof Deflector
        const deflector = new THREE.Mesh(new THREE.BoxGeometry(28, 8, 22), blueMetallic);
        deflector.position.set(0, 40, -4);
        deflector.rotation.x = -0.35;
        group.add(deflector);

        // Heavy Dual Exhaust Stacks
        for (const s of [-1, 1]) {
          const stack = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 44, 16), chromeStacks);
          stack.position.set(s * 16, 32, -18);
          group.add(stack);
        }

        // Rear Chassis Rail
        const rail = new THREE.Mesh(new THREE.BoxGeometry(22, 6, 52), chassisSteel);
        rail.position.set(0, 8, -38);
        group.add(rail);
        const fifthWheel = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 2.5, 20), chassisSteel);
        fifthWheel.position.set(0, 12, -44);
        group.add(fifthWheel);

        // 10 Heavy Truck Wheels (2 Front, 8 Rear Dual Axles)
        const truckWheels = [
          [-16, 8, 24], [16, 8, 24],
          [-16, 8, -28], [16, 8, -28], [-19, 8, -28], [19, 8, -28],
          [-16, 8, -46], [16, 8, -46], [-19, 8, -46], [19, 8, -46]
        ];
        truckWheels.forEach(([wx, wy, wz]) => {
          const w = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 4.5, 20), createPbr('#1e293b', 0.7, 0.1));
          w.rotateZ(Math.PI / 2);
          w.position.set(wx, wy, wz);
          group.add(w);
        });
        break;
      }

      // =========================================================================
      // 3. 🏍️ MOTORCYCLES (CYBERPUNK SUPERBIKE, V-TWIN CHOPPER, MOTOGP, CAFE RACER)
      // =========================================================================
      case 'moto_cyberpunk': {
        const redAkira = createPbr('#dc2626', 0.15, 0.6);
        const neonCyan = createPbr('#00f0ff', 0.1, 0.05, '#00f0ff', 2.0);
        const darkFrame = createPbr('#0f172a', 0.25, 0.85);

        // Low-Slung Aerodynamic Monocoque
        const body = new THREE.Mesh(new THREE.BoxGeometry(14, 16, 52), redAkira);
        body.position.set(0, 15, 0);
        group.add(body);

        // Recumbent Cockpit Seat
        const seat = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 18), darkFrame);
        seat.position.set(0, 16, -6);
        group.add(seat);

        // Front Swept Shield & Dual LED Headlight
        const shield = new THREE.Mesh(new THREE.ConeGeometry(8, 24, 4), redAkira);
        shield.rotateX(Math.PI / 2);
        shield.scale.set(1.0, 0.4, 1.0);
        shield.position.set(0, 18, 26);
        group.add(shield);
        const headlight = new THREE.Mesh(new THREE.BoxGeometry(10, 2, 2), neonCyan);
        headlight.position.set(0, 17, 36);
        group.add(headlight);

        // Twin Large Hubless Wheels with Neon Rim Illumination
        for (const wz of [-26, 26]) {
          const tire = new THREE.Mesh(new THREE.TorusGeometry(12, 4.5, 16, 32), createPbr('#18181b', 0.65, 0.05));
          tire.position.set(0, 12, wz);
          group.add(tire);
          const rimNeon = new THREE.Mesh(new THREE.TorusGeometry(11, 0.8, 8, 32), neonCyan);
          rimNeon.position.set(0, 12, wz);
          group.add(rimNeon);
        }
        break;
      }

      case 'moto_chopper': {
        const chromeLuster = createPbr('#f1f5f9', 0.05, 0.98);
        const darkPaint = createPbr('#450a0a', 0.15, 0.85);
        const leatherBrown = createPbr('#78350f', 0.7, 0.05);

        // Teardrop Fuel Tank & Frame Spine
        const tank = new THREE.Mesh(new THREE.SphereGeometry(7, 18, 14), darkPaint);
        tank.scale.set(0.9, 0.8, 1.8);
        tank.position.set(0, 22, 4);
        group.add(tank);

        // Detailed V-Twin Engine Block with Cooling Fins
        const crankcase = new THREE.Mesh(new THREE.BoxGeometry(10, 8, 12), chromeLuster);
        crankcase.position.set(0, 12, 0);
        group.add(crankcase);
        for (const [cylX, cylZ, ang] of [[0, 4, 0.45], [0, -4, -0.45]]) {
          const cyl = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 10, 14), chromeLuster);
          cyl.position.set(cylX, 18, cylZ);
          cyl.rotation.x = ang;
          group.add(cyl);
        }

        // Dual Chrome Fishtail Exhaust Pipes
        for (const s of [-1, 1]) {
          const pipe = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 34, 12), chromeLuster);
          pipe.rotateX(Math.PI / 2);
          pipe.position.set(s * 6.5, 8, -14);
          group.add(pipe);
        }

        // Raked Long Front Forks & Ape-Hanger Handlebars
        for (const s of [-1, 1]) {
          const fork = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 48, 12), chromeLuster);
          fork.position.set(s * 4, 20, 24);
          fork.rotation.x = -0.55;
          group.add(fork);
        }
        const bar = new THREE.Mesh(new THREE.TorusGeometry(8, 1.0, 8, 20, Math.PI), chromeLuster);
        bar.position.set(0, 36, 12);
        group.add(bar);

        // Classic Leather Solo Seat
        const seat = new THREE.Mesh(new THREE.BoxGeometry(9, 3, 12), leatherBrown);
        seat.position.set(0, 16, -10);
        group.add(seat);

        // Front 21" Spoke Wheel & Fat Rear 16" Wheel
        const fWheel = new THREE.Mesh(new THREE.TorusGeometry(14, 3, 14, 32), chromeLuster);
        fWheel.position.set(0, 14, 40);
        group.add(fWheel);
        const rWheel = new THREE.Mesh(new THREE.TorusGeometry(10, 4.5, 14, 32), chromeLuster);
        rWheel.position.set(0, 10, -24);
        group.add(rWheel);
        break;
      }

      case 'moto_sportbike': {
        const raceCyan = createPbr('#06b6d4', 0.15, 0.4);
        const carbonMat = createPbr('#0f172a', 0.25, 0.85);
        const titaniumExhaust = createPbr('#94a3b8', 0.2, 0.95);

        // Full Wind-Tunnel Aerodynamic Fairing
        const fairing = new THREE.Mesh(new THREE.BoxGeometry(12, 18, 48), raceCyan);
        fairing.position.set(0, 16, 2);
        group.add(fairing);

        // Angular Headlight Beak & Windscreen
        const screen = new THREE.Mesh(new THREE.BoxGeometry(10, 8, 14), createPbr('#020617', 0.05, 0.9));
        screen.position.set(0, 24, 18);
        screen.rotation.x = -0.6;
        group.add(screen);

        // High Upswept Titanium Akrapovič Exhaust
        const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.8, 18, 12), titaniumExhaust);
        exhaust.position.set(6.5, 18, -20);
        exhaust.rotation.x = 0.55;
        group.add(exhaust);

        // Carbon Swingarm & Wheels
        const swingarm = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 22), carbonMat);
        swingarm.position.set(0, 11, -16);
        group.add(swingarm);
        for (const wz of [-26, 26]) {
          const w = new THREE.Mesh(new THREE.TorusGeometry(11, 3.8, 16, 32), createPbr('#18181b', 0.6, 0.05));
          w.position.set(0, 11, wz);
          group.add(w);
        }
        break;
      }

      case 'moto_caferacer': {
        const silverTank = createPbr('#e2e8f0', 0.15, 0.9);
        const brownLeather = createPbr('#92400e', 0.75, 0.05);
        const blackFrame = createPbr('#18181b', 0.3, 0.7);

        // Vintage Sculpted Tank with Knee Indents
        const tank = new THREE.Mesh(new THREE.BoxGeometry(11, 9, 22), silverTank);
        tank.position.set(0, 18, 4);
        group.add(tank);

        // Ribbed Cafe Racer Bench Seat & Round Tail Hump
        const seat = new THREE.Mesh(new THREE.BoxGeometry(9, 4, 18), brownLeather);
        seat.position.set(0, 16, -12);
        group.add(seat);
        const hump = new THREE.Mesh(new THREE.SphereGeometry(5, 14, 12), silverTank);
        hump.position.set(0, 17, -21);
        group.add(hump);

        // Round Vintage Yellow Lens Headlight
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 12), createPbr('#fef08a', 0.1, 0.1, '#fef08a', 1.2));
        lamp.position.set(0, 18, 18);
        group.add(lamp);

        // Wire-Spoke Wheels
        for (const wz of [-24, 24]) {
          const tire = new THREE.Mesh(new THREE.TorusGeometry(11, 3.5, 14, 28), createPbr('#27272a', 0.7, 0.05));
          tire.position.set(0, 11, wz);
          group.add(tire);
        }
        break;
      }

      // =========================================================================
      // 4. 🚀 SPACESHIPS (BATTLECRUISER, CORELLIAN, WARP EXPLORER, STEALTH, MOTHERSHIP)
      // =========================================================================
      case 'ship_battlecruiser': {
        const hullMat = createPbr('#334155', 0.3, 0.75);
        const platingMat = createPbr('#1e293b', 0.25, 0.85);
        const plasmaCyan = createPbr('#00f0ff', 0.1, 0.05, '#00f0ff', 2.0);

        // Heavy Multi-Tiered Armored Hull
        const mainHull = new THREE.Mesh(new THREE.BoxGeometry(36, 14, 88), hullMat);
        mainHull.position.set(0, 10, 0);
        group.add(mainHull);

        // Slanted Dagger Bow Wedge
        const bow = new THREE.Mesh(new THREE.ConeGeometry(18, 36, 4), hullMat);
        bow.rotateX(Math.PI / 2);
        bow.scale.set(1.0, 0.4, 1.0);
        bow.position.set(0, 10, 56);
        group.add(bow);

        // Command Bridge Superstructure
        const bridge = new THREE.Mesh(new THREE.BoxGeometry(20, 12, 28), platingMat);
        bridge.position.set(0, 22, -14);
        group.add(bridge);
        const tower = new THREE.Mesh(new THREE.BoxGeometry(12, 8, 14), hullMat);
        tower.position.set(0, 31, -16);
        group.add(tower);

        // Heavy Dual Dorsal Plasma Turrets
        for (const tz of [14, 34]) {
          const turret = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.5, 4, 16), platingMat);
          turret.position.set(0, 18, tz);
          group.add(turret);
          for (const tx of [-2, 2]) {
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 18, 10), platingMat);
            barrel.rotateX(Math.PI / 2);
            barrel.position.set(tx, 18, tz + 9);
            group.add(barrel);
          }
        }

        // Triple Heavy Ion Warp Engines with Cyan Thruster Glow
        for (const ex of [-10, 0, 10]) {
          const noz = new THREE.Mesh(new THREE.CylinderGeometry(5, 6.5, 12, 16), platingMat);
          noz.rotateX(Math.PI / 2);
          noz.position.set(ex, 10, -48);
          group.add(noz);
          const glow = new THREE.Mesh(new THREE.CircleGeometry(4.5, 16), plasmaCyan);
          glow.position.set(ex, 10, -54.1);
          group.add(glow);
        }
        break;
      }

      case 'ship_corellian': {
        const freighterMat = createPbr('#cbd5e1', 0.35, 0.45);
        const darkMachinery = createPbr('#1e293b', 0.4, 0.7);
        const engineBlue = createPbr('#38bdf8', 0.1, 0.05, '#38bdf8', 2.2);

        // Iconic Saucer Disc Main Hull
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(32, 32, 8, 32), freighterMat);
        disc.position.set(0, 10, 0);
        group.add(disc);

        // Forward Dual Cargo Mandibles
        for (const s of [-1, 1]) {
          const mand = new THREE.Mesh(new THREE.BoxGeometry(10, 7, 28), freighterMat);
          mand.position.set(s * 10, 10, 38);
          group.add(mand);
        }

        // Asymmetrical Starboard Cockpit Pod
        const cockTube = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 26, 12), freighterMat);
        cockTube.rotateZ(Math.PI / 2);
        cockTube.position.set(22, 10, 12);
        group.add(cockTube);
        const cockpit = new THREE.Mesh(new THREE.ConeGeometry(4.5, 12, 12), darkMachinery);
        cockpit.rotateX(Math.PI / 2);
        cockpit.position.set(34, 10, 20);
        group.add(cockpit);

        // Dorsal Quad Laser Turret & Rectangular Radar Dish
        const turret = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 10), darkMachinery);
        turret.position.set(0, 15, 0);
        group.add(turret);
        const dish = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 1.5), freighterMat);
        dish.position.set(-14, 16, 8);
        dish.rotation.y = 0.4;
        group.add(dish);

        // Rear Full-Width Sublight Ion Engine Glow Strip
        const engineStrip = new THREE.Mesh(new THREE.BoxGeometry(36, 4, 2), engineBlue);
        engineStrip.position.set(0, 10, -32.5);
        group.add(engineStrip);
        break;
      }

      case 'ship_warp_explorer': {
        const whiteHull = createPbr('#f8fafc', 0.2, 0.3);
        const copperWarp = createPbr('#b45309', 0.25, 0.85);
        const blueGlow = createPbr('#0ea5e9', 0.1, 0.05, '#0ea5e9', 2.0);

        // Central Primary Science Hull Spine
        const spine = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 84, 20), whiteHull);
        spine.rotateX(Math.PI / 2);
        spine.position.set(0, 16, 0);
        group.add(spine);

        // Forward Parabolic Navigational Deflector Dish
        const deflector = new THREE.Mesh(new THREE.SphereGeometry(14, 24, 12, 0, Math.PI * 2, 0, Math.PI / 3), blueGlow);
        deflector.rotateX(-Math.PI / 2);
        deflector.position.set(0, 16, 46);
        group.add(deflector);

        // Large Rotating Habitation Torus Ring
        const torus = new THREE.Mesh(new THREE.TorusGeometry(26, 3.5, 16, 36), whiteHull);
        torus.position.set(0, 16, 8);
        group.add(torus);

        // Twin Catamaran Warp Nacelles
        for (const s of [-1, 1]) {
          const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 64, 16), copperWarp);
          nacelle.rotateX(Math.PI / 2);
          nacelle.position.set(s * 28, 16, -16);
          group.add(nacelle);
          const pylon = new THREE.Mesh(new THREE.BoxGeometry(22, 1.5, 12), whiteHull);
          pylon.position.set(s * 15, 16, -10);
          group.add(pylon);
        }
        break;
      }

      case 'ship_stealth_frigate': {
        const radarBlack = createPbr('#09090b', 0.3, 0.95);
        const sensorGold = createPbr('#eab308', 0.1, 0.9);

        // Faceted Angular Stealth Dagger Hull
        const hullGeo = new THREE.ConeGeometry(14, 88, 5);
        hullGeo.scale(1.6, 0.4, 1.0);
        hullGeo.rotateX(Math.PI / 2);
        const hull = new THREE.Mesh(hullGeo, radarBlack);
        hull.position.set(0, 12, 6);
        group.add(hull);

        // Recessed Bridge Slot
        const bridge = new THREE.Mesh(new THREE.BoxGeometry(14, 2.5, 16), sensorGold);
        bridge.position.set(0, 15, 12);
        group.add(bridge);

        // Inverted Canted Twin Tail Fins
        for (const s of [-1, 1]) {
          const fin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 16, 24), radarBlack);
          fin.position.set(s * 14, 18, -28);
          fin.rotation.z = s * -0.4;
          group.add(fin);
        }
        break;
      }

      case 'ship_mothership': {
        const bioChitin = createPbr('#3b0764', 0.25, 0.85);
        const bioPlasma = createPbr('#a855f7', 0.1, 0.05, '#a855f7', 2.2);

        // Curved Organic Crescent Bio-Hull
        const crescent = new THREE.Mesh(new THREE.TorusGeometry(36, 8, 18, 40, Math.PI * 1.4), bioChitin);
        crescent.rotateX(Math.PI / 2);
        crescent.position.set(0, 14, -6);
        group.add(crescent);

        // Central Singularity Grav-Drive Core
        const core = new THREE.Mesh(new THREE.SphereGeometry(12, 24, 16), bioPlasma);
        core.position.set(0, 14, -6);
        group.add(core);

        // Forward Bio-Filament Mandibles
        for (const s of [-1, 1]) {
          const mand = new THREE.Mesh(new THREE.ConeGeometry(5, 36, 12), bioChitin);
          mand.rotateX(Math.PI / 2);
          mand.rotateZ(s * -0.2);
          mand.position.set(s * 18, 14, 32);
          group.add(mand);
        }
        break;
      }

      // =========================================================================
      // 5. 👽 EXTRATERRESTRIALS & ALIENS (XENOMORPH, GREY ARCHON, REPTILIAN, ENERGY, SQUID)
      // =========================================================================
      case 'alien_xenomorph': {
        const bioBlack = createPbr('#020617', 0.15, 0.9);
        const silverTeeth = createPbr('#f1f5f9', 0.08, 0.98);

        // Elongated Domed Biomechanical Skull
        const skull = new THREE.Mesh(new THREE.CylinderGeometry(4, 7, 44, 16), bioBlack);
        skull.scale.set(0.8, 1.0, 1.0);
        skull.rotateX(-0.5);
        skull.position.set(0, 56, -8);
        group.add(skull);

        // Snout & Silver Inner Pharyngeal Jaws
        const snout = new THREE.Mesh(new THREE.BoxGeometry(8, 7, 16), bioBlack);
        snout.position.set(0, 50, 12);
        group.add(snout);
        const jaw = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 10), silverTeeth);
        jaw.position.set(0, 48, 16);
        group.add(jaw);

        // Ribbed Exoskeleton Torso & Dorsal Tubes
        const torso = new THREE.Mesh(new THREE.CylinderGeometry(6, 4.5, 26, 10), bioBlack);
        torso.position.set(0, 36, 0);
        group.add(torso);
        for (const s of [-1, 1]) {
          const tube = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.2, 20, 8), bioBlack);
          tube.position.set(s * 6, 44, -12);
          tube.rotation.x = -0.5;
          group.add(tube);
        }

        // Long Segmented Tail with Blade Stinger
        for (let t = 0; t < 8; t++) {
          const tSeg = new THREE.Mesh(new THREE.SphereGeometry(3 - t * 0.25, 8, 8), bioBlack);
          tSeg.position.set(0, 22 - t * 2, -10 - t * 5);
          group.add(tSeg);
        }
        const stinger = new THREE.Mesh(new THREE.ConeGeometry(2, 8, 4), silverTeeth);
        stinger.rotateX(-Math.PI / 2);
        stinger.position.set(0, 6, -52);
        group.add(stinger);

        // Grasping Arms & Digitigrade Legs
        for (const s of [-1, 1]) {
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(2, 1.2, 26, 8), bioBlack);
          arm.position.set(s * 10, 36, 6);
          arm.rotation.x = 0.6;
          group.add(arm);
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(3, 2, 34, 8), bioBlack);
          leg.position.set(s * 7, 14, 0);
          group.add(leg);
        }
        break;
      }

      case 'alien_grey_archon': {
        const greySkin = createPbr('#cbd5e1', 0.6, 0.05);
        const obsidianEyes = createPbr('#000000', 0.05, 0.95);
        const auraPlatform = createPbr('#38bdf8', 0.1, 0.1, '#38bdf8', 1.6);

        // Slender Slender Torso
        const torso = new THREE.Mesh(new THREE.CylinderGeometry(4, 2.5, 28, 12), greySkin);
        torso.position.set(0, 34, 0);
        group.add(torso);

        // Large Bulbous Cranium
        const head = new THREE.Mesh(new THREE.SphereGeometry(9, 20, 16), greySkin);
        head.scale.set(1.1, 1.4, 1.3);
        head.position.set(0, 56, 2);
        group.add(head);

        // Iconic Slanted Almond Obsidian Eyes
        for (const s of [-1, 1]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(3.6, 16, 12), obsidianEyes);
          eye.scale.set(1.0, 1.5, 0.6);
          eye.rotation.z = s * 0.45;
          eye.rotation.y = s * 0.3;
          eye.position.set(s * 4.5, 54, 8.5);
          group.add(eye);
        }

        // Elongated 4-Finger Arms
        for (const s of [-1, 1]) {
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 0.9, 32, 8), greySkin);
          arm.position.set(s * 8, 30, 2);
          group.add(arm);
        }

        // Levitation Energy Disk
        const plat = new THREE.Mesh(new THREE.CylinderGeometry(18, 18, 3, 32), auraPlatform);
        plat.position.set(0, 2, 0);
        group.add(plat);
        break;
      }

      case 'alien_reptilian': {
        const reptileGreen = createPbr('#14532d', 0.45, 0.3);
        const cyberGoldEye = createPbr('#eab308', 0.1, 0.9, '#eab308', 1.8);
        const harnessMat = createPbr('#1e293b', 0.3, 0.8);

        // Broad Scaled Torso & Battle Harness
        const torso = new THREE.Mesh(new THREE.BoxGeometry(22, 26, 14), reptileGreen);
        torso.position.set(0, 42, 0);
        group.add(torso);
        const strap = new THREE.Mesh(new THREE.BoxGeometry(24, 6, 16), harnessMat);
        strap.position.set(0, 44, 0);
        group.add(strap);

        // Heavy Horned Reptilian Head
        const head = new THREE.Mesh(new THREE.BoxGeometry(14, 12, 18), reptileGreen);
        head.position.set(0, 62, 4);
        group.add(head);
        for (const s of [-1, 1]) {
          const horn = new THREE.Mesh(new THREE.ConeGeometry(2.5, 12, 6), createPbr('#0f172a', 0.3, 0.4));
          horn.position.set(s * 6, 70, -2);
          horn.rotation.x = -0.6;
          horn.rotation.z = s * 0.3;
          group.add(horn);
        }

        // Cybernetic Ocular Implant (Right Eye)
        const eyeR = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 3, 12), cyberGoldEye);
        eyeR.rotateX(Math.PI / 2);
        eyeR.position.set(4.5, 62, 13);
        group.add(eyeR);

        // Muscular Arms & Heavy Tail
        for (const s of [-1, 1]) {
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(4, 3, 28, 8), reptileGreen);
          arm.position.set(s * 15, 38, 2);
          group.add(arm);
        }
        const tail = new THREE.Mesh(new THREE.ConeGeometry(5, 32, 8), reptileGreen);
        tail.rotateX(-Math.PI / 3);
        tail.position.set(0, 22, -18);
        group.add(tail);
        break;
      }

      case 'alien_energy': {
        const plasmaCore = createPbr('#ffffff', 0.05, 0.1, '#38bdf8', 2.8);
        const crystalShard = createPbr('#0284c7', 0.1, 0.9, '#0284c7', 1.2);

        // Pulsating Central Core Sphere
        const core = new THREE.Mesh(new THREE.SphereGeometry(12, 24, 20), plasmaCore);
        core.position.set(0, 36, 0);
        group.add(core);

        // Floating Geometric Crystal Shards
        for (let i = 0; i < 16; i++) {
          const ang = (i * Math.PI * 2) / 16;
          const r = 24 + (i % 3) * 6;
          const shard = new THREE.Mesh(new THREE.OctahedronGeometry(4 + (i % 3) * 2, 0), crystalShard);
          shard.position.set(Math.cos(ang) * r, 36 + Math.sin(i * 1.5) * 14, Math.sin(ang) * r);
          shard.rotation.set(i * 0.3, i * 0.5, i * 0.7);
          group.add(shard);
        }
        break;
      }

      case 'alien_squid': {
        const bioPink = createPbr('#be185d', 0.25, 0.2);
        const bioGlow = createPbr('#f472b6', 0.1, 0.05, '#f472b6', 2.0);

        // Cranial Floating Mantle Bell
        const mantle = new THREE.Mesh(new THREE.ConeGeometry(16, 44, 16), bioPink);
        mantle.position.set(0, 52, 0);
        group.add(mantle);

        // Large Telepathic Sensor Eyes
        for (const s of [-1, 1]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(4.5, 16, 12), bioGlow);
          eye.position.set(s * 10, 34, 6);
          group.add(eye);
        }

        // 8 Undulating Flexible Tentacles
        for (let t = 0; t < 8; t++) {
          const ang = (t * Math.PI * 2) / 8;
          const tent = new THREE.Mesh(new THREE.CylinderGeometry(2, 0.5, 38, 8), bioPink);
          tent.position.set(Math.cos(ang) * 10, 14, Math.sin(ang) * 10);
          tent.rotation.z = Math.cos(ang) * 0.3;
          tent.rotation.x = Math.sin(ang) * 0.3;
          group.add(tent);
        }
        break;
      }

      // =========================================================================
      // 6. 🐾 ANIMALS (PANTHER, HORSE, WHALE, GRIZZLY, GORILLA)
      // =========================================================================
      case 'animal_panther': {
        const shadowCoat = createPbr('#09090b', 0.35, 0.85);
        const goldEyes = createPbr('#eab308', 0.1, 0.1, '#eab308', 2.0);

        // Sleek Muscular Feline Body
        const torso = new THREE.Mesh(new THREE.CylinderGeometry(8, 7, 38, 14), shadowCoat);
        torso.rotateX(Math.PI / 2);
        torso.position.set(0, 22, 0);
        group.add(torso);

        // Predatory Head & Glowing Gold Eyes
        const head = new THREE.Mesh(new THREE.BoxGeometry(10, 8, 12), shadowCoat);
        head.position.set(0, 28, 22);
        group.add(head);
        for (const s of [-1, 1]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 8), goldEyes);
          eye.position.set(s * 3.5, 29, 27.5);
          group.add(eye);
        }

        // 4 Muscular Paws
        const pawPos = [[-7, 14], [7, 14], [-7, -14], [7, -14]];
        pawPos.forEach(([px, pz]) => {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.2, 22, 10), shadowCoat);
          leg.position.set(px, 11, pz);
          group.add(leg);
        });

        // Long S-Curved Tail
        const tail = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.0, 32, 8), shadowCoat);
        tail.position.set(0, 24, -28);
        tail.rotation.x = -0.7;
        group.add(tail);
        break;
      }

      case 'animal_horse': {
        const brownCoat = createPbr('#78350f', 0.45, 0.05);
        const darkMane = createPbr('#1c1917', 0.6, 0.05);
        const hoofMat = createPbr('#0c0a09', 0.3, 0.3);

        // Graceful Equine Torso
        const body = new THREE.Mesh(new THREE.CylinderGeometry(10, 9, 44, 14), brownCoat);
        body.rotateX(Math.PI / 2);
        body.position.set(0, 36, 0);
        group.add(body);

        // Arched Neck & Head
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 7.5, 24, 12), brownCoat);
        neck.position.set(0, 48, 16);
        neck.rotation.x = 0.65;
        group.add(neck);
        const head = new THREE.Mesh(new THREE.BoxGeometry(8, 9, 18), brownCoat);
        head.position.set(0, 58, 26);
        group.add(head);

        // Flowing Dark Mane & Ears
        const mane = new THREE.Mesh(new THREE.BoxGeometry(3, 26, 8), darkMane);
        mane.position.set(0, 50, 12);
        mane.rotation.x = 0.65;
        group.add(mane);

        // 4 Slender Legs with Hooves
        const horseLegs = [[-7, 16], [7, 16], [-7, -16], [7, -16]];
        horseLegs.forEach(([hx, hz]) => {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 1.8, 36, 10), brownCoat);
          leg.position.set(hx, 18, hz);
          group.add(leg);
          const hoof = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.8, 4, 10), hoofMat);
          hoof.position.set(hx, 2, hz);
          group.add(hoof);
        });
        break;
      }

      case 'animal_whale': {
        const blueWhale = createPbr('#1e3a8a', 0.3, 0.2);
        const whiteBelly = createPbr('#f1f5f9', 0.4, 0.05);

        // Massive Hydrodynamic Body
        const body = new THREE.Mesh(new THREE.SphereGeometry(16, 24, 18), blueWhale);
        body.scale.set(1.0, 0.8, 3.2);
        body.position.set(0, 24, 0);
        group.add(body);

        // Pleated Ventral Grooves (Belly)
        const belly = new THREE.Mesh(new THREE.SphereGeometry(14, 20, 16), whiteBelly);
        belly.scale.set(0.9, 0.5, 2.6);
        belly.position.set(0, 18, 4);
        group.add(belly);

        // Pectoral Flippers & Dorsal Fin
        for (const s of [-1, 1]) {
          const flip = new THREE.Mesh(new THREE.BoxGeometry(28, 2, 10), blueWhale);
          flip.position.set(s * 22, 20, 8);
          flip.rotation.z = s * -0.3;
          group.add(flip);
        }
        const dorsal = new THREE.Mesh(new THREE.ConeGeometry(4, 10, 4), blueWhale);
        dorsal.position.set(0, 36, -18);
        group.add(dorsal);

        // Large Horizontal Tail Fluke
        const fluke = new THREE.Mesh(new THREE.BoxGeometry(38, 2, 12), blueWhale);
        fluke.position.set(0, 24, -54);
        group.add(fluke);
        break;
      }

      case 'animal_grizzly': {
        const brownFur = createPbr('#451a03', 0.75, 0.02);
        const blackClaw = createPbr('#0c0a09', 0.3, 0.4);

        // Heavy Barrel Torso & Hump
        const body = new THREE.Mesh(new THREE.SphereGeometry(16, 18, 14), brownFur);
        body.scale.set(1.1, 1.0, 1.6);
        body.position.set(0, 26, 0);
        group.add(body);
        const hump = new THREE.Mesh(new THREE.SphereGeometry(8, 12, 10), brownFur);
        hump.position.set(0, 36, 8);
        group.add(hump);

        // Broad Snout Head & Rounded Ears
        const head = new THREE.Mesh(new THREE.SphereGeometry(9, 14, 12), brownFur);
        head.position.set(0, 32, 22);
        group.add(head);
        const snout = new THREE.Mesh(new THREE.BoxGeometry(7, 6, 9), createPbr('#78350f', 0.6, 0.05));
        snout.position.set(0, 29, 29);
        group.add(snout);

        // 4 Heavy Columnar Paws with Claws
        const bearPaws = [[-10, 12], [10, 12], [-10, -12], [10, -12]];
        bearPaws.forEach(([bx, bz]) => {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 4.5, 20, 10), brownFur);
          leg.position.set(bx, 10, bz);
          group.add(leg);
        });
        break;
      }

      case 'animal_gorilla': {
        const gorillaSkin = createPbr('#18181b', 0.6, 0.05);
        const silverBack = createPbr('#94a3b8', 0.5, 0.1);

        // Massive Muscular Chest & Silverback
        const chest = new THREE.Mesh(new THREE.BoxGeometry(26, 22, 18), gorillaSkin);
        chest.position.set(0, 32, 0);
        group.add(chest);
        const sBack = new THREE.Mesh(new THREE.BoxGeometry(24, 16, 4), silverBack);
        sBack.position.set(0, 32, -9);
        group.add(sBack);

        // Conical Sagittal Crest Head
        const head = new THREE.Mesh(new THREE.SphereGeometry(8, 16, 12), gorillaSkin);
        head.scale.set(0.9, 1.3, 1.0);
        head.position.set(0, 48, 4);
        group.add(head);

        // Heavy Knuckle-Walking Forearms
        for (const s of [-1, 1]) {
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(6, 4.5, 36, 12), gorillaSkin);
          arm.position.set(s * 18, 20, 10);
          arm.rotation.x = 0.35;
          group.add(arm);
        }
        break;
      }

      // =========================================================================
      // 7. 🦅 BIRDS (HUNTING FALCON, PEACOCK, BARN OWL, FIRE PHOENIX)
      // =========================================================================
      case 'bird_hunting_falcon': {
        const falconFeather = createPbr('#3f3f46', 0.45, 0.1);
        const goldBeak = createPbr('#eab308', 0.2, 0.4);

        // Aerodynamic Dive Body
        const body = new THREE.Mesh(new THREE.SphereGeometry(8, 16, 14), falconFeather);
        body.scale.set(0.9, 0.8, 2.2);
        body.position.set(0, 30, 0);
        group.add(body);

        // Hooked Beak & Head
        const head = new THREE.Mesh(new THREE.SphereGeometry(5.5, 14, 12), falconFeather);
        head.position.set(0, 34, 14);
        group.add(head);
        const beak = new THREE.Mesh(new THREE.ConeGeometry(2, 6, 6), goldBeak);
        beak.rotateX(Math.PI / 2);
        beak.position.set(0, 33, 19);
        group.add(beak);

        // Swept-Back Swept Wings in Hunting Dive Stance
        for (const s of [-1, 1]) {
          const wing = new THREE.Mesh(new THREE.BoxGeometry(42, 1.5, 14), falconFeather);
          wing.position.set(s * 26, 32, -4);
          wing.rotation.y = s * -0.5;
          wing.rotation.z = s * -0.2;
          group.add(wing);
        }
        break;
      }

      case 'bird_peacock': {
        const peacockBlue = createPbr('#0284c7', 0.15, 0.7);
        const fanGreen = createPbr('#059669', 0.25, 0.6);
        const eyeSpot = createPbr('#eab308', 0.1, 0.1, '#38bdf8', 1.5);

        // Slender Royal Body & Crown Crest
        const body = new THREE.Mesh(new THREE.SphereGeometry(7, 14, 12), peacockBlue);
        body.position.set(0, 24, 0);
        group.add(body);
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 4, 20, 10), peacockBlue);
        neck.position.set(0, 36, 4);
        group.add(neck);

        // Spectacular Extended Semicircular Fan Tail
        const fan = new THREE.Mesh(new THREE.CircleGeometry(36, 32, 0, Math.PI), fanGreen);
        fan.position.set(0, 24, -8);
        group.add(fan);

        // Eye Spots along Plumage Fan
        for (let e = 0; e < 18; e++) {
          const ang = (e * Math.PI) / 17;
          const r = 28;
          const spot = new THREE.Mesh(new THREE.CircleGeometry(2.8, 12), eyeSpot);
          spot.position.set(Math.cos(ang) * r, 24 + Math.sin(ang) * r, -7.8);
          group.add(spot);
        }
        break;
      }

      case 'bird_barn_owl': {
        const owlPlumage = createPbr('#d97706', 0.55, 0.05);
        const faceWhite = createPbr('#f8fafc', 0.7, 0.0);
        const darkEyes = createPbr('#09090b', 0.1, 0.9);

        // Plump Nocturnal Body
        const body = new THREE.Mesh(new THREE.SphereGeometry(10, 16, 14), owlPlumage);
        body.scale.set(1.0, 1.4, 1.0);
        body.position.set(0, 28, 0);
        group.add(body);

        // Heart-Shaped Facial Disc
        const face = new THREE.Mesh(new THREE.CircleGeometry(8, 20), faceWhite);
        face.position.set(0, 36, 9.5);
        group.add(face);
        for (const s of [-1, 1]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(1.8, 10, 10), darkEyes);
          eye.position.set(s * 3.5, 37, 10.2);
          group.add(eye);
        }

        // Perched Wooden Branch
        const branch = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 44, 12), createPbr('#5c3a21', 0.8, 0.0));
        branch.rotateZ(Math.PI / 2);
        branch.position.set(0, 6, 0);
        group.add(branch);
        break;
      }

      case 'bird_fire_phoenix': {
        const fireGold = createPbr('#f97316', 0.15, 0.5, '#ea580c', 1.6);
        const neonFlame = createPbr('#facc15', 0.1, 0.1, '#facc15', 2.4);

        // Mythic Blazing Body
        const body = new THREE.Mesh(new THREE.SphereGeometry(8, 16, 14), fireGold);
        body.scale.set(0.9, 1.0, 2.0);
        body.position.set(0, 34, 0);
        group.add(body);

        // Radiant Layered Wings
        for (const s of [-1, 1]) {
          const wing = new THREE.Mesh(new THREE.BoxGeometry(44, 2, 18), fireGold);
          wing.position.set(s * 28, 38, 0);
          wing.rotation.z = s * 0.35;
          group.add(wing);
          const wingTip = new THREE.Mesh(new THREE.ConeGeometry(6, 24, 4), neonFlame);
          wingTip.rotateZ(s * -Math.PI / 2);
          wingTip.position.set(s * 54, 44, 0);
          group.add(wingTip);
        }

        // Twin Long Glowing Tail Streamers
        for (const s of [-3, 3]) {
          const tail = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 0.2, 52, 8), neonFlame);
          tail.position.set(s, 12, -32);
          tail.rotation.x = -0.5;
          group.add(tail);
        }
        break;
      }

      // =========================================================================
      // 8. 👤 HUMANS & FIGURES (ASTRONAUT, SAMURAI, KNIGHT, VITRUVIAN, GODDESS)
      // =========================================================================
      case 'figure_astronaut': {
        const suitWhite = createPbr('#f8fafc', 0.45, 0.1);
        const goldVisor = createPbr('#eab308', 0.05, 0.98, '#ca8a04', 0.5);
        const packMat = createPbr('#475569', 0.3, 0.7);

        // Pressurized Spacesuit Torso
        const torso = new THREE.Mesh(new THREE.BoxGeometry(18, 24, 14), suitWhite);
        torso.position.set(0, 42, 0);
        group.add(torso);

        // Life Support PLSS Backpack
        const pack = new THREE.Mesh(new THREE.BoxGeometry(16, 22, 10), packMat);
        pack.position.set(0, 44, -11);
        group.add(pack);

        // Gold Foil Reflective Helmet Visor
        const helmet = new THREE.Mesh(new THREE.SphereGeometry(9, 20, 16), suitWhite);
        helmet.position.set(0, 62, 0);
        group.add(helmet);
        const visor = new THREE.Mesh(new THREE.SphereGeometry(7, 16, 12), goldVisor);
        visor.scale.set(1.0, 0.85, 0.7);
        visor.position.set(0, 62, 4.5);
        group.add(visor);

        // Articulated Suit Limbs & Heavy Lunar Boots
        for (const s of [-1, 1]) {
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.0, 26, 10), suitWhite);
          arm.position.set(s * 13, 40, 2);
          group.add(arm);
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 3.8, 30, 10), suitWhite);
          leg.position.set(s * 6.5, 16, 0);
          group.add(leg);
          const boot = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 14), packMat);
          boot.position.set(s * 6.5, 2.5, 2);
          group.add(boot);
        }
        break;
      }

      case 'figure_samurai': {
        const lacqueredBlack = createPbr('#09090b', 0.2, 0.85);
        const goldAccents = createPbr('#d4af37', 0.15, 0.95);
        const katanaSteel = createPbr('#f1f5f9', 0.08, 0.98);

        // Layered O-Yoroi Plate Armor Torso
        const cuirass = new THREE.Mesh(new THREE.BoxGeometry(16, 22, 12), lacqueredBlack);
        cuirass.position.set(0, 42, 0);
        group.add(cuirass);

        // Kabuto Helmet with Gold Crest
        const kabuto = new THREE.Mesh(new THREE.SphereGeometry(8, 16, 14), lacqueredBlack);
        kabuto.position.set(0, 60, 0);
        group.add(kabuto);
        const crest = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 1), goldAccents);
        crest.position.set(0, 67, 5);
        group.add(crest);

        // Katana Sword in Hand
        const blade = new THREE.Mesh(new THREE.BoxGeometry(1, 56, 3), katanaSteel);
        blade.position.set(12, 48, 14);
        blade.rotation.x = 0.5;
        group.add(blade);
        const guard = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 1, 12), goldAccents);
        guard.position.set(12, 34, 7);
        guard.rotation.x = 0.5;
        group.add(guard);

        // Armored Sode Shoulder Plates & Greaves
        for (const s of [-1, 1]) {
          const sode = new THREE.Mesh(new THREE.BoxGeometry(8, 14, 2), goldAccents);
          sode.position.set(s * 13, 46, 0);
          group.add(sode);
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 2.5, 30, 8), lacqueredBlack);
          leg.position.set(s * 6, 15, 0);
          group.add(leg);
        }
        break;
      }

      case 'figure_knight': {
        const plateSteel = createPbr('#cbd5e1', 0.18, 0.92);
        const brassTrim = createPbr('#d97706', 0.2, 0.85);

        // Full Gothic Breastplate
        const breastplate = new THREE.Mesh(new THREE.BoxGeometry(18, 24, 14), plateSteel);
        breastplate.position.set(0, 44, 0);
        group.add(breastplate);

        // Visored Sallet Knight Helmet
        const helmet = new THREE.Mesh(new THREE.SphereGeometry(8.5, 16, 14), plateSteel);
        helmet.position.set(0, 62, 0);
        group.add(helmet);
        const visor = new THREE.Mesh(new THREE.BoxGeometry(12, 3, 4), brassTrim);
        visor.position.set(0, 62, 6);
        group.add(visor);

        // Kite Shield & Longsword
        const shield = new THREE.Mesh(new THREE.BoxGeometry(14, 28, 2), plateSteel);
        shield.position.set(-14, 40, 6);
        shield.rotation.y = 0.3;
        group.add(shield);
        const sword = new THREE.Mesh(new THREE.BoxGeometry(1.2, 48, 3.5), plateSteel);
        sword.position.set(14, 40, 6);
        group.add(sword);

        // Fluted Plate Greaves
        for (const s of [-1, 1]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(4, 3, 30, 10), plateSteel);
          leg.position.set(s * 6.5, 15, 0);
          group.add(leg);
        }
        break;
      }

      case 'figure_anatomical': {
        const marbleMat = createPbr('#f1f5f9', 0.3, 0.05);
        const pedestalMat = createPbr('#1e293b', 0.4, 0.2);

        // Detailed Sculpted Male Muscular Torso (Pectorals, Abs, Lats)
        const torso = new THREE.Mesh(new THREE.CylinderGeometry(10, 7.5, 34, 16), marbleMat);
        torso.position.set(0, 36, 0);
        group.add(torso);
        const pecs = new THREE.Mesh(new THREE.BoxGeometry(16, 8, 4), marbleMat);
        pecs.position.set(0, 44, 6);
        group.add(pecs);

        // Classical Museum Pedestal Base
        const ped = new THREE.Mesh(new THREE.BoxGeometry(22, 16, 22), pedestalMat);
        ped.position.set(0, 8, 0);
        group.add(ped);
        break;
      }

      case 'figure_goddess': {
        const marbleWhite = createPbr('#f8fafc', 0.28, 0.02);
        const goldTiara = createPbr('#eab308', 0.15, 0.9);

        // Draped Chiton Robed Statue Body
        const dress = new THREE.Mesh(new THREE.CylinderGeometry(7, 13, 44, 20), marbleWhite);
        dress.position.set(0, 24, 0);
        group.add(dress);

        // Classical Head with Braided Hair & Gold Laurel Tiara
        const head = new THREE.Mesh(new THREE.SphereGeometry(6.5, 16, 14), marbleWhite);
        head.position.set(0, 52, 0);
        group.add(head);
        const tiara = new THREE.Mesh(new THREE.TorusGeometry(6.8, 1.2, 8, 24), goldTiara);
        tiara.rotateX(Math.PI / 2);
        tiara.position.set(0, 54, 0);
        group.add(tiara);
        break;
      }

      // =========================================================================
      // 9. 🔮 UNIQUE MASTERPIECES (ZEPPELIN, ORNITHOPTER, JWST, CYBER CITY, ORRERY)
      // =========================================================================
      case 'unique_airship': {
        const canvasMat = createPbr('#fef08a', 0.5, 0.05);
        const woodMat = createPbr('#78350f', 0.65, 0.0);
        const brassMat = createPbr('#d97706', 0.2, 0.85);

        // Zeppelin Rigid Envelope Gasbag
        const envelope = new THREE.Mesh(new THREE.SphereGeometry(18, 24, 16), canvasMat);
        envelope.scale.set(1.0, 0.9, 3.8);
        envelope.position.set(0, 36, 0);
        group.add(envelope);

        // Steampunk Wooden Passenger Gondola
        const gondola = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 32), woodMat);
        gondola.position.set(0, 14, 2);
        group.add(gondola);

        // Twin Brass Spinning Propellers & Rudder
        for (const s of [-1, 1]) {
          const prop = new THREE.Mesh(new THREE.BoxGeometry(14, 2, 1), brassMat);
          prop.position.set(s * 10, 14, -16);
          group.add(prop);
        }
        const rudder = new THREE.Mesh(new THREE.BoxGeometry(1.5, 22, 14), woodMat);
        rudder.position.set(0, 36, -64);
        group.add(rudder);
        break;
      }

      case 'unique_ornithopter': {
        const mahoganyMat = createPbr('#5c2606', 0.6, 0.0);
        const parchmentWings = createPbr('#fef3c7', 0.4, 0.05);
        const brassGears = createPbr('#d97706', 0.2, 0.9);

        // Skeletal Fuselage Cockpit
        const hull = new THREE.Mesh(new THREE.CylinderGeometry(4, 3, 38, 10), mahoganyMat);
        hull.rotateX(Math.PI / 2);
        hull.position.set(0, 20, 0);
        group.add(hull);

        // Articulated Da Vinci Flapping Wings
        for (const s of [-1, 1]) {
          const wing = new THREE.Mesh(new THREE.BoxGeometry(48, 1, 18), parchmentWings);
          wing.position.set(s * 28, 24, 4);
          wing.rotation.z = s * 0.25;
          group.add(wing);
        }

        // Visible Mechanical Gear Mechanism
        const gear = new THREE.Mesh(new THREE.TorusGeometry(5, 1.2, 8, 16), brassGears);
        gear.position.set(0, 24, 0);
        group.add(gear);
        break;
      }

      case 'unique_jwst': {
        const berylliumGold = createPbr('#fbbf24', 0.08, 0.98, '#d97706', 0.3);
        const sunshieldSilver = createPbr('#e2e8f0', 0.15, 0.92);
        const busMat = createPbr('#334155', 0.3, 0.7);

        // 5-Layer Silver Diamond Sunshield
        const sunshield = new THREE.Mesh(new THREE.BoxGeometry(44, 2, 72), sunshieldSilver);
        sunshield.rotateY(Math.PI / 4);
        sunshield.scale.set(1.0, 1.0, 0.7);
        sunshield.position.set(0, 8, 0);
        group.add(sunshield);

        // Spacecraft Bus & Solar Array
        const bus = new THREE.Mesh(new THREE.BoxGeometry(14, 8, 14), busMat);
        bus.position.set(0, 3, 0);
        group.add(bus);

        // 18 Hexagonal Gold-Plated Primary Mirror Segments
        const mirrorRing = new THREE.Mesh(new THREE.CylinderGeometry(18, 18, 2, 6), berylliumGold);
        mirrorRing.rotateX(Math.PI / 2);
        mirrorRing.position.set(0, 24, 0);
        group.add(mirrorRing);

        // Secondary Mirror Tripod Boom
        for (let t = 0; t < 3; t++) {
          const ang = (t * Math.PI * 2) / 3;
          const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 26, 6), busMat);
          strut.position.set(Math.cos(ang) * 9, 32, 10);
          strut.rotation.x = 0.5;
          group.add(strut);
        }
        const secMirror = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 1, 12), berylliumGold);
        secMirror.rotateX(Math.PI / 2);
        secMirror.position.set(0, 38, 20);
        group.add(secMirror);
        break;
      }

      case 'unique_cybercity': {
        const towerMat = createPbr('#0f172a', 0.3, 0.8);
        const windowGlow = createPbr('#00f0ff', 0.1, 0.05, '#00f0ff', 2.0);
        const bridgeMat = createPbr('#e11d48', 0.1, 0.1, '#e11d48', 1.8);

        // Base Diorama Foundation Slab
        const base = new THREE.Mesh(new THREE.BoxGeometry(60, 4, 60), towerMat);
        base.position.set(0, 2, 0);
        group.add(base);

        // Cluster of Tiered Cyberpunk Skyscrapers
        const towers = [
          [-14, -14, 52, 14],
          [12, -10, 68, 16],
          [-10, 14, 44, 12],
          [14, 14, 58, 14],
          [0, 0, 84, 18]
        ];
        towers.forEach(([tx, tz, th, tw]) => {
          const bld = new THREE.Mesh(new THREE.BoxGeometry(tw, th, tw), towerMat);
          bld.position.set(tx, th / 2 + 4, tz);
          group.add(bld);
          const beacon = new THREE.Mesh(new THREE.SphereGeometry(2, 8, 8), windowGlow);
          beacon.position.set(tx, th + 6, tz);
          group.add(beacon);
        });

        // Suspended High-Altitude Neon Skybridges
        const br1 = new THREE.Mesh(new THREE.BoxGeometry(26, 2.5, 3), bridgeMat);
        br1.position.set(-1, 48, -12);
        group.add(br1);
        const br2 = new THREE.Mesh(new THREE.BoxGeometry(3, 2.5, 26), bridgeMat);
        br2.position.set(13, 40, 2);
        group.add(br2);
        break;
      }

      case 'unique_orrery': {
        const brassRings = createPbr('#d97706', 0.15, 0.95);
        const sunGold = createPbr('#fbbf24', 0.1, 0.1, '#f59e0b', 2.2);

        // Concentric Brass Gear Rings
        for (let r = 1; r <= 3; r++) {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 10, 1.2, 8, 36), brassRings);
          ring.rotateX(Math.PI / 2);
          ring.position.set(0, 6 + r * 4, 0);
          group.add(ring);
        }

        // Center Sun & Orbiting Planets
        const sun = new THREE.Mesh(new THREE.SphereGeometry(7, 20, 16), sunGold);
        sun.position.set(0, 26, 0);
        group.add(sun);

        const planets = [
          [14, 2, '#38bdf8'],
          [22, 3.5, '#ef4444'],
          [32, 4.5, '#eab308']
        ];
        planets.forEach(([pr, ps, pc], idx) => {
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, pr, 6), brassRings);
          arm.rotateZ(Math.PI / 2);
          arm.position.set(pr / 2, 10 + idx * 4, 0);
          group.add(arm);
          const planet = new THREE.Mesh(new THREE.SphereGeometry(ps, 12, 10), createPbr(pc, 0.3, 0.2));
          planet.position.set(pr, 10 + idx * 4, 0);
          group.add(planet);
        });
        break;
      }

      default:
        return ModelGenerators.generateParametric('box');
    }

    return group;
  }

  /**
   * Generates a 100% Lossless Ultra-HD 3D Physical Photo Frame & Display for Augmented Reality

   * @param {HTMLImageElement|HTMLCanvasElement} img 
   * @param {Object} options 
   * @returns {THREE.Group}
   */
  /**
   * Procedural Linen Canvas Weave Bump Texture Generator
   * @returns {THREE.CanvasTexture}
   */
  static createLinenBumpTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 128, 128);

    ctx.fillStyle = '#9c9c9c';
    for (let x = 0; x < 128; x += 4) {
      ctx.fillRect(x, 0, 2, 128);
    }
    ctx.fillStyle = '#646464';
    for (let y = 0; y < 128; y += 4) {
      ctx.fillRect(0, y, 128, 2);
    }

    const bumpTex = new THREE.CanvasTexture(canvas);
    bumpTex.wrapS = THREE.RepeatWrapping;
    bumpTex.wrapT = THREE.RepeatWrapping;
    bumpTex.repeat.set(8, 8);
    bumpTex.needsUpdate = true;
    return bumpTex;
  }

  /**
   * Generates a Beveled Museum Brass / Silver Engraved Plaque
   * @param {string} text 
   * @param {string} materialType 
   * @param {number} width 
   * @param {number} height 
   * @returns {THREE.Mesh}
   */
  static createPlaqueMesh(text, materialType = 'gold', width = 16, height = 3.5) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 112;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 512, 112);
    if (materialType === 'silver') {
      grad.addColorStop(0, '#c8cdd4');
      grad.addColorStop(0.3, '#f2f4f8');
      grad.addColorStop(0.7, '#e4e7ec');
      grad.addColorStop(1, '#98a2b3');
    } else {
      grad.addColorStop(0, '#c69214');
      grad.addColorStop(0.3, '#fae17d');
      grad.addColorStop(0.7, '#e5b22c');
      grad.addColorStop(1, '#946300');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 112);

    ctx.strokeStyle = materialType === 'silver' ? '#475467' : '#5c3e03';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, 500, 100);
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, 492, 92);

    const drawScrew = (x, y) => {
      ctx.fillStyle = materialType === 'silver' ? '#344054' : '#452b00';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    };
    drawScrew(18, 18);
    drawScrew(494, 18);
    drawScrew(18, 94);
    drawScrew(494, 94);

    ctx.fillStyle = materialType === 'silver' ? '#101828' : '#291800';
    ctx.font = 'bold 26px "Times New Roman", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text || 'PolyMorph Gallery • 2026', 256, 56);

    const plaqueTex = new THREE.CanvasTexture(canvas);
    plaqueTex.format = THREE.RGBAFormat;
    plaqueTex.needsUpdate = true;

    const plaqueMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: plaqueTex,
      metalness: materialType === 'silver' ? 0.85 : 0.8,
      roughness: 0.25,
      side: THREE.DoubleSide
    });

    const plaqueGeo = new THREE.BoxGeometry(width, height, 0.25);
    const plaqueMesh = new THREE.Mesh(plaqueGeo, plaqueMat);
    return plaqueMesh;
  }

  /**
   * Generates a 100% Lossless Ultra-HD 3D Physical Photo Frame & Display for Augmented Reality
   * @param {HTMLImageElement|HTMLCanvasElement} img 
   * @param {Object} options 
   * @returns {THREE.Group}
   */
  static generatePhotoAR(img, options = {}) {
    const {
      style = 'museum_frame', // 'museum_frame', 'acrylic_stand', 'crystal_glass', 'canvas_wrap', 'poster', 'die_cut'
      frameColor = 'black', // 'black', 'wood', 'gold', 'white', 'silver'
      widthCm = 40,
      matMarginPercent = 8,
      shape = 'single', // 'single', 'triptych', 'circular', 'hexagonal'
      surfaceFinish = 'smooth', // 'smooth', 'canvas_linen', 'glossy_glass', 'matte_fineart'
      hasPlaque = false,
      plaqueText = '',
      plaqueMaterial = 'gold'
    } = options;

    const group = new THREE.Group();
    group.name = "AR_Photo_Display";

    const naturalW = img.naturalWidth || img.width || 1024;
    const naturalH = img.naturalHeight || img.height || 1024;
    const aspect = naturalW / naturalH || 1;
    const photoW = widthCm;
    const photoH = widthCm / aspect;

    // 1. Render photo onto dedicated High-Definition Canvas for guaranteed texture fidelity
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(2048, Math.max(64, naturalW));
    canvas.height = Math.min(2048, Math.max(64, naturalH));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    try {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    } catch (e) {
      console.warn("drawImage exception:", e);
    }

    // 2. Create Canvas Texture with full sRGB and double-sided visibility
    const texture = new THREE.CanvasTexture(canvas);
    if ('colorSpace' in texture && THREE.SRGBColorSpace) {
      texture.colorSpace = THREE.SRGBColorSpace;
    } else if (THREE.sRGBEncoding) {
      texture.encoding = THREE.sRGBEncoding;
    }
    texture.format = THREE.RGBAFormat;
    texture.anisotropy = 16;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    // 3. Photo Material with Surface Texture Finishes (Option 4)
    const photoMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: texture,
      roughness: 0.3,
      metalness: 0.0,
      side: THREE.DoubleSide
    });

    if (surfaceFinish === 'canvas_linen') {
      photoMaterial.roughness = 0.7;
      photoMaterial.bumpMap = ModelGenerators.createLinenBumpTexture();
      photoMaterial.bumpScale = 0.04;
    } else if (surfaceFinish === 'glossy_glass') {
      photoMaterial.roughness = 0.05;
      photoMaterial.metalness = 0.06;
    } else if (surfaceFinish === 'matte_fineart') {
      photoMaterial.roughness = 0.88;
      photoMaterial.metalness = 0.0;
    }

    // Frame Materials Definition
    const frameMaterials = {
      black: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.1, side: THREE.DoubleSide }),
      wood: new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide }),
      gold: new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.25, metalness: 0.85, side: THREE.DoubleSide }),
      white: new THREE.MeshStandardMaterial({ color: 0xf8f9fa, roughness: 0.35, metalness: 0.05, side: THREE.DoubleSide }),
      silver: new THREE.MeshStandardMaterial({ color: 0xd0d5dd, roughness: 0.2, metalness: 0.9, side: THREE.DoubleSide })
    };

    const matBoardMaterial = new THREE.MeshStandardMaterial({
      color: 0xf4f4f0,
      roughness: 0.85,
      metalness: 0.0,
      side: THREE.DoubleSide
    });

    const glassMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.18,
      roughness: 0.05,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    const backMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.7,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    // Option 2: 3-Panel Triptych Slicing Layout
    if (shape === 'triptych') {
      const gap = Math.max(1.5, photoW * 0.03);
      const panelW = (photoW - gap * 2) / 3;

      for (let i = 0; i < 3; i++) {
        const subCanvas = document.createElement('canvas');
        subCanvas.width = Math.max(32, Math.floor(canvas.width / 3));
        subCanvas.height = canvas.height;
        const sCtx = subCanvas.getContext('2d');
        sCtx.drawImage(canvas, i * subCanvas.width, 0, subCanvas.width, subCanvas.height, 0, 0, subCanvas.width, subCanvas.height);

        const subTex = new THREE.CanvasTexture(subCanvas);
        subTex.format = THREE.RGBAFormat;
        subTex.needsUpdate = true;

        const subMat = photoMaterial.clone();
        subMat.map = subTex;

        const panelGroup = ModelGenerators.buildFrameStructure({
          mat: subMat,
          w: panelW,
          h: photoH,
          style,
          frameMaterials,
          frameColor,
          matBoardMaterial,
          glassMaterial,
          backMaterial,
          matMarginPercent
        });

        const posX = (i - 1) * (panelW + gap);
        panelGroup.position.set(posX, 0, 0);
        group.add(panelGroup);
      }

    } else if (shape === 'circular') {
      // Modern Round / Circular Frame
      const radius = photoW / 2;
      const frameBorder = Math.max(1.5, photoW * 0.06);

      const circleGeo = new THREE.CircleGeometry(radius, 64);
      const circleMesh = new THREE.Mesh(circleGeo, photoMaterial);
      circleMesh.position.set(0, radius + frameBorder, 0.1);
      group.add(circleMesh);

      // Circular Ring Outer Frame
      const ringGeo = new THREE.RingGeometry(radius, radius + frameBorder, 64);
      const ringMat = frameMaterials[frameColor] || frameMaterials.black;
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.set(0, radius + frameBorder, 0.15);
      group.add(ringMesh);

      // Backplate
      const backCircleGeo = new THREE.CircleGeometry(radius + frameBorder, 64);
      const backMesh = new THREE.Mesh(backCircleGeo, backMaterial);
      backMesh.position.set(0, radius + frameBorder, -0.2);
      group.add(backMesh);

    } else if (shape === 'hexagonal') {
      // Modular Hexagonal Geometry
      const radius = photoW / 2;
      const hexShape = new THREE.Shape();
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) hexShape.moveTo(x, y);
        else hexShape.lineTo(x, y);
      }
      hexShape.closePath();

      const hexGeo = new THREE.ShapeGeometry(hexShape);
      const hexMesh = new THREE.Mesh(hexGeo, photoMaterial);
      hexMesh.position.set(0, radius + 1, 0.1);
      group.add(hexMesh);

    } else {
      // Standard Single Frame Layout
      const singleFrame = ModelGenerators.buildFrameStructure({
        mat: photoMaterial,
        w: photoW,
        h: photoH,
        style,
        frameMaterials,
        frameColor,
        matBoardMaterial,
        glassMaterial,
        backMaterial,
        matMarginPercent,
        img
      });
      group.add(singleFrame);
    }

    // Option 3: Engraved Museum Brass / Silver Plaque
    if (hasPlaque && plaqueText) {
      const plaqueWidth = Math.min(24, Math.max(12, photoW * 0.5));
      const plaqueHeight = Math.max(2.6, Math.min(4.5, photoH * 0.12));
      const plaqueMesh = ModelGenerators.createPlaqueMesh(plaqueText, plaqueMaterial, plaqueWidth, plaqueHeight);
      
      group.updateMatrixWorld(true);
      const artBox = new THREE.Box3().setFromObject(group);
      const bottomY = isFinite(artBox.min.y) ? artBox.min.y : 0;
      plaqueMesh.position.set(0, bottomY - plaqueHeight / 2 - 0.6, 0.35);
      group.add(plaqueMesh);
    }

    group.userData.sourceImage = img;
    return group;
  }

  /**
   * Internal helper to construct frame physical components
   */
  static buildFrameStructure(cfg) {
    const { mat, w, h, style, frameMaterials, frameColor, matBoardMaterial, glassMaterial, backMaterial, matMarginPercent, img } = cfg;
    const subGroup = new THREE.Group();

    if (style === 'museum_frame') {
      const matRatio = (matMarginPercent || 8) / 100;
      const matPad = w * matRatio;
      const frameBorder = Math.max(1.5, w * 0.05);
      const frameDepth = Math.max(2.0, w * 0.06);

      const totalW = w + matPad * 2 + frameBorder * 2;
      const totalH = h + matPad * 2 + frameBorder * 2;

      // 1. Photo Mesh
      const photoGeo = new THREE.PlaneGeometry(w, h);
      const photoMesh = new THREE.Mesh(photoGeo, mat);
      photoMesh.position.set(0, totalH / 2, 0.1);
      subGroup.add(photoMesh);

      // 2. Mat Board (Passe-Partout surrounding photo)
      if (matPad > 0) {
        const matGeo = new THREE.BoxGeometry(w + matPad * 2, h + matPad * 2, 0.4);
        const matMesh = new THREE.Mesh(matGeo, matBoardMaterial);
        matMesh.position.set(0, totalH / 2, -0.2);
        subGroup.add(matMesh);
      }

      // 3. Outer Frame Box (4 Border Bars)
      const frameMat = frameMaterials[frameColor] || frameMaterials.black;
      const barThickness = frameBorder;
      const tGeo = new THREE.BoxGeometry(totalW, barThickness, frameDepth);
      const sGeo = new THREE.BoxGeometry(barThickness, totalH - barThickness * 2, frameDepth);

      const topBar = new THREE.Mesh(tGeo, frameMat);
      topBar.position.set(0, totalH - barThickness / 2, 0);
      const botBar = new THREE.Mesh(tGeo, frameMat);
      botBar.position.set(0, barThickness / 2, 0);
      const leftBar = new THREE.Mesh(sGeo, frameMat);
      leftBar.position.set(-totalW / 2 + barThickness / 2, totalH / 2, 0);
      const rightBar = new THREE.Mesh(sGeo, frameMat);
      rightBar.position.set(totalW / 2 - barThickness / 2, totalH / 2, 0);

      subGroup.add(topBar, botBar, leftBar, rightBar);

      // 4. Backboard
      const backGeo = new THREE.BoxGeometry(totalW - 0.4, totalH - 0.4, 0.4);
      const backMesh = new THREE.Mesh(backGeo, backMaterial);
      backMesh.position.set(0, totalH / 2, -frameDepth / 2 - 0.2);
      subGroup.add(backMesh);

    } else if (style === 'acrylic_stand') {
      const acrylicW = w + 2;
      const acrylicH = h + 2;
      const acrylicThick = 0.6;

      const photoGeo = new THREE.PlaneGeometry(w, h);
      const photoMesh = new THREE.Mesh(photoGeo, mat);
      photoMesh.position.set(0, acrylicH / 2 + 0.5, 0.0);
      subGroup.add(photoMesh);

      const acrGeo = new THREE.BoxGeometry(acrylicW, acrylicH, acrylicThick);
      const acrMesh = new THREE.Mesh(acrGeo, glassMaterial);
      acrMesh.position.set(0, acrylicH / 2 + 0.5, 0.35);
      subGroup.add(acrMesh);

      const legLength = h * 0.65;
      const legGeo = new THREE.BoxGeometry(w * 0.3, legLength, 0.4);
      const legMesh = new THREE.Mesh(legGeo, frameMaterials[frameColor] || frameMaterials.silver);
      legMesh.position.set(0, legLength * 0.4, -legLength * 0.35);
      legMesh.rotation.x = 0.45;
      subGroup.add(legMesh);

    } else if (style === 'crystal_glass') {
      const panelW = w + 4;
      const panelH = h + 4;

      const photoGeo = new THREE.PlaneGeometry(w, h);
      const photoMesh = new THREE.Mesh(photoGeo, mat);
      photoMesh.position.set(0, panelH / 2, 0.0);
      subGroup.add(photoMesh);

      const glassGeo = new THREE.BoxGeometry(panelW, panelH, 0.4);
      const glassMesh = new THREE.Mesh(glassGeo, glassMaterial);
      glassMesh.position.set(0, panelH / 2, 0.25);
      subGroup.add(glassMesh);

      const boltGeo = new THREE.CylinderGeometry(0.8, 0.8, 1.0, 16);
      const boltMat = frameMaterials[frameColor] || frameMaterials.silver;
      const bx = panelW / 2 - 1.5;
      const by = panelH - 1.5;
      const byLow = 1.5;

      const makeBolt = (bxPos, byPos) => {
        const b = new THREE.Mesh(boltGeo, boltMat);
        b.rotation.x = Math.PI / 2;
        b.position.set(bxPos, byPos, 0.3);
        return b;
      };
      subGroup.add(makeBolt(-bx, by), makeBolt(bx, by), makeBolt(-bx, byLow), makeBolt(bx, byLow));

    } else if (style === 'canvas_wrap') {
      const depth = Math.max(2.5, w * 0.05);
      const canvasGeo = new THREE.BoxGeometry(w, h, depth);
      const mats = [backMaterial, backMaterial, backMaterial, backMaterial, mat, backMaterial];
      const canvasMesh = new THREE.Mesh(canvasGeo, mats);
      canvasMesh.position.set(0, h / 2, 0);
      subGroup.add(canvasMesh);

    } else if (style === 'die_cut') {
      if (img) {
        const cutoutMesh = ModelGenerators.generateHeightmap(img, {
          reliefDepth: 2,
          baseThickness: 1.5,
          resolution: 240,
          noBasePlate: true,
          removeBgStrength: 35
        });
        subGroup.add(cutoutMesh);
      }
      const baseGeo = new THREE.CylinderGeometry(w * 0.4, w * 0.45, 1.2, 32);
      const baseMesh = new THREE.Mesh(baseGeo, frameMaterials[frameColor] || frameMaterials.black);
      baseMesh.position.set(0, 0.6, 0);
      subGroup.add(baseMesh);

    } else {
      // Poster
      const photoGeo = new THREE.PlaneGeometry(w, h);
      const photoMesh = new THREE.Mesh(photoGeo, mat);
      photoMesh.position.set(0, h / 2, 0);
      subGroup.add(photoMesh);
    }

    return subGroup;
  }
}

window.ModelGenerators = ModelGenerators;
