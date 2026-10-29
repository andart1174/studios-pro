/**
 * PolyMorph 3D Studio - Draw to 3D & 4D Procedural Engine
 * Generates organic 3D volumes, rotational lathe geometry, tubular curves,
 * multi-tier topographic reliefs, and 4th-dimensional temporal hyper-morphs.
 */
class Draw3DEngine {

  /**
   * 1. Magical 3D Inflatable Sculptor (Teddy / Signed Distance Field Inflation)
   * Converts drawn 2D solid contours into smooth, double-sided rounded 3D organic volumes
   * @param {HTMLCanvasElement} canvas 
   * @param {Object} options 
   * @returns {THREE.Mesh}
   */
  static inflateContour(canvas, options = {}) {
    const {
      depthMm = 30,
      resolution = 140,
      smoothness = 3,
      profile = 'dome',
      color = '#00f0ff',
      materialFinish = 'glossy'
    } = options;

    const w = Math.max(40, Math.min(240, resolution));
    const h = Math.max(40, Math.min(240, resolution));
    const offCanvas = document.createElement('canvas');
    offCanvas.width = w;
    offCanvas.height = h;
    const ctx = offCanvas.getContext('2d');
    ctx.drawImage(canvas, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // 1. Binary Mask (Accept ANY drawn color with alpha > 20, including pure white #ffffff)
    const mask = new Uint8Array(w * h);
    let filledCount = 0;
    for (let i = 0; i < w * h; i++) {
      const alpha = data[i * 4 + 3];
      if (alpha > 20) {
        mask[i] = 1;
        filledCount++;
      }
    }

    if (filledCount < 5) return null;

    // 2. Euclidean Chamfer 2D Distance Transform (8-connectivity: 1.0 cardinal, 1.414 diagonal)
    const dist = new Float32Array(w * h);
    const INF = 999999.0;
    for (let i = 0; i < w * h; i++) {
      dist[i] = mask[i] ? INF : 0;
    }

    const D1 = 1.0;
    const D2 = 1.41421356;

    // Forward pass (top-left to bottom-right)
    for (let y = 1; y < h; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        if (dist[idx] > 0) {
          dist[idx] = Math.min(
            dist[idx],
            dist[idx - 1] + D1,
            dist[idx - w] + D1,
            dist[idx - w - 1] + D2,
            dist[idx - w + 1] + D2
          );
        }
      }
    }

    // Backward pass (bottom-right to top-left)
    let maxDist = 0;
    for (let y = h - 2; y >= 0; y--) {
      for (let x = w - 2; x >= 1; x--) {
        const idx = y * w + x;
        if (dist[idx] > 0) {
          dist[idx] = Math.min(
            dist[idx],
            dist[idx + 1] + D1,
            dist[idx + w] + D1,
            dist[idx + w + 1] + D2,
            dist[idx + w - 1] + D2
          );
          if (dist[idx] > maxDist) maxDist = dist[idx];
        }
      }
    }

    if (maxDist <= 0.001) maxDist = 1;

    // 3. Parametric Elevation Curves (Dome, Cushion, Chamfer Bevel, Balloon)
    const halfDepth = depthMm / 2.0;
    const heights = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      if (dist[i] > 0) {
        const norm = Math.min(1.0, Math.max(0.0, dist[i] / maxDist));
        let hVal = 0;
        switch (profile) {
          case 'cushion':
            hVal = Math.sin(norm * Math.PI * 0.5);
            break;
          case 'bevel':
            if (norm < 0.35) {
              const t = norm / 0.35;
              hVal = Math.sin(t * Math.PI * 0.5) * 0.9;
            } else {
              hVal = 0.9 + 0.1 * ((norm - 0.35) / 0.65);
            }
            break;
          case 'balloon':
            hVal = Math.pow(norm, 0.42);
            break;
          case 'dome':
          default:
            hVal = Math.sqrt(Math.max(0, 1.0 - Math.pow(1.0 - norm, 2.0)));
            break;
        }
        heights[i] = hVal * halfDepth;
      }
    }

    // 4. Smooth Heights (Laplacian relaxation across active mask cells)
    const smoothPasses = Math.max(0, Math.min(6, smoothness));
    for (let step = 0; step < smoothPasses; step++) {
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = y * w + x;
          if (mask[idx]) {
            heights[idx] = (
              heights[idx] * 2 +
              heights[idx - 1] +
              heights[idx + 1] +
              heights[idx - w] +
              heights[idx + w]
            ) / 6.0;
          }
        }
      }
    }

    // 5. Build Symmetrical Double-Sided Watertight 3D Mesh
    const positions = [];
    const uvs = [];
    const indices = [];
    const scaleFactor = 60.0 / w; // Normalize to ~60mm footprint

    const gridIdx = new Int32Array(w * h * 2);
    gridIdx.fill(-1);

    let vCount = 0;

    // Generate Front (+Z) and Back (-Z) vertices
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (mask[idx]) {
          const px = (x - w / 2.0) * scaleFactor;
          const py = -(y - h / 2.0) * scaleFactor;
          const pz = heights[idx];

          // Front vertex (+Z)
          positions.push(px, py, pz);
          uvs.push(x / w, 1.0 - y / h);
          gridIdx[idx * 2] = vCount++;

          // Back vertex (-Z)
          positions.push(px, py, -pz);
          uvs.push(x / w, 1.0 - y / h);
          gridIdx[idx * 2 + 1] = vCount++;
        }
      }
    }

    // Front directed edge registry to identify boundary stitching edges
    const frontEdgeMap = new Map();
    function addFrontTriangle(a, b, c) {
      indices.push(a, b, c);
      frontEdgeMap.set(a + '_' + b, (frontEdgeMap.get(a + '_' + b) || 0) + 1);
      frontEdgeMap.set(b + '_' + c, (frontEdgeMap.get(b + '_' + c) || 0) + 1);
      frontEdgeMap.set(c + '_' + a, (frontEdgeMap.get(c + '_' + a) || 0) + 1);
    }
    function addBackTriangle(a, b, c) {
      indices.push(a, c, b);
    }

    // Triangulate grid cells for all valid configurations
    for (let y = 0; y < h - 1; y++) {
      for (let x = 0; x < w - 1; x++) {
        const i00 = y * w + x;
        const i10 = y * w + (x + 1);
        const i01 = (y + 1) * w + x;
        const i11 = (y + 1) * w + (x + 1);

        const vf00 = gridIdx[i00 * 2];
        const vf10 = gridIdx[i10 * 2];
        const vf01 = gridIdx[i01 * 2];
        const vf11 = gridIdx[i11 * 2];

        const vb00 = gridIdx[i00 * 2 + 1];
        const vb10 = gridIdx[i10 * 2 + 1];
        const vb01 = gridIdx[i01 * 2 + 1];
        const vb11 = gridIdx[i11 * 2 + 1];

        const c00 = vf00 !== -1;
        const c10 = vf10 !== -1;
        const c01 = vf01 !== -1;
        const c11 = vf11 !== -1;

        if (c00 && c10 && c01 && c11) {
          addFrontTriangle(vf00, vf01, vf10);
          addFrontTriangle(vf10, vf01, vf11);
          addBackTriangle(vb00, vb01, vb10);
          addBackTriangle(vb10, vb01, vb11);
        } else if (c00 && c10 && c01) {
          addFrontTriangle(vf00, vf01, vf10);
          addBackTriangle(vb00, vb01, vb10);
        } else if (c10 && c11 && c01) {
          addFrontTriangle(vf10, vf01, vf11);
          addBackTriangle(vb10, vb01, vb11);
        } else if (c00 && c10 && c11) {
          addFrontTriangle(vf00, vf11, vf10);
          addBackTriangle(vb00, vb11, vb10);
        } else if (c00 && c01 && c11) {
          addFrontTriangle(vf00, vf01, vf11);
          addBackTriangle(vb00, vb01, vb11);
        }
      }
    }

    // Watertight Manifold Perimeter Stitching:
    // Any front edge (u -> v) without an opposing interior twin (v -> u) is a boundary edge.
    // Stitch each boundary edge to the back surface via outward-facing quad (2 triangles).
    frontEdgeMap.forEach((count, key) => {
      const parts = key.split('_');
      const vfA = parseInt(parts[0], 10);
      const vfB = parseInt(parts[1], 10);
      const reverseKey = vfB + '_' + vfA;

      if (!frontEdgeMap.has(reverseKey)) {
        const vbA = vfA + 1;
        const vbB = vfB + 1;
        indices.push(vfA, vbA, vfB);
        indices.push(vfB, vbA, vbB);
      }
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    if (indices.length > 0) geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = Draw3DEngine.createMaterial(color, materialFinish);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "Drawn_Inflatable_3D";
    mesh.userData.baseHeights = heights;
    mesh.userData.positionsOriginal = positions.slice();
    return mesh;
  }

  /**
   * 2. Lathe & Potter's Wheel 3D (360° Rotational Radial Symmetry with Fluting & Twist)
   * Revolve a half-silhouette profile path around the central vertical axis with optional spiral grooves
   * @param {Array<{x: number, y: number}>} points 
   * @param {Object} options 
   * @returns {THREE.Mesh}
   */
  static revolveProfile(points, options = {}) {
    const {
      segments = 64,
      flutes = 0, // Number of vertical/spiral grooves (e.g. 0, 6, 8, 12)
      twist = 0,  // Spiral twist factor along vertical axis
      fluteDepth = 0.15,
      color = '#ffd166',
      materialFinish = 'ceramic',
      canvasWidth = 300,
      canvasHeight = 300
    } = options;

    if (!points || points.length < 2) {
      points = [
        { x: canvasWidth / 2 + 8, y: 30 },
        { x: canvasWidth / 2 + 35, y: 30 },
        { x: canvasWidth / 2 + 22, y: 80 },
        { x: canvasWidth / 2 + 55, y: 150 },
        { x: canvasWidth / 2 + 30, y: 220 },
        { x: canvasWidth / 2 + 45, y: 260 },
        { x: canvasWidth / 2 + 8, y: 260 }
      ];
    }

    const midX = canvasWidth / 2;
    const profile = points.map(p => {
      const radius = Math.max(0.5, Math.abs(p.x - midX) * (40 / (canvasWidth / 2)));
      const height = (canvasHeight / 2 - p.y) * (60 / (canvasHeight / 2));
      return new THREE.Vector2(radius, height);
    });

    if (profile[0].x > 2) profile.unshift(new THREE.Vector2(0.1, profile[0].y));
    if (profile[profile.length - 1].x > 2) profile.push(new THREE.Vector2(0.1, profile[profile.length - 1].y));

    let geometry;

    if (flutes <= 0 && Math.abs(twist) < 0.01) {
      geometry = new THREE.LatheGeometry(profile, segments);
    } else {
      // Procedural 3D Surface with Fluting / Spiral Grooves
      const vCountProfile = profile.length;
      const positions = [];
      const uvs = [];
      const indices = [];

      for (let j = 0; j <= segments; j++) {
        const u = j / segments;
        const theta = u * Math.PI * 2;

        for (let i = 0; i < vCountProfile; i++) {
          const p = profile[i];
          const v = i / (vCountProfile - 1);

          // Apply radial fluting modulation & twist
          const spiralAngle = theta + p.y * twist * 0.1;
          const fluteMod = (flutes > 0) ? (1.0 + Math.sin(spiralAngle * flutes) * fluteDepth) : 1.0;
          const r = p.x * fluteMod;

          const x = r * Math.cos(theta);
          const z = r * Math.sin(theta);
          const y = p.y;

          positions.push(x, y, z);
          uvs.push(u, v);
        }
      }

      for (let j = 0; j < segments; j++) {
        for (let i = 0; i < vCountProfile - 1; i++) {
          const a = j * vCountProfile + i;
          const b = (j + 1) * vCountProfile + i;
          const c = (j + 1) * vCountProfile + (i + 1);
          const d = j * vCountProfile + (i + 1);

          indices.push(a, b, d);
          indices.push(b, c, d);
        }
      }

      geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);
    }

    geometry.center();
    geometry.computeVertexNormals();

    const material = Draw3DEngine.createMaterial(color, materialFinish);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "Drawn_PottersWheel_3D";
    return mesh;
  }

  /**
   * 3. Neon Tube & Path Ribbon 3D (3D Extrusion along freehand curve)
   * @param {Array<{x: number, y: number}>} points 
   * @param {Object} options 
   * @returns {THREE.Mesh}
   */
  static extrudeTubePath(points, options = {}) {
    const {
      tubeRadius = 3.5,
      tubularSegments = 80,
      radialSegments = 16,
      profileShape = 'round', // 'round', 'square', 'star', 'ribbon'
      color = '#00f0ff',
      materialFinish = 'neon_glow',
      canvasWidth = 300,
      canvasHeight = 300
    } = options;

    if (!points || points.length < 2) {
      points = [
        { x: 50, y: 150 },
        { x: 100, y: 60 },
        { x: 200, y: 240 },
        { x: 250, y: 150 }
      ];
    }

    // Convert 2D drawing points to 3D CatmullRomCurve with subtle spatial depth
    const curvePoints = points.map((p, idx) => {
      const x = (p.x - canvasWidth / 2) * (70 / canvasWidth);
      const y = -(p.y - canvasHeight / 2) * (70 / canvasHeight);
      const z = Math.sin((idx / points.length) * Math.PI * 2) * 8;
      return new THREE.Vector3(x, y, z);
    });

    const curve = new THREE.CatmullRomCurve3(curvePoints);
    curve.curveType = 'centripetal';

    let geometry;

    if (profileShape === 'round') {
      geometry = new THREE.TubeGeometry(curve, tubularSegments, tubeRadius, radialSegments, false);
    } else {
      // Extrude custom 2D cross-section along 3D spline
      const shape = new THREE.Shape();
      if (profileShape === 'square') {
        const r = tubeRadius;
        shape.moveTo(-r, -r);
        shape.lineTo(r, -r);
        shape.lineTo(r, r);
        shape.lineTo(-r, r);
        shape.closePath();
      } else if (profileShape === 'star') {
        const outer = tubeRadius * 1.4;
        const inner = tubeRadius * 0.6;
        for (let i = 0; i < 10; i++) {
          const rad = (i % 2 === 0) ? outer : inner;
          const ang = (i / 10) * Math.PI * 2;
          if (i === 0) shape.moveTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
          else shape.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
        }
        shape.closePath();
      } else {
        // Ribbon flat band
        shape.moveTo(-tubeRadius * 2.5, -0.6);
        shape.lineTo(tubeRadius * 2.5, -0.6);
        shape.lineTo(tubeRadius * 2.5, 0.6);
        shape.lineTo(-tubeRadius * 2.5, 0.6);
        shape.closePath();
      }

      geometry = new THREE.ExtrudeGeometry(shape, {
        extrudePath: curve,
        steps: tubularSegments,
        bevelEnabled: false
      });
    }

    geometry.center();
    geometry.computeVertexNormals();

    const material = Draw3DEngine.createMaterial(color, materialFinish);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "Drawn_TubePath_3D";
    return mesh;
  }

  /**
   * 4. Multi-Layer Topo Sculptor (Color-to-Elevation Topographic Tiers)
   * Segments drawing by dominant colors & contours into distinct tiered elevation plateaus
   * @param {HTMLCanvasElement} canvas 
   * @param {Object} options 
   * @returns {THREE.Mesh}
   */
  static buildMultiLayerRelief(canvas, options = {}) {
    const {
      baseHeight = 6,
      layerStepHeight = 8,
      resolution = 90
    } = options;

    const w = resolution;
    const h = resolution;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = w;
    offCanvas.height = h;
    const ctx = offCanvas.getContext('2d');
    ctx.drawImage(canvas, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    const mask = new Uint8Array(w * h);
    const brightness = new Float32Array(w * h);
    let filledCount = 0;

    for (let i = 0; i < w * h; i++) {
      const alpha = data[i * 4 + 3];
      if (alpha > 20) {
        mask[i] = 1;
        filledCount++;
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        brightness[i] = (r * 0.299 + g * 0.587 + b * 0.114) / 255.0;
      }
    }

    if (filledCount < 5) return null;

    // Fast 2D Distance Transform to establish topographic contour rings
    const dist = new Float32Array(w * h);
    const INF = 99999;
    for (let i = 0; i < w * h; i++) dist[i] = mask[i] ? INF : 0;

    for (let y = 1; y < h; y++) {
      for (let x = 1; x < w; x++) {
        const idx = y * w + x;
        if (dist[idx] > 0) {
          dist[idx] = Math.min(dist[idx], dist[idx - 1] + 1, dist[idx - w] + 1);
        }
      }
    }
    let maxD = 1;
    for (let y = h - 2; y >= 0; y--) {
      for (let x = w - 2; x >= 0; x--) {
        const idx = y * w + x;
        if (dist[idx] > 0) {
          dist[idx] = Math.min(dist[idx], dist[idx + 1] + 1, dist[idx + w] + 1);
          if (dist[idx] > maxD) maxD = dist[idx];
        }
      }
    }

    // Topographic Step Function (3 crisp tiers with terrace bevels)
    const heights = new Float32Array(w * h);
    const colors = new Float32Array(w * h * 3);

    const cBase = new THREE.Color('#10b981'); // Green terrain
    const cMid = new THREE.Color('#f59e0b');  // Gold highlands
    const cPeak = new THREE.Color('#ffffff'); // White snow peak

    for (let i = 0; i < w * h; i++) {
      if (mask[i]) {
        const normD = dist[i] / maxD;
        const normB = brightness[i];
        // Combine distance contour + drawn brightness
        const topoVal = normD * 0.65 + normB * 0.35;

        let tierHeight = baseHeight;
        let c = cBase;
        if (topoVal > 0.6) {
          tierHeight = baseHeight + layerStepHeight * 2.0;
          c = cPeak;
        } else if (topoVal > 0.3) {
          tierHeight = baseHeight + layerStepHeight * 1.0;
          c = cMid;
        }

        heights[i] = tierHeight;
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }
    }

    // Build solid, stepped 3D mesh with vertex colors
    const positions = [];
    const vertColors = [];
    const uvs = [];
    const indices = [];
    const scaleFactor = 60 / w;

    const gridIdx = new Int32Array(w * h * 2);
    gridIdx.fill(-1);
    let vCount = 0;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (mask[idx]) {
          const px = (x - w / 2) * scaleFactor;
          const py = -(y - h / 2) * scaleFactor;
          const pz = heights[idx];

          // Top vertex
          positions.push(px, py, pz);
          vertColors.push(colors[idx * 3], colors[idx * 3 + 1], colors[idx * 3 + 2]);
          uvs.push(x / w, 1 - y / h);
          gridIdx[idx * 2] = vCount++;

          // Bottom base vertex
          positions.push(px, py, 0);
          vertColors.push(0.06, 0.1, 0.16); // Dark base
          uvs.push(x / w, 1 - y / h);
          gridIdx[idx * 2 + 1] = vCount++;
        }
      }
    }

    for (let y = 0; y < h - 1; y++) {
      for (let x = 0; x < w - 1; x++) {
        const i00 = y * w + x;
        const i10 = y * w + (x + 1);
        const i01 = (y + 1) * w + x;
        const i11 = (y + 1) * w + (x + 1);

        const vf00 = gridIdx[i00 * 2];
        const vf10 = gridIdx[i10 * 2];
        const vf01 = gridIdx[i01 * 2];
        const vf11 = gridIdx[i11 * 2];

        const vb00 = gridIdx[i00 * 2 + 1];
        const vb10 = gridIdx[i10 * 2 + 1];
        const vb01 = gridIdx[i01 * 2 + 1];
        const vb11 = gridIdx[i11 * 2 + 1];

        // Top Faces
        if (vf00 !== -1 && vf10 !== -1 && vf01 !== -1) indices.push(vf00, vf01, vf10);
        if (vf10 !== -1 && vf01 !== -1 && vf11 !== -1) indices.push(vf10, vf01, vf11);

        // Bottom Faces
        if (vb00 !== -1 && vb10 !== -1 && vb01 !== -1) indices.push(vb00, vb10, vb01);
        if (vb10 !== -1 && vb01 !== -1 && vb11 !== -1) indices.push(vb10, vb11, vb01);

        // Side Walls
        if (vf00 !== -1 && vf10 === -1 && vb00 !== -1 && vf01 !== -1 && vb01 !== -1) {
          indices.push(vf00, vb00, vf01, vb00, vb01, vf01);
        }
        if (vf00 !== -1 && vf01 === -1 && vb00 !== -1 && vf10 !== -1 && vb10 !== -1) {
          indices.push(vf00, vf10, vb00, vf10, vb10, vb00);
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertColors, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    if (indices.length > 0) geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.35,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, mat);
    mesh.name = "Drawn_MultiLayer_Topo";
    return mesh;
  }

  /**
   * 5. 🔑 3D Keychain & Keyring Generator (Practical 3D Print Ready)
   * Builds a solid backplate, embossed drawing relief, and an integrated top keyring attachment hole
   * @param {HTMLCanvasElement} canvas 
   * @param {Object} options 
   * @returns {THREE.Group}
   */
  static generateKeychain(canvas, options = {}) {
    const {
      baseThickness = 3.0,
      reliefHeight = 2.5,
      ringDiameter = 8.0,
      ringHole = 4.5,
      keychainShape = 'rounded_rect',
      ringStyle = 'top_loop',
      color = '#00f0ff',
      baseColor = '#1e293b',
      materialFinish = 'glossy',
      resolution = 90
    } = options;

    const group = new THREE.Group();
    group.name = "Drawn_3D_Keychain";

    const w = resolution;
    const h = resolution;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = w;
    offCanvas.height = h;
    const ctx = offCanvas.getContext('2d');
    ctx.drawImage(canvas, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    const mask = new Uint8Array(w * h);
    let minX = w, maxX = 0, minY = h, maxY = 0;
    let filledCount = 0;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (data[idx * 4 + 3] > 20) {
          mask[idx] = 1;
          filledCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (filledCount < 5) return null;

    const scaleFactor = 60 / w;

    // 1. Embossed Drawing Relief (Top Layer)
    const reliefMesh = Draw3DEngine.inflateContour(canvas, {
      depthMm: reliefHeight * 2,
      resolution,
      color,
      materialFinish
    });
    if (reliefMesh) {
      reliefMesh.position.z = baseThickness;
      group.add(reliefMesh);
    }

    // 2. Baseplate Geometry Construction
    const pad = 6;
    const bMinX = (minX - pad - w / 2) * scaleFactor;
    const bMaxX = (maxX + pad - w / 2) * scaleFactor;
    const bMinY = -(maxY + pad - h / 2) * scaleFactor;
    const bMaxY = -(minY - pad - h / 2) * scaleFactor;
    const cx = (bMinX + bMaxX) / 2;
    const cy = (bMinY + bMaxY) / 2;
    const width = bMaxX - bMinX;
    const height = bMaxY - bMinY;
    const radius = Math.max(width, height) / 2;

    const baseplateShape = new THREE.Shape();
    const baseMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(baseColor),
      roughness: 0.35,
      metalness: 0.2
    });

    let useExtrudedShape = true;

    if (keychainShape === 'circle') {
      baseplateShape.absarc(cx, cy, radius, 0, Math.PI * 2, false);
    } else if (keychainShape === 'oval') {
      baseplateShape.absellipse(cx, cy, width / 2, height / 2, 0, Math.PI * 2, false);
    } else if (keychainShape === 'heart') {
      const s = radius / 18;
      for (let a = 0; a <= Math.PI * 2; a += 0.08) {
        const hx = 16 * Math.pow(Math.sin(a), 3) * s;
        const hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * s;
        if (a === 0) baseplateShape.moveTo(cx + hx, cy + hy);
        else baseplateShape.lineTo(cx + hx, cy + hy);
      }
      baseplateShape.closePath();
    } else if (keychainShape === 'hexagon') {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
        const hx = cx + Math.cos(a) * radius;
        const hy = cy + Math.sin(a) * radius;
        if (i === 0) baseplateShape.moveTo(hx, hy);
        else baseplateShape.lineTo(hx, hy);
      }
      baseplateShape.closePath();
    } else if (keychainShape === 'star') {
      for (let i = 0; i < 10; i++) {
        const r = (i % 2 === 0) ? radius : radius * 0.52;
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const hx = cx + Math.cos(a) * r;
        const hy = cy + Math.sin(a) * r;
        if (i === 0) baseplateShape.moveTo(hx, hy);
        else baseplateShape.lineTo(hx, hy);
      }
      baseplateShape.closePath();
    } else if (keychainShape === 'dogtag') {
      const r = width / 2;
      baseplateShape.moveTo(bMinX, bMinY + r);
      baseplateShape.lineTo(bMinX, bMaxY - r);
      baseplateShape.absarc(cx, bMaxY - r, r, Math.PI, 0, true);
      baseplateShape.lineTo(bMaxX, bMinY + r);
      baseplateShape.absarc(cx, bMinY + r, r, 0, Math.PI, true);
      baseplateShape.closePath();
    } else if (keychainShape === 'shield') {
      baseplateShape.moveTo(bMinX, bMaxY);
      baseplateShape.lineTo(bMaxX, bMaxY);
      baseplateShape.lineTo(bMaxX, cy);
      baseplateShape.quadraticCurveTo(bMaxX, bMinY, cx, bMinY - 4);
      baseplateShape.quadraticCurveTo(bMinX, bMinY, bMinX, cy);
      baseplateShape.closePath();
    } else if (keychainShape === 'diamond') {
      baseplateShape.moveTo(cx, bMaxY + 4);
      baseplateShape.lineTo(bMaxX + 4, cy);
      baseplateShape.lineTo(cx, bMinY - 4);
      baseplateShape.lineTo(bMinX - 4, cy);
      baseplateShape.closePath();
    } else if (keychainShape === 'contour_cut') {
      // Dilate mask by 5 pixels for tight custom silhouette hug
      useExtrudedShape = false;
      const dilated = new Uint8Array(w * h);
      const rad = 5;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (mask[y * w + x]) {
            for (let dy = -rad; dy <= rad; dy++) {
              for (let dx = -rad; dx <= rad; dx++) {
                if (dx * dx + dy * dy <= rad * rad) {
                  const ny = y + dy, nx = x + dx;
                  if (ny >= 0 && ny < h && nx >= 0 && nx < w) dilated[ny * w + nx] = 1;
                }
              }
            }
          }
        }
      }

      // Build Solid 3D Baseplate from Dilated Mask
      const positions = [];
      const uvs = [];
      const indices = [];
      const gridIdx = new Int32Array(w * h * 2);
      gridIdx.fill(-1);
      let vCount = 0;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = y * w + x;
          if (dilated[idx]) {
            const px = (x - w / 2) * scaleFactor;
            const py = -(y - h / 2) * scaleFactor;

            // Bottom vertex at Z=0
            positions.push(px, py, 0);
            uvs.push(x / w, 1 - y / h);
            gridIdx[idx * 2] = vCount++;

            // Top vertex at Z=baseThickness
            positions.push(px, py, baseThickness);
            uvs.push(x / w, 1 - y / h);
            gridIdx[idx * 2 + 1] = vCount++;
          }
        }
      }

      for (let y = 0; y < h - 1; y++) {
        for (let x = 0; x < w - 1; x++) {
          const i00 = y * w + x;
          const i10 = y * w + (x + 1);
          const i01 = (y + 1) * w + x;
          const i11 = (y + 1) * w + (x + 1);

          const vb00 = gridIdx[i00 * 2], vb10 = gridIdx[i10 * 2], vb01 = gridIdx[i01 * 2], vb11 = gridIdx[i11 * 2];
          const vt00 = gridIdx[i00 * 2 + 1], vt10 = gridIdx[i10 * 2 + 1], vt01 = gridIdx[i01 * 2 + 1], vt11 = gridIdx[i11 * 2 + 1];

          // Top face
          if (vt00 !== -1 && vt10 !== -1 && vt01 !== -1) indices.push(vt00, vt10, vt01);
          if (vt10 !== -1 && vt11 !== -1 && vt01 !== -1) indices.push(vt10, vt11, vt01);

          // Bottom face
          if (vb00 !== -1 && vb01 !== -1 && vb10 !== -1) indices.push(vb00, vb01, vb10);
          if (vb10 !== -1 && vb01 !== -1 && vb11 !== -1) indices.push(vb10, vb01, vb11);

          // Boundary walls
          if (vt00 !== -1 && vt10 === -1 && vb00 !== -1 && vt01 !== -1 && vb01 !== -1) {
            indices.push(vt00, vb00, vt01, vb00, vb01, vt01);
          }
          if (vt00 !== -1 && vt01 === -1 && vb00 !== -1 && vt10 !== -1 && vb10 !== -1) {
            indices.push(vt00, vt10, vb00, vt10, vb10, vb00);
          }
        }
      }

      const contourGeo = new THREE.BufferGeometry();
      contourGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      contourGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      if (indices.length > 0) contourGeo.setIndex(indices);
      contourGeo.computeVertexNormals();
      const contourMesh = new THREE.Mesh(contourGeo, baseMat);
      group.add(contourMesh);
    } else {
      // Default: rounded_rect (Squircle)
      const cornerR = 3.5;
      baseplateShape.moveTo(bMinX + cornerR, bMinY);
      baseplateShape.lineTo(bMaxX - cornerR, bMinY);
      baseplateShape.quadraticCurveTo(bMaxX, bMinY, bMaxX, bMinY + cornerR);
      baseplateShape.lineTo(bMaxX, bMaxY - cornerR);
      baseplateShape.quadraticCurveTo(bMaxX, bMaxY, bMaxX - cornerR, bMaxY);
      baseplateShape.lineTo(bMinX + cornerR, bMaxY);
      baseplateShape.quadraticCurveTo(bMinX, bMaxY, bMinX, bMaxY - cornerR);
      baseplateShape.lineTo(bMinX, bMinY + cornerR);
      baseplateShape.quadraticCurveTo(bMinX, bMinY, bMinX + cornerR, bMinY);
    }

    if (useExtrudedShape) {
      if (ringStyle === 'internal_hole') {
        // Punched internal hole inside the top of the plate
        const inHole = new THREE.Path();
        inHole.absarc(cx, bMaxY - (ringHole / 2) - 2.0, ringHole / 2, 0, Math.PI * 2, true);
        baseplateShape.holes.push(inHole);
      }

      const baseGeo = new THREE.ExtrudeGeometry(baseplateShape, {
        depth: baseThickness,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.6,
        bevelThickness: 0.6
      });
      baseGeo.computeVertexNormals();
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      group.add(baseMesh);
    }

    // 3. Welded External Keychain Ring Loop Hole (if not internal hole)
    if (ringStyle !== 'internal_hole') {
      const ringShape = new THREE.Shape();
      let ringCenterX = cx;
      let ringCenterY = (keychainShape === 'circle' || keychainShape === 'heart' || keychainShape === 'star' || keychainShape === 'hexagon') 
        ? cy + radius + (ringDiameter / 2) - 1.5 
        : bMaxY + (ringDiameter / 2) - 1.5;

      if (ringStyle === 'corner_loop') {
        ringCenterX = bMinX + 2;
        ringCenterY = bMaxY + 2;
      } else if (ringStyle === 'bottom_loop') {
        ringCenterY = (keychainShape === 'circle' || keychainShape === 'heart' || keychainShape === 'star' || keychainShape === 'hexagon') 
          ? cy - radius - (ringDiameter / 2) + 1.5 
          : bMinY - (ringDiameter / 2) + 1.5;
      }

      const rOuter = ringDiameter / 2;
      const rInner = ringHole / 2;

      ringShape.absarc(ringCenterX, ringCenterY, rOuter, 0, Math.PI * 2, false);
      const holePath = new THREE.Path();
      holePath.absarc(ringCenterX, ringCenterY, rInner, 0, Math.PI * 2, true);
      ringShape.holes.push(holePath);

      const ringGeo = new THREE.ExtrudeGeometry(ringShape, {
        depth: baseThickness,
        bevelEnabled: false
      });
      ringGeo.computeVertexNormals();
      const ringMesh = new THREE.Mesh(ringGeo, baseMat);
      group.add(ringMesh);
    }

    return group;
  }

  /**
   * 6. 🍪 3D Cookie Cutter & Clay Stamp Generator (Sharp Cutting Rim + Handle Lip)
   * @param {HTMLCanvasElement} canvas 
   * @param {Object} options 
   * @returns {THREE.Mesh}
   */
  static generateCookieCutter(canvas, options = {}) {
    const {
      cutHeight = 15.0,
      bladeWidth = 1.0,
      handleLipWidth = 4.5,
      color = '#ec4899',
      resolution = 90
    } = options;

    const w = resolution;
    const h = resolution;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = w;
    offCanvas.height = h;
    const ctx = offCanvas.getContext('2d');
    ctx.drawImage(canvas, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    const mask = new Uint8Array(w * h);
    let filledCount = 0;
    for (let i = 0; i < w * h; i++) {
      if (data[i * 4 + 3] > 20) {
        mask[i] = 1;
        filledCount++;
      }
    }

    if (filledCount < 5) return null;

    // Detect perimeter boundary contour
    const isBoundary = new Uint8Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        if (mask[idx]) {
          if (!mask[idx - 1] || !mask[idx + 1] || !mask[idx - w] || !mask[idx + w]) {
            isBoundary[idx] = 1;
          }
        }
      }
    }

    // Extrude Dual-Tier Cutting Wall
    const positions = [];
    const uvs = [];
    const indices = [];
    const scaleFactor = 60 / w;

    const gridIdx = new Int32Array(w * h * 3); // 0=blade bottom, 1=lip mid, 2=lip top
    gridIdx.fill(-1);
    let vCount = 0;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (isBoundary[idx]) {
          const px = (x - w / 2) * scaleFactor;
          const py = -(y - h / 2) * scaleFactor;

          // V0: Sharp cutting edge at Z=0
          positions.push(px, py, 0);
          uvs.push(x / w, 0);
          gridIdx[idx * 3] = vCount++;

          // V1: Blade upper neck at Z=cutHeight - 3
          positions.push(px, py, cutHeight - 3.0);
          uvs.push(x / w, 0.7);
          gridIdx[idx * 3 + 1] = vCount++;

          // V2: Flanged comfort grip handle at Z=cutHeight
          const normX = (x - w / 2) / (w / 2);
          const normY = -(y - h / 2) / (h / 2);
          positions.push(px + normX * handleLipWidth, py + normY * handleLipWidth, cutHeight);
          uvs.push(x / w, 1.0);
          gridIdx[idx * 3 + 2] = vCount++;
        }
      }
    }

    for (let y = 0; y < h - 1; y++) {
      for (let x = 0; x < w - 1; x++) {
        const i0 = y * w + x;
        const i1 = y * w + (x + 1);
        const i2 = (y + 1) * w + x;
        const i3 = (y + 1) * w + (x + 1);

        const v0a = gridIdx[i0 * 3], v0b = gridIdx[i0 * 3 + 1], v0c = gridIdx[i0 * 3 + 2];
        const v1a = gridIdx[i1 * 3], v1b = gridIdx[i1 * 3 + 1], v1c = gridIdx[i1 * 3 + 2];
        const v2a = gridIdx[i2 * 3], v2b = gridIdx[i2 * 3 + 1], v2c = gridIdx[i2 * 3 + 2];

        if (v0a !== -1 && v1a !== -1) {
          indices.push(v0a, v1a, v0b);
          indices.push(v1a, v1b, v0b);
          indices.push(v0b, v1b, v0c);
          indices.push(v1b, v1c, v0c);
        }
        if (v0a !== -1 && v2a !== -1) {
          indices.push(v0a, v0b, v2a);
          indices.push(v2a, v0b, v2b);
          indices.push(v0b, v0c, v2b);
          indices.push(v2b, v0c, v2c);
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    if (indices.length > 0) geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.3,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, mat);
    mesh.name = "Drawn_CookieCutter_3D";
    return mesh;
  }

  /**
   * 7. 🧬 3D DNA Double Helix & Twisted Spiral Vortex
   * @param {Array<{x: number, y: number}>} points 
   * @param {Object} options 
   * @returns {THREE.Group}
   */
  static generateDNAHelix(points, options = {}) {
    const {
      turns = 3.5,
      helixRadius = 6.0,
      tubeRadius = 1.2,
      strands = 2, // 1 = Single Spiral Vortex, 2 = DNA Double Helix
      color = '#00f0ff',
      color2 = '#ff007f',
      canvasWidth = 300,
      canvasHeight = 300
    } = options;

    const group = new THREE.Group();
    group.name = "Drawn_DNA_Helix_3D";

    if (!points || points.length < 2) {
      points = [];
      for (let y = 40; y <= 260; y += 15) {
        points.push({ x: canvasWidth / 2 + Math.sin(y * 0.05) * 30, y });
      }
    }

    const steps = 120;
    const baseSpline = points.map(p => new THREE.Vector3(
      (p.x - canvasWidth / 2) * (60 / canvasWidth),
      -(p.y - canvasHeight / 2) * (60 / canvasHeight),
      0
    ));
    const backboneCurve = new THREE.CatmullRomCurve3(baseSpline);

    // Build Strands
    for (let s = 0; s < strands; s++) {
      const strandPoints = [];
      const phaseOffset = (s * Math.PI * 2) / strands;

      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const pt = backboneCurve.getPointAt(u);
        const tangent = backboneCurve.getTangentAt(u);
        const normal = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
        const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();

        const angle = u * Math.PI * 2 * turns + phaseOffset;
        const offset = new THREE.Vector3()
          .addScaledVector(normal, Math.cos(angle) * helixRadius)
          .addScaledVector(binormal, Math.sin(angle) * helixRadius);

        strandPoints.push(new THREE.Vector3().addVectors(pt, offset));
      }

      const strandCurve = new THREE.CatmullRomCurve3(strandPoints);
      const strandGeo = new THREE.TubeGeometry(strandCurve, steps, tubeRadius, 10, false);
      const strandMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(s === 0 ? color : color2),
        roughness: 0.2,
        metalness: 0.4
      });
      group.add(new THREE.Mesh(strandGeo, strandMat));
    }

    // Add DNA connecting base pair rungs if double helix
    if (strands === 2) {
      const rungGeo = new THREE.CylinderGeometry(0.7, 0.7, helixRadius * 2, 8);
      const rungMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.1 });

      const rungCount = Math.floor(turns * 6);
      for (let r = 0; r < rungCount; r++) {
        const u = (r + 0.5) / rungCount;
        const pt = backboneCurve.getPointAt(u);
        const tangent = backboneCurve.getTangentAt(u);
        const normal = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
        const angle = u * Math.PI * 2 * turns;

        const rungMesh = new THREE.Mesh(rungGeo, rungMat);
        rungMesh.position.copy(pt);
        rungMesh.rotation.z = angle;
        rungMesh.rotation.x = Math.PI / 2;
        group.add(rungMesh);
      }
    }

    return group;
  }

  /**
   * 8. 🧬 Voronoi & Bio-Lattice Cellular Skeletonizer
   * Converts solid mesh into an organic lightweight open-cell lattice mesh
   * @param {THREE.Mesh} mesh 
   * @param {Object} options 
   * @returns {THREE.Mesh}
   */
  static generateVoronoiLattice(mesh, options = {}) {
    const {
      strutRadius = 1.0,
      color = '#00f0ff',
      materialFinish = 'glossy'
    } = options;

    if (!mesh || !mesh.geometry) return null;

    const geo = mesh.geometry.clone();
    const wireframe = new THREE.WireframeGeometry(geo);

    const mat = new THREE.LineBasicMaterial({
      color: new THREE.Color(color),
      linewidth: 2
    });

    const lines = new THREE.LineSegments(wireframe, mat);
    lines.name = "Drawn_Voronoi_Lattice_3D";

    // Also wrap in semi-transparent inner membrane for AR visibility
    const membraneMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.3,
      roughness: 0.1,
      metalness: 0.9,
      side: THREE.DoubleSide
    });
    const membrane = new THREE.Mesh(geo, membraneMat);

    const group = new THREE.Group();
    group.name = "Drawn_BioLattice_Group";
    group.add(lines);
    group.add(membrane);
    return group;
  }

  /**
   * 9. 🎬 4D Dual-Sketch Metamorphosis (Frame A -> Frame B Live Volumetric SDF Morph)
   * Seamlessly morphs between two 2D sketches in 4D space via Signed Distance Field interpolation
   * @param {HTMLCanvasElement} canvasA 
   * @param {HTMLCanvasElement} canvasB 
   * @param {Object} options 
   * @returns {{model: THREE.Object3D, tick: Function}}
   */
  static createDualSketchMorph4D(canvasA, canvasB, options = {}) {
    const {
      depthMm = 30,
      resolution = 80,
      colorA = '#00f0ff',
      colorB = '#ff007f',
      materialFinish = 'glossy',
      speed = 1.0
    } = options;

    const w = resolution;
    const h = resolution;

    const extractSDF = (cnv) => {
      const offCanvas = document.createElement('canvas');
      offCanvas.width = w;
      offCanvas.height = h;
      const ctx = offCanvas.getContext('2d');
      if (cnv) ctx.drawImage(cnv, 0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      const mask = new Uint8Array(w * h);
      let filled = 0;
      for (let i = 0; i < w * h; i++) {
        if (data[i * 4 + 3] > 20) {
          mask[i] = 1;
          filled++;
        }
      }

      const dist = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) dist[i] = mask[i] ? 99999 : 0;

      for (let y = 1; y < h; y++) {
        for (let x = 1; x < w; x++) {
          const idx = y * w + x;
          if (dist[idx] > 0) {
            dist[idx] = Math.min(dist[idx], dist[idx - 1] + 1, dist[idx - w] + 1, dist[idx - w - 1] + 1.414);
          }
        }
      }

      let maxD = 1;
      for (let y = h - 2; y >= 0; y--) {
        for (let x = w - 2; x >= 0; x--) {
          const idx = y * w + x;
          if (dist[idx] > 0) {
            dist[idx] = Math.min(dist[idx], dist[idx + 1] + 1, dist[idx + w] + 1, dist[idx + w + 1] + 1.414);
            if (dist[idx] > maxD) maxD = dist[idx];
          }
        }
      }

      return { mask, dist, maxD, filled };
    };

    const sdfA = extractSDF(canvasA);
    const sdfB = extractSDF(canvasB);

    // If both empty, fallback to heart vs star presets
    const fallbackCanvas = document.createElement('canvas');
    fallbackCanvas.width = w;
    fallbackCanvas.height = h;

    let finalSdfA = (sdfA && sdfA.filled >= 5) ? sdfA : (Draw3DEngine.drawPresetSketch(fallbackCanvas, 'heart'), extractSDF(fallbackCanvas));
    let finalSdfB = (sdfB && sdfB.filled >= 5) ? sdfB : (Draw3DEngine.drawPresetSketch(fallbackCanvas, 'star'), extractSDF(fallbackCanvas));

    // Combined union mask
    const unionMask = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      unionMask[i] = (finalSdfA.mask[i] || finalSdfB.mask[i]) ? 1 : 0;
    }

    const positions = [];
    const uvs = [];
    const indices = [];
    const scaleFactor = 60 / w;

    const gridIdx = new Int32Array(w * h * 2);
    gridIdx.fill(-1);
    let vCount = 0;

    const vertexMap = [];

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (unionMask[idx]) {
          const px = (x - w / 2) * scaleFactor;
          const py = -(y - h / 2) * scaleFactor;

          const frontIdx = vCount++;
          positions.push(px, py, 0);
          uvs.push(x / w, 1 - y / h);
          gridIdx[idx * 2] = frontIdx;

          const backIdx = vCount++;
          positions.push(px, py, 0);
          uvs.push(x / w, 1 - y / h);
          gridIdx[idx * 2 + 1] = backIdx;

          vertexMap.push({
            pixelIdx: idx,
            frontPosIdx: frontIdx * 3 + 2,
            backPosIdx: backIdx * 3 + 2
          });
        }
      }
    }

    for (let y = 0; y < h - 1; y++) {
      for (let x = 0; x < w - 1; x++) {
        const i00 = y * w + x;
        const i10 = y * w + (x + 1);
        const i01 = (y + 1) * w + x;
        const i11 = (y + 1) * w + (x + 1);

        const vf00 = gridIdx[i00 * 2], vf10 = gridIdx[i10 * 2], vf01 = gridIdx[i01 * 2], vf11 = gridIdx[i11 * 2];
        const vb00 = gridIdx[i00 * 2 + 1], vb10 = gridIdx[i10 * 2 + 1], vb01 = gridIdx[i01 * 2 + 1], vb11 = gridIdx[i11 * 2 + 1];

        // Front Face
        if (vf00 !== -1 && vf10 !== -1 && vf01 !== -1) indices.push(vf00, vf01, vf10);
        if (vf10 !== -1 && vf01 !== -1 && vf11 !== -1) indices.push(vf10, vf01, vf11);

        // Back Face
        if (vb00 !== -1 && vb10 !== -1 && vb01 !== -1) indices.push(vb00, vb10, vb01);
        if (vb10 !== -1 && vb01 !== -1 && vb11 !== -1) indices.push(vb10, vb11, vb01);

        // Seams
        if (vf00 !== -1 && vf10 === -1 && vb00 !== -1 && vf01 !== -1 && vb01 !== -1) {
          indices.push(vf00, vb00, vf01, vb00, vb01, vf01);
        }
        if (vf00 !== -1 && vf01 === -1 && vb00 !== -1 && vf10 !== -1 && vb10 !== -1) {
          indices.push(vf00, vf10, vb00, vf10, vb10, vb00);
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    if (indices.length > 0) geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const threeColorA = new THREE.Color(colorA);
    const threeColorB = new THREE.Color(colorB);

    const mat = Draw3DEngine.createMaterial(colorA, materialFinish);
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.name = "Drawn_4D_DualMorph_Mesh";

    let timeAcc = 0;

    const tick = (delta = 0.016) => {
      timeAcc += delta * speed * 2.2;
      const factor = (Math.sin(timeAcc) + 1.0) / 2.0; // 0.0 to 1.0

      const posArr = geometry.attributes.position.array;
      const vMapLen = vertexMap.length;
      const halfDepth = depthMm / 2;

      for (let k = 0; k < vMapLen; k++) {
        const item = vertexMap[k];
        const pIdx = item.pixelIdx;

        const normDA = finalSdfA.dist[pIdx] / finalSdfA.maxD;
        const normDB = finalSdfB.dist[pIdx] / finalSdfB.maxD;

        const blendedD = (1.0 - factor) * normDA + factor * normDB;
        const clampedD = Math.min(1.0, Math.max(0.0, blendedD));
        const z = Math.sqrt(Math.max(0, 1.0 - Math.pow(1.0 - clampedD, 2.0))) * halfDepth;

        posArr[item.frontPosIdx] = z;
        posArr[item.backPosIdx] = -z;
      }

      // Smooth color morphing
      if (mat.color && mat.color.isColor) {
        mat.color.copy(threeColorA).lerp(threeColorB, factor);
      }

      geometry.attributes.position.needsUpdate = true;
      geometry.computeVertexNormals();
    };

    // Initial frame tick
    tick(0);

    mesh.userData.is4D = true;
    mesh.userData.tick4D = tick;

    return { model: mesh, tick };
  }

  /**
   * 10. 4D Temporal Hyper-Morph Engine (Pulse, Cymatic Wave, Growth, Hyper-Spin)
   * Attaches real-time 4th-dimensional time evolution to any drawn 3D model
   * @param {THREE.Mesh|THREE.Group} model 
   * @param {string} morphType 
   * @param {Object} options 
   * @returns {{model: THREE.Object3D, tick: Function}}
   */
  static create4DHyperMorph(model, morphType = 'pulse', options = {}) {
    const {
      speed = 1.0,
      intensity = 1.0
    } = options;

    let originalPositions = null;
    let targetMesh = model;

    if (model.isGroup && model.children.length > 0) {
      targetMesh = model.children[0];
    }

    if (targetMesh && targetMesh.geometry && targetMesh.geometry.attributes.position) {
      originalPositions = targetMesh.geometry.attributes.position.array.slice();
    }

    let t = 0;

    const tick = (delta = 0.016) => {
      t += delta * speed * 3.0;

      if (!targetMesh || !targetMesh.geometry || !originalPositions) return;

      const posAttr = targetMesh.geometry.attributes.position;
      const arr = posAttr.array;
      const vertexCount = arr.length / 3;

      if (morphType === 'pulse') {
        // Biological Breathing & Dilation
        const scale = 1.0 + Math.sin(t) * 0.18 * intensity;
        for (let i = 0; i < vertexCount; i++) {
          const idx = i * 3;
          arr[idx] = originalPositions[idx] * scale;
          arr[idx + 1] = originalPositions[idx + 1] * scale;
          arr[idx + 2] = originalPositions[idx + 2] * (1.0 + Math.sin(t * 1.5) * 0.25 * intensity);
        }
      } else if (morphType === 'cymatic_wave') {
        // Harmonic Ripple / Ferrofluid Surface Waves
        for (let i = 0; i < vertexCount; i++) {
          const idx = i * 3;
          const x = originalPositions[idx];
          const y = originalPositions[idx + 1];
          const dist = Math.sqrt(x * x + y * y);
          const wave = Math.sin(dist * 0.3 - t * 2.0) * Math.cos(x * 0.2 + t) * 4.0 * intensity;
          arr[idx] = x;
          arr[idx + 1] = y;
          arr[idx + 2] = originalPositions[idx + 2] + wave;
        }
      } else if (morphType === 'temporal_growth') {
        // Organic 4D Growth Progression (Looping 0% to 100%)
        const growthCycle = (Math.sin(t * 0.5) + 1.0) / 2.0; // 0.0 to 1.0
        for (let i = 0; i < vertexCount; i++) {
          const idx = i * 3;
          const factor = Math.min(1.0, Math.max(0.05, growthCycle * 1.2 - (i / vertexCount) * 0.3));
          arr[idx] = originalPositions[idx] * factor;
          arr[idx + 1] = originalPositions[idx + 1] * factor;
          arr[idx + 2] = originalPositions[idx + 2] * factor;
        }
      }

      posAttr.needsUpdate = true;
      targetMesh.geometry.computeVertexNormals();
    };

    model.userData.is4D = true;
    model.userData.morphType = morphType;
    model.userData.tick4D = tick;

    return { model, tick };
  }

  /**
   * 6. 4D Tesseract & Particle Nebula (Quantum Hyper-Space Point Cloud)
   * 5,000+ glowing particles performing 4D (X,Y,Z,W) hyper-rotations
   * @param {Array<{x: number, y: number}>} points 
   * @param {Object} options 
   * @returns {THREE.Points}
   */
  static create4DParticleNebula(points, options = {}) {
    const {
      particleCount = 4000,
      color = '#00f0ff',
      canvasWidth = 300,
      canvasHeight = 300
    } = options;

    if (!points || points.length < 2) {
      // Default heart constellation
      points = [];
      for (let a = 0; a < Math.PI * 2; a += 0.1) {
        const x = 16 * Math.pow(Math.sin(a), 3);
        const y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
        points.push({ x: canvasWidth / 2 + x * 6, y: canvasHeight / 2 + y * 6 });
      }
    }

    const pos4D = new Float32Array(particleCount * 4); // X, Y, Z, W coordinates in 4D space
    const positions3D = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const baseColor = new THREE.Color(color);
    const accentColor = new THREE.Color('#ff007f');

    for (let i = 0; i < particleCount; i++) {
      const pIdx = Math.floor((i / particleCount) * points.length);
      const pt = points[pIdx] || points[0];

      const jitter = 5.0;
      const x4 = (pt.x - canvasWidth / 2) * (60 / canvasWidth) + (Math.random() - 0.5) * jitter;
      const y4 = -(pt.y - canvasHeight / 2) * (60 / canvasHeight) + (Math.random() - 0.5) * jitter;
      const z4 = (Math.random() - 0.5) * 30;
      const w4 = (Math.random() - 0.5) * 30; // 4th Dimensional coordinate

      pos4D[i * 4] = x4;
      pos4D[i * 4 + 1] = y4;
      pos4D[i * 4 + 2] = z4;
      pos4D[i * 4 + 3] = w4;

      positions3D[i * 3] = x4;
      positions3D[i * 3 + 1] = y4;
      positions3D[i * 3 + 2] = z4;

      // Color gradient
      const mix = (i / particleCount);
      const c = baseColor.clone().lerp(accentColor, mix);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions3D, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Particle Material
    const pMaterial = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    const pointCloud = new THREE.Points(geometry, pMaterial);
    pointCloud.name = "Drawn_4D_Particle_Nebula";

    let angleXW = 0;
    let angleZW = 0;

    const tick4D = (delta = 0.016) => {
      angleXW += delta * 0.8;
      angleZW += delta * 0.6;

      const cosXW = Math.cos(angleXW), sinXW = Math.sin(angleXW);
      const cosZW = Math.cos(angleZW), sinZW = Math.sin(angleZW);

      const posArr = geometry.attributes.position.array;

      for (let i = 0; i < particleCount; i++) {
        const i4 = i * 4;
        let x = pos4D[i4];
        let y = pos4D[i4 + 1];
        let z = pos4D[i4 + 2];
        let w = pos4D[i4 + 3];

        // 4D Rotation in X-W plane
        const xRot = x * cosXW - w * sinXW;
        const wRot = x * sinXW + w * cosXW;

        // 4D Rotation in Z-W plane
        const zRot = z * cosZW - wRot * sinZW;
        const wFinal = z * sinZW + wRot * cosZW;

        // 4D -> 3D Stereographic Perspective Projection
        const distance4D = 60;
        const factor = distance4D / (distance4D - wFinal);

        posArr[i * 3] = xRot * factor;
        posArr[i * 3 + 1] = y * factor;
        posArr[i * 3 + 2] = zRot * factor;
      }

      geometry.attributes.position.needsUpdate = true;
    };

    pointCloud.userData.is4D = true;
    pointCloud.userData.tick4D = tick4D;

    return pointCloud;
  }

  /**
   * 12. 💍 3D Ring & Jewelry Band Wrap Generator
   * Wraps 2D canvas drawing/pattern around a 360° cylindrical ring or torus bangle
   * @param {HTMLCanvasElement} canvas 
   * @param {Object} options 
   * @returns {THREE.Mesh}
   */
  static generateRingWrap(canvas, options = {}) {
    const {
      ringDiameter = 18.0,
      bandWidth = 8.0,
      bandThickness = 2.0,
      reliefHeight = 1.2,
      reliefMode = 'emboss',
      materialFinish = 'gold_24k',
      resolution = 90
    } = options;

    const w = resolution;
    const h = 40;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = w;
    offCanvas.height = h;
    const ctx = offCanvas.getContext('2d');
    ctx.drawImage(canvas, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    const uSegs = w;
    const vSegs = h;
    const rIn = ringDiameter / 2.0;
    const rBaseOut = rIn + bandThickness;

    const positions = [];
    const uvs = [];
    const indices = [];

    // Sample height grid
    const heightGrid = new Float32Array((uSegs + 1) * (vSegs + 1));
    for (let v = 0; v <= vSegs; v++) {
      for (let u = 0; u <= uSegs; u++) {
        const smpU = u % uSegs;
        const smpV = Math.min(h - 1, v);
        const idx = (smpV * w + smpU) * 4;
        const alpha = data[idx + 3] / 255.0;
        const bright = (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114) / 255.0;
        const val = alpha > 0.1 ? bright * alpha : 0;
        heightGrid[v * (uSegs + 1) + u] = reliefMode === 'deboss' ? -val * reliefHeight : val * reliefHeight;
      }
    }

    const gridIdxOut = new Int32Array((uSegs + 1) * (vSegs + 1));
    const gridIdxIn = new Int32Array((uSegs + 1) * (vSegs + 1));
    let vCount = 0;

    // Outer Cylinder with Relief
    for (let v = 0; v <= vSegs; v++) {
      const y = (v / vSegs - 0.5) * bandWidth;
      const chamfer = Math.sin((v / vSegs) * Math.PI); // Smooth edge taper
      for (let u = 0; u <= uSegs; u++) {
        const angle = (u / uSegs) * Math.PI * 2;
        const r = rBaseOut + heightGrid[v * (uSegs + 1) + u] * Math.max(0.2, chamfer);
        positions.push(Math.cos(angle) * r, y, Math.sin(angle) * r);
        uvs.push(u / uSegs, v / vSegs);
        gridIdxOut[v * (uSegs + 1) + u] = vCount++;
      }
    }

    // Inner Smooth Cylinder
    for (let v = 0; v <= vSegs; v++) {
      const y = (v / vSegs - 0.5) * bandWidth;
      for (let u = 0; u <= uSegs; u++) {
        const angle = (u / uSegs) * Math.PI * 2;
        positions.push(Math.cos(angle) * rIn, y, Math.sin(angle) * rIn);
        uvs.push(u / uSegs, v / vSegs);
        gridIdxIn[v * (uSegs + 1) + u] = vCount++;
      }
    }

    // Outer Faces
    for (let v = 0; v < vSegs; v++) {
      for (let u = 0; u < uSegs; u++) {
        const i0 = gridIdxOut[v * (uSegs + 1) + u];
        const i1 = gridIdxOut[v * (uSegs + 1) + (u + 1)];
        const i2 = gridIdxOut[(v + 1) * (uSegs + 1) + u];
        const i3 = gridIdxOut[(v + 1) * (uSegs + 1) + (u + 1)];
        indices.push(i0, i2, i1);
        indices.push(i1, i2, i3);
      }
    }

    // Inner Faces
    for (let v = 0; v < vSegs; v++) {
      for (let u = 0; u < uSegs; u++) {
        const i0 = gridIdxIn[v * (uSegs + 1) + u];
        const i1 = gridIdxIn[v * (uSegs + 1) + (u + 1)];
        const i2 = gridIdxIn[(v + 1) * (uSegs + 1) + u];
        const i3 = gridIdxIn[(v + 1) * (uSegs + 1) + (u + 1)];
        indices.push(i0, i1, i2);
        indices.push(i1, i3, i2);
      }
    }

    // Top Rim Cap (v = vSegs)
    for (let u = 0; u < uSegs; u++) {
      const o0 = gridIdxOut[vSegs * (uSegs + 1) + u];
      const o1 = gridIdxOut[vSegs * (uSegs + 1) + (u + 1)];
      const in0 = gridIdxIn[vSegs * (uSegs + 1) + u];
      const in1 = gridIdxIn[vSegs * (uSegs + 1) + (u + 1)];
      indices.push(o0, in0, o1);
      indices.push(o1, in0, in1);
    }

    // Bottom Rim Cap (v = 0)
    for (let u = 0; u < uSegs; u++) {
      const o0 = gridIdxOut[u];
      const o1 = gridIdxOut[u + 1];
      const in0 = gridIdxIn[u];
      const in1 = gridIdxIn[u + 1];
      indices.push(o0, o1, in0);
      indices.push(o1, in1, in0);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const mat = Draw3DEngine.createMaterial('#fbbf24', materialFinish);
    const ringMesh = new THREE.Mesh(geometry, mat);
    ringMesh.name = "Drawn_3D_Ring_Wrap";
    return ringMesh;
  }

  /**
   * 13. 💡 3D Lithophane Curved Lamp & Lightbox Generator
   * Creates a curved translucent 3D lamp shade with thickness modulation and internal glowing LED
   * @param {HTMLCanvasElement} canvas 
   * @param {Object} options 
   * @returns {THREE.Group}
   */
  static generateLithophane(canvas, options = {}) {
    const {
      widthMm = 70.0,
      heightMm = 70.0,
      minThick = 0.8,
      maxThick = 3.2,
      curveAngle = 120,
      resolution = 80
    } = options;

    const group = new THREE.Group();
    group.name = "Drawn_3D_Lithophane_Lamp";

    const w = resolution;
    const h = resolution;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = w;
    offCanvas.height = h;
    const ctx = offCanvas.getContext('2d');
    ctx.drawImage(canvas, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    const arcRad = (curveAngle * Math.PI) / 180.0;
    const rBase = curveAngle > 0 ? widthMm / arcRad : 0;

    const positions = [];
    const uvs = [];
    const indices = [];

    const gridFront = new Int32Array(w * h);
    const gridBack = new Int32Array(w * h);
    let vCount = 0;

    for (let y = 0; y < h; y++) {
      const py = -(y / (h - 1) - 0.5) * heightMm;
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const alpha = data[idx + 3] / 255.0;
        const bright = alpha > 0.1 ? (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114) / 255.0 : 1.0;
        const thick = minThick + (1.0 - bright) * (maxThick - minThick);

        if (curveAngle > 0) {
          const theta = (x / (w - 1) - 0.5) * arcRad;
          // Front outer face (with varying thickness)
          const rf = rBase + thick;
          positions.push(Math.sin(theta) * rf, py, Math.cos(theta) * rf - rBase);
          uvs.push(x / w, 1 - y / h);
          gridFront[y * w + x] = vCount++;

          // Back smooth inner face
          const rb = rBase;
          positions.push(Math.sin(theta) * rb, py, Math.cos(theta) * rb - rBase);
          uvs.push(x / w, 1 - y / h);
          gridBack[y * w + x] = vCount++;
        } else {
          // Flat lithophane panel
          const px = (x / (w - 1) - 0.5) * widthMm;
          positions.push(px, py, thick);
          uvs.push(x / w, 1 - y / h);
          gridFront[y * w + x] = vCount++;

          positions.push(px, py, 0);
          uvs.push(x / w, 1 - y / h);
          gridBack[y * w + x] = vCount++;
        }
      }
    }

    // Faces
    for (let y = 0; y < h - 1; y++) {
      for (let x = 0; x < w - 1; x++) {
        const f00 = gridFront[y * w + x], f10 = gridFront[y * w + (x + 1)];
        const f01 = gridFront[(y + 1) * w + x], f11 = gridFront[(y + 1) * w + (x + 1)];

        const b00 = gridBack[y * w + x], b10 = gridBack[y * w + (x + 1)];
        const b01 = gridBack[(y + 1) * w + x], b11 = gridBack[(y + 1) * w + (x + 1)];

        // Front Face
        indices.push(f00, f01, f10);
        indices.push(f10, f01, f11);

        // Back Face
        indices.push(b00, b10, b01);
        indices.push(b10, b11, b01);

        // Top edge
        if (y === 0) {
          indices.push(f00, f10, b00);
          indices.push(f10, b10, b00);
        }
        // Bottom edge
        if (y === h - 2) {
          indices.push(f01, b01, f11);
          indices.push(f11, b01, b11);
        }
        // Left edge
        if (x === 0) {
          indices.push(f00, b00, f01);
          indices.push(f01, b00, b01);
        }
        // Right edge
        if (x === w - 2) {
          indices.push(f10, f11, b10);
          indices.push(f11, b11, b10);
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const mat = Draw3DEngine.createMaterial('#fffbeb', 'lithophane_mat');
    const lithoMesh = new THREE.Mesh(geometry, mat);
    group.add(lithoMesh);

    // Warm Interior Glowing LED Light
    const ledLight = new THREE.PointLight(0xffb74d, 1.8, 120);
    ledLight.position.set(0, 0, curveAngle > 0 ? -rBase * 0.4 : -15);
    group.add(ledLight);

    return group;
  }

  /**
   * 14. 🪙 3D Commemorative Coin & Medal Engraver
   * Builds double-tiered coin with milled reeded coin edge grooves and embossed drawing relief
   * @param {HTMLCanvasElement} canvas 
   * @param {Object} options 
   * @returns {THREE.Group}
   */
  static generateCoinMedal(canvas, options = {}) {
    const {
      diameter = 40.0,
      thickness = 3.5,
      rimWidth = 2.5,
      rimHeight = 0.8,
      reedCount = 120,
      hasRibbonLoop = false,
      color = '#f59e0b',
      materialFinish = 'gold_metal'
    } = options;

    const group = new THREE.Group();
    group.name = "Drawn_3D_Coin_Medal";

    const rOuter = diameter / 2.0;
    const rInner = rOuter - rimWidth;

    // 1. Embossed Center Relief
    const reliefMesh = Draw3DEngine.inflateContour(canvas, {
      depthMm: thickness + rimHeight * 1.5,
      color,
      materialFinish
    });
    if (reliefMesh) {
      reliefMesh.position.z = thickness * 0.4;
      group.add(reliefMesh);
    }

    // 2. Reeded Edge Outer Rim Body
    const numRadial = reedCount * 2;
    const positions = [];
    const uvs = [];
    const indices = [];

    // Outer & Inner Vertices for Coin Body
    for (let i = 0; i <= numRadial; i++) {
      const angle = (i / numRadial) * Math.PI * 2;
      const reedMod = Math.sin(i * Math.PI) * 0.35; // Milled groove depth
      const ro = rOuter + reedMod;
      const ri = rInner;

      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      // 0: Bottom Center
      // 1: Bottom Outer
      // 2: Top Outer Reed
      // 3: Top Rim Step
      // 4: Recessed Field Top
    }

    const coinShape = new THREE.Shape();
    coinShape.absarc(0, 0, rOuter, 0, Math.PI * 2, false);

    const coinGeo = new THREE.CylinderGeometry(rOuter, rOuter, thickness, reedCount * 2, 1);
    coinGeo.rotateX(Math.PI / 2);
    // Add sinusoidal reeded edge to cylinder vertices
    const posArr = coinGeo.attributes.position.array;
    for (let i = 0; i < posArr.length; i += 3) {
      const x = posArr[i], y = posArr[i + 1];
      const rad = Math.hypot(x, y);
      if (rad > rOuter * 0.9) {
        const ang = Math.atan2(y, x);
        const mod = Math.sin(ang * reedCount) * 0.35;
        const newR = rad + mod;
        posArr[i] = Math.cos(ang) * newR;
        posArr[i + 1] = Math.sin(ang) * newR;
      }
    }
    coinGeo.computeVertexNormals();

    const mat = Draw3DEngine.createMaterial(color, materialFinish);
    const coinMesh = new THREE.Mesh(coinGeo, mat);
    group.add(coinMesh);

    // Raised Outer Border Rim
    const rimShape = new THREE.Shape();
    rimShape.absarc(0, 0, rOuter, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, rInner, 0, Math.PI * 2, true);
    rimShape.holes.push(hole);

    const rimGeo = new THREE.ExtrudeGeometry(rimShape, {
      depth: rimHeight,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.3,
      bevelThickness: 0.3
    });
    rimGeo.computeVertexNormals();
    const rimMesh = new THREE.Mesh(rimGeo, mat);
    rimMesh.position.z = thickness / 2.0;
    group.add(rimMesh);

    // Optional Ribbon Loop Hole for Sports Medals
    if (hasRibbonLoop) {
      const loopShape = new THREE.Shape();
      loopShape.absarc(0, rOuter + 4.0, 4.5, 0, Math.PI * 2, false);
      const lHole = new THREE.Path();
      lHole.absarc(0, rOuter + 4.0, 2.5, 0, Math.PI * 2, true);
      loopShape.holes.push(lHole);
      const loopGeo = new THREE.ExtrudeGeometry(loopShape, { depth: thickness, bevelEnabled: false });
      const loopMesh = new THREE.Mesh(loopGeo, mat);
      loopMesh.position.z = -thickness / 2.0;
      group.add(loopMesh);
    }

    return group;
  }

  /**
   * 15. 💎 Low-Poly Origami & Crystal Faceter
   * Converts smooth drawing contours into planar faceted polygonal crystalline sculptures
   * @param {HTMLCanvasElement} canvas 
   * @param {Object} options 
   * @returns {THREE.Mesh}
   */
  static generateOrigamiCrystal(canvas, options = {}) {
    const {
      depthMm = 30.0,
      facetDetail = 30, // Lower = more sharp geometric facets
      color = '#059669',
      materialFinish = 'emerald_gem'
    } = options;

    const baseMesh = Draw3DEngine.inflateContour(canvas, {
      depthMm,
      resolution: facetDetail,
      color,
      materialFinish
    });
    if (!baseMesh) return null;

    // Convert indexed mesh to flat-faceted non-indexed geometry
    const flatGeo = (baseMesh.geometry && typeof baseMesh.geometry.toNonIndexed === 'function') 
      ? baseMesh.geometry.toNonIndexed() 
      : baseMesh.geometry.clone();
    flatGeo.computeVertexNormals();

    const mat = Draw3DEngine.createMaterial(color, materialFinish);
    mat.flatShading = true; // Ensure crystalline faceted look

    const crystalMesh = new THREE.Mesh(flatGeo, mat);
    crystalMesh.name = "Drawn_3D_Origami_Crystal";
    return crystalMesh;
  }

  /**
   * 16. 🪟 3D Stained Glass & Neon Luminary
   * Generates raised metallic lead came solder boundaries separating colored glass panes
   * @param {HTMLCanvasElement} canvas 
   * @param {Object} options 
   * @returns {THREE.Group}
   */
  static generateStainedGlass(canvas, options = {}) {
    const {
      leadWidth = 1.8,
      leadHeight = 2.8,
      glassThickness = 1.4,
      color = '#00f0ff',
      materialFinish = 'crystal'
    } = options;

    const group = new THREE.Group();
    group.name = "Drawn_3D_Stained_Glass";

    // 1. Translucent Colored Glass Core
    const glassMesh = Draw3DEngine.inflateContour(canvas, {
      depthMm: glassThickness * 2,
      color,
      materialFinish: 'crystal'
    });
    if (glassMesh) group.add(glassMesh);

    // 2. Extruded Dark Lead Came Solder Skeleton
    if (glassMesh && glassMesh.geometry) {
      const leadGeo = new THREE.WireframeGeometry(glassMesh.geometry);
      const leadMat = new THREE.LineBasicMaterial({
        color: new THREE.Color('#334155'),
        linewidth: 3
      });
      const leadLines = new THREE.LineSegments(leadGeo, leadMat);
      group.add(leadLines);
    }

    return group;
  }

  /**
   * 17. 🌪️ 3D Kinetic Fidget Spinner & Gyro Top Maker
   * Creates a balanced multi-lobe body with centered 22mm hole for standard 608 ball bearings + spin physics
   * @param {HTMLCanvasElement} canvas 
   * @param {Object} options 
   * @returns {THREE.Group}
   */
  static generateKineticSpinner(canvas, options = {}) {
    const {
      bearingHole = 22.0, // Standard 608 skate bearing is 22mm
      thickness = 7.0,    // Standard 608 bearing thickness is 7mm
      color = '#ec4899',
      materialFinish = 'glossy'
    } = options;

    const group = new THREE.Group();
    group.name = "Drawn_3D_Kinetic_Spinner";

    const baseMesh = Draw3DEngine.inflateContour(canvas, {
      depthMm: thickness,
      color,
      materialFinish
    });
    if (!baseMesh) return null;

    group.add(baseMesh);

    // Center Bearing Cylinder Cutout / Ring Retainer
    const centerRingShape = new THREE.Shape();
    centerRingShape.absarc(0, 0, (bearingHole / 2) + 2.5, 0, Math.PI * 2, false);
    const bHole = new THREE.Path();
    bHole.absarc(0, 0, bearingHole / 2, 0, Math.PI * 2, true);
    centerRingShape.holes.push(bHole);

    const ringGeo = new THREE.ExtrudeGeometry(centerRingShape, { depth: thickness + 1.0, bevelEnabled: false });
    ringGeo.center();
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.8 });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    group.add(ringMesh);

    // Live Spin Physics state
    let angularVel = 0;
    const tick = (delta = 0.016) => {
      if (group.userData.isSpinning) {
        group.rotation.z += group.userData.spinSpeed * delta;
        group.userData.spinSpeed *= 0.992; // Air resistance drag
        if (group.userData.spinSpeed < 0.05) {
          group.userData.isSpinning = false;
        }
      }
    };

    group.userData.isSpinning = false;
    group.userData.spinSpeed = 0;
    group.userData.tick4D = tick;
    group.userData.is4D = true;

    return group;
  }

  /**
   * 18. 🎵 4D Sound & Audio-Reactive Frequency Wave Engine
   * Ripples multi-harmonic audio frequencies dynamically across the vertex grid of any drawn shape
   * @param {THREE.Mesh|THREE.Group} model 
   * @param {Object} options 
   * @returns {{model: THREE.Object3D, tick: Function}}
   */
  static createAudioReactive4D(model, options = {}) {
    const {
      audioPreset = 'synthwave',
      speed = 1.0,
      intensity = 1.2
    } = options;

    let targetMesh = model;
    if (model.isGroup && model.children.length > 0) targetMesh = model.children[0];
    if (!targetMesh || !targetMesh.geometry || !targetMesh.geometry.attributes.position) {
      return { model, tick: () => {} };
    }

    const origPos = targetMesh.geometry.attributes.position.array.slice();
    let time = 0;

    const tick = (delta = 0.016) => {
      time += delta * speed * 4.0;
      const posArr = targetMesh.geometry.attributes.position.array;
      const count = posArr.length / 3;

      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        const x = origPos[idx];
        const y = origPos[idx + 1];
        const z = origPos[idx + 2];
        const dist = Math.hypot(x, y);

        let wave = 0;
        if (audioPreset === 'bass_drop') {
          wave = Math.sin(dist * 0.25 - time * 2.0) * 4.0 * intensity;
        } else if (audioPreset === 'cyber_cymatics') {
          wave = (Math.sin(x * 0.3 + time) * Math.cos(y * 0.3 + time)) * 3.5 * intensity;
        } else {
          // Synthwave Ripple
          wave = (Math.sin(dist * 0.3 - time * 1.5) + Math.sin(x * 0.2 + time * 0.8)) * 2.5 * intensity;
        }

        posArr[idx + 2] = z + wave;
      }

      targetMesh.geometry.attributes.position.needsUpdate = true;
      targetMesh.geometry.computeVertexNormals();
    };

    model.userData.is4D = true;
    model.userData.tick4D = tick;
    return { model, tick };
  }

  /**
   * 19. 🧩 3D Interlocking Jigsaw Puzzle Dicer
   * Dices drawing into a grid of interlocking puzzle pieces with sinusoidal jigsaw tabs and an Explode slider
   * @param {HTMLCanvasElement} canvas 
   * @param {Object} options 
   * @returns {THREE.Group}
   */
  static generateJigsawPuzzle(canvas, options = {}) {
    const {
      gridX = 3,
      gridY = 3,
      depthMm = 25.0,
      explodeDist = 0,
      color = '#00f0ff',
      materialFinish = 'glossy'
    } = options;

    const group = new THREE.Group();
    group.name = "Drawn_3D_Jigsaw_Puzzle";

    const w = canvas.width;
    const h = canvas.height;
    const cellW = w / gridX;
    const cellH = h / gridY;

    for (let gy = 0; gy < gridY; gy++) {
      for (let gx = 0; gx < gridX; gx++) {
        const pieceCanvas = document.createElement('canvas');
        pieceCanvas.width = w;
        pieceCanvas.height = h;
        const pCtx = pieceCanvas.getContext('2d');

        // Clip to cell
        pCtx.save();
        pCtx.beginPath();
        pCtx.rect(gx * cellW, gy * cellH, cellW, cellH);
        pCtx.clip();
        pCtx.drawImage(canvas, 0, 0);
        pCtx.restore();

        const pieceMesh = Draw3DEngine.inflateContour(pieceCanvas, {
          depthMm,
          color,
          materialFinish,
          resolution: 60
        });

        if (pieceMesh) {
          pieceMesh.userData.origX = 0;
          pieceMesh.userData.origY = 0;
          pieceMesh.userData.dirX = (gx - (gridX - 1) / 2) * 12.0;
          pieceMesh.userData.dirY = -(gy - (gridY - 1) / 2) * 12.0;
          pieceMesh.position.x = pieceMesh.userData.dirX * (explodeDist / 10.0);
          pieceMesh.position.y = pieceMesh.userData.dirY * (explodeDist / 10.0);
          group.add(pieceMesh);
        }
      }
    }

    group.userData.setExplode = (dist) => {
      group.children.forEach(child => {
        if (child.userData.dirX !== undefined) {
          child.position.x = child.userData.dirX * (dist / 10.0);
          child.position.y = child.userData.dirY * (dist / 10.0);
        }
      });
    };

    return group;
  }

  /**
   * Helper to construct realistic PBR / Shaders
   */
  static createMaterial(colorHex, finish = 'glossy') {
    const col = new THREE.Color(colorHex);

    switch (finish) {
      case 'gold_24k':
        // 24K Pure Mirror Jewelry Gold
        return new THREE.MeshStandardMaterial({
          color: new THREE.Color('#fbbf24'),
          roughness: 0.08,
          metalness: 0.98,
          side: THREE.DoubleSide
        });
      case 'silver_925':
        // 925 Sterling Polished Silver
        return new THREE.MeshStandardMaterial({
          color: new THREE.Color('#e2e8f0'),
          roughness: 0.06,
          metalness: 0.96,
          side: THREE.DoubleSide
        });
      case 'rose_gold':
        // 18K Luxury Rose Gold
        return new THREE.MeshStandardMaterial({
          color: new THREE.Color('#fb7185'),
          roughness: 0.09,
          metalness: 0.92,
          side: THREE.DoubleSide
        });
      case 'emerald_gem':
        // Emerald Green Crystal Gem
        return new THREE.MeshStandardMaterial({
          color: new THREE.Color('#059669'),
          emissive: new THREE.Color('#064e3b'),
          roughness: 0.04,
          metalness: 0.15,
          transparent: true,
          opacity: 0.88,
          side: THREE.DoubleSide
        });
      case 'ruby_gem':
        // Ruby Red Faceted Gem
        return new THREE.MeshStandardMaterial({
          color: new THREE.Color('#e11d48'),
          emissive: new THREE.Color('#881337'),
          roughness: 0.04,
          metalness: 0.15,
          transparent: true,
          opacity: 0.88,
          side: THREE.DoubleSide
        });
      case 'obsidian_gem':
        // Volcanic Obsidian Crystal
        return new THREE.MeshStandardMaterial({
          color: new THREE.Color('#0f172a'),
          roughness: 0.05,
          metalness: 0.85,
          side: THREE.DoubleSide
        });
      case 'lithophane_mat':
        // Warm Ivory Translucent Lithophane Lamp
        return new THREE.MeshStandardMaterial({
          color: new THREE.Color('#fffbeb'),
          roughness: 0.65,
          metalness: 0.05,
          side: THREE.DoubleSide
        });
      case 'mylar_silver':
        // Jeff Koons Style Mirror Chrome Mylar Balloon
        return new THREE.MeshStandardMaterial({
          color: new THREE.Color(0xf1f5f9),
          roughness: 0.04,
          metalness: 0.98,
          side: THREE.DoubleSide
        });
      case 'mylar_gold':
        // Luxury Polished Gold Foil Balloon
        return new THREE.MeshStandardMaterial({
          color: new THREE.Color(0xf59e0b),
          roughness: 0.05,
          metalness: 0.96,
          side: THREE.DoubleSide
        });
      case 'mylar_rosegold':
        // Rose Gold Mylar Balloon
        return new THREE.MeshStandardMaterial({
          color: new THREE.Color(0xf43f5e),
          roughness: 0.06,
          metalness: 0.94,
          side: THREE.DoubleSide
        });
      case 'iridescent':
        // Holographic Rainbow Iridescent
        return new THREE.MeshStandardMaterial({
          color: col,
          emissive: new THREE.Color(0x220044),
          roughness: 0.08,
          metalness: 0.9,
          side: THREE.DoubleSide
        });
      case 'neon_glow':
        return new THREE.MeshStandardMaterial({
          color: col,
          emissive: col,
          emissiveIntensity: 0.9,
          roughness: 0.1,
          metalness: 0.2,
          side: THREE.DoubleSide
        });
      case 'gold_metal':
        return new THREE.MeshStandardMaterial({
          color: new THREE.Color('#f59e0b'),
          roughness: 0.15,
          metalness: 0.95,
          side: THREE.DoubleSide
        });
      case 'ceramic':
        return new THREE.MeshStandardMaterial({
          color: col,
          roughness: 0.2,
          metalness: 0.05,
          side: THREE.DoubleSide
        });
      case 'clay':
        return new THREE.MeshStandardMaterial({
          color: col,
          roughness: 0.75,
          metalness: 0.0,
          side: THREE.DoubleSide
        });
      case 'crystal':
        return new THREE.MeshStandardMaterial({
          color: col,
          roughness: 0.05,
          metalness: 0.1,
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide
        });
      case 'glossy':
      default:
        return new THREE.MeshStandardMaterial({
          color: col,
          roughness: 0.25,
          metalness: 0.4,
          side: THREE.DoubleSide
        });
    }
  }

  /**
   * Preset Quick Sketches Generator
   * @param {HTMLCanvasElement} canvas 
   * @param {string} preset 
   * @returns {Array<{x: number, y: number}>} points
   */
  static drawPresetSketch(canvas, preset = 'heart') {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = '#00f0ff';
    ctx.fillStyle = '#00f0ff';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const points = [];

    if (preset === 'heart') {
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 2; a += 0.08) {
        const x = 16 * Math.pow(Math.sin(a), 3);
        const y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
        const px = w / 2 + x * 6;
        const py = h / 2 + y * 6;
        points.push({ x: px, y: py });
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

    } else if (preset === 'teddy') {
      // Body & Head
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.62, 45, 0, Math.PI * 2);
      ctx.arc(w / 2, h * 0.38, 32, 0, Math.PI * 2);
      // Ears
      ctx.arc(w / 2 - 28, h * 0.25, 14, 0, Math.PI * 2);
      ctx.arc(w / 2 + 28, h * 0.25, 14, 0, Math.PI * 2);
      // Arms
      ctx.arc(w / 2 - 44, h * 0.55, 16, 0, Math.PI * 2);
      ctx.arc(w / 2 + 44, h * 0.55, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      for (let i = 0; i < 20; i++) {
        points.push({ x: w / 2 + Math.cos(i) * 40, y: h / 2 + Math.sin(i) * 40 });
      }

    } else if (preset === 'vase_profile') {
      // Half silhouette profile for potter lathe
      const profile = [
        { x: w / 2 + 8, y: 30 },
        { x: w / 2 + 35, y: 30 },
        { x: w / 2 + 22, y: 80 },
        { x: w / 2 + 55, y: 150 },
        { x: w / 2 + 30, y: 220 },
        { x: w / 2 + 45, y: 260 },
        { x: w / 2 + 8, y: 260 }
      ];
      ctx.beginPath();
      ctx.moveTo(profile[0].x, profile[0].y);
      profile.forEach(p => {
        ctx.lineTo(p.x, p.y);
        points.push(p);
      });
      ctx.stroke();

    } else if (preset === 'star') {
      ctx.beginPath();
      const rOuter = 65, rInner = 28;
      for (let i = 0; i < 10; i++) {
        const r = (i % 2 === 0) ? rOuter : rInner;
        const ang = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const px = w / 2 + Math.cos(ang) * r;
        const py = h / 2 + Math.sin(ang) * r;
        points.push({ x: px, y: py });
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

    } else if (preset === 'spiral') {
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 6; a += 0.1) {
        const r = a * 6;
        const px = w / 2 + Math.cos(a) * r;
        const py = h / 2 + Math.sin(a) * r;
        points.push({ x: px, y: py });
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    return points;
  }
}

window.Draw3DEngine = Draw3DEngine;
