// STUDIOS-PRO Scripting Live Prototype Engine
let scene, camera, renderer, controls;
let currentMeshGroup = new THREE.Group();
let currentLang = 'en';

// --- PREMIUM STATUS HANDSHAKE & BACK BUTTON ---
const channel = new BroadcastChannel('studios_pro_channel');
let isPremiumUser = new URLSearchParams(window.location.search).get('premium') === 'true';
let collabRoomId = new URLSearchParams(window.location.search).get('room') || null;

// Request fresh user status from host site
channel.postMessage({ type: 'GET_USER_STATUS' });

channel.onmessage = (e) => {
  if (e.data.type === 'USER_STATUS_RESPONSE' || e.data.type === 'EXPORT_ALLOWED') {
    isPremiumUser = !!(e.data.payload && e.data.payload.isPremium);
    updatePremiumUI();
    if (e.data.payload && e.data.payload.userEmail) {
      collabUser.name = e.data.payload.userEmail.split('@')[0] || collabUser.name;
    }
  }
};

// Back & Collab button handlers
document.addEventListener('DOMContentLoaded', () => {
  const backBtn = document.getElementById('back-btn');
  if (backBtn) {
    backBtn.onclick = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      channel.postMessage({ type: 'CLOSE_STUDIO' });
      window.parent.postMessage({ type: 'CLOSE_STUDIO' }, '*');
    };
  }

  const collabBtn = document.getElementById('btn-collab-start');
  if (collabBtn) {
    collabBtn.onclick = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      
      if (!isPremiumUser) {
        checkPremiumAction('share');
        return;
      }
      
      // Generate a new room ID
      const newRoomId = 'room_' + Math.random().toString(36).substring(2, 9);
      collabRoomId = newRoomId;
      window.parent.postMessage({ type: 'CREATE_COLLAB_ROOM', payload: { roomId: newRoomId } }, '*');
      
      // Copy invitation link to clipboard
      const inviteUrl = `${window.location.origin}/?ref=scripting&room=${newRoomId}`;
      navigator.clipboard.writeText(inviteUrl).then(() => {
        showToast(currentLang === 'en' ? '🔗 Collab link copied to clipboard!' : '🔗 Lien de collab copié !');
      }).catch(err => {
        console.error('Copy collab link error:', err);
        window.prompt('Collab URL:', inviteUrl);
      });
      
      // Force trigger local Join event to enter room state
      setTimeout(() => {
        collabChannel.postMessage({
          type: 'USER_JOIN',
          user: collabUser
        });
      }, 500);
      
      updateCollabUI();
    };
  }
  
  // Initialize UI lockouts
  updatePremiumUI();
  setupCopyPrevention();
});

function updatePremiumUI() {
  const premiumButtons = ['btn-exp-obj', 'btn-exp-stl', 'btn-exp-html', 'btn-share', 'btn-collab-start'];
  premiumButtons.forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (btn) {
      if (isPremiumUser) {
        btn.classList.remove('locked-feature');
      } else {
        btn.classList.add('locked-feature');
      }
    }
  });
}

function checkPremiumAction(actionName, callback) {
  if (isPremiumUser) {
    if (callback) callback();
    return true;
  }
  
  let msg = "";
  if (currentLang === 'fr') {
    if (actionName === 'copy') msg = "La copie du code est réservée aux membres Premium !";
    else if (actionName === 'export') msg = "L'exportation de modèles est réservée aux membres Premium !";
    else if (actionName === 'share') msg = "Le partage de projets est réservé aux membres Premium !";
  } else if (currentLang === 'ro') {
    if (actionName === 'copy') msg = "Copierea codului este un feature Premium! Abonează-te pentru acces.";
    else if (actionName === 'export') msg = "Exportarea modelelor este o funcționalitate Premium! Abonează-te.";
    else if (actionName === 'share') msg = "Partajarea proiectelor este o funcționalitate Premium! Abonează-te.";
  } else {
    if (actionName === 'copy') msg = "Copying code is a Premium feature! Subscribe to unlock.";
    else if (actionName === 'export') msg = "Exporting models is a Premium feature! Subscribe to unlock.";
    else if (actionName === 'share') msg = "Sharing projects is a Premium feature! Subscribe to unlock.";
  }
  
  showToast(msg);
  // Post trigger checkout flow
  channel.postMessage({ type: 'TRIGGER_PAYMENT_MODAL', payload: { forcePremium: true, ref: 'scripting-live' } });
  return false;
}

function setupCopyPrevention() {
  const preventCopyIfFree = (e) => {
    if (!isPremiumUser) {
      e.preventDefault();
      checkPremiumAction('copy');
    }
  };

  const editorTextarea = document.getElementById('code-editor');
  if (editorTextarea) {
    editorTextarea.addEventListener('copy', preventCopyIfFree);
    editorTextarea.addEventListener('cut', preventCopyIfFree);
    editorTextarea.addEventListener('contextmenu', (e) => {
      if (!isPremiumUser) {
        e.preventDefault();
        let msg = currentLang === 'fr' 
          ? "Le clic droit est désactivé pour les utilisateurs gratuits."
          : (currentLang === 'ro' ? "Meniul contextual este dezactivat pentru utilizatorii gratuiti." : "Context menu is disabled for free users.");
        showToast(msg);
      }
    });
    
    editorTextarea.addEventListener('keydown', (e) => {
      if (!isPremiumUser && (e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'x' || e.key === 'C' || e.key === 'X')) {
        e.preventDefault();
        checkPremiumAction('copy');
      }
    });
  }
}

// API data container
const geometryData = {
  vertices: [],
  edges: [],
  faces: [],
  particles: [],
  spheres: [],
  cubes: [],
  cylinders: [],
  toruses: [],
  cones: [],
  planes: [],
  logEntries: []
};

// Track dynamic sliders/controls defined by user scripts
const dynamicControlsData = {
  values: {},
  registered: []
};

// Parse Three.js Geometry to vertices/faces
function addThreeGeometryToData(geom) {
  const positionAttr = geom.attributes.position;
  const indexAttr = geom.index;
  const startIdx = geometryData.vertices.length;
  
  for (let i = 0; i < positionAttr.count; i++) {
    geometryData.vertices.push(new THREE.Vector3(
      positionAttr.getX(i),
      positionAttr.getY(i),
      positionAttr.getZ(i)
    ));
  }
  
  if (indexAttr) {
    for (let i = 0; i < indexAttr.count; i += 3) {
      geometryData.faces.push([
        startIdx + indexAttr.getX(i),
        startIdx + indexAttr.getX(i + 1),
        startIdx + indexAttr.getX(i + 2)
      ]);
    }
  } else {
    for (let i = 0; i < positionAttr.count; i += 3) {
      geometryData.faces.push([
        startIdx + i,
        startIdx + i + 1,
        startIdx + i + 2
      ]);
    }
  }
}

// Physics Simulation Engine (Cannon.js wrapper)
const physicsEngine = {
  world: null,
  bodies: [],
  reset: function() {
    this.world = null;
    this.bodies = [];
  },
  init: function(gx = 0, gy = -9.82, gz = 0) {
    if (typeof CANNON === 'undefined') {
      logToConsole("Error: Cannon.js physics library not loaded yet.", "error");
      return;
    }
    this.world = new CANNON.World();
    this.world.gravity.set(gx, gy, gz);
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 10;
    this.bodies = [];
  },
  addFloor: function() {
    if (!this.world) return;
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    // position at y=-10 to match grid helper
    groundBody.position.set(0, -10, 0);
    this.world.addBody(groundBody);
    this.bodies.push({ id: 'floor', body: groundBody, type: 'floor' });
  },
  addSphere: function(x, y, z, radius, mass) {
    if (!this.world) return;
    const shape = new CANNON.Sphere(radius);
    const body = new CANNON.Body({
      mass: mass,
      shape: shape,
      position: new CANNON.Vec3(x, y, z)
    });
    this.world.addBody(body);
    const id = 'sphere_' + this.bodies.length;
    this.bodies.push({ id: id, body: body, type: 'sphere', radius: radius });
    return id;
  },
  addBox: function(x, y, z, size, mass) {
    if (!this.world) return;
    const shape = new CANNON.Box(new CANNON.Vec3(size/2, size/2, size/2));
    const body = new CANNON.Body({
      mass: mass,
      shape: shape,
      position: new CANNON.Vec3(x, y, z)
    });
    this.world.addBody(body);
    const id = 'box_' + this.bodies.length;
    this.bodies.push({ id: id, body: body, type: 'box', size: size });
    return id;
  },
  step: function(dt = 1/60) {
    if (!this.world) return;
    this.world.step(dt);
  },
  getBodiesState: function() {
    return this.bodies.map(b => ({
      id: b.id,
      type: b.type,
      radius: b.radius,
      size: b.size,
      position: { x: b.body.position.x, y: b.body.position.y, z: b.body.position.z },
      quaternion: { x: b.body.quaternion.x, y: b.body.quaternion.y, z: b.body.quaternion.z, w: b.body.quaternion.w }
    }));
  }
};

function updateAudioVisualizerCanvas() {
  const canvas = document.getElementById('audio-spec-canvas');
  if (!canvas) return;
  
  if (!audioEngine.active) {
    canvas.style.display = 'none';
    return;
  }
  
  canvas.style.display = 'block';
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  
  const audio = audioEngine.getData();
  const barWidth = width / 32;
  
  for (let i = 0; i < 32; i++) {
    const val = audio.frequencies[i] || 0;
    const barHeight = (val / 255) * height;
    
    const hue = (i / 32) * 360;
    ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
    ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
  }
  
  requestAnimationFrame(updateAudioVisualizerCanvas);
}

// Sound-Reactive Audio Engine (Web Audio Analyser)
const audioEngine = {
  audioContext: null,
  analyser: null,
  microphone: null,
  dataArray: null,
  active: false,
  stream: null,
  init: function() {
    if (this.active) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64; // 32 frequency bins
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          this.stream = stream;
          this.microphone = this.audioContext.createMediaStreamSource(stream);
          this.microphone.connect(this.analyser);
          this.active = true;
          logToConsole("Audio input connected (microphone).", "success");
          updateAudioVisualizerCanvas();
        })
        .catch(err => {
          console.error("Microphone access denied:", err);
          logToConsole("Audio access denied or unavailable: " + err.message, "error");
        });
    } catch(err) {
      console.error("Web Audio API error:", err);
      logToConsole("Web Audio API not supported in this browser.", "error");
    }
  },
  getData: function() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    if (!this.active || !this.analyser) {
      return { volume: 0, frequencies: new Array(32).fill(0), getFrequency: () => 0 };
    }
    this.analyser.getByteFrequencyData(this.dataArray);
    let sum = 0;
    const frequencies = [];
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
      frequencies.push(this.dataArray[i]);
    }
    const volume = sum / (this.dataArray.length * 255);
    return {
      volume: volume,
      frequencies: frequencies,
      getFrequency: (idx) => frequencies[idx] || 0
    };
  },
  stop: function() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.active = false;
    if (this.microphone) {
      try { this.microphone.disconnect(); } catch(e) {}
      this.microphone = null;
    }
    const canvas = document.getElementById('audio-spec-canvas');
    if (canvas) canvas.style.display = 'none';
  }
};

// Webcam Pixel Mapping Engine
const cameraEngine = {
  video: null,
  canvas: null,
  ctx: null,
  active: false,
  stream: null,
  init: function() {
    if (this.active) return;
    this.video = document.createElement('video');
    this.video.autoplay = true;
    this.video.playsInline = true;
    
    this.canvas = document.createElement('canvas');
    this.canvas.width = 64;  // low-res for high performance
    this.canvas.height = 48;
    this.ctx = this.canvas.getContext('2d');
    
    navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } })
      .then(stream => {
        this.stream = stream;
        this.video.srcObject = stream;
        this.active = true;
        logToConsole("Webcam input connected.", "success");
      })
      .catch(err => {
        console.error("Camera access denied:", err);
        logToConsole("Camera access denied or unavailable: " + err.message, "error");
      });
  },
  getData: function() {
    if (!this.active || !this.video || this.video.readyState < 2) {
      return null;
    }
    this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
    const imgData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imgData.data;
    return {
      width: this.canvas.width,
      height: this.canvas.height,
      getPixel: (x, y) => {
        if (x < 0 || x >= this.canvas.width || y < 0 || y >= this.canvas.height) {
          return { r: 0, g: 0, b: 0, brightness: 0, color: '#000000' };
        }
        const idx = (y * this.canvas.width + x) * 4;
        const r = data[idx];
        const g = data[idx+1];
        const b = data[idx+2];
        const brightness = (r + g + b) / 3;
        const color = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        return { r, g, b, brightness, color };
      }
    };
  },
  stop: function() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.active = false;
    if (this.video) {
      this.video.srcObject = null;
    }
  }
};

const keysPressed = {};
window.addEventListener('keydown', (e) => { keysPressed[e.key] = true; });
window.addEventListener('keyup', (e) => { keysPressed[e.key] = false; });

let mouseState = { x: 0, y: 0, isDown: false };

// Expose API to sandbox
const scriptingAPI = {
  time: 0,
  frame: 0,
  physicsActive: false,
  keys: keysPressed,
  mouse: mouseState,
  
  // Custom interactive controllers
  addSlider: (name, defaultValue, min, max, step) => {
    if (!dynamicControlsData.registered.some(c => c.name === name && c.type === 'slider')) {
      dynamicControlsData.registered.push({
        type: 'slider',
        name: name,
        default: defaultValue,
        min: min !== undefined ? min : 0,
        max: max !== undefined ? max : 100,
        step: step !== undefined ? step : 1
      });
    }
    return dynamicControlsData.values[name] !== undefined ? dynamicControlsData.values[name] : defaultValue;
  },
  
  addColorPicker: (name, defaultHex) => {
    if (!dynamicControlsData.registered.some(c => c.name === name && c.type === 'color')) {
      dynamicControlsData.registered.push({
        type: 'color',
        name: name,
        default: defaultHex || '#38bdf8'
      });
    }
    return dynamicControlsData.values[name] !== undefined ? dynamicControlsData.values[name] : (defaultHex || '#38bdf8');
  },

  addVertex: (x, y, z) => {
    geometryData.vertices.push(new THREE.Vector3(x, y, z));
    return geometryData.vertices.length - 1;
  },
  addEdge: (i, j) => {
    geometryData.edges.push([i, j]);
  },
  addFace: (i, j, k) => {
    geometryData.faces.push([i, j, k]);
  },
  addParticle: (x, y, z, size, color) => {
    geometryData.particles.push({
      position: new THREE.Vector3(x, y, z),
      size: size || 0.2,
      color: color || document.getElementById('modelColor').value
    });
  },
  addSphere: (x, y, z, radius, colorOrOptions) => {
    geometryData.spheres.push({
      position: new THREE.Vector3(x, y, z),
      radius: radius || 0.5,
      materialOptions: colorOrOptions
    });
  },
  addCube: (x, y, z, size, colorOrOptions) => {
    geometryData.cubes.push({
      position: new THREE.Vector3(x, y, z),
      size: size || 1.0,
      materialOptions: colorOrOptions
    });
  },
  addCylinder: (x, y, z, radiusTop, radiusBottom, height, colorOrOptions) => {
    geometryData.cylinders.push({
      position: new THREE.Vector3(x, y, z),
      radiusTop: radiusTop !== undefined ? radiusTop : 0.5,
      radiusBottom: radiusBottom !== undefined ? radiusBottom : 0.5,
      height: height !== undefined ? height : 1.5,
      materialOptions: colorOrOptions
    });
  },
  addTorus: (x, y, z, radius, tubeRadius, radialSegments, tubularSegments, colorOrOptions) => {
    geometryData.toruses.push({
      position: new THREE.Vector3(x, y, z),
      radius: radius !== undefined ? radius : 1.0,
      tubeRadius: tubeRadius !== undefined ? tubeRadius : 0.3,
      radialSegments: radialSegments !== undefined ? radialSegments : 16,
      tubularSegments: tubularSegments !== undefined ? tubularSegments : 32,
      materialOptions: colorOrOptions
    });
  },
  addCone: (x, y, z, radius, height, colorOrOptions) => {
    geometryData.cones.push({
      position: new THREE.Vector3(x, y, z),
      radius: radius !== undefined ? radius : 0.5,
      height: height !== undefined ? height : 1.0,
      materialOptions: colorOrOptions
    });
  },
  addPlane: (x, y, z, width, height, colorOrOptions) => {
    geometryData.planes.push({
      position: new THREE.Vector3(x, y, z),
      width: width !== undefined ? width : 2.0,
      height: height !== undefined ? height : 2.0,
      materialOptions: colorOrOptions
    });
  },
  addLathe: (points, segments) => {
    if (!points || points.length === 0) return;
    const threePoints = points.map(p => {
      if (Array.isArray(p)) return new THREE.Vector2(p[0], p[1]);
      return new THREE.Vector2(p.x, p.y);
    });
    const latheGeom = new THREE.LatheGeometry(threePoints, segments || 32);
    addThreeGeometryToData(latheGeom);
    latheGeom.dispose();
  },
  addExtrude: (points, depth, bevelEnabled) => {
    if (!points || points.length === 0) return;
    const shape = new THREE.Shape();
    const p0 = points[0];
    const p0x = Array.isArray(p0) ? p0[0] : p0.x;
    const p0y = Array.isArray(p0) ? p0[1] : p0.y;
    shape.moveTo(p0x, p0y);
    for (let i = 1; i < points.length; i++) {
      const pi = points[i];
      const pix = Array.isArray(pi) ? pi[0] : pi.x;
      const piy = Array.isArray(pi) ? pi[1] : pi.y;
      shape.lineTo(pix, piy);
    }
    const extrudeSettings = {
      depth: depth !== undefined ? depth : 2.0,
      bevelEnabled: bevelEnabled !== undefined ? bevelEnabled : true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.1,
      bevelThickness: 0.1
    };
    const extrudeGeom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    addThreeGeometryToData(extrudeGeom);
    extrudeGeom.dispose();
  },
  log: (msg) => {
    logToConsole(msg, 'info');
  },
  clear: () => {
    geometryData.vertices = [];
    geometryData.edges = [];
    geometryData.faces = [];
    geometryData.particles = [];
    geometryData.spheres = [];
    geometryData.cubes = [];
    geometryData.cylinders = [];
    geometryData.toruses = [];
    geometryData.cones = [];
    geometryData.planes = [];
  },
  // Webcam Generative Point-Cloud APIs
  initCamera: () => {
    if (cameraRequested) return;
    cameraRequested = true;
    cameraEngine.init();
  },
  getCameraData: () => {
    return cameraEngine.getData();
  },
  // Audio Scripting Analyser APIs
  initAudio: () => {
    if (audioRequested) return;
    audioRequested = true;
    audioEngine.init();
  },
  getAudioData: () => {
    return audioEngine.getData();
  },
  // Cannon.js Physics APIs
  initPhysics: (gx, gy, gz) => {
    physicsEngine.init(gx, gy, gz);
    scriptingAPI.physicsActive = true;
  },
  addPhysicalFloor: () => {
    physicsEngine.addFloor();
  },
  addPhysicalSphere: (x, y, z, radius, mass) => {
    return physicsEngine.addSphere(x, y, z, radius, mass);
  },
  addPhysicalBox: (x, y, z, size, mass) => {
    return physicsEngine.addBox(x, y, z, size, mass);
  },
  stepPhysics: (dt) => {
    physicsEngine.step(dt);
  },
  getPhysicalBodies: () => {
    return physicsEngine.getBodiesState();
  }
};

// Preset script templates in English
const templatesEn = {
  spiroHelix: `// Template 1: Parametric Spiro-Helix
api.clear();
api.log("Generating Spiro-Helix...");

const steps = 600;
const radius = 6;
const tubeRadius = 2;
const speed = 15;

for (let i = 0; i < steps; i++) {
    const t = i / steps * Math.PI * 2 * 8; // 8 rotations
    
    // Main helix coordinates
    const mx = Math.cos(t) * radius;
    const my = t * 0.4 - 8;
    const mz = Math.sin(t) * radius;
    
    // Spiro secondary coordinates
    const sx = mx + Math.cos(t * speed) * tubeRadius;
    const sy = my + Math.sin(t * speed * 0.5) * tubeRadius * 0.5;
    const sz = mz + Math.sin(t * speed) * tubeRadius;
    
    const idx = api.addVertex(sx, sy, sz);
    
    if (i > 0) {
        api.addEdge(idx - 1, idx);
    }
}
api.log("Successfully generated " + steps + " vertices.");`,

  torusKnot: `// Template 2: Torus Knot
api.clear();
api.log("Generating Torus Knot...");

const p = 3; // Rotations around coplanar axis
const q = 7; // Rotations around center axis
const steps = 1000;
const r1 = 8;
const r2 = 3;

for (let i = 0; i < steps; i++) {
    const phi = (i / steps) * Math.PI * 2 * p;
    
    const r = r1 + r2 * Math.cos((q / p) * phi);
    const x = r * Math.cos(phi);
    const y = r * Math.sin(phi);
    const z = r2 * Math.sin((q / p) * phi);
    
    api.addVertex(x, y, z);
    if (i > 0) {
        api.addEdge(i - 1, i);
    }
}
// Connect loop back
api.addEdge(steps - 1, 0);
api.log("Torus knot generated.");`,

  parametricVase: `// Template 3: Parametric Vase Surface
api.clear();
api.log("Generating Parametric Vase Mesh...");

const segments = 40;
const rings = 40;
const height = 15;

for (let r = 0; r <= rings; r++) {
    const y = (r / rings) * height - (height / 2);
    const progress = r / rings;
    
    // Radius changes dynamically based on height sine wave
    const baseRadius = 4 + Math.sin(progress * Math.PI * 3.5) * 1.8;
    
    for (let s = 0; s < segments; s++) {
        const theta = (s / segments) * Math.PI * 2;
        const twist = progress * 1.5;
        const x = Math.cos(theta + twist) * baseRadius;
        const z = Math.sin(theta + twist) * baseRadius;
        
        api.addVertex(x, y, z);
    }
}

for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segments; s++) {
        const nextS = (s + 1) % segments;
        const i0 = r * segments + s;
        const i1 = r * segments + nextS;
        const i2 = (r + 1) * segments + s;
        const i3 = (r + 1) * segments + nextS;
        
        api.addFace(i0, i1, i2);
        api.addFace(i1, i3, i2);
    }
}
api.log("Vase Mesh generated: " + (rings * segments * 2) + " faces.");`,

  hyperHelix: `// Template 4: 4D Hyper-Helix Projection
api.clear();
api.log("Generating 4D Hyper-Helix...");

const steps = 800;
const R = 6;
const r = 3.5;
const wSpeed = 3;
const wAngle = Math.PI / 4; 

for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2 * 6;
    
    const x4 = Math.cos(t) * R;
    const y4 = Math.sin(t) * R;
    const z4 = Math.cos(t * wSpeed) * r;
    const w4 = Math.sin(t * wSpeed) * r;
    
    const rotY = y4 * Math.cos(wAngle) - w4 * Math.sin(wAngle);
    const rotW = y4 * Math.sin(wAngle) + w4 * Math.cos(wAngle);
    
    const dist = 10;
    const factor = dist / (dist - rotW);
    
    const x3 = x4 * factor;
    const y3 = rotY * factor;
    const z3 = z4 * factor;
    
    api.addVertex(x3, y3, z3);
    if (i > 0) {
        api.addEdge(i - 1, i);
    }
}
api.log("4D Helix generated.");`,

  lorenzAttractor: `// Template 5: Lorenz Attractor (Chaos Theory)
api.clear();
api.log("Generating Lorenz Attractor...");

const sigma = 10;
const rho = 28;
const beta = 2.66;
const dt = 0.01;
const steps = 2000;

let x = 0.1;
let y = 0;
let z = 0;

for (let i = 0; i < steps; i++) {
    const dx = sigma * (y - x) * dt;
    const dy = (x * (rho - z) - y) * dt;
    const dz = (x * y - beta * z) * dt;
    
    x += dx;
    y += dy;
    z += dz;
    
    // Center geometry around z-axis for camera view
    const idx = api.addVertex(x, y, z - 25);
    
    if (i > 0) {
        api.addEdge(idx - 1, idx);
    }
}
api.log("Lorenz Attractor generated with " + steps + " points.");`,

  lSystemTree: `// Template 6: Recursive L-System Fractal Tree
api.clear();
api.log("Generating 3D L-System Tree...");

const depth = 5;
const angle = 25;
const scale = 0.75;

const rad = angle * Math.PI / 180;

function createBranch(x1, y1, z1, length, theta, phi, currentDepth) {
    if (currentDepth <= 0) return;
    
    const x2 = x1 + length * Math.sin(theta) * Math.cos(phi);
    const y2 = y1 + length * Math.cos(theta);
    const z2 = z1 + length * Math.sin(theta) * Math.sin(phi);
    
    const i1 = api.addVertex(x1, y1, z1);
    const i2 = api.addVertex(x2, y2, z2);
    api.addEdge(i1, i2);
    
    const nextLen = length * scale;
    
    // Recursive branching in 3D directions
    createBranch(x2, y2, z2, nextLen, theta + rad, phi, currentDepth - 1);
    createBranch(x2, y2, z2, nextLen, theta - rad, phi + Math.PI * 0.66, currentDepth - 1);
    createBranch(x2, y2, z2, nextLen, theta - rad, phi - Math.PI * 0.66, currentDepth - 1);
}

// Start growth upwards from the base
createBranch(0, -8, 0, 6, 0, 0, depth);
api.log("L-System fractal tree rendered.");`,

  mobiusStrip: `// Template 7: Möbius Strip Surface (Non-orientable)
api.clear();
api.log("Generating Möbius Strip...");

const radius = 6;
const width = 2.5;
const stepsU = 100;
const stepsV = 10;

for (let j = 0; j <= stepsV; j++) {
    const v = -width / 2 + (j / stepsV) * width;
    
    for (let i = 0; i <= stepsU; i++) {
        const u = (i / stepsU) * Math.PI * 2;
        
        const x = (radius + v * Math.cos(u / 2)) * Math.cos(u);
        const y = (radius + v * Math.cos(u / 2)) * Math.sin(u);
        const z = v * Math.sin(u / 2);
        
        api.addVertex(x, y, z);
    }
}

for (let j = 0; j < stepsV; j++) {
    for (let i = 0; i < stepsU; i++) {
        const i0 = j * (stepsU + 1) + i;
        const i1 = j * (stepsU + 1) + i + 1;
        const i2 = (j + 1) * (stepsU + 1) + i;
        const i3 = (j + 1) * (stepsU + 1) + i + 1;
        
        api.addFace(i0, i1, i2);
        api.addFace(i1, i3, i2);
    }
}
api.log("Möbius Strip generated successfully.");`,

  kleinBottle: `// Template 8: Klein Bottle Surface (Figure-8 Immersion)
api.clear();
api.log("Generating Figure-8 Klein Bottle...");

const scale = 4;
const stepsU = 60;
const stepsV = 60;
const R = 2.5;

for (let j = 0; j <= stepsV; j++) {
    const v = (j / stepsV) * Math.PI * 2;
    
    for (let i = 0; i <= stepsU; i++) {
        const u = (i / stepsU) * Math.PI * 2;
        
        const cosU = Math.cos(u);
        const sinU = Math.sin(u);
        const cosU2 = Math.cos(u / 2);
        const sinU2 = Math.sin(u / 2);
        const sinV = Math.sin(v);
        const sin2v = Math.sin(2 * v);
        
        const rFactor = R + cosU2 * sinV - sinU2 * sin2v;
        const x = cosU * rFactor * scale;
        const y = sinU * rFactor * scale;
        const z = (sinU2 * sinV + cosU2 * sin2v) * scale;
        
        api.addVertex(x, y, z);
    }
}

for (let j = 0; j < stepsV; j++) {
    for (let i = 0; i < stepsU; i++) {
        const i0 = j * (stepsU + 1) + i;
        const i1 = j * (stepsU + 1) + i + 1;
        const i2 = (j + 1) * (stepsU + 1) + i;
        const i3 = (j + 1) * (stepsU + 1) + i + 1;
        
        api.addFace(i0, i1, i2);
        api.addFace(i1, i3, i2);
    }
}
api.log("Klein Bottle generated successfully.");`,

  particleVortex: `// Template 9: Particle System Vortex
api.clear();
api.log("Generating Particle Vortex...");

const count = 600;
const spirals = 3;

// Add a central core sphere
api.addSphere(0, 0, 0, 1.5, "#eab308");

for (let i = 0; i < count; i++) {
    const t = i / count;
    const angle = t * Math.PI * 2 * spirals;
    const r = t * 12 + 1.5;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const y = (Math.random() - 0.5) * 2 * (1 - t) * 4;
    
    // Color transition from warm orange to cool cyan
    const rCol = Math.floor(244 * (1 - t) + 6 * t);
    const gCol = Math.floor(63 * (1 - t) + 182 * t);
    const bCol = Math.floor(94 * (1 - t) + 212 * t);
    const colorHex = "#" + ((1 << 24) + (rCol << 16) + (gCol << 8) + bCol).toString(16).slice(1);
    
    api.addParticle(x, y, z, 0.4, colorHex);
    
    // Add small cubes orbiting
    if (i % 80 === 0 && i > 0) {
        api.addCube(x, y + 0.5, z, 0.8, "#ec4899");
    }
}
api.log("Procedural Particle Vortex generated: " + count + " particles.");`,

  webcamSelfie: `// Template 10: 3D Webcam Point-Cloud
api.clear();
api.initCamera();

const width = 64;
const height = 48;

const cam = api.getCameraData();
if (cam) {
    api.log("Webcam ready. Generating 3D particles...");
    
    // Auto-spin logic using camera time to rotate nicely
    const angle = api.time * 0.4;
    
    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const pixel = cam.getPixel(x, y);
            
            // Only plot pixels that are somewhat bright/active to reduce particle count
            if (pixel.brightness > 15) {
                // Map x, y to center of scene
                const px = (x - width / 2) * 0.35;
                const py = (height / 2 - y) * 0.35;
                
                // Depth Z is mapped from pixel brightness
                const pz = (pixel.brightness / 255) * 4.5 - 2.25;
                
                // Rotate points for dynamic visualization
                const rx = px * Math.cos(angle) - pz * Math.sin(angle);
                const rz = px * Math.sin(angle) + pz * Math.cos(angle);
                
                api.addParticle(rx, py, rz, 0.3, pixel.color);
            }
        }
    }
} else {
    api.log("Waiting for Webcam connection...");
    // Add a placeholder central rotating sphere while loading
    api.addSphere(0, 0, 0, 2, "#38bdf8");
}`,

  audioVisualizer: `// Template 11: 3D Audio Visualizer
api.clear();
api.initAudio();

const audio = api.getAudioData();
const count = 32;
const radius = 8;

api.log("Audio connected. Volume: " + audio.volume.toFixed(2));

// Central pulsing sphere
const centerPulse = 1.0 + audio.volume * 4.5;
api.addSphere(0, 0, 0, centerPulse, "#ec4899");

// Circular spectrum ring
for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const freq = audio.getFrequency(i); // 0 - 255
    const height = 0.5 + (freq / 255) * 8;
    
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = -10 + height / 2; // grow from bottom grid plane
    
    // Dynamic color shifting based on frequency height
    const hue = (i / count) * 360;
    const color = \`hsl(\${hue}, 90%, 60%)\`;
    
    api.addCube(x, y, z, 1.2, color);
    
    // Add small satellite spheres above the spectrum bars
    api.addSphere(x, y + height / 2 + 1.0, 0.4, color);
}

// Spawn random dancing particles from center
const particleCount = Math.floor(audio.volume * 50);
for (let j = 0; j < particleCount; j++) {
    const speed = 1.0 + audio.volume * 10;
    const pAngle = Math.random() * Math.PI * 2;
    const pHeight = Math.random() * Math.PI;
    
    const px = Math.sin(pHeight) * Math.cos(pAngle) * speed;
    const py = Math.cos(pHeight) * speed;
    const pz = Math.sin(pHeight) * Math.sin(pAngle) * speed;
    
    api.addParticle(px, py, pz, 0.35, "#38bdf8");
}`,

  physicsSandbox: `// Template 12: 3D Physics Sandbox
api.clear();

// Initialize Cannon.js world once at frame 1
if (!api.physicsActive) {
    api.initPhysics(0, -9.82, 0); // standard gravity
    api.addPhysicalFloor();
    
    // Spawn sphere stack
    for (let i = 0; i < 12; i++) {
        api.addPhysicalSphere(Math.random() * 2 - 1, 8 + i * 2.5, Math.random() * 2 - 1, 0.8, 1.0);
    }
    // Spawn cube stack
    for (let j = 0; j < 10; j++) {
        api.addPhysicalBox(Math.random() * 2 - 1, 10 + j * 3.0, Math.random() * 2 - 1, 1.5, 1.0);
    }
    
    api.log("Physics World initialized. Dropping objects...");
}

// Step Cannon.js world
api.stepPhysics(1/60);

// Draw all bodies
const bodies = api.getPhysicalBodies();
bodies.forEach((b, idx) => {
    if (b.type === 'sphere') {
        const hue = (idx * 30) % 360;
        api.addSphere(b.position.x, b.position.y, b.position.z, b.radius, \`hsl(\${hue}, 85%, 55%)\`);
    } else if (b.type === 'box') {
        const hue = (idx * 30 + 180) % 360;
        api.addCube(b.position.x, b.position.y, b.position.z, b.size, \`hsl(\${hue}, 85%, 55%)\`);
    }
});`,
  sketchWineGlass: `// Drawn 3D Lathe Mesh (Rotational Wine Glass)
api.clear();
api.log("Generating Lathe Wine Glass...");

const points = [
  { x: 0.1, y: -5.0 },
  { x: 1.5, y: -5.0 },
  { x: 1.2, y: -4.7 },
  { x: 0.2, y: -4.5 },
  { x: 0.2, y: -1.0 },
  { x: 0.4, y: 0.0 },
  { x: 1.8, y: 1.5 },
  { x: 2.2, y: 3.5 },
  { x: 2.1, y: 4.0 },
  { x: 1.9, y: 4.0 },
  { x: 1.9, y: 3.3 },
  { x: 1.6, y: 1.6 },
  { x: 0.3, y: 0.0 },
  { x: 0.1, y: -1.0 }
];

api.addLathe(points, 32);
api.log("Successfully rendered Lathe Wine Glass.");`,
  sketchStarExtrude: `// Drawn 3D Extruded Star Shape
api.clear();
api.log("Generating Extruded Star...");

const points = [];
const outerRadius = 4.5;
const innerRadius = 2.0;
const numPoints = 5;

for (let i = 0; i < numPoints * 2; i++) {
    const angle = i * Math.PI / numPoints;
    const r = (i % 2 === 0) ? outerRadius : innerRadius;
    points.push({
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r
    });
}

api.addExtrude(points, 2.0, true);
api.log("Successfully rendered Extruded Star.");`,
  sketchRoyalChalice: `// Drawn 3D Lathe Mesh (Royal Chalice)
api.clear();
api.log("Generating Royal Chalice...");

const points = [
  { x: 0.1, y: -4.0 },
  { x: 1.5, y: -4.0 },
  { x: 0.8, y: -3.8 },
  { x: 0.3, y: -3.5 },
  { x: 0.3, y: -1.0 },
  { x: 0.6, y: 0.0 },
  { x: 1.6, y: 1.2 },
  { x: 2.2, y: 3.0 },
  { x: 2.2, y: 4.2 },
  { x: 2.0, y: 4.2 },
  { x: 2.0, y: 3.2 },
  { x: 1.4, y: 1.4 },
  { x: 0.2, y: -0.8 },
  { x: 0.1, y: -3.5 }
];

api.addLathe(points, 32);
api.log("Successfully rendered Royal Chalice.");`,
  sketchMechanicalGear: `// Drawn 3D Extruded Gear (Mechanical Cogwheel)
api.clear();
api.log("Generating Mechanical Gear...");

const points = [];
const teeth = 8;
const rOuter = 4.0;
const rInner = 2.8;

for (let i = 0; i < teeth; i++) {
    const angle = (i * 2 * Math.PI) / teeth;
    const angle2 = ((i * 2 + 1) * Math.PI) / teeth;
    
    // Tooth profile
    points.push({ x: Math.cos(angle) * rInner, y: Math.sin(angle) * rInner });
    points.push({ x: Math.cos(angle + 0.1) * rOuter, y: Math.sin(angle + 0.1) * rOuter });
    points.push({ x: Math.cos(angle2 - 0.1) * rOuter, y: Math.sin(angle2 - 0.1) * rOuter });
    points.push({ x: Math.cos(angle2) * rInner, y: Math.sin(angle2) * rInner });
}

api.addExtrude(points, 1.5, true);
api.log("Successfully rendered Mechanical Gear.");`
};

// Preset script templates in French
const templatesFr = {
  spiroHelix: `// Modèle 1: Spiro-Hélice Paramétrique
api.clear();
api.log("Génération de la Spiro-Hélice...");

const steps = 600;
const radius = 6;
const tubeRadius = 2;
const speed = 15;

for (let i = 0; i < steps; i++) {
    const t = i / steps * Math.PI * 2 * 8; // 8 rotations
    
    // Coordonnées de l'hélice principale
    const mx = Math.cos(t) * radius;
    const my = t * 0.4 - 8;
    const mz = Math.sin(t) * radius;
    
    // Coordonnées spiro secondaires
    const sx = mx + Math.cos(t * speed) * tubeRadius;
    const sy = my + Math.sin(t * speed * 0.5) * tubeRadius * 0.5;
    const sz = mz + Math.sin(t * speed) * tubeRadius;
    
    const idx = api.addVertex(sx, sy, sz);
    
    if (i > 0) {
        api.addEdge(idx - 1, idx);
    }
}
api.log("Généré avec succès " + steps + " sommets.");`,

  torusKnot: `// Modèle 2: Nœud Torique
api.clear();
api.log("Génération du Nœud Torique...");

const p = 3; // Rotations autour de l'axe coplanaire
const q = 7; // Rotations autour de l'axe central
const steps = 1000;
const r1 = 8;
const r2 = 3;

for (let i = 0; i < steps; i++) {
    const phi = (i / steps) * Math.PI * 2 * p;
    
    const r = r1 + r2 * Math.cos((q / p) * phi);
    const x = r * Math.cos(phi);
    const y = r * Math.sin(phi);
    const z = r2 * Math.sin((q / p) * phi);
    
    api.addVertex(x, y, z);
    if (i > 0) {
        api.addEdge(i - 1, i);
    }
}
// Connecter la boucle
api.addEdge(steps - 1, 0);
api.log("Nœud torique généré.");`,

  parametricVase: `// Modèle 3: Surface de Vase Paramétrique
api.clear();
api.log("Génération du maillage du vase...");

const segments = 40;
const rings = 40;
const height = 15;

for (let r = 0; r <= rings; r++) {
    const y = (r / rings) * height - (height / 2);
    const progress = r / rings;
    
    // Le rayon change dynamiquement avec une onde sinusoïdale
    const baseRadius = 4 + Math.sin(progress * Math.PI * 3.5) * 1.8;
    
    for (let s = 0; s < segments; s++) {
        const theta = (s / segments) * Math.PI * 2;
        const twist = progress * 1.5;
        const x = Math.cos(theta + twist) * baseRadius;
        const z = Math.sin(theta + twist) * baseRadius;
        
        api.addVertex(x, y, z);
    }
}

for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segments; s++) {
        const nextS = (s + 1) % segments;
        const i0 = r * segments + s;
        const i1 = r * segments + nextS;
        const i2 = (r + 1) * segments + s;
        const i3 = (r + 1) * segments + nextS;
        
        api.addFace(i0, i1, i2);
        api.addFace(i1, i3, i2);
    }
}
api.log("Maillage du vase généré: " + (rings * segments * 2) + " faces.");`,

  hyperHelix: `// Modèle 4: Projection d'une Hyper-Hélice 4D
api.clear();
api.log("Génération de l'Hyper-Hélice 4D...");

const steps = 800;
const R = 6;
const r = 3.5;
const wSpeed = 3;
const wAngle = Math.PI / 4; 

for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2 * 6;
    
    const x4 = Math.cos(t) * R;
    const y4 = Math.sin(t) * R;
    const z4 = Math.cos(t * wSpeed) * r;
    const w4 = Math.sin(t * wSpeed) * r;
    
    const rotY = y4 * Math.cos(wAngle) - w4 * Math.sin(wAngle);
    const rotW = y4 * Math.sin(wAngle) + w4 * Math.cos(wAngle);
    
    const dist = 10;
    const factor = dist / (dist - rotW);
    
    const x3 = x4 * factor;
    const y3 = rotY * factor;
    const z3 = z4 * factor;
    
    api.addVertex(x3, y3, z3);
    if (i > 0) {
        api.addEdge(i - 1, i);
    }
}
api.log("Hélice 4D générée.");`,

  lorenzAttractor: `// Modèle 5: Attracteur de Lorenz (Théorie du Chaos)
api.clear();
api.log("Génération de l'Attracteur de Lorenz...");

const sigma = 10;
const rho = 28;
const beta = 2.66;
const dt = 0.01;
const steps = 2000;

let x = 0.1;
let y = 0;
let z = 0;

for (let i = 0; i < steps; i++) {
    const dx = sigma * (y - x) * dt;
    const dy = (x * (rho - z) - y) * dt;
    const dz = (x * y - beta * z) * dt;
    
    x += dx;
    y += dy;
    z += dz;
    
    // Centrer la géométrie pour la vue caméra
    const idx = api.addVertex(x, y, z - 25);
    
    if (i > 0) {
        api.addEdge(idx - 1, idx);
    }
}
api.log("Attracteur de Lorenz généré avec " + steps + " points.");`,

  lSystemTree: `// Modèle 6: Arbre Fractal Récurrent L-System
api.clear();
api.log("Génération de l'Arbre L-System 3D...");

const depth = 5;
const angle = 25;
const scale = 0.75;

const rad = angle * Math.PI / 180;

function createBranch(x1, y1, z1, length, theta, phi, currentDepth) {
    if (currentDepth <= 0) return;
    
    const x2 = x1 + length * Math.sin(theta) * Math.cos(phi);
    const y2 = y1 + length * Math.cos(theta);
    const z2 = z1 + length * Math.sin(theta) * Math.sin(phi);
    
    const i1 = api.addVertex(x1, y1, z1);
    const i2 = api.addVertex(x2, y2, z2);
    api.addEdge(i1, i2);
    
    const nextLen = length * scale;
    
    // Branchement récursif dans les directions 3D
    createBranch(x2, y2, z2, nextLen, theta + rad, phi, currentDepth - 1);
    createBranch(x2, y2, z2, nextLen, theta - rad, phi + Math.PI * 0.66, currentDepth - 1);
    createBranch(x2, y2, z2, nextLen, theta - rad, phi - Math.PI * 0.66, currentDepth - 1);
}

// Commencer la croissance vers le haut depuis la base
createBranch(0, -8, 0, 6, 0, 0, depth);
api.log("Arbre fractal L-System rendu.");`,

  mobiusStrip: `// Modèle 7: Surface du Ruban de Möbius (Non-orientable)
api.clear();
api.log("Génération du Ruban de Möbius...");

const radius = 6;
const width = 2.5;
const stepsU = 100;
const stepsV = 10;

for (let j = 0; j <= stepsV; j++) {
    const v = -width / 2 + (j / stepsV) * width;
    
    for (let i = 0; i <= stepsU; i++) {
        const u = (i / stepsU) * Math.PI * 2;
        
        const x = (radius + v * Math.cos(u / 2)) * Math.cos(u);
        const y = (radius + v * Math.cos(u / 2)) * Math.sin(u);
        const z = v * Math.sin(u / 2);
        
        api.addVertex(x, y, z);
    }
}

for (let j = 0; j < stepsV; j++) {
    for (let i = 0; i < stepsU; i++) {
        const i0 = j * (stepsU + 1) + i;
        const i1 = j * (stepsU + 1) + i + 1;
        const i2 = (j + 1) * (stepsU + 1) + i;
        const i3 = (j + 1) * (stepsU + 1) + i + 1;
        
        api.addFace(i0, i1, i2);
        api.addFace(i1, i3, i2);
    }
}
api.log("Ruban de Möbius généré avec succès.");`,

  kleinBottle: `// Modèle 8: Surface de la Bouteille de Klein (Immersion Figure-8)
api.clear();
api.log("Génération de la Bouteille de Klein...");

const scale = 4;
const stepsU = 60;
const stepsV = 60;
const R = 2.5;

for (let j = 0; j <= stepsV; j++) {
    const v = (j / stepsV) * Math.PI * 2;
    
    for (let i = 0; i <= stepsU; i++) {
        const u = (i / stepsU) * Math.PI * 2;
        
        const cosU = Math.cos(u);
        const sinU = Math.sin(u);
        const cosU2 = Math.cos(u / 2);
        const sinU2 = Math.sin(u / 2);
        const sinV = Math.sin(v);
        const sin2v = Math.sin(2 * v);
        
        const rFactor = R + cosU2 * sinV - sinU2 * sin2v;
        const x = cosU * rFactor * scale;
        const y = sinU * rFactor * scale;
        const z = (sinU2 * sinV + cosU2 * sin2v) * scale;
        
        api.addVertex(x, y, z);
    }
}

for (let j = 0; j < stepsV; j++) {
    for (let i = 0; i < stepsU; i++) {
        const i0 = j * (stepsU + 1) + i;
        const i1 = j * (stepsU + 1) + i + 1;
        const i2 = (j + 1) * (stepsU + 1) + i;
        const i3 = (j + 1) * (stepsU + 1) + i + 1;
        
        api.addFace(i0, i1, i2);
        api.addFace(i1, i3, i2);
    }
}
api.log("Bouteille de Klein générée avec succès.");`,

  particleVortex: `// Modèle 9: Vortex du Système de Particules
api.clear();
api.log("Génération du Vortex de Particules...");

const count = 600;
const spirals = 3;

// Ajouter une sphère centrale
api.addSphere(0, 0, 0, 1.5, "#eab308");

for (let i = 0; i < count; i++) {
    const t = i / count;
    const angle = t * Math.PI * 2 * spirals;
    const r = t * 12 + 1.5;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const y = (Math.random() - 0.5) * 2 * (1 - t) * 4;
    
    // Transition de couleur de l'orange chaud au cyan froid
    const rCol = Math.floor(244 * (1 - t) + 6 * t);
    const gCol = Math.floor(63 * (1 - t) + 182 * t);
    const bCol = Math.floor(94 * (1 - t) + 212 * t);
    const colorHex = "#" + ((1 << 24) + (rCol << 16) + (gCol << 8) + bCol).toString(16).slice(1);
    
    api.addParticle(x, y, z, 0.4, colorHex);
    
    // Ajouter des petits cubes en orbite
    if (i % 80 === 0 && i > 0) {
        api.addCube(x, y + 0.5, z, 0.8, "#ec4899");
    }
}
api.log("Vortex de particules procédural généré: " + count + " particules.");`,

  webcamSelfie: `// Modèle 10: Nuage de Points Webcam 3D
api.clear();
api.initCamera();

const width = 64;
const height = 48;

const cam = api.getCameraData();
if (cam) {
    api.log("Webcam prête. Génération des particules 3D...");
    
    // Rotation automatique avec le temps
    const angle = api.time * 0.4;
    
    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const pixel = cam.getPixel(x, y);
            
            if (pixel.brightness > 15) {
                const px = (x - width / 2) * 0.35;
                const py = (height / 2 - y) * 0.35;
                const pz = (pixel.brightness / 255) * 4.5 - 2.25;
                
                const rx = px * Math.cos(angle) - pz * Math.sin(angle);
                const rz = px * Math.sin(angle) + pz * Math.cos(angle);
                
                api.addParticle(rx, py, rz, 0.3, pixel.color);
            }
        }
    }
} else {
    api.log("En attente de connexion webcam...");
    api.addSphere(0, 0, 0, 2, "#38bdf8");
}`,

  audioVisualizer: `// Modèle 11: Visualiseur Audio 3D
api.clear();
api.initAudio();

const audio = api.getAudioData();
const count = 32;
const radius = 8;

api.log("Audio connecté. Volume: " + audio.volume.toFixed(2));

const centerPulse = 1.0 + audio.volume * 4.5;
api.addSphere(0, 0, 0, centerPulse, "#ec4899");

for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const freq = audio.getFrequency(i);
    const height = 0.5 + (freq / 255) * 8;
    
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = -10 + height / 2;
    
    const hue = (i / count) * 360;
    const color = \`hsl(\${hue}, 90%, 60%)\`;
    
    api.addCube(x, y, z, 1.2, color);
    api.addSphere(x, y + height / 2 + 1.0, 0.4, color);
}

const particleCount = Math.floor(audio.volume * 50);
for (let j = 0; j < particleCount; j++) {
    const speed = 1.0 + audio.volume * 10;
    const pAngle = Math.random() * Math.PI * 2;
    const pHeight = Math.random() * Math.PI;
    
    const px = Math.sin(pHeight) * Math.cos(pAngle) * speed;
    const py = Math.cos(pHeight) * speed;
    const pz = Math.sin(pHeight) * Math.sin(pAngle) * speed;
    
    api.addParticle(px, py, pz, 0.35, "#38bdf8");
}`,

  physicsSandbox: `// Modèle 12: Bac à Sable Physique 3D
api.clear();

if (!api.physicsActive) {
    api.initPhysics(0, -9.82, 0);
    api.addPhysicalFloor();
    
    for (let i = 0; i < 12; i++) {
        api.addPhysicalSphere(Math.random() * 2 - 1, 8 + i * 2.5, Math.random() * 2 - 1, 0.8, 1.0);
    }
    for (let j = 0; j < 10; j++) {
        api.addPhysicalBox(Math.random() * 2 - 1, 10 + j * 3.0, Math.random() * 2 - 1, 1.5, 1.0);
    }
    
    api.log("Monde physique initialisé. Chute des solides...");
}

api.stepPhysics(1/60);

const bodies = api.getPhysicalBodies();
bodies.forEach((b, idx) => {
    if (b.type === 'sphere') {
        const hue = (idx * 30) % 360;
        api.addSphere(b.position.x, b.position.y, b.position.z, b.radius, \`hsl(\${hue}, 85%, 55%)\`);
    } else if (b.type === 'box') {
        const hue = (idx * 30 + 180) % 360;
        api.addCube(b.position.x, b.position.y, b.position.z, b.size, \`hsl(\${hue}, 85%, 55%)\`);
    }
});`,
  sketchWineGlass: `// Dessin Verre à Vin Révolution
api.clear();
api.log("Génération du Verre à Vin Révolution...");

const points = [
  { x: 0.1, y: -5.0 },
  { x: 1.5, y: -5.0 },
  { x: 1.2, y: -4.7 },
  { x: 0.2, y: -4.5 },
  { x: 0.2, y: -1.0 },
  { x: 0.4, y: 0.0 },
  { x: 1.8, y: 1.5 },
  { x: 2.2, y: 3.5 },
  { x: 2.1, y: 4.0 },
  { x: 1.9, y: 4.0 },
  { x: 1.9, y: 3.3 },
  { x: 1.6, y: 1.6 },
  { x: 0.3, y: 0.0 },
  { x: 0.1, y: -1.0 }
];

api.addLathe(points, 32);
api.log("Verre à Vin Révolution généré avec succès.");`,
  sketchStarExtrude: `// Dessin Étoile 3D Extrudée
api.clear();
api.log("Génération de l'Étoile Extrudée...");

const points = [];
const outerRadius = 4.5;
const innerRadius = 2.0;
const numPoints = 5;

for (let i = 0; i < numPoints * 2; i++) {
    const angle = i * Math.PI / numPoints;
    const r = (i % 2 === 0) ? outerRadius : innerRadius;
    points.push({
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r
    });
}

api.addExtrude(points, 2.0, true);
api.log("Étoile Extrudée générée avec succès.");`,
  sketchRoyalChalice: `// Dessin Coupe Royale Révolution
api.clear();
api.log("Génération de la Coupe Royale Révolution...");

const points = [
  { x: 0.1, y: -4.0 },
  { x: 1.5, y: -4.0 },
  { x: 0.8, y: -3.8 },
  { x: 0.3, y: -3.5 },
  { x: 0.3, y: -1.0 },
  { x: 0.6, y: 0.0 },
  { x: 1.6, y: 1.2 },
  { x: 2.2, y: 3.0 },
  { x: 2.2, y: 4.2 },
  { x: 2.0, y: 4.2 },
  { x: 2.0, y: 3.2 },
  { x: 1.4, y: 1.4 },
  { x: 0.2, y: -0.8 },
  { x: 0.1, y: -3.5 }
];

api.addLathe(points, 32);
api.log("Coupe Royale Révolution générée avec succès.");`,
  sketchMechanicalGear: `// Dessin Engrenage Extrudé (Roue Dentée)
api.clear();
api.log("Génération de l'Engrenage Extrudé...");

const points = [];
const teeth = 8;
const rOuter = 4.0;
const rInner = 2.8;

for (let i = 0; i < teeth; i++) {
    const angle = (i * 2 * Math.PI) / teeth;
    const angle2 = ((i * 2 + 1) * Math.PI) / teeth;
    
    // Profil de dent
    points.push({ x: Math.cos(angle) * rInner, y: Math.sin(angle) * rInner });
    points.push({ x: Math.cos(angle + 0.1) * rOuter, y: Math.sin(angle + 0.1) * rOuter });
    points.push({ x: Math.cos(angle2 - 0.1) * rOuter, y: Math.sin(angle2 - 0.1) * rOuter });
    points.push({ x: Math.cos(angle2) * rInner, y: Math.sin(angle2) * rInner });
}

api.addExtrude(points, 1.5, true);
api.log("Engrenage Extrudé généré avec succès.");`
};

// Preset parameters configuration for Generative HUD
const presetParams = {
  spiroHelix: [
    { name: 'steps', min: 100, max: 1000, step: 50, default: 600, label: { en: 'Steps', fr: 'Étapes' } },
    { name: 'radius', min: 1, max: 15, step: 0.5, default: 6, label: { en: 'Radius', fr: 'Rayon' } },
    { name: 'tubeRadius', min: 0.5, max: 5, step: 0.1, default: 2, label: { en: 'Tube Radius', fr: 'Rayon du Tube' } },
    { name: 'speed', min: 1, max: 30, step: 1, default: 15, label: { en: 'Speed', fr: 'Vitesse' } }
  ],
  torusKnot: [
    { name: 'p', min: 1, max: 10, step: 1, default: 3, label: { en: 'P (Rotations)', fr: 'P (Rotations)' } },
    { name: 'q', min: 1, max: 20, step: 1, default: 7, label: { en: 'Q (Rotations)', fr: 'Q (Rotations)' } },
    { name: 'steps', min: 100, max: 2000, step: 50, default: 1000, label: { en: 'Steps', fr: 'Étapes' } },
    { name: 'r1', min: 2, max: 15, step: 0.5, default: 8, label: { en: 'Major Radius', fr: 'Grand Rayon' } },
    { name: 'r2', min: 1, max: 10, step: 0.5, default: 3, label: { en: 'Minor Radius', fr: 'Petit Rayon' } }
  ],
  parametricVase: [
    { name: 'segments', min: 10, max: 100, step: 5, default: 40, label: { en: 'Segments', fr: 'Segments' } },
    { name: 'rings', min: 10, max: 100, step: 5, default: 40, label: { en: 'Rings', fr: 'Anneaux' } },
    { name: 'height', min: 5, max: 30, step: 1, default: 15, label: { en: 'Height', fr: 'Hauteur' } }
  ],
  hyperHelix: [
    { name: 'steps', min: 100, max: 2000, step: 50, default: 800, label: { en: 'Steps', fr: 'Étapes' } },
    { name: 'R', min: 2, max: 15, step: 0.5, default: 6, label: { en: 'Major R', fr: 'Grand R' } },
    { name: 'r', min: 1, max: 10, step: 0.5, default: 3.5, label: { en: 'Minor r', fr: 'Petit r' } },
    { name: 'wSpeed', min: 1, max: 10, step: 1, default: 3, label: { en: '4D Speed', fr: 'Vitesse 4D' } }
  ],
  lorenzAttractor: [
    { name: 'sigma', min: 1, max: 30, step: 0.5, default: 10, label: { en: 'Sigma σ', fr: 'Sigma σ' } },
    { name: 'rho', min: 1, max: 60, step: 0.5, default: 28, label: { en: 'Rho ρ', fr: 'Rho ρ' } },
    { name: 'beta', min: 0.5, max: 6, step: 0.1, default: 2.66, label: { en: 'Beta β', fr: 'Bêta β' } },
    { name: 'steps', min: 500, max: 8000, step: 500, default: 2000, label: { en: 'Steps', fr: 'Étapes' } },
    { name: 'dt', min: 0.001, max: 0.02, step: 0.001, default: 0.01, label: { en: 'Time Step dt', fr: 'Pas de temps dt' } }
  ],
  lSystemTree: [
    { name: 'depth', min: 1, max: 7, step: 1, default: 5, label: { en: 'Depth', fr: 'Profondeur' } },
    { name: 'angle', min: 5, max: 60, step: 1, default: 25, label: { en: 'Branch Angle', fr: 'Angle Branche' } },
    { name: 'scale', min: 0.4, max: 0.9, step: 0.05, default: 0.75, label: { en: 'Scale Factor', fr: 'Facteur Échelle' } }
  ],
  mobiusStrip: [
    { name: 'radius', min: 2, max: 12, step: 0.5, default: 6, label: { en: 'Strip Radius', fr: 'Rayon du Ruban' } },
    { name: 'width', min: 0.5, max: 6, step: 0.25, default: 2.5, label: { en: 'Width', fr: 'Largeur' } },
    { name: 'stepsU', min: 30, max: 200, step: 10, default: 100, label: { en: 'U Segments', fr: 'Segments U' } }
  ],
  kleinBottle: [
    { name: 'scale', min: 1, max: 8, step: 0.5, default: 4, label: { en: 'Scale', fr: 'Échelle' } },
    { name: 'R', min: 1, max: 5, step: 0.25, default: 2.5, label: { en: 'Inner Radius R', fr: 'Rayon Interne R' } },
    { name: 'stepsU', min: 20, max: 100, step: 10, default: 60, label: { en: 'U Segments', fr: 'Segments U' } },
    { name: 'stepsV', min: 20, max: 100, step: 10, default: 60, label: { en: 'V Segments', fr: 'Segments V' } }
  ],
  particleVortex: [
    { name: 'count', min: 100, max: 2000, step: 100, default: 600, label: { en: 'Particle Count', fr: 'Nombre de Particules' } },
    { name: 'spirals', min: 1, max: 10, step: 1, default: 3, label: { en: 'Spirals', fr: 'Spirales' } }
  ],
  webcamSelfie: [],
  audioVisualizer: [],
  physicsSandbox: []
};

// Bilingual Dictionaries
const translations = {
  en: {
    appTitle: '<i class="fa-solid fa-code"></i> STUDIOS-PRO <span class="version-tag">Scripting Live Sandbox</span>',
    headerTag: 'Offline Desktop Prototype',
    editorTitle: '<i class="fa-solid fa-square-terminal"></i> Script Editor',
    runBtn: 'Run Script',
    formatBtn: 'Format Code',
    consoleTitle: 'Console logs',
    hudColors: 'Color Settings',
    modelColor: 'Model Color',
    bgColor: 'Background',
    hudCamera: 'View Settings',
    autoRotate: 'Auto Rotate',
    hudGen: 'Generative Parameters',
    expObj: 'Export OBJ',
    expStl: 'Export STL',
    expHtml: 'Export HTML',
    placeholder: 'Write JavaScript code here...',
    toastObj: '💾 OBJ Exported!',
    toastStl: '💾 STL Exported!',
    toastStlErr: '⚠️ STL requires Faces/Solid meshes. Exporting OBJ instead.',
    toastHtml: '🚀 HTML Sandbox Exported!',
    toastNoGeom: '❌ No geometry loaded to export',
    toastShareCopied: '🔗 Share URL copied to clipboard!',
    toastHtmlExported: '💾 HTML File Exported!',
    shareBtn: 'Share',
    logCompiling: 'Compiling script...',
    logNoGeom: 'No geometry was generated by the script.',
    logSuccess: 'Successfully rendered 3D geometry!',
    logError: 'Error executing script: ',
    presetSpiro: 'Spiro-Helix',
    presetTorus: 'Torus Knot',
    presetVase: 'Parametric Vase',
    preset4d: 'Helix 4D',
    presetLorenz: 'Lorenz Attractor',
    presetLSystem: 'L-System Tree',
    presetMobius: 'Möbius Strip',
    presetKlein: 'Klein Bottle',
    presetParticleVortex: 'Particle Vortex',
    presetWebcamSelfie: '3D Webcam Point-Cloud',
    presetAudioVisualizer: '3D Audio Visualizer',
    presetPhysicsSandbox: '3D Physics Sandbox',
    previewBtn: 'Full Preview',
    overlayTitle: 'HTML Live Preview',
    overlayRefresh: 'Refresh',
    overlayExit: 'Exit Preview',
    galleryBtn: 'Browse Templates',
    galleryTitle: 'Templates Gallery',
    galleryCardLoad: 'Load & Run',
    screenshotBtn: 'Screenshot',
    recordBtn: 'Record',
    tabConsole: 'Console',
    tabHistory: 'History',
    historyRestore: 'Restore',
    historyEmpty: 'No scripts run yet',
    toastScreenshot: '📸 Screenshot saved!',
    toastRecordStarted: '⏺ Recording started (4s)...',
    toastRecordSaved: '💾 Video recording downloaded!',
    sketchOpenBtn: 'Draw 3D',
    sketchTitle: '3D Sketcher',
    sketchLathe: 'Lathe (Vase)',
    sketchExtrude: 'Extrude (Depth)',
    sketchClear: 'Clear',
    sketchSave: 'Generate Code',
    sketchExit: 'Exit',
    tabToolbox: 'Toolbox',
    hudScriptParams: 'Script Parameters',
    lblEnvPreset: 'Scene Style',
    tabProjects: 'Projects',
    toastProjectSaved: '💾 Project Saved!',
    toastProjectDeleted: '🗑️ Project Deleted!',
    toastProjectEnterName: '⚠️ Please enter a project name',
    projectPlaceholder: 'Project name...',
    projectEmpty: 'No saved projects yet',
    projectLoad: 'Load'
  },
  fr: {
    appTitle: '<i class="fa-solid fa-code"></i> STUDIOS-PRO <span class="version-tag">Bac à sable Scripting</span>',
    headerTag: 'Prototype de bureau hors ligne',
    editorTitle: '<i class="fa-solid fa-square-terminal"></i> Éditeur de Script',
    runBtn: 'Exécuter le script',
    formatBtn: 'Formater le Code',
    consoleTitle: 'Logs de la Console',
    hudColors: 'Paramètres Couleurs',
    modelColor: 'Couleur du Modèle',
    bgColor: 'Arrière-plan',
    hudCamera: 'Paramètres de Vue',
    autoRotate: 'Rotation Automatique',
    hudGen: 'Paramètres Génératifs',
    expObj: 'Exporter OBJ',
    expStl: 'Exporter STL',
    expHtml: 'Exporter HTML',
    placeholder: 'Écrivez le code JavaScript ici...',
    toastObj: '💾 OBJ Exporté !',
    toastStl: '💾 STL Exporté !',
    toastStlErr: '⚠️ STL nécessite des faces/maillages solides. Exportation en OBJ.',
    toastHtml: '🚀 HTML Sandbox Exported !',
    toastNoGeom: '❌ Aucune géométrie chargée à exporter',
    toastShareCopied: '🔗 URL de partage copiée dans le presse-papier !',
    toastHtmlExported: '💾 Fichier HTML personnalisé exporté !',
    shareBtn: 'Partager',
    logCompiling: 'Compilation du script...',
    logNoGeom: 'Aucune géométrie n\'a été générée par le script.',
    logSuccess: 'Géométrie 3D rendue avec succès !',
    logError: 'Erreur d\'exécution du script : ',
    presetSpiro: 'Spiro-Hélice',
    presetTorus: 'Nœud Torique',
    presetVase: 'Vase Paramétrique',
    preset4d: 'Hélice 4D',
    presetLorenz: 'Attracteur de Lorenz',
    presetLSystem: 'Arbre L-System',
    presetMobius: 'Ruban de Möbius',
    presetKlein: 'Bouteille de Klein',
    presetParticleVortex: 'Vortex de Particules',
    presetWebcamSelfie: 'Nuage de Points Webcam 3D',
    presetAudioVisualizer: 'Visualiseur Audio 3D',
    presetPhysicsSandbox: 'Simulateur Physique 3D',
    previewBtn: 'Aperçu Complet',
    overlayTitle: 'Aperçu HTML en Direct',
    overlayRefresh: 'Actualiser',
    overlayExit: 'Quitter',
    galleryBtn: 'Parcourir Modèles',
    galleryTitle: 'Galerie des Modèles',
    galleryCardLoad: 'Charger & Exécuter',
    screenshotBtn: 'Capture',
    recordBtn: 'Enregistrer',
    tabConsole: 'Console',
    tabHistory: 'Historique',
    historyRestore: 'Restaurer',
    historyEmpty: 'Aucun script exécuté',
    toastScreenshot: '📸 Capture d\'écran sauvegardée !',
    toastRecordStarted: '⏺ Enregistrement démarré (4s)...',
    toastRecordSaved: '💾 Enregistrement vidéo téléchargé !',
    sketchOpenBtn: 'Dessiner 3D',
    sketchTitle: 'Dessin 3D',
    sketchLathe: 'Révolution (Vase)',
    sketchExtrude: 'Extrusion (Profondeur)',
    sketchClear: 'Effacer',
    sketchSave: 'Générer le Code',
    sketchExit: 'Quitter',
    tabToolbox: 'Boîte à outils',
    hudScriptParams: 'Paramètres Script',
    lblEnvPreset: 'Style Scène',
    tabProjects: 'Projets',
    toastProjectSaved: '💾 Projet enregistré !',
    toastProjectDeleted: '🗑️ Projet supprimé !',
    toastProjectEnterName: '⚠️ Veuillez entrer un nom de projet',
    projectPlaceholder: 'Nom du projet...',
    projectEmpty: 'Aucun projet enregistré pour le moment',
    projectLoad: 'Charger'
  }
};

let ambientLight, dirLight1, dirLight2, gridHelper;

// Initialize scene
function initScene() {
  const container = document.getElementById('canvas3d');
  
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0f19);
  
  camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(15, 15, 25);
  
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);
  
  ambientLight = new THREE.AmbientLight(0x444444);
  scene.add(ambientLight);
  
  dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight1.position.set(1, 1, 1).normalize();
  scene.add(dirLight1);
  
  dirLight2 = new THREE.DirectionalLight(0x223344, 0.6);
  dirLight2.position.set(-1, -1, -1).normalize();
  scene.add(dirLight2);
  
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  
  scene.add(currentMeshGroup);
  
  gridHelper = new THREE.GridHelper(30, 30, 0x06b6d4, 0x1e293b);
  gridHelper.position.y = -10;
  scene.add(gridHelper);
  
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
  
  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });
}

function applyEnvironmentPreset(presetName) {
  if (!scene || !ambientLight || !dirLight1 || !dirLight2 || !gridHelper) return;
  
  const bgColorInput = document.getElementById('bgColor');
  
  if (presetName === 'cyber') {
    scene.background.setHex(0x0b0f19);
    if (bgColorInput) bgColorInput.value = '#0b0f19';
    ambientLight.color.setHex(0x444444);
    dirLight1.color.setHex(0xffffff);
    dirLight1.intensity = 0.8;
    dirLight2.color.setHex(0x223344);
    dirLight2.intensity = 0.6;
    
    scene.remove(gridHelper);
    gridHelper = new THREE.GridHelper(30, 30, 0x06b6d4, 0x1e293b);
    gridHelper.position.y = -10;
    scene.add(gridHelper);
  } else if (presetName === 'sunset') {
    scene.background.setHex(0x13071e);
    if (bgColorInput) bgColorInput.value = '#13071e';
    ambientLight.color.setHex(0x3c1053);
    dirLight1.color.setHex(0xfd79a8);
    dirLight1.intensity = 1.0;
    dirLight2.color.setHex(0xffbe76);
    dirLight2.intensity = 0.7;
    
    scene.remove(gridHelper);
    gridHelper = new THREE.GridHelper(30, 30, 0xe056fd, 0x4834d4);
    gridHelper.position.y = -10;
    scene.add(gridHelper);
  } else if (presetName === 'matrix') {
    scene.background.setHex(0x040c04);
    if (bgColorInput) bgColorInput.value = '#040c04';
    ambientLight.color.setHex(0x0e240e);
    dirLight1.color.setHex(0x2ecc71);
    dirLight1.intensity = 1.0;
    dirLight2.color.setHex(0x27ae60);
    dirLight2.intensity = 0.5;
    
    scene.remove(gridHelper);
    gridHelper = new THREE.GridHelper(30, 30, 0x2ecc71, 0x1b4f72);
    gridHelper.position.y = -10;
    scene.add(gridHelper);
  } else if (presetName === 'studio') {
    scene.background.setHex(0xf1f5f9);
    if (bgColorInput) bgColorInput.value = '#f1f5f9';
    ambientLight.color.setHex(0x888888);
    dirLight1.color.setHex(0xffffff);
    dirLight1.intensity = 1.2;
    dirLight2.color.setHex(0xdddddd);
    dirLight2.intensity = 0.4;
    
    scene.remove(gridHelper);
    gridHelper = new THREE.GridHelper(30, 30, 0x94a3b8, 0xe2e8f0);
    gridHelper.position.y = -10;
    scene.add(gridHelper);
  }
  
  if (renderer) renderer.render(scene, camera);
}

// Logger helper
function logToConsole(message, type = 'info') {
  const consoleLogs = document.getElementById('console-logs');
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}-log`;
  
  const time = new Date().toLocaleTimeString();
  entry.innerHTML = `<span class="log-time">[${time}]</span> <span class="log-${type}">${message}</span>`;
  consoleLogs.appendChild(entry);
  consoleLogs.scrollTop = consoleLogs.scrollHeight;
}

let animationFrameId = null;
let animationStartTime = null;
let cameraRequested = false;
let audioRequested = false;

// Compile and run user script
function executeScript() {
  if (isLockHolder) {
    collabChannel.postMessage({ type: 'RUN_SCRIPT', userId: collabUser.id });
  }
  
  const code = document.getElementById('code-editor').value;
  const usesAudio = /\bapi\.initAudio\b/.test(code);
  const usesCamera = /\bapi\.initCamera\b/.test(code);
  
  if (!usesCamera) {
    cameraEngine.stop();
    cameraRequested = false;
  } else {
    cameraRequested = cameraEngine.active;
  }
  
  if (!usesAudio) {
    audioEngine.stop();
    audioRequested = false;
  } else {
    audioRequested = audioEngine.active;
  }
  
  physicsEngine.reset();
  scriptingAPI.physicsActive = false;
  
  dynamicControlsData.registered = [];
  
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  pushToHistory(code);
  const t = translations[currentLang];
  
  const trimmed = code.trim();
  const isHTML = trimmed.startsWith('<') || trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<!doctype');
  
  const canvas = document.getElementById('canvas3d');
  const htmlFrame = document.getElementById('html-preview-frame');
  const previewBtn = document.getElementById('btn-preview');
  
  if (isHTML) {
    // Show the small inline preview in viewport
    if (canvas) canvas.style.display = 'none';
    if (htmlFrame) {
      htmlFrame.style.display = 'block';
      htmlFrame.srcdoc = code;
    }
    // Show the Full Preview button
    if (previewBtn) previewBtn.style.display = 'flex';
    logToConsole(currentLang === 'en' ? '✅ HTML detected — click Full Preview for fullscreen!' : '✅ HTML détecté — cliquez sur Aperçu Complet pour le plein écran !', 'success');
    return;
  } else {
    if (htmlFrame) htmlFrame.style.display = 'none';
    if (canvas) canvas.style.display = 'block';
    if (previewBtn) previewBtn.style.display = 'none';
    // Close fullscreen overlay if it was open for HTML mode
    const overlay = document.getElementById('html-fullscreen-overlay');
    if (overlay && overlay.style.display !== 'none') {
      overlay.style.display = 'none';
    }
  }
  
  scriptingAPI.time = 0;
  scriptingAPI.frame = 0;
  const isAnimated = /\bapi\.(?:time|frame|getAudioData|getCameraData|stepPhysics)\b/.test(code);
  
  if (isAnimated) {
    logToConsole("Starting animation loop...", 'info');
    animationStartTime = performance.now();
    
    let execute;
    try {
      execute = new Function('api', code);
    } catch (err) {
      logToConsole(`${t.logError}${err.message}`, 'error');
      return;
    }
    
    const runAnimationLoop = () => {
      const now = performance.now();
      scriptingAPI.time = (now - animationStartTime) / 1000.0;
      scriptingAPI.frame++;
      
      scriptingAPI.clear();
      
      while (currentMeshGroup.children.length > 0) {
        const child = currentMeshGroup.children[0];
        currentMeshGroup.remove(child);
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      }
      
      try {
        execute(scriptingAPI);
        buildThreeGeometry(true);
      } catch (err) {
        console.error(err);
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        logToConsole(`${t.logError}${err.message}`, 'error');
        return;
      }
      
      animationFrameId = requestAnimationFrame(runAnimationLoop);
    };
    
    animationFrameId = requestAnimationFrame(runAnimationLoop);
    return;
  }

  logToConsole(t.logCompiling, 'info');
  
  scriptingAPI.clear();
  
  while(currentMeshGroup.children.length > 0){
    const child = currentMeshGroup.children[0];
    currentMeshGroup.remove(child);
    if(child.geometry) child.geometry.dispose();
    if(child.material) {
      if(Array.isArray(child.material)) child.material.forEach(m => m.dispose());
      else child.material.dispose();
    }
  }
  
  try {
    const execute = new Function('api', code);
    execute(scriptingAPI);
    buildThreeGeometry(false);
  } catch (err) {
    logToConsole(`${t.logError}${err.message}`, 'error');
  }
}

// Helper to parse material options from user scripts
function getMaterialFromOptions(options, defaultColor) {
  const modelColorVal = defaultColor || document.getElementById('modelColor').value;
  if (!options) {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(modelColorVal),
      roughness: 0.4,
      metalness: 0.2,
      side: THREE.DoubleSide
    });
  }
  
  if (typeof options === 'string') {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(options),
      roughness: 0.4,
      metalness: 0.2,
      side: THREE.DoubleSide
    });
  }
  
  return new THREE.MeshStandardMaterial({
    color: options.color !== undefined ? new THREE.Color(options.color) : new THREE.Color(modelColorVal),
    roughness: options.roughness !== undefined ? parseFloat(options.roughness) : 0.4,
    metalness: options.metalness !== undefined ? parseFloat(options.metalness) : 0.2,
    emissive: options.emissive !== undefined ? new THREE.Color(options.emissive) : new THREE.Color(0x000000),
    opacity: options.opacity !== undefined ? parseFloat(options.opacity) : 1.0,
    transparent: options.transparent !== undefined ? !!options.transparent : (options.opacity !== undefined && options.opacity < 1.0),
    wireframe: options.wireframe !== undefined ? !!options.wireframe : false,
    side: THREE.DoubleSide
  });
}

let lastRegisteredSerialized = '';
function renderDynamicControlsUI() {
  const hud = document.getElementById('script-controls-hud');
  const container = document.getElementById('script-controls-container');
  if (!hud || !container) return;
  
  const registered = dynamicControlsData.registered;
  if (registered.length === 0) {
    hud.style.display = 'none';
    lastRegisteredSerialized = '';
    return;
  }
  
  hud.style.display = 'block';
  
  const serialized = registered.map(c => `${c.type}:${c.name}:${c.min}:${c.max}:${c.step}`).join('|');
  if (serialized === lastRegisteredSerialized) {
    registered.forEach(c => {
      const currentVal = dynamicControlsData.values[c.name] !== undefined ? dynamicControlsData.values[c.name] : c.default;
      if (c.type === 'slider') {
        const input = document.getElementById(`dyn-ctrl-${c.name}`);
        const valSpan = document.getElementById(`dyn-val-${c.name}`);
        if (input && document.activeElement !== input) input.value = currentVal;
        if (valSpan) valSpan.innerText = currentVal;
      } else if (c.type === 'color') {
        const input = document.getElementById(`dyn-ctrl-${c.name}`);
        if (input && document.activeElement !== input) input.value = currentVal;
      }
    });
    return;
  }
  
  lastRegisteredSerialized = serialized;
  container.innerHTML = '';
  
  registered.forEach(c => {
    const controlDiv = document.createElement('div');
    controlDiv.className = 'hud-control';
    controlDiv.style.flexDirection = 'column';
    controlDiv.style.alignItems = 'stretch';
    controlDiv.style.gap = '4px';
    controlDiv.style.marginBottom = '6px';
    
    const labelRow = document.createElement('div');
    labelRow.style.display = 'flex';
    labelRow.style.justifyContent = 'space-between';
    labelRow.style.fontSize = '0.7rem';
    
    const labelSpan = document.createElement('span');
    labelSpan.innerText = c.name;
    labelRow.appendChild(labelSpan);
    
    const currentVal = dynamicControlsData.values[c.name] !== undefined ? dynamicControlsData.values[c.name] : c.default;
    
    if (c.type === 'slider') {
      const valueSpan = document.createElement('span');
      valueSpan.id = `dyn-val-${c.name}`;
      valueSpan.innerText = currentVal;
      valueSpan.style.color = 'var(--accent-cyan)';
      valueSpan.style.fontWeight = 'bold';
      labelRow.appendChild(valueSpan);
      
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.id = `dyn-ctrl-${c.name}`;
      slider.min = c.min;
      slider.max = c.max;
      slider.step = c.step;
      slider.value = currentVal;
      slider.style.width = '100%';
      slider.style.cursor = 'pointer';
      
      slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        valueSpan.innerText = val;
        dynamicControlsData.values[c.name] = val;
        executeScript();
      });
      
      controlDiv.appendChild(labelRow);
      controlDiv.appendChild(slider);
    } else if (c.type === 'color') {
      controlDiv.style.flexDirection = 'row';
      controlDiv.style.justifyContent = 'space-between';
      controlDiv.style.alignItems = 'center';
      controlDiv.style.marginBottom = '8px';
      
      const picker = document.createElement('input');
      picker.type = 'color';
      picker.id = `dyn-ctrl-${c.name}`;
      picker.value = currentVal;
      picker.style.width = '32px';
      picker.style.height = '20px';
      picker.style.border = 'none';
      picker.style.background = 'none';
      picker.style.cursor = 'pointer';
      
      picker.addEventListener('input', (e) => {
        dynamicControlsData.values[c.name] = e.target.value;
        executeScript();
      });
      
      controlDiv.appendChild(labelRow);
      controlDiv.appendChild(picker);
    }
    
    container.appendChild(controlDiv);
  });
}

// Convert geometryData to Three.js objects
function buildThreeGeometry(isAnimatedFrame = false) {
  const vertices = geometryData.vertices;
  const edges = geometryData.edges;
  const faces = geometryData.faces;
  const particles = geometryData.particles || [];
  const spheres = geometryData.spheres || [];
  const cubes = geometryData.cubes || [];
  const cylinders = geometryData.cylinders || [];
  const toruses = geometryData.toruses || [];
  const cones = geometryData.cones || [];
  const planes = geometryData.planes || [];
  const t = translations[currentLang];
  
  const modelColorVal = document.getElementById('modelColor').value;
  
  const hasGeom = vertices.length > 0 || particles.length > 0 || spheres.length > 0 || cubes.length > 0 || cylinders.length > 0 || toruses.length > 0 || cones.length > 0 || planes.length > 0;
  if (!hasGeom) {
    if (!isAnimatedFrame) logToConsole(t.logNoGeom, 'error');
    renderDynamicControlsUI();
    return;
  }
  
  if (faces.length > 0) {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    
    faces.forEach(f => {
      const v0 = vertices[f[0]];
      const v1 = vertices[f[1]];
      const v2 = vertices[f[2]];
      
      if (v0 && v1 && v2) {
        positions.push(v0.x, v0.y, v0.z, v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
      }
    });
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(modelColorVal),
      roughness: 0.4,
      metalness: 0.2,
      side: THREE.DoubleSide
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    currentMeshGroup.add(mesh);
  }
  
  if (edges.length > 0) {
    const linePositions = [];
    edges.forEach(e => {
      const v0 = vertices[e[0]];
      const v1 = vertices[e[1]];
      if (v0 && v1) {
        linePositions.push(v0.x, v0.y, v0.z, v1.x, v1.y, v1.z);
      }
    });
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(modelColorVal)
    });
    
    const lineSegments = new THREE.LineSegments(geometry, material);
    currentMeshGroup.add(lineSegments);
  }

  // Render Particles
  if (particles.length > 0) {
    const pGeom = new THREE.BufferGeometry();
    const pPositions = [];
    const pColors = [];
    particles.forEach(p => {
      pPositions.push(p.position.x, p.position.y, p.position.z);
      const c = new THREE.Color(p.color);
      pColors.push(c.r, c.g, c.b);
    });
    pGeom.setAttribute('position', new THREE.Float32BufferAttribute(pPositions, 3));
    pGeom.setAttribute('color', new THREE.Float32BufferAttribute(pColors, 3));
    
    const pMat = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.9
    });
    const points = new THREE.Points(pGeom, pMat);
    currentMeshGroup.add(points);
  }

  // Render Spheres
  if (spheres.length > 0) {
    spheres.forEach(s => {
      const sGeom = new THREE.SphereGeometry(s.radius, 16, 16);
      const sMat = getMaterialFromOptions(s.materialOptions, modelColorVal);
      const sMesh = new THREE.Mesh(sGeom, sMat);
      sMesh.position.copy(s.position);
      currentMeshGroup.add(sMesh);
    });
  }

  // Render Cubes
  if (cubes.length > 0) {
    cubes.forEach(c => {
      const cGeom = new THREE.BoxGeometry(c.size, c.size, c.size);
      const cMat = getMaterialFromOptions(c.materialOptions, modelColorVal);
      const cMesh = new THREE.Mesh(cGeom, cMat);
      cMesh.position.copy(c.position);
      currentMeshGroup.add(cMesh);
    });
  }

  // Render Cylinders
  if (cylinders.length > 0) {
    cylinders.forEach(cy => {
      const cyGeom = new THREE.CylinderGeometry(cy.radiusTop, cy.radiusBottom, cy.height, 16);
      const cyMat = getMaterialFromOptions(cy.materialOptions, modelColorVal);
      const cyMesh = new THREE.Mesh(cyGeom, cyMat);
      cyMesh.position.copy(cy.position);
      currentMeshGroup.add(cyMesh);
    });
  }

  // Render Toruses
  if (toruses.length > 0) {
    toruses.forEach(to => {
      const toGeom = new THREE.TorusGeometry(to.radius, to.tubeRadius, to.radialSegments, to.tubularSegments);
      const toMat = getMaterialFromOptions(to.materialOptions, modelColorVal);
      const toMesh = new THREE.Mesh(toGeom, toMat);
      toMesh.position.copy(to.position);
      currentMeshGroup.add(toMesh);
    });
  }

  // Render Cones
  if (cones.length > 0) {
    cones.forEach(co => {
      const coGeom = new THREE.ConeGeometry(co.radius, co.height, 16);
      const coMat = getMaterialFromOptions(co.materialOptions, modelColorVal);
      const coMesh = new THREE.Mesh(coGeom, coMat);
      coMesh.position.copy(co.position);
      currentMeshGroup.add(coMesh);
    });
  }

  // Render Planes
  if (planes.length > 0) {
    planes.forEach(pl => {
      const plGeom = new THREE.PlaneGeometry(pl.width, pl.height);
      const plMat = getMaterialFromOptions(pl.materialOptions, modelColorVal);
      const plMesh = new THREE.Mesh(plGeom, plMat);
      plMesh.position.copy(pl.position);
      currentMeshGroup.add(plMesh);
    });
  }
  
  renderDynamicControlsUI();
  
  if (!isAnimatedFrame) {
    adjustCamera();
    logToConsole(t.logSuccess, 'success');
  }
}

function adjustCamera() {
  const box = new THREE.Box3().setFromObject(currentMeshGroup);
  const center = new THREE.Vector3();
  box.getCenter(center);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0) {
    camera.position.set(maxDim * 1.2, maxDim * 1.2, maxDim * 1.5);
    camera.lookAt(center);
    controls.target.copy(center);
    controls.update();
  }
}

function bytesToBase64(bytes) {
  let bin = '';
  for(let i=0; i<bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function getSolidGeometryForExport() {
  const exportVertices = [];
  const exportFaces = [];
  
  // 1. If we have raw faces, copy them
  if (geometryData.faces.length > 0) {
    geometryData.vertices.forEach(v => {
      exportVertices.push({ x: v.x, y: v.y, z: v.z });
    });
    geometryData.faces.forEach(f => {
      exportFaces.push([f[0], f[1], f[2]]);
    });
  } else if (geometryData.edges.length > 0) {
    // 2. If we have edges and no faces, generate tubes for edges
    const r = 0.12; // tube thickness
    geometryData.edges.forEach(e => {
      const p1 = geometryData.vertices[e[0]];
      const p2 = geometryData.vertices[e[1]];
      if (!p1 || !p2) return;
      
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dz = p2.z - p1.z;
      const len = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (len < 0.0001) return;
      
      const nx = dx / len;
      const ny = dy / len;
      const nz = dz / len;
      
      let tx = 0, ty = 1, tz = 0;
      if (Math.abs(nx) > 0.9) {
        tx = 0; ty = 0; tz = 1;
      }
      
      let ux = ny * tz - nz * ty;
      let uy = nz * tx - nx * tz;
      let uz = nx * ty - ny * tx;
      const uLen = Math.sqrt(ux*ux + uy*uy + uz*uz);
      ux /= uLen; uy /= uLen; uz /= uLen;
      
      let vx = ny * uz - nz * uy;
      let vy = nz * ux - nx * uz;
      let vz = nx * uy - ny * ux;
      const vLen = Math.sqrt(vx*vx + vy*vy + vz*vz);
      vx /= vLen; vy /= vLen; vz /= vLen;
      
      const ux_r = ux * r, uy_r = uy * r, uz_r = uz * r;
      const vx_r = vx * r, vy_r = vy * r, vz_r = vz * r;
      
      const startIdx = exportVertices.length;
      
      exportVertices.push({ x: p1.x - ux_r - vx_r, y: p1.y - uy_r - vy_r, z: p1.z - uz_r - vz_r });
      exportVertices.push({ x: p1.x + ux_r - vx_r, y: p1.y - uy_r - vy_r, z: p1.z + uz_r - vz_r });
      exportVertices.push({ x: p1.x + ux_r + vx_r, y: p1.y + uy_r + vy_r, z: p1.z + uz_r + vz_r });
      exportVertices.push({ x: p1.x - ux_r + vx_r, y: p1.y - uy_r + vy_r, z: p1.z - uz_r + vz_r });
      
      exportVertices.push({ x: p2.x - ux_r - vx_r, y: p2.y - uy_r - vy_r, z: p2.z - uz_r - vz_r });
      exportVertices.push({ x: p2.x + ux_r - vx_r, y: p2.y - uy_r - vy_r, z: p2.z + uz_r - vz_r });
      exportVertices.push({ x: p2.x + ux_r + vx_r, y: p2.y + uy_r + vy_r, z: p2.z + uz_r + vz_r });
      exportVertices.push({ x: p2.x - ux_r + vx_r, y: p2.y - uy_r + vy_r, z: p2.z - uz_r + vz_r });
      
      const addFace = (i1, i2, i3) => {
        exportFaces.push([startIdx + i1, startIdx + i2, startIdx + i3]);
      };
      
      addFace(0, 2, 1); addFace(0, 3, 2);
      addFace(4, 5, 6); addFace(4, 6, 7);
      addFace(0, 1, 5); addFace(0, 5, 4);
      addFace(1, 2, 6); addFace(1, 6, 5);
      addFace(2, 3, 7); addFace(2, 7, 6);
      addFace(3, 0, 4); addFace(3, 4, 7);
    });
  }
  
  // Helper to append a THREE BufferGeometry to solid lists
  const appendGeometryToSolid = (geom, position, scale) => {
    const posAttr = geom.getAttribute('position');
    if (!posAttr) return;
    
    const startIdx = exportVertices.length;
    const numVerts = posAttr.count;
    
    for (let i = 0; i < numVerts; i++) {
      exportVertices.push({
        x: posAttr.getX(i) * scale.x + position.x,
        y: posAttr.getY(i) * scale.y + position.y,
        z: posAttr.getZ(i) * scale.z + position.z
      });
    }
    
    const indexAttr = geom.index;
    if (indexAttr) {
      const numIndices = indexAttr.count;
      for (let i = 0; i < numIndices; i += 3) {
        exportFaces.push([
          indexAttr.array[i] + startIdx,
          indexAttr.array[i+1] + startIdx,
          indexAttr.array[i+2] + startIdx
        ]);
      }
    } else {
      for (let i = 0; i < numVerts; i += 3) {
        exportFaces.push([
          i + startIdx,
          i + 1 + startIdx,
          i + 2 + startIdx
        ]);
      }
    }
  };
  
  // 3. Append Spheres
  const spheres = geometryData.spheres || [];
  spheres.forEach(s => {
    const sGeom = new THREE.SphereGeometry(s.radius, 16, 16);
    appendGeometryToSolid(sGeom, s.position, new THREE.Vector3(1, 1, 1));
    sGeom.dispose();
  });
  
  // 4. Append Cubes
  const cubes = geometryData.cubes || [];
  cubes.forEach(c => {
    const cGeom = new THREE.BoxGeometry(c.size, c.size, c.size);
    appendGeometryToSolid(cGeom, c.position, new THREE.Vector3(1, 1, 1));
    cGeom.dispose();
  });

  // 5. Append Cylinders
  const cylinders = geometryData.cylinders || [];
  cylinders.forEach(cy => {
    const cyGeom = new THREE.CylinderGeometry(cy.radiusTop, cy.radiusBottom, cy.height, 16);
    appendGeometryToSolid(cyGeom, cy.position, new THREE.Vector3(1, 1, 1));
    cyGeom.dispose();
  });

  // 6. Append Toruses
  const toruses = geometryData.toruses || [];
  toruses.forEach(to => {
    const toGeom = new THREE.TorusGeometry(to.radius, to.tubeRadius, to.radialSegments, to.tubularSegments);
    appendGeometryToSolid(toGeom, to.position, new THREE.Vector3(1, 1, 1));
    toGeom.dispose();
  });

  // 7. Append Cones
  const cones = geometryData.cones || [];
  cones.forEach(co => {
    const coGeom = new THREE.ConeGeometry(co.radius, co.height, 16);
    appendGeometryToSolid(coGeom, co.position, new THREE.Vector3(1, 1, 1));
    coGeom.dispose();
  });

  // 8. Append Planes
  const planes = geometryData.planes || [];
  planes.forEach(pl => {
    const plGeom = new THREE.PlaneGeometry(pl.width, pl.height);
    appendGeometryToSolid(plGeom, pl.position, new THREE.Vector3(1, 1, 1));
    plGeom.dispose();
  });
  
  return {
    vertices: exportVertices,
    faces: exportFaces
  };
}

function getOBJString() {
  let objText = '# Exported from STUDIOS-PRO Scripting Sandbox\n';
  
  // Get all solid geometry (faces, edge tubes, spheres, cubes)
  const solid = getSolidGeometryForExport();
  
  // Output all vertices
  solid.vertices.forEach(v => {
    objText += 'v ' + v.x.toFixed(6) + ' ' + v.y.toFixed(6) + ' ' + v.z.toFixed(6) + '\n';
  });
  
  // Output all faces
  solid.faces.forEach(f => {
    objText += 'f ' + (f[0]+1) + ' ' + (f[1]+1) + ' ' + (f[2]+1) + '\n';
  });
  
  // Output particles as points
  const particles = geometryData.particles || [];
  let vertOffset = solid.vertices.length;
  particles.forEach(p => {
    const pos = p.position;
    objText += 'v ' + pos.x.toFixed(6) + ' ' + pos.y.toFixed(6) + ' ' + pos.z.toFixed(6) + '\n';
    vertOffset++;
    objText += 'p ' + vertOffset + '\n';
  });
  
  return objText;
}

function exportOBJ() {
  const t = translations[currentLang];
  const hasGeom = geometryData.vertices.length > 0 || 
                  (geometryData.particles && geometryData.particles.length > 0) || 
                  (geometryData.spheres && geometryData.spheres.length > 0) || 
                  (geometryData.cubes && geometryData.cubes.length > 0) ||
                  (geometryData.cylinders && geometryData.cylinders.length > 0) ||
                  (geometryData.toruses && geometryData.toruses.length > 0) ||
                  (geometryData.cones && geometryData.cones.length > 0) ||
                  (geometryData.planes && geometryData.planes.length > 0);
  if (!hasGeom) { showToast(t.toastNoGeom); return; }
  const objText = getOBJString();
  downloadFile(objText, 'text/plain', 'model.obj');
  showToast(t.toastObj);
}

function exportSTL() {
  const t = translations[currentLang];
  const hasGeom = geometryData.vertices.length > 0 || 
                  (geometryData.particles && geometryData.particles.length > 0) || 
                  (geometryData.spheres && geometryData.spheres.length > 0) || 
                  (geometryData.cubes && geometryData.cubes.length > 0) ||
                  (geometryData.cylinders && geometryData.cylinders.length > 0) ||
                  (geometryData.toruses && geometryData.toruses.length > 0) ||
                  (geometryData.cones && geometryData.cones.length > 0) ||
                  (geometryData.planes && geometryData.planes.length > 0);
  if (!hasGeom) { showToast(t.toastNoGeom); return; }
  
  // For STL, always generate solid geometry (either existing faces or generated tubes around edges)
  const solidGeom = getSolidGeometryForExport();
  if (solidGeom.faces.length === 0) {
    showToast(t.toastStlErr);
    exportOBJ();
    return;
  }
  
  let stl = 'solid model\n';
  solidGeom.faces.forEach(f => {
    const v0 = solidGeom.vertices[f[0]];
    const v1 = solidGeom.vertices[f[1]];
    const v2 = solidGeom.vertices[f[2]];
    const cb = new THREE.Vector3().subVectors(v2, v1);
    const ab = new THREE.Vector3().subVectors(v0, v1);
    cb.cross(ab).normalize();
    stl += '  facet normal ' + cb.x + ' ' + cb.y + ' ' + cb.z + '\n';
    stl += '    outer loop\n';
    stl += '      vertex ' + v0.x + ' ' + v0.y + ' ' + v0.z + '\n';
    stl += '      vertex ' + v1.x + ' ' + v1.y + ' ' + v1.z + '\n';
    stl += '      vertex ' + v2.x + ' ' + v2.y + ' ' + v2.z + '\n';
    stl += '    endloop\n';
    stl += '  endfacet\n';
  });
  stl += 'endsolid model\n';
  downloadFile(stl, 'text/plain', 'model.stl');
  showToast(t.toastStl);
}


function downloadFile(content, mimeType, fileName) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 300);
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.innerText = message;
  toast.className = 'show';
  setTimeout(() => { toast.className = ''; }, 2500);
}

// Syntax Highlighting for JS code
function highlightJS(code) {
  const escapeHtml = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  const rules = [
    { class: 'comment', regex: /(\/\/.*|\/\*[\s\S]*?\*\/)/ },
    { class: 'string', regex: /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/ },
    { class: 'number', regex: /\b(0x[0-9a-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/ },
    { class: 'api', regex: /\b(api\.(?:clear|log|addVertex|addEdge|addFace))\b/ },
    { class: 'keyword', regex: /\b(const|let|var|function|return|for|if|else|while|do|break|continue|switch|case|default|class|new|this|typeof|instanceof|in|of|Math)\b/ },
    { class: 'class', regex: /\b(THREE|Vector3|BufferGeometry|Float32BufferAttribute|MeshStandardMaterial|Color|Mesh|LineBasicMaterial|LineSegments|AmbientLight|DirectionalLight|PerspectiveCamera|WebGLRenderer|OrbitControls|GridHelper|Box3)\b/ },
    { class: 'function', regex: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*\()/ },
    { class: 'operator', regex: /([+\-*/%&|^!~=<>:?]+)/ }
  ];
  
  let html = '';
  let index = 0;
  
  while (index < code.length) {
    let matched = false;
    for (const rule of rules) {
      rule.regex.lastIndex = 0;
      const match = code.substr(index).match(new RegExp('^' + rule.regex.source));
      if (match) {
        const matchText = match[0];
        html += `<span class="token ${rule.class}">${escapeHtml(matchText)}</span>`;
        index += matchText.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      html += escapeHtml(code[index]);
      index++;
    }
  }
  return html;
}

function updateHighlighting() {
  const editor = document.getElementById('code-editor');
  const highlightingContent = document.getElementById('highlighting-content');
  if (!editor || !highlightingContent) return;
  const code = editor.value;
  highlightingContent.innerHTML = highlightJS(code) + (code.endsWith('\n') ? '\n ' : '');
}

// Curly brace based formatting with 4 spaces indentation
function formatCode(code) {
  const lines = code.split('\n');
  let formattedLines = [];
  let indentLevel = 0;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    let closeBraces = 0;
    let openBraces = 0;
    
    let inString = false;
    let stringChar = '';
    let inComment = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const nextChar = line[j+1];
      
      if (inComment) {
        if (char === '*' && nextChar === '/') {
          inComment = false;
          j++;
        }
        continue;
      }
      if (inString) {
        if (char === '\\') {
          j++;
        } else if (char === stringChar) {
          inString = false;
        }
        continue;
      }
      if (char === '/' && nextChar === '/') {
        break;
      }
      if (char === '/' && nextChar === '*') {
        inComment = true;
        j++;
        continue;
      }
      if (char === '"' || char === "'" || char === '`') {
        inString = true;
        stringChar = char;
        continue;
      }
      
      if (char === '{') {
        openBraces++;
      } else if (char === '}') {
        closeBraces++;
      }
    }
    
    let lineIndent = indentLevel;
    if (line.startsWith('}')) {
      lineIndent = Math.max(0, indentLevel - 1);
    }
    
    const indent = ' '.repeat(Math.max(0, lineIndent * 4));
    
    if (line === '') {
      if (formattedLines.length === 0 || formattedLines[formattedLines.length - 1] !== '') {
        formattedLines.push('');
      }
    } else {
      formattedLines.push(indent + line);
    }
    
    indentLevel += (openBraces - closeBraces);
    indentLevel = Math.max(0, indentLevel);
  }
  
  return formattedLines.join('\n');
}

// Render dynamic sliders inside HUD
function renderSlidersForPreset(presetKey) {
  const genHud = document.getElementById('generative-hud');
  const genControls = document.getElementById('gen-controls');
  if (!genHud || !genControls) return;
  
  genControls.innerHTML = '';
  const params = presetParams[presetKey];
  if (!params) {
    genHud.style.display = 'none';
    return;
  }
  
  genHud.style.display = 'block';
  const editor = document.getElementById('code-editor');
  if (!editor) return;
  const code = editor.value;
  
  params.forEach(p => {
    const regex = new RegExp('(?:const|let|var)\\s+' + p.name + '\\s*=\\s*(-?[0-9\\.]+)', 'i');
    const match = code.match(regex);
    const currentValue = match ? parseFloat(match[1]) : p.default;
    
    const controlDiv = document.createElement('div');
    controlDiv.className = 'hud-control';
    controlDiv.style.flexDirection = 'column';
    controlDiv.style.alignItems = 'stretch';
    controlDiv.style.gap = '4px';
    controlDiv.style.marginBottom = '10px';
    
    const labelRow = document.createElement('div');
    labelRow.style.display = 'flex';
    labelRow.style.justifyContent = 'space-between';
    labelRow.style.fontSize = '0.7rem';
    
    const labelSpan = document.createElement('span');
    labelSpan.innerText = p.label[currentLang];
    
    const valueSpan = document.createElement('span');
    valueSpan.id = `val-${p.name}`;
    valueSpan.innerText = currentValue;
    valueSpan.style.color = 'var(--accent-cyan)';
    valueSpan.style.fontWeight = 'bold';
    
    labelRow.appendChild(labelSpan);
    labelRow.appendChild(valueSpan);
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = p.min;
    slider.max = p.max;
    slider.step = p.step;
    slider.value = currentValue;
    slider.setAttribute('data-param-name', p.name);
    slider.style.width = '100%';
    slider.style.cursor = 'pointer';
    
    slider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      valueSpan.innerText = val;
      
      const currentCode = editor.value;
      const replaceRegex = new RegExp('((?:const|let|var)\\s+' + p.name + '\\s*=\\s*)-?[0-9\\.]+(;?)', 'g');
      editor.value = currentCode.replace(replaceRegex, `$1${val}$2`);
      
      updateHighlighting();
      updateLineNumbers();
      executeScript();
    });
    
    controlDiv.appendChild(labelRow);
    controlDiv.appendChild(slider);
    genControls.appendChild(controlDiv);
  });
}

// Synchronize sliders with the code content (in case of manual code changes)
function syncSlidersFromCode() {
  const select = document.getElementById('preset-select');
  if (!select) return;
  const selectVal = select.value;
  const params = presetParams[selectVal];
  if (!params) return;
  
  const editor = document.getElementById('code-editor');
  if (!editor) return;
  const code = editor.value;
  
  params.forEach(p => {
    const regex = new RegExp('(?:const|let|var)\\s+' + p.name + '\\s*=\\s*(-?[0-9\\.]+)', 'i');
    const match = code.match(regex);
    if (match) {
      const val = parseFloat(match[1]);
      const slider = document.querySelector(`#gen-controls input[data-param-name="${p.name}"]`);
      const valSpan = document.getElementById(`val-${p.name}`);
      if (slider) slider.value = val;
      if (valSpan) valSpan.innerText = val;
    }
  });
}

function updateLineNumbers() {
  const textarea = document.getElementById('code-editor');
  const lineNumbers = document.getElementById('line-numbers');
  if (!textarea || !lineNumbers) return;
  const lines = textarea.value.split('\n').length;
  let numbers = '';
  for (let i = 1; i <= lines; i++) { numbers += i + '<br>'; }
  lineNumbers.innerHTML = numbers;
}

function setLanguage(lang, resetEditor = true) {
  currentLang = lang;
  const t = translations[lang];
  
  const safeSetInner = (id, html) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  };
  const safeSetText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
  };
  const safeSetPlaceholder = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.placeholder = text;
  };

  safeSetInner('app-title', t.appTitle);
  safeSetText('header-tag', t.headerTag);
  safeSetInner('editor-title', t.editorTitle);
  safeSetText('lbl-run', t.runBtn);
  safeSetText('lbl-format', t.formatBtn);
  safeSetText('lbl-share', t.shareBtn);
  safeSetText('lbl-console', t.consoleTitle);
  safeSetText('lbl-hud-colors', t.hudColors);
  safeSetText('lbl-model-color', t.modelColor);
  safeSetText('lbl-bg-color', t.bgColor);
  safeSetText('lbl-hud-camera', t.hudCamera);
  safeSetText('lbl-auto-rotate', t.autoRotate);
  safeSetText('lbl-hud-gen', t.hudGen);
  safeSetText('lbl-exp-obj', t.expObj);
  safeSetText('lbl-exp-stl', t.expStl);
  safeSetText('lbl-exp-html', t.expHtml);
  safeSetText('lbl-sketch-open', t.sketchOpenBtn);
  safeSetText('lbl-sketch-title', t.sketchTitle);
  safeSetText('lbl-sketch-lathe', t.sketchLathe);
  safeSetText('lbl-sketch-extrude', t.sketchExtrude);
  safeSetText('lbl-sketch-clear', t.sketchClear);
  safeSetText('lbl-sketch-save', t.sketchSave);
  safeSetText('lbl-sketch-exit', t.sketchExit);
  safeSetPlaceholder('code-editor', t.placeholder);
  
  const select = document.getElementById('preset-select');
  if (select && select.options) {
    if (select.options[0]) select.options[0].text = t.presetSpiro;
    if (select.options[1]) select.options[1].text = t.presetTorus;
    if (select.options[2]) select.options[2].text = t.presetVase;
    if (select.options[3]) select.options[3].text = t.preset4d;
    if (select.options[4]) select.options[4].text = t.presetLorenz;
    if (select.options[5]) select.options[5].text = t.presetLSystem;
    if (select.options[6]) select.options[6].text = t.presetMobius;
    if (select.options[7]) select.options[7].text = t.presetKlein;
    if (select.options[8]) select.options[8].text = t.presetParticleVortex;
    if (select.options[9]) select.options[9].text = t.presetWebcamSelfie;
    if (select.options[10]) select.options[10].text = t.presetAudioVisualizer;
    if (select.options[11]) select.options[11].text = t.presetPhysicsSandbox;
  }
  
  const previewLbl = document.getElementById('lbl-preview');
  if (previewLbl) previewLbl.innerText = t.previewBtn;
  const overlayTitleEl = document.getElementById('lbl-overlay-title');
  if (overlayTitleEl) overlayTitleEl.innerText = t.overlayTitle;
  const overlayRefreshEl = document.getElementById('lbl-overlay-refresh');
  if (overlayRefreshEl) overlayRefreshEl.innerText = t.overlayRefresh;
  const overlayExitEl = document.getElementById('lbl-overlay-exit');
  if (overlayExitEl) overlayExitEl.innerText = t.overlayExit;

  // Visual Sandbox translation updates
  const galleryBtnEl = document.getElementById('lbl-gallery-btn');
  if (galleryBtnEl) galleryBtnEl.innerText = t.galleryBtn;
  const galleryTitleEl = document.getElementById('lbl-gallery-title');
  if (galleryTitleEl) galleryTitleEl.innerHTML = `<i class="fa-solid fa-images"></i> ${t.galleryTitle}`;

  const tabConsoleEl = document.getElementById('lbl-tab-console');
  if (tabConsoleEl) tabConsoleEl.innerText = t.tabConsole;
  const tabHistoryEl = document.getElementById('lbl-tab-history');
  if (tabHistoryEl) tabHistoryEl.innerText = t.tabHistory;
  const tabToolboxEl = document.getElementById('lbl-tab-toolbox');
  if (tabToolboxEl) tabToolboxEl.innerText = t.tabToolbox;
  const tabProjectsEl = document.getElementById('lbl-tab-projects');
  if (tabProjectsEl) tabProjectsEl.innerText = t.tabProjects;
  safeSetPlaceholder('project-name-input', t.projectPlaceholder);
  safeSetText('lbl-project-save', currentLang === 'en' ? 'Save' : 'Enregistrer');

  safeSetText('lbl-hud-script-params', t.hudScriptParams);
  safeSetText('lbl-env-preset', t.lblEnvPreset);

  const btnScreenshotEl = document.getElementById('lbl-screenshot');
  if (btnScreenshotEl) btnScreenshotEl.innerText = t.screenshotBtn;
  const btnRecordEl = document.getElementById('lbl-record');
  if (btnRecordEl) {
    if (!btnRecordEl.parentElement.classList.contains('recording-active')) {
      btnRecordEl.innerText = t.recordBtn;
    }
  }

  const replInputEl = document.getElementById('console-repl-input');
  if (replInputEl) replInputEl.placeholder = currentLang === 'en' ? 'Type api commands (e.g. api.addSphere(0,0,0,2))...' : 'Commandes api (ex. api.addSphere(0,0,0,2))...';
  
  if (resetEditor && select) {
    const editor = document.getElementById('code-editor');
    const presetTemplates = lang === 'en' ? templatesEn : templatesFr;
    const selectVal = select.value;
    if (editor && selectVal && presetTemplates[selectVal]) {
      editor.value = presetTemplates[selectVal];
      updateHighlighting();
      updateLineNumbers();
      renderSlidersForPreset(selectVal);
      executeScript();
    }
  }
}

function exportHTML() {
  const t = translations[currentLang];
  const code = document.getElementById('code-editor').value;
  const trimmed = code.trim();
  const isHTML = trimmed.startsWith('<') || trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<!doctype');
  
  if (isHTML) {
    downloadFile(code, 'text/html', 'index.html');
    showToast(t.toastHtmlExported);
    return;
  }
  
  const hasGeom = geometryData.vertices.length > 0 || 
                  (geometryData.particles && geometryData.particles.length > 0) || 
                  (geometryData.spheres && geometryData.spheres.length > 0) || 
                  (geometryData.cubes && geometryData.cubes.length > 0);
  if (!hasGeom) { showToast(t.toastNoGeom); return; }
  
  const objText = getOBJString();
  const utf8Bytes = new TextEncoder().encode(objText);
  const base64Data = bytesToBase64(utf8Bytes);
  
  const modelColorVal = document.getElementById('modelColor').value;
  const bgColorVal = document.getElementById('bgColor').value;
  const autoRotateChecked = document.getElementById('autoRotate').checked;
  
  const htmlContent = `<!DOCTYPE html>
<html lang="${currentLang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>STUDIOS-PRO - 3D Interactive Viewer</title>
  <style>
    body { margin: 0; padding: 0; background-color: ${bgColorVal}; color: #ffffff; font-family: 'Segoe UI', Roboto, sans-serif; overflow: hidden; }
    #container { width: 100vw; height: 100vh; display: block; }
    #loader { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 18px; font-weight: 600; background: rgba(15, 23, 42, 0.8); padding: 15px 30px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); pointer-events: none; transition: opacity 0.3s ease; z-index: 10; }
    .panel { position: absolute; bottom: 24px; left: 24px; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(8px); padding: 20px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.1); z-index: 10; min-width: 250px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .panel h3 { margin-top: 0; margin-bottom: 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #38bdf8; }
    .control-group { margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 12px; }
    .control-group:last-child { margin-bottom: 0; }
    .control-group input[type="color"] { border: none; background: none; cursor: pointer; width: 40px; height: 25px; padding: 0; }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"><\/script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/OBJLoader.js"><\/script>
</head>
<body>
  <div id="loader">${currentLang === 'en' ? 'Loading 3D Model...' : 'Chargement du modèle 3D...'}</div>
  <div id="container"></div>
  <div class="panel">
    <h3 id="panel-title">${currentLang === 'en' ? 'Interactive 3D View' : 'Vue 3D Interactive'}</h3>
    <div class="control-group">
      <span>${currentLang === 'en' ? 'Model Color' : 'Couleur du Modèle'}</span>
      <input type="color" id="modelColor" value="${modelColorVal}">
    </div>
    <div class="control-group">
      <span>${currentLang === 'en' ? 'Background' : 'Arrière-plan'}</span>
      <input type="color" id="bgColor" value="${bgColorVal}">
    </div>
    <div class="control-group">
      <span>${currentLang === 'en' ? 'Auto Rotate' : 'Rotation Automatique'}</span>
      <input type="checkbox" id="autoRotate" ${autoRotateChecked ? 'checked' : ''}>
    </div>
  </div>
  
  <script>
    const base64Data = "${base64Data}";
    const container = document.getElementById('container');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('${bgColorVal}');
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 50);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);
    
    scene.add(new THREE.AmbientLight(0x444444));
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(1, 1, 1).normalize();
    scene.add(dirLight1);
    const dirLight2 = new THREE.DirectionalLight(0x223344, 0.6);
    dirLight2.position.set(-1, -1, -1).normalize();
    scene.add(dirLight2);
    
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = ${autoRotateChecked};
    controls.autoRotateSpeed = 2.0;
    
    let currentMesh;
    
    function base64ToBytes(base64) {
      const cleaned = base64.replace(/[^A-Za-z0-9+\\/]/g, '');
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      const lookup = new Uint8Array(256);
      for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;
      const bufferLength = Math.floor(cleaned.length * 0.75);
      const bytes = new Uint8Array(bufferLength);
      let p = 0;
      for (let i = 0; i < cleaned.length; i += 4) {
        const encoded1 = lookup[cleaned.charCodeAt(i)];
        const encoded2 = lookup[cleaned.charCodeAt(i + 1)];
        const encoded3 = lookup[cleaned.charCodeAt(i + 2)] || 0;
        const encoded4 = lookup[cleaned.charCodeAt(i + 3)] || 0;
        bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
        if (p < bufferLength) bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
        if (p < bufferLength) bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
      }
      return bytes;
    }
    
    try {
      const bytes = base64ToBytes(base64Data);
      const text = new TextDecoder('utf-8').decode(bytes);
      const loader = new THREE.OBJLoader();
      const obj = loader.parse(text);
      currentMesh = obj;
      
      obj.traverse((child) => {
        if (child.isMesh) {
          child.material = new THREE.MeshStandardMaterial({ color: '${modelColorVal}', roughness: 0.4, metalness: 0.2, side: THREE.DoubleSide });
        } else if (child.isPoints) {
          child.material = new THREE.PointsMaterial({ size: 0.35, color: '${modelColorVal}', sizeAttenuation: true });
        } else if (child.isLine || child.isLineSegments || child.material) {
          child.material = new THREE.LineBasicMaterial({ color: '${modelColorVal}' });
        }
      });
      
      scene.add(obj);
      adjustCamera(obj);
    } catch (err) {
      console.error(err);
      document.getElementById('loader').innerText = 'Error loading model';
    }
    
    function adjustCamera(obj) {
      document.getElementById('loader').style.opacity = '0';
      setTimeout(() => document.getElementById('loader').remove(), 300);
      
      const box = new THREE.Box3().setFromObject(obj);
      const center = new THREE.Vector3();
      box.getCenter(center);
      const size = new THREE.Vector3();
      box.getSize(size);
      
      obj.position.x -= center.x;
      obj.position.y -= center.y;
      obj.position.z -= center.z;
      
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 0) {
        camera.position.set(maxDim * 1.2, maxDim * 1.2, maxDim * 1.5);
        camera.lookAt(0, 0, 0);
        controls.target.set(0, 0, 0);
        controls.update();
      }
    }
    
    document.getElementById('modelColor').addEventListener('input', (e) => {
      if (!currentMesh) return;
      currentMesh.traverse((child) => {
        if (child.isMesh) {
          child.material.color.set(e.target.value);
        } else if (child.isLine || child.isLineSegments || child.material) {
          child.material.color.set(e.target.value);
        }
      });
    });
    
    document.getElementById('bgColor').addEventListener('input', (e) => {
      scene.background.set(e.target.value);
    });
    
    document.getElementById('autoRotate').addEventListener('change', (e) => {
      controls.autoRotate = e.target.checked;
    });
    
    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();
    
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  <\/script>
</body>
</html>`;

  downloadFile(htmlContent, 'text/html', 'model_viewer.html');
  showToast(t.toastHtml);
}

function generateShareURL() {
  const code = document.getElementById('code-editor').value;
  const modelColorVal = document.getElementById('modelColor').value;
  const bgColorVal = document.getElementById('bgColor').value;
  const autoRotateChecked = document.getElementById('autoRotate').checked;
  const presetSelectVal = document.getElementById('preset-select').value;
  
  const state = {
    c: code,
    mc: modelColorVal,
    bc: bgColorVal,
    ar: autoRotateChecked,
    l: currentLang,
    p: presetSelectVal
  };
  
  const serialized = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
  
  // Build URL pointing to viewer.html (standalone 3D viewer, not the full sandbox)
  const base = window.location.href.replace(/[^/]*$/, '');
  const url = base + 'viewer.html#state=' + serialized;
  return url;
}

function loadStateFromURL() {
  const hash = window.location.hash;
  if (!hash || !hash.startsWith('#state=')) return false;
  
  try {
    const base64 = hash.substring(7);
    const decoded = JSON.parse(decodeURIComponent(escape(atob(base64))));
    
    if (decoded.l) {
      currentLang = decoded.l;
    }
    
    // Set language and update layout (WITHOUT resetting editor)
    setLanguage(currentLang, false);
    
    const presetSelect = document.getElementById('preset-select');
    if (decoded.p && presetSelect) presetSelect.value = decoded.p;
    
    const editor = document.getElementById('code-editor');
    if (decoded.c && editor) editor.value = decoded.c;
    
    const modelColorEl = document.getElementById('modelColor');
    if (decoded.mc && modelColorEl) modelColorEl.value = decoded.mc;
    
    const bgColorEl = document.getElementById('bgColor');
    if (decoded.bc && bgColorEl) {
      bgColorEl.value = decoded.bc;
      if (scene) scene.background.set(new THREE.Color(decoded.bc));
    }
    
    const autoRotateEl = document.getElementById('autoRotate');
    if (decoded.ar !== undefined && autoRotateEl) {
      autoRotateEl.checked = decoded.ar;
      if (controls) {
        controls.autoRotate = decoded.ar;
        controls.autoRotateSpeed = 2.0;
      }
    }
    
    updateHighlighting();
    updateLineNumbers();
    if (decoded.p) renderSlidersForPreset(decoded.p);
    
    // Sync slider controls to values
    syncSlidersFromCode();
    
    return true;
  } catch (err) {
    console.error('Failed to load state from URL:', err);
    return false;
  }
}

let activeToken = null;

function getNumberTokenAtCursor(text, index) {
  if (index < 0 || index > text.length) return null;
  
  let start = index;
  while (start > 0 && /[0-9.-]/.test(text[start - 1])) {
    start--;
  }
  
  let end = index;
  while (end < text.length && /[0-9.-]/.test(text[end])) {
    end++;
  }
  
  const token = text.substring(start, end);
  if (/^-?[0-9]+(?:\.[0-9]+)?$/.test(token)) {
    return {
      value: parseFloat(token),
      start: start,
      end: end,
      token: token
    };
  }
  return null;
}

function getCaretCoordinates(textarea, charIndex) {
  const div = document.createElement('div');
  const style = window.getComputedStyle(textarea);
  
  const properties = [
    'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontVariant', 'fontStretch',
    'lineHeight', 'textTransform', 'letterSpacing', 'wordSpacing', 'textAlign',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'boxSizing', 'width', 'height'
  ];
  
  properties.forEach(prop => {
    div.style[prop] = style[prop];
  });
  
  div.style.position = 'absolute';
  div.style.visibility = 'hidden';
  div.style.whiteSpace = 'pre';
  
  document.body.appendChild(div);
  
  const text = textarea.value;
  const textBefore = text.substring(0, charIndex);
  div.textContent = textBefore;
  
  const span = document.createElement('span');
  span.textContent = text.substring(charIndex, charIndex + 1) || '.';
  div.appendChild(span);
  
  const coordinates = {
    top: span.offsetTop - textarea.scrollTop,
    left: span.offsetLeft - textarea.scrollLeft
  };
  
  document.body.removeChild(div);
  return coordinates;
}

function handleCaretChange() {
  const editor = document.getElementById('code-editor');
  const index = editor.selectionStart;
  const text = editor.value;
  
  const tokenInfo = getNumberTokenAtCursor(text, index);
  const sliderContainer = document.getElementById('floating-slider-container');
  const slider = document.getElementById('floating-slider');
  const sliderVal = document.getElementById('floating-slider-val');
  
  if (tokenInfo) {
    activeToken = {
      start: tokenInfo.start,
      end: tokenInfo.end,
      value: tokenInfo.value,
      decimals: tokenInfo.token.includes('.') ? tokenInfo.token.split('.')[1].length : 0
    };
    
    const coords = getCaretCoordinates(editor, tokenInfo.start);
    let sliderTop = coords.top - 48;
    if (sliderTop < 0) {
      sliderTop = coords.top + 24;
    }
    
    const editorWidth = editor.clientWidth;
    const sliderWidth = 180;
    const sliderLeft = Math.max(10, Math.min(coords.left, editorWidth - sliderWidth - 10));
    
    sliderContainer.style.top = `${sliderTop}px`;
    sliderContainer.style.left = `${sliderLeft}px`;
    
    const val = tokenInfo.value;
    const hasDecimals = tokenInfo.token.includes('.');
    let min, max, step;
    if (val === 0) {
      min = -10;
      max = 10;
      step = 0.1;
    } else {
      const abs = Math.abs(val);
      min = val - abs;
      max = val + abs;
      step = abs / 50;
      if (!hasDecimals) {
        step = Math.ceil(step) || 1;
        min = Math.floor(min);
        max = Math.ceil(max);
      }
    }
    
    slider.min = min;
    slider.max = max;
    slider.step = step;
    slider.value = val;
    sliderVal.innerText = val;
    
    sliderContainer.style.display = 'flex';
  } else {
    sliderContainer.style.display = 'none';
    activeToken = null;
  }
}

const galleryTemplates = [
  { key: 'spiroHelix', icon: 'fa-dharmachakra', gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)', title: { en: 'Parametric Spiro-Helix', fr: 'Spiro-Hélice Paramétrique' }, desc: { en: 'A complex spiral helix wound around a main curved axis, illustrating nested coordinates.', fr: 'Une hélice spirale complexe enroulée autour d\'un axe courbe principal, illustrant des coordonnées imbriquées.' } },
  { key: 'torusKnot', icon: 'fa-circle-notch', gradient: 'linear-gradient(135deg, #3b82f6, #6366f1)', title: { en: 'Torus Knot', fr: 'Nœud Torique' }, desc: { en: 'A classic mathematical knot that lies on the surface of a torus, forming a complex closed loop.', fr: 'Un nœud mathématique classique qui repose sur la surface d\'un tore, formant une boucle fermée complexe.' } },
  { key: 'parametricVase', icon: 'fa-wine-glass', gradient: 'linear-gradient(135deg, #ec4899, #f43f5e)', title: { en: 'Parametric Vase Surface', fr: 'Vase Paramétrique' }, desc: { en: 'A beautiful 3D mesh surface representing a vase, constructed by patching faces together in rings.', fr: 'Une magnifique surface 3D représentant un vase, construite en reliant des faces en anneaux successifs.' } },
  { key: 'hyperHelix', icon: 'fa-bezier-curve', gradient: 'linear-gradient(135deg, #8b5cf6, #d946ef)', title: { en: '4D Hyper-Helix', fr: 'Hélice 4D Hyper' }, desc: { en: 'Stereographic projection of a 4D double spiral rotating in hyperspace down to 3D.', fr: 'Projection stéréographique d\'une double spirale 4D en rotation dans l\'hyperespace vers la 3D.' } },
  { key: 'lorenzAttractor', icon: 'fa-atom', gradient: 'linear-gradient(135deg, #f97316, #eab308)', title: { en: 'Lorenz Attractor (Chaos)', fr: 'Attracteur de Lorenz (Chaos)' }, desc: { en: 'A system of chaotic differential equations representing atmospheric convection, forming butterfly wings.', fr: 'Un système d\'équations différentielles chaotiques représentant la convection atmosphérique, formant des ailes de papillon.' } },
  { key: 'lSystemTree', icon: 'fa-tree', gradient: 'linear-gradient(135deg, #10b981, #059669)', title: { en: 'L-System Fractal Tree', fr: 'Arbre Fractal L-System' }, desc: { en: 'Procedural 3D vegetation generated recursively using string rewriting and vector directions.', fr: 'Végétation 3D procédurale générée de manière récursive en utilisant le réécriture de chaînes et des vecteurs.' } },
  { key: 'mobiusStrip', icon: 'fa-infinity', gradient: 'linear-gradient(135deg, #14b8a6, #06b6d4)', title: { en: 'Möbius Strip', fr: 'Ruban de Möbius' }, desc: { en: 'A one-sided, non-orientable mathematical surface with only one boundary component.', fr: 'Une surface mathématique à face unique et non orientable, possédant une seule bordure.' } },
  { key: 'kleinBottle', icon: 'fa-flask', gradient: 'linear-gradient(135deg, #ef4444, #f97316)', title: { en: 'Klein Bottle', fr: 'Bouteille de Klein' }, desc: { en: 'A closed, non-orientable 3D manifold surface with zero volume and no distinct inner/outer sides.', fr: 'Une surface fermée et non orientable en 3D, ayant un volume nul et pas de côté intérieur/extérieur distinct.' } },
  { key: 'particleVortex', icon: 'fa-snowflake', gradient: 'linear-gradient(135deg, #06b6d4, #10b981)', title: { en: 'Particle System Vortex', fr: 'Vortex de Particules' }, desc: { en: 'Demonstrator of the new Particle & Primitive Mesh APIs. Renders spheres, cubes, and points.', fr: 'Démonstrateur des nouvelles API de Particules et Mesh. Affiche des sphères, des cubes et des points.' } },
  { key: 'webcamSelfie', icon: 'fa-camera', gradient: 'linear-gradient(135deg, #f43f5e, #fb7185)', title: { en: '3D Webcam Point-Cloud', fr: 'Nuage de Points Webcam 3D' }, desc: { en: 'Generates a live 3D point cloud of your face using your webcam and pixel brightness mapping.', fr: 'Génère un nuage de points 3D en direct de votre visage en utilisant votre webcam et la luminosité des pixels.' } },
  { key: 'audioVisualizer', icon: 'fa-music', gradient: 'linear-gradient(135deg, #c084fc, #e879f9)', title: { en: '3D Audio Visualizer', fr: 'Visualiseur Audio 3D' }, desc: { en: 'Animate 3D shapes and particles to the frequency and volume of your microphone.', fr: 'Animez des formes 3D et des particules au rythme de votre microphone.' } },
  { key: 'physicsSandbox', icon: 'fa-basketball', gradient: 'linear-gradient(135deg, #fb923c, #facc15)', title: { en: '3D Physics Sandbox', fr: 'Simulateur Physique 3D' }, desc: { en: 'Simulate realistic gravity and collisions with a stack of rigid bodies falling onto a floor.', fr: 'Simulez une gravité et des collisions réalistes avec un empilement de corps rigides tombant sur le sol.' } },
  { key: 'sketchWineGlass', icon: 'fa-glass-water', gradient: 'linear-gradient(135deg, #10b981, #06b6d4)', title: { en: 'Sketch: Lathe Wine Glass', fr: 'Dessin : Verre à Vin Révolution' }, desc: { en: 'A 3D wine glass model generated using the new api.addLathe rotational sketch algorithm.', fr: 'Un modèle de verre à vin 3D généré en utilisant le nouvel algorithme de révolution api.addLathe.' } },
  { key: 'sketchStarExtrude', icon: 'fa-star', gradient: 'linear-gradient(135deg, #eab308, #fb923c)', title: { en: 'Sketch: Extruded Star', fr: 'Dessin : Étoile Extrudée' }, desc: { en: 'A 5-point star path extruded into a solid 3D mesh using the api.addExtrude API.', fr: 'Un tracé d\'étoile à 5 branches extrudé en un maillage 3D solide via l\'API api.addExtrude.' } },
  { key: 'sketchRoyalChalice', icon: 'fa-trophy', gradient: 'linear-gradient(135deg, #a78bfa, #8b5cf6)', title: { en: 'Sketch: Royal Chalice', fr: 'Dessin : Coupe Royale Révolution' }, desc: { en: 'A majestic chalice model generated using the api.addLathe revolution algorithm.', fr: 'Un modèle de coupe royale majestueuse généré via l\'algorithme de révolution api.addLathe.' } },
  { key: 'sketchMechanicalGear', icon: 'fa-cog', gradient: 'linear-gradient(135deg, #64748b, #475569)', title: { en: 'Sketch: Mechanical Gear', fr: 'Dessin : Engrenage Extrudé' }, desc: { en: 'An 8-tooth mechanical gear extruded into a solid 3D mesh using api.addExtrude.', fr: 'Un engrenage mécanique à 8 dents extrudé en un maillage 3D solide via api.addExtrude.' } }
];

function renderGallery() {
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;
  
  grid.innerHTML = '';
  const t = translations[currentLang];
  
  galleryTemplates.forEach(tpl => {
    const card = document.createElement('div');
    card.className = 'gallery-card';
    card.addEventListener('click', () => {
      if (lockOwner && !isLockHolder) {
        showToast(currentLang === 'en' ? 'Only the lock holder can modify the code.' : 'Seul le détenteur du verrou peut modifier le code.');
        return;
      }
      const presetSelect = document.getElementById('preset-select');
      const editor = document.getElementById('code-editor');
      if (presetSelect && editor) {
        presetSelect.value = tpl.key;
        const presetTemplates = currentLang === 'en' ? templatesEn : templatesFr;
        editor.value = presetTemplates[tpl.key];
        updateHighlighting();
        updateLineNumbers();
        renderSlidersForPreset(tpl.key);
        executeScript();
      }
      document.getElementById('gallery-modal').style.display = 'none';
    });
    
    const iconWrapper = document.createElement('div');
    iconWrapper.className = 'gallery-card-icon';
    iconWrapper.innerHTML = `<i class="fa-solid ${tpl.icon}" style="background: ${tpl.gradient}; -webkit-background-clip: text; -webkit-text-fill-color: transparent;"></i>`;
    
    const title = document.createElement('div');
    title.className = 'gallery-card-title';
    title.innerText = tpl.title[currentLang];
    
    const desc = document.createElement('div');
    desc.className = 'gallery-card-desc';
    desc.innerText = tpl.desc[currentLang];
    
    const action = document.createElement('div');
    action.className = 'gallery-card-action';
    action.innerHTML = `<i class="fa-solid fa-play"></i> ${t.galleryCardLoad}`;
    
    card.appendChild(iconWrapper);
    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(action);
    grid.appendChild(card);
  });
}

function initGallery() {
  const openBtn = document.getElementById('btn-gallery-open');
  const closeBtn = document.getElementById('btn-gallery-close');
  const modal = document.getElementById('gallery-modal');
  
  if (openBtn && modal) {
    openBtn.addEventListener('click', () => {
      renderGallery();
      modal.style.display = 'flex';
    });
  }
  
  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }
  
  if (modal) {
    modal.addEventListener('mousedown', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  }
}

let codeHistory = [];

function getCodeName(code) {
  const lines = code.split('\n');
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i].trim();
    if (line.startsWith('//')) {
      const cleaned = line.replace(/^\/\/+\s*/, '').trim();
      if (cleaned.length > 3) return cleaned.substring(0, 30);
    }
  }
  const presetSelect = document.getElementById('preset-select');
  if (presetSelect && presetSelect.value) {
    const t = translations[currentLang];
    const key = 'preset' + presetSelect.value.charAt(0).toUpperCase() + presetSelect.value.slice(1);
    if (t[key]) return t[key];
  }
  return currentLang === 'en' ? 'Custom Script' : 'Script Personnalisé';
}

function pushToHistory(code) {
  if (!code || code.trim() === '') return;
  if (codeHistory.length > 0 && codeHistory[0].code === code) return;
  
  const item = {
    code: code,
    time: new Date().toLocaleTimeString(),
    name: getCodeName(code)
  };
  
  codeHistory.unshift(item);
  if (codeHistory.length > 10) {
    codeHistory.pop();
  }
  
  updateHistoryUI();
}

function updateHistoryUI() {
  const historyList = document.getElementById('history-list');
  if (!historyList) return;
  
  historyList.innerHTML = '';
  const t = translations[currentLang];
  
  if (codeHistory.length === 0) {
    historyList.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 20px;">${t.historyEmpty}</div>`;
    return;
  }
  
  codeHistory.forEach((item, index) => {
    const el = document.createElement('div');
    el.className = 'history-item';
    el.addEventListener('click', () => {
      if (lockOwner && !isLockHolder) {
        showToast(currentLang === 'en' ? 'Only the lock holder can modify the code.' : 'Seul le détenteur du verrou peut modifier le code.');
        return;
      }
      const editor = document.getElementById('code-editor');
      if (editor) {
        editor.value = item.code;
        updateHighlighting();
        updateLineNumbers();
        syncSlidersFromCode();
        executeScript();
        if (isLockHolder) {
          collabChannel.postMessage({ type: 'CODE_SYNC', code: editor.value, userId: collabUser.id });
        }
        switchConsoleTab('console');
      }
    });
    
    const details = document.createElement('div');
    details.className = 'history-item-details';
    
    const name = document.createElement('div');
    name.className = 'history-item-name';
    name.innerText = item.name;
    
    const time = document.createElement('div');
    time.className = 'history-item-time';
    time.innerText = item.time;
    
    details.appendChild(name);
    details.appendChild(time);
    
    const btn = document.createElement('button');
    btn.className = 'history-item-restore-btn';
    btn.innerText = t.historyRestore;
    
    el.appendChild(details);
    el.appendChild(btn);
    historyList.appendChild(el);
  });
}

const toolboxFeatures = [
  // Primitives
  { name: 'api.addSphere', desc: 'Add a 3D sphere at (x, y, z) with radius.', code: 'api.addSphere(0, 0, 0, 1.5, "#38bdf8");' },
  { name: 'api.addCube', desc: 'Add a 3D cube at (x, y, z) with size.', code: 'api.addCube(0, 0, 0, 1.5, "#38bdf8");' },
  { name: 'api.addCylinder', desc: 'Add a 3D cylinder at (x, y, z).', code: 'api.addCylinder(0, 0, 0, 0.5, 0.5, 2.0, "#38bdf8");' },
  { name: 'api.addTorus', desc: 'Add a 3D torus ring at (x, y, z).', code: 'api.addTorus(0, 0, 0, 1.5, 0.4, 16, 32, "#38bdf8");' },
  { name: 'api.addCone', desc: 'Add a 3D cone at (x, y, z).', code: 'api.addCone(0, 0, 0, 0.8, 1.5, "#38bdf8");' },
  { name: 'api.addPlane', desc: 'Add a 3D plane/sheet at (x, y, z).', code: 'api.addPlane(0, 0, 0, 3.0, 3.0, "#38bdf8");' },
  { name: 'api.addParticle', desc: 'Add a small point particle at (x, y, z).', code: 'api.addParticle(0, 0, 0, 0.4, "#38bdf8");' },
  
  // Custom Materials
  { name: 'Emissive Material', desc: 'Add shape with glowing emissive option.', code: 'api.addSphere(0, 0, 0, 1.5, { color: "#38bdf8", emissive: "#0369a1", metalness: 0.1, roughness: 0.8 });' },
  { name: 'Glossy Metallic', desc: 'Add shape with highly reflective metallic finish.', code: 'api.addTorus(0, 0, 0, 1.5, 0.4, 16, 32, { color: "#fb923c", metalness: 0.9, roughness: 0.1 });' },
  { name: 'Transparent Glass', desc: 'Add shape with translucent glass appearance.', code: 'api.addCube(0, 0, 0, 1.5, { color: "#ffffff", opacity: 0.4, transparent: true, roughness: 0.1 });' },
  
  // Interactive HUD parameters
  { name: 'api.addSlider', desc: 'Create a dynamic slider in the HUD.', code: 'const val = api.addSlider("My Parameter", 5.0, 1.0, 10.0, 0.1);' },
  { name: 'api.addColorPicker', desc: 'Create a dynamic color picker in the HUD.', code: 'const col = api.addColorPicker("My Color", "#ec4899");' },
  
  // Interactive Inputs
  { name: 'api.keys (WASD)', desc: 'Control positions using keyboard buttons.', code: '// Run inside animation loop\nlet px = 0;\nif (api.keys.d) px += 1;\nif (api.keys.a) px -= 1;' },
  { name: 'api.mouse (Follow)', desc: 'Follow the user mouse coordinates.', code: '// Normalized -1 to 1\nconst mx = api.mouse.x * 10;\nconst my = api.mouse.y * 10;\napi.addSphere(mx, my, 0, 1.0);' },
  
  // Audio reactive
  { name: 'Audio Reactive Volume', desc: 'Initialize and read microphone volume.', code: 'api.initAudio();\nconst audio = api.getAudioData();\napi.log("Volume: " + audio.volume);\napi.addSphere(0, 0, 0, 1.0 + audio.volume * 5.0);' }
];

function renderToolboxList() {
  const listDiv = document.getElementById('toolbox-list');
  const searchInput = document.getElementById('toolbox-search');
  if (!listDiv) return;
  
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  listDiv.innerHTML = '';
  
  const filtered = toolboxFeatures.filter(f => 
    f.name.toLowerCase().includes(query) || 
    f.desc.toLowerCase().includes(query)
  );
  
  filtered.forEach(f => {
    const card = document.createElement('div');
    card.className = 'toolbox-card';
    card.addEventListener('mousedown', (e) => {
      e.preventDefault(); // Keep editor focus to preserve cursor selection range
    });
    card.addEventListener('click', () => {
      insertCodeAtCursor(f.code);
    });
    
    const name = document.createElement('div');
    name.className = 'toolbox-card-name';
    name.innerText = f.name;
    
    const desc = document.createElement('div');
    desc.className = 'toolbox-card-desc';
    desc.innerText = f.desc;
    
    const action = document.createElement('div');
    action.className = 'toolbox-card-insert';
    action.innerText = currentLang === 'en' ? 'Insert' : 'Insérer';
    
    card.appendChild(name);
    card.appendChild(desc);
    card.appendChild(action);
    listDiv.appendChild(card);
  });
}

function insertCodeAtCursor(textToInsert) {
  const editor = document.getElementById('code-editor');
  if (!editor) return;
  
  if (lockOwner && !isLockHolder) {
    showToast(currentLang === 'en' ? 'Only the lock holder can modify the code.' : 'Seul le détenteur du verrou peut modifier le code.');
    return;
  }
  
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const oldText = editor.value;
  
  editor.value = oldText.substring(0, start) + textToInsert + oldText.substring(end);
  editor.focus();
  editor.selectionStart = editor.selectionEnd = start + textToInsert.length;
  
  editor.scrollLeft = 0;
  const highlightingEl = document.getElementById('highlighting');
  if (highlightingEl) highlightingEl.scrollLeft = 0;
  
  updateHighlighting();
  updateLineNumbers();
  executeScript();
  if (isLockHolder) {
    collabChannel.postMessage({ type: 'CODE_SYNC', code: editor.value, userId: collabUser.id });
  }
  showToast(currentLang === 'en' ? 'Code snippet inserted!' : 'Snippet de code inséré !');
}

function switchConsoleTab(tabId) {
  const tabConsole = document.getElementById('tab-console');
  const tabHistory = document.getElementById('tab-history');
  const tabToolbox = document.getElementById('tab-toolbox');
  const tabProjects = document.getElementById('tab-projects');
  const logsDiv = document.getElementById('console-logs');
  const historyDiv = document.getElementById('code-history-panel');
  const toolboxDiv = document.getElementById('toolbox-panel');
  const projectsDiv = document.getElementById('projects-panel');
  
  if (tabConsole) tabConsole.classList.remove('active');
  if (tabHistory) tabHistory.classList.remove('active');
  if (tabToolbox) tabToolbox.classList.remove('active');
  if (tabProjects) tabProjects.classList.remove('active');
  if (logsDiv) logsDiv.style.display = 'none';
  if (historyDiv) historyDiv.style.display = 'none';
  if (toolboxDiv) toolboxDiv.style.display = 'none';
  if (projectsDiv) projectsDiv.style.display = 'none';
  
  if (tabId === 'console') {
    if (tabConsole) tabConsole.classList.add('active');
    if (logsDiv) logsDiv.style.display = 'block';
  } else if (tabId === 'history') {
    if (tabHistory) tabHistory.classList.add('active');
    if (historyDiv) {
      historyDiv.style.display = 'block';
      updateHistoryUI();
    }
  } else if (tabId === 'toolbox') {
    if (tabToolbox) tabToolbox.classList.add('active');
    if (toolboxDiv) {
      toolboxDiv.style.display = 'flex';
      renderToolboxList();
    }
  } else if (tabId === 'projects') {
    if (tabProjects) tabProjects.classList.add('active');
    if (projectsDiv) {
      projectsDiv.style.display = 'block';
      renderProjectsList();
    }
  }
}

function initConsoleTabs() {
  const tabConsole = document.getElementById('tab-console');
  const tabHistory = document.getElementById('tab-history');
  const tabToolbox = document.getElementById('tab-toolbox');
  const tabProjects = document.getElementById('tab-projects');
  
  if (tabConsole) {
    tabConsole.addEventListener('click', () => switchConsoleTab('console'));
  }
  if (tabHistory) {
    tabHistory.addEventListener('click', () => switchConsoleTab('history'));
  }
  if (tabToolbox) {
    tabToolbox.addEventListener('click', () => switchConsoleTab('toolbox'));
  }
  if (tabProjects) {
    tabProjects.addEventListener('click', () => switchConsoleTab('projects'));
  }
  
  const searchInput = document.getElementById('toolbox-search');
  if (searchInput) {
    searchInput.addEventListener('input', renderToolboxList);
  }

  const btnSaveProj = document.getElementById('btn-project-save');
  if (btnSaveProj) {
    btnSaveProj.addEventListener('click', saveCurrentProject);
  }
}

function saveCurrentProject() {
  const nameInput = document.getElementById('project-name-input');
  if (!nameInput) return;
  const name = nameInput.value.trim();
  const t = translations[currentLang];
  
  if (name === '') {
    showToast(t.toastProjectEnterName);
    return;
  }
  
  const editor = document.getElementById('code-editor');
  if (!editor) return;
  const code = editor.value;
  
  let projects = [];
  try {
    const stored = localStorage.getItem('studios_pro_saved_projects');
    if (stored) projects = JSON.parse(stored);
  } catch(e) {
    console.error("Failed to parse projects:", e);
  }
  
  const existingIndex = projects.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
  const nowStr = new Date().toLocaleString();
  
  if (existingIndex !== -1) {
    projects[existingIndex].code = code;
    projects[existingIndex].time = nowStr;
  } else {
    projects.unshift({
      name: name,
      code: code,
      time: nowStr
    });
  }
  
  localStorage.setItem('studios_pro_saved_projects', JSON.stringify(projects));
  showToast(t.toastProjectSaved);
  nameInput.value = '';
  renderProjectsList();
}

function deleteProject(index) {
  const t = translations[currentLang];
  let projects = [];
  try {
    const stored = localStorage.getItem('studios_pro_saved_projects');
    if (stored) projects = JSON.parse(stored);
  } catch(e) {
    console.error(e);
  }
  
  if (index >= 0 && index < projects.length) {
    projects.splice(index, 1);
    localStorage.setItem('studios_pro_saved_projects', JSON.stringify(projects));
    showToast(t.toastProjectDeleted);
    renderProjectsList();
  }
}

function loadProject(index) {
  let projects = [];
  try {
    const stored = localStorage.getItem('studios_pro_saved_projects');
    if (stored) projects = JSON.parse(stored);
  } catch(e) {
    console.error(e);
  }
  
  if (index >= 0 && index < projects.length) {
    const item = projects[index];
    if (lockOwner && !isLockHolder) {
      showToast(currentLang === 'en' ? 'Only the lock holder can modify the code.' : 'Seul le détenteur du verrou peut modifier le code.');
      return;
    }
    
    const editor = document.getElementById('code-editor');
    if (editor) {
      editor.value = item.code;
      updateHighlighting();
      updateLineNumbers();
      syncSlidersFromCode();
      executeScript();
      if (isLockHolder) {
        collabChannel.postMessage({ type: 'CODE_SYNC', code: editor.value, userId: collabUser.id });
      }
      switchConsoleTab('console');
    }
  }
}

function renderProjectsList() {
  const listDiv = document.getElementById('projects-list');
  if (!listDiv) return;
  listDiv.innerHTML = '';
  
  const t = translations[currentLang];
  let projects = [];
  try {
    const stored = localStorage.getItem('studios_pro_saved_projects');
    if (stored) projects = JSON.parse(stored);
  } catch(e) {
    console.error(e);
  }
  
  if (projects.length === 0) {
    listDiv.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 20px;">${t.projectEmpty}</div>`;
    return;
  }
  
  projects.forEach((proj, idx) => {
    const el = document.createElement('div');
    el.className = 'project-item';
    el.addEventListener('click', (e) => {
      if (e.target.closest('.project-btn-delete')) return;
      loadProject(idx);
    });
    
    const details = document.createElement('div');
    details.className = 'project-item-details';
    
    const name = document.createElement('div');
    name.className = 'project-item-name';
    name.innerText = proj.name;
    
    const time = document.createElement('div');
    time.className = 'project-item-time';
    time.innerText = proj.time;
    
    details.appendChild(name);
    details.appendChild(time);
    
    const actions = document.createElement('div');
    actions.className = 'project-actions';
    
    const btnLoad = document.createElement('button');
    btnLoad.className = 'project-btn-load';
    btnLoad.innerText = t.projectLoad;
    btnLoad.addEventListener('click', (e) => {
      e.stopPropagation();
      loadProject(idx);
    });
    
    const btnDel = document.createElement('button');
    btnDel.className = 'project-btn-delete';
    btnDel.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
    btnDel.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(currentLang === 'en' ? `Delete project "${proj.name}"?` : `Supprimer le projet "${proj.name}" ?`)) {
        deleteProject(idx);
      }
    });
    
    actions.appendChild(btnLoad);
    actions.appendChild(btnDel);
    
    el.appendChild(details);
    el.appendChild(actions);
    listDiv.appendChild(el);
  });
}

function executeREPLCommand() {
  const input = document.getElementById('console-repl-input');
  if (!input) return;
  
  const cmd = input.value.trim();
  if (cmd === '') return;
  
  if (cmd.startsWith('/say ')) {
    const chatText = cmd.substring(5).trim();
    input.value = '';
    logChatToConsole(collabUser.name, chatText);
    collabChannel.postMessage({ type: 'CHAT_MESSAGE', user: collabUser.name, text: chatText });
    return;
  }
  
  // Echo the command in the console logs
  const consoleLogs = document.getElementById('console-logs');
  const entry = document.createElement('div');
  entry.className = `log-entry info-log`;
  entry.innerHTML = `<span style="color: var(--accent-cyan); font-weight: bold;">&gt;</span> <code style="font-family: 'Fira Code', monospace; color: #fff;">${cmd}</code>`;
  consoleLogs.appendChild(entry);
  consoleLogs.scrollTop = consoleLogs.scrollHeight;
  
  input.value = '';
  
  try {
    const fn = new Function('api', cmd);
    fn(scriptingAPI);
    buildThreeGeometry(false); // Update meshes on screen
  } catch (err) {
    logToConsole(`Error: ${err.message}`, 'error');
  }
}

function initREPL() {
  const input = document.getElementById('console-repl-input');
  const sendBtn = document.getElementById('btn-repl-send');
  
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        executeREPLCommand();
      }
    });
  }
  
  if (sendBtn) {
    sendBtn.addEventListener('click', executeREPLCommand);
  }
}

function downloadURL(url, fileName) {
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); }, 300);
}

function takeScreenshot() {
  const t = translations[currentLang];
  // Force a render pass to capture the canvas correctly
  renderer.render(scene, camera);
  try {
    const dataUrl = renderer.domElement.toDataURL('image/png');
    downloadURL(dataUrl, 'studios_pro_screenshot.png');
    showToast(t.toastScreenshot);
  } catch (err) {
    console.error('Screenshot error:', err);
    logToConsole('Error taking screenshot: ' + err.message, 'error');
  }
}

let mediaRecorder = null;
let recordedChunks = [];
let isRecordingState = false;
let recordingTimer = null;
let originalAutoRotateState = false;

function toggleRecording() {
  const btn = document.getElementById('btn-record');
  const lbl = document.getElementById('lbl-record');
  const t = translations[currentLang];
  
  if (!isRecordingState) {
    // Start Recording
    isRecordingState = true;
    btn.classList.add('recording-active');
    lbl.innerText = currentLang === 'en' ? 'Recording...' : 'Enregistrement...';
    
    recordedChunks = [];
    const stream = renderer.domElement.captureStream(30);
    
    let options = { mimeType: 'video/webm; codecs=vp9' };
    try {
      mediaRecorder = new MediaRecorder(stream, options);
    } catch (e) {
      try {
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      } catch (e2) {
        mediaRecorder = new MediaRecorder(stream);
      }
    }
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      downloadURL(url, 'studios_pro_recording.webm');
      showToast(t.toastRecordSaved);
      
      // Cleanup Object URL
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    
    // Auto-spin scene
    originalAutoRotateState = controls.autoRotate;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 3.0; // slightly faster for recording
    
    mediaRecorder.start();
    showToast(t.toastRecordStarted);
    
    // Auto stop after 4 seconds
    recordingTimer = setTimeout(() => {
      toggleRecording();
    }, 4000);
  } else {
    // Stop Recording
    isRecordingState = false;
    clearTimeout(recordingTimer);
    
    btn.classList.remove('recording-active');
    lbl.innerText = t.recordBtn;
    
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    
    // Restore auto-spin
    controls.autoRotate = originalAutoRotateState;
  }
}

function initCaptureButtons() {
  const screenshotBtn = document.getElementById('btn-screenshot');
  const recordBtn = document.getElementById('btn-record');
  
  if (screenshotBtn) {
    screenshotBtn.addEventListener('click', takeScreenshot);
  }
  if (recordBtn) {
    recordBtn.addEventListener('click', toggleRecording);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initScene();
  initGallery();
  initConsoleTabs();
  initREPL();
  initCaptureButtons();
  const editor = document.getElementById('code-editor');
  const presetSelect = document.getElementById('preset-select');
  
  let loaded = false;
  try {
    loaded = loadStateFromURL();
  } catch(e) {
    console.error(e);
  }
  
  if (!loaded) {
    editor.value = templatesEn.spiroHelix;
    updateHighlighting();
    updateLineNumbers();
    renderSlidersForPreset('spiroHelix');
    setLanguage(currentLang, true);
  }
  
  editor.addEventListener('input', () => {
    updateHighlighting();
    updateLineNumbers();
    syncSlidersFromCode();
    if (isLockHolder) {
      collabChannel.postMessage({ type: 'CODE_SYNC', code: editor.value, userId: collabUser.id });
    }
  });
  
  editor.addEventListener('mouseup', handleCaretChange);
  editor.addEventListener('keyup', handleCaretChange);
  
  editor.addEventListener('scroll', () => {
    document.getElementById('line-numbers').scrollTop = editor.scrollTop;
    document.getElementById('highlighting').scrollTop = editor.scrollTop;
    document.getElementById('highlighting').scrollLeft = editor.scrollLeft;
    
    if (activeToken) {
      const coords = getCaretCoordinates(editor, activeToken.start);
      let sliderTop = coords.top - 48;
      if (sliderTop < 0) {
        sliderTop = coords.top + 24;
      }
      const editorWidth = editor.clientWidth;
      const sliderWidth = 180;
      const sliderLeft = Math.max(10, Math.min(coords.left, editorWidth - sliderWidth - 10));
      
      const sliderContainer = document.getElementById('floating-slider-container');
      sliderContainer.style.top = `${sliderTop}px`;
      sliderContainer.style.left = `${sliderLeft}px`;
    }
  });

  document.getElementById('floating-slider').addEventListener('input', (e) => {
    if (lockOwner && !isLockHolder) return;
    if (!activeToken) return;
    
    const val = parseFloat(e.target.value);
    const formattedVal = activeToken.decimals > 0 ? val.toFixed(activeToken.decimals) : Math.round(val).toString();
    
    const text = editor.value;
    const before = text.substring(0, activeToken.start);
    const after = text.substring(activeToken.end);
    
    editor.value = before + formattedVal + after;
    activeToken.end = activeToken.start + formattedVal.length;
    activeToken.value = val;
    
    document.getElementById('floating-slider-val').innerText = formattedVal;
    
    updateHighlighting();
    updateLineNumbers();
    executeScript();
    if (isLockHolder) {
      collabChannel.postMessage({ type: 'CODE_SYNC', code: editor.value, userId: collabUser.id });
    }
  });

  document.addEventListener('mousedown', (e) => {
    const sliderContainer = document.getElementById('floating-slider-container');
    if (sliderContainer && sliderContainer.style.display !== 'none') {
      if (sliderContainer.contains(e.target) || e.target === editor) {
        return;
      }
      sliderContainer.style.display = 'none';
      activeToken = null;
    }
  });
  
  presetSelect.addEventListener('change', (e) => {
    if (lockOwner && !isLockHolder) {
      showToast(currentLang === 'en' ? 'Only the lock holder can modify the code.' : 'Seul le détenteur du verrou peut modifier le code.');
      return;
    }
    const presetTemplates = currentLang === 'en' ? templatesEn : templatesFr;
    if (presetTemplates[e.target.value]) {
      editor.value = presetTemplates[e.target.value];
      updateHighlighting();
      updateLineNumbers();
      renderSlidersForPreset(e.target.value);
      executeScript();
      if (isLockHolder) {
        collabChannel.postMessage({ type: 'CODE_SYNC', code: editor.value, userId: collabUser.id });
      }
    }
  });
  
  document.getElementById('btn-format').addEventListener('click', () => {
    if (lockOwner && !isLockHolder) {
      showToast(currentLang === 'en' ? 'Only the lock holder can modify the code.' : 'Seul le détenteur du verrou peut modifier le code.');
      return;
    }
    editor.value = formatCode(editor.value);
    updateHighlighting();
    updateLineNumbers();
    syncSlidersFromCode();
    executeScript();
    if (isLockHolder) {
      collabChannel.postMessage({ type: 'CODE_SYNC', code: editor.value, userId: collabUser.id });
    }
  });
  
  document.getElementById('btn-run').addEventListener('click', executeScript);
  document.getElementById('modelColor').addEventListener('input', () => { executeScript(); });
  document.getElementById('bgColor').addEventListener('input', (e) => { scene.background.set(e.target.value); });
  document.getElementById('autoRotate').addEventListener('change', (e) => { controls.autoRotate = e.target.checked; controls.autoRotateSpeed = 2.0; });
  
  // Ambient Preset select listener
  const ambPreset = document.getElementById('ambientPreset');
  if (ambPreset) {
    ambPreset.addEventListener('change', (e) => {
      applyEnvironmentPreset(e.target.value);
    });
  }
  
  // Mouse state tracking on the 3D viewport
  const canvas3dEl = document.getElementById('canvas3d');
  if (canvas3dEl) {
    canvas3dEl.addEventListener('mousemove', (e) => {
      const rect = canvas3dEl.getBoundingClientRect();
      mouseState.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseState.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });
    canvas3dEl.addEventListener('mousedown', () => { mouseState.isDown = true; });
    canvas3dEl.addEventListener('mouseup', () => { mouseState.isDown = false; });
  }

  document.getElementById('btn-lang').addEventListener('click', () => {
    const nextLang = currentLang === 'en' ? 'fr' : 'en';
    setLanguage(nextLang);
  });
  
  document.getElementById('btn-exp-obj').addEventListener('click', () => {
    checkPremiumAction('export', exportOBJ);
  });
  document.getElementById('btn-exp-stl').addEventListener('click', () => {
    checkPremiumAction('export', exportSTL);
  });
  document.getElementById('btn-exp-html').addEventListener('click', () => {
    checkPremiumAction('export', exportHTML);
  });
  
  document.getElementById('btn-share').addEventListener('click', () => {
    checkPremiumAction('share', () => {
      const url = generateShareURL();
      navigator.clipboard.writeText(url).then(() => {
        showToast(translations[currentLang].toastShareCopied);
      }).catch(err => {
        console.error('Could not copy text: ', err);
        window.prompt('Share URL (copy this link):', url);
      });
    });
  });
  
  // Full Preview button → open fullscreen overlay
  document.getElementById('btn-preview').addEventListener('click', () => {
    const code = document.getElementById('code-editor').value;
    const overlay = document.getElementById('html-fullscreen-overlay');
    const fullFrame = document.getElementById('html-fullscreen-frame');
    fullFrame.srcdoc = code;
    overlay.style.display = 'flex';
    // Update title language
    const t = translations[currentLang];
    const titleEl = document.getElementById('lbl-overlay-title');
    if (titleEl) titleEl.innerText = currentLang === 'en' ? 'HTML Live Preview' : 'Aperçu HTML en Direct';
  });

  // Overlay Refresh button
  document.getElementById('btn-overlay-refresh').addEventListener('click', () => {
    const code = document.getElementById('code-editor').value;
    const fullFrame = document.getElementById('html-fullscreen-frame');
    fullFrame.srcdoc = '';
    setTimeout(() => { fullFrame.srcdoc = code; }, 50);
    showToast(currentLang === 'en' ? '🔄 Preview refreshed!' : '🔄 Aperçu actualisé !');
  });

  // Overlay Exit button
  document.getElementById('btn-overlay-exit').addEventListener('click', () => {
    const overlay = document.getElementById('html-fullscreen-overlay');
    overlay.style.display = 'none';
  });
  
  initSketcher();
  initCollaboration();
  setTimeout(executeScript, 200);
});

// --- COLLABORATION ENGINE LOGIC ---
let collabUser = {
  id: Math.random().toString(36).substring(2, 11),
  name: 'Coder-' + Math.floor(100 + Math.random() * 900)
};
let otherUsers = new Map();
let collabChannel = new BroadcastChannel('studios_pro_sandbox_collab');
let isLockHolder = false;
let lockOwner = null;
let lockOwnerId = null;
let cameraSyncEnabled = false;
let isUpdatingCameraFromSync = false;

// Relaying messages over window postMessage to host Firestore database broker
let codeSyncTimeout = null;
let lastCameraSyncTime = 0;

collabChannel.postMessage = function(msg) {
  // Always call original BroadcastChannel locally
  BroadcastChannel.prototype.postMessage.call(collabChannel, msg);
  
  if (!collabRoomId) return; // Only sync remotely if in a room!
  
  // Forward to parent window for remote sync
  if (msg.type === 'CODE_SYNC') {
    if (codeSyncTimeout) clearTimeout(codeSyncTimeout);
    codeSyncTimeout = setTimeout(() => {
      window.parent.postMessage({ type: 'COLLAB_MSG', payload: msg }, '*');
    }, 300);
  } else if (msg.type === 'CAMERA_MOVE') {
    const now = Date.now();
    if (now - lastCameraSyncTime > 100) {
      window.parent.postMessage({ type: 'COLLAB_MSG', payload: msg }, '*');
      lastCameraSyncTime = now;
    }
  } else {
    window.parent.postMessage({ type: 'COLLAB_MSG', payload: msg }, '*');
  }
};

window.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'COLLAB_MSG') {
    const msg = e.data.payload;
    if (msg && msg.userId !== collabUser.id) {
      handleCollabMessage({ data: msg });
    }
  }
});

function initCollaboration() {
  const btnLock = document.getElementById('btn-collab-lock');
  const btnCamera = document.getElementById('btn-collab-camera');
  
  if (btnLock) {
    btnLock.addEventListener('click', toggleCollabLock);
  }
  if (btnCamera) {
    btnCamera.addEventListener('click', toggleCollabCamera);
  }
  
  if (typeof controls !== 'undefined' && controls) {
    setupCameraCollabListener();
  } else {
    setTimeout(() => {
      if (typeof controls !== 'undefined' && controls) setupCameraCollabListener();
    }, 500);
  }
  
  collabChannel.postMessage({
    type: 'USER_JOIN',
    user: collabUser
  });
  
  window.addEventListener('beforeunload', () => {
    collabChannel.postMessage({
      type: 'USER_LEAVE',
      userId: collabUser.id
    });
  });
  
  collabChannel.onmessage = handleCollabMessage;
  
  updateCollabUI();
  
  // Notify parent window that we are fully ready to receive collaboration messages
  window.parent.postMessage({ type: 'COLLAB_IFRAME_READY' }, '*');
}

function setupCameraCollabListener() {
  controls.addEventListener('change', () => {
    if (cameraSyncEnabled && !isUpdatingCameraFromSync) {
      collabChannel.postMessage({
        type: 'CAMERA_MOVE',
        userId: collabUser.id,
        position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
        target: { x: controls.target.x, y: controls.target.y, z: controls.target.z }
      });
    }
  });
}

function handleCollabMessage(e) {
  const msg = e.data;
  if (!msg || msg.userId === collabUser.id) return;
  
  switch (msg.type) {
    case 'USER_JOIN':
      otherUsers.set(msg.user.id, msg.user.name);
      collabChannel.postMessage({
        type: 'USER_PRESENCE',
        userId: collabUser.id,
        user: collabUser
      });
      if (isLockHolder) {
        collabChannel.postMessage({
          type: 'LOCK_REQUEST',
          userId: collabUser.id,
          userName: collabUser.name
        });
        collabChannel.postMessage({
          type: 'CODE_SYNC',
          userId: collabUser.id,
          code: document.getElementById('code-editor').value
        });
      }
      updateCollabUI();
      break;
      
    case 'USER_PRESENCE':
      otherUsers.set(msg.user.id, msg.user.name);
      updateCollabUI();
      break;
      
    case 'USER_LEAVE':
      otherUsers.delete(msg.userId);
      if (lockOwnerId === msg.userId) {
        lockOwner = null;
        lockOwnerId = null;
        isLockHolder = false;
        
        const editor = document.getElementById('code-editor');
        if (editor) editor.readOnly = false;
        
        const overlay = document.getElementById('editor-lock-overlay');
        if (overlay) overlay.style.display = 'none';
        
        const btnLock = document.getElementById('btn-collab-lock');
        if (btnLock) {
          btnLock.classList.remove('locked', 'active');
          btnLock.innerHTML = '<i class="fa-solid fa-lock-open"></i>';
        }
      }
      updateCollabUI();
      break;
      
    case 'LOCK_REQUEST':
      lockOwner = msg.userName;
      lockOwnerId = msg.userId;
      isLockHolder = false;
      
      const editorToLock = document.getElementById('code-editor');
      if (editorToLock) editorToLock.readOnly = true;
      
      const overlayToShow = document.getElementById('editor-lock-overlay');
      if (overlayToShow) overlayToShow.style.display = 'flex';
      
      const lockOverlayText = document.getElementById('lock-overlay-text');
      if (lockOverlayText) {
        lockOverlayText.innerText = currentLang === 'en' ? `${lockOwner} is editing...` : `${lockOwner} est en train d'éditer...`;
      }
      
      const btnLockToLock = document.getElementById('btn-collab-lock');
      if (btnLockToLock) {
        btnLockToLock.classList.remove('active');
        btnLockToLock.classList.add('locked');
        btnLockToLock.innerHTML = '<i class="fa-solid fa-lock"></i>';
      }
      updateCollabUI();
      break;
      
    case 'LOCK_RELEASE':
      lockOwner = null;
      lockOwnerId = null;
      isLockHolder = false;
      
      const editorToUnlock = document.getElementById('code-editor');
      if (editorToUnlock) editorToUnlock.readOnly = false;
      
      const overlayToHide = document.getElementById('editor-lock-overlay');
      if (overlayToHide) overlayToHide.style.display = 'none';
      
      const btnLockToUnlock = document.getElementById('btn-collab-lock');
      if (btnLockToUnlock) {
        btnLockToUnlock.classList.remove('locked', 'active');
        btnLockToUnlock.innerHTML = '<i class="fa-solid fa-lock-open"></i>';
      }
      updateCollabUI();
      break;
      
    case 'CODE_SYNC':
      if (!isLockHolder) {
        const editorToSync = document.getElementById('code-editor');
        if (editorToSync) {
          editorToSync.value = msg.code;
          updateHighlighting();
          updateLineNumbers();
          syncSlidersFromCode();
        }
      }
      break;
      
    case 'RUN_SCRIPT':
      if (!isLockHolder) {
        executeScript();
      }
      break;
      
    case 'CAMERA_MOVE':
      if (cameraSyncEnabled && camera && controls) {
        isUpdatingCameraFromSync = true;
        camera.position.set(msg.position.x, msg.position.y, msg.position.z);
        controls.target.set(msg.target.x, msg.target.y, msg.target.z);
        controls.update();
        isUpdatingCameraFromSync = false;
      }
      break;
      
    case 'CHAT_MESSAGE':
      logChatToConsole(msg.user, msg.text);
      break;
  }
}

function toggleCollabLock() {
  const btnLock = document.getElementById('btn-collab-lock');
  const editor = document.getElementById('code-editor');
  if (!btnLock || !editor) return;
  
  if (isLockHolder) {
    isLockHolder = false;
    lockOwner = null;
    lockOwnerId = null;
    
    btnLock.classList.remove('active');
    btnLock.innerHTML = '<i class="fa-solid fa-lock-open"></i>';
    
    collabChannel.postMessage({
      type: 'LOCK_RELEASE',
      userId: collabUser.id
    });
    
    showToast(currentLang === 'en' ? '🔓 Edit Lock Released' : '🔓 Verrou de modification relâché');
  } else {
    if (lockOwner !== null) {
      showToast(currentLang === 'en' ? `Already locked by ${lockOwner}` : `Déjà verrouillé par ${lockOwner}`);
      return;
    }
    
    isLockHolder = true;
    lockOwner = collabUser.name;
    lockOwnerId = collabUser.id;
    
    btnLock.classList.add('active');
    btnLock.innerHTML = '<i class="fa-solid fa-lock"></i>';
    
    collabChannel.postMessage({
      type: 'LOCK_REQUEST',
      userId: collabUser.id,
      userName: collabUser.name
    });
    
    collabChannel.postMessage({
      type: 'CODE_SYNC',
      userId: collabUser.id,
      code: editor.value
    });
    
    showToast(currentLang === 'en' ? '🔒 Edit Lock Acquired' : '🔒 Verrou de modification acquis');
  }
  updateCollabUI();
}

function toggleCollabCamera() {
  const btnCamera = document.getElementById('btn-collab-camera');
  if (!btnCamera) return;
  
  cameraSyncEnabled = !cameraSyncEnabled;
  if (cameraSyncEnabled) {
    btnCamera.classList.add('active');
    btnCamera.innerHTML = '<i class="fa-solid fa-video"></i>';
    showToast(currentLang === 'en' ? '🎥 Camera sync enabled' : '🎥 Synchro caméra activée');
  } else {
    btnCamera.classList.remove('active');
    btnCamera.innerHTML = '<i class="fa-solid fa-video-slash"></i>';
    showToast(currentLang === 'en' ? '🎥 Camera sync disabled' : '🎥 Synchro caméra désactivée');
  }
}

function updateCollabUI() {
  const badgeDot = document.getElementById('collab-dot');
  const badgeText = document.getElementById('collab-text');
  if (!badgeDot || !badgeText) return;
  
  if (!collabRoomId) {
    badgeDot.className = 'collab-dot offline';
    badgeText.innerText = currentLang === 'en' ? 'Single Mode' : 'Mode Solo';
  } else if (otherUsers.size === 0) {
    badgeDot.className = 'collab-dot online';
    badgeText.innerText = currentLang === 'en' ? 'Collab: Room Active' : 'Collab : Salon Actif';
  } else {
    if (lockOwner !== null) {
      badgeDot.className = 'collab-dot locked';
      if (isLockHolder) {
        badgeText.innerText = currentLang === 'en' ? 'You Hold Lock' : 'Verrou détenu';
      } else {
        badgeText.innerText = currentLang === 'en' ? `Locked by ${lockOwner}` : `Verrouillé par ${lockOwner}`;
      }
    } else {
      badgeDot.className = 'collab-dot online';
      const count = otherUsers.size + 1;
      badgeText.innerText = currentLang === 'en' ? `Connected: ${count} Users` : `Connecté : ${count} Utilisateurs`;
    }
  }
}

function logChatToConsole(user, text) {
  const consoleLogs = document.getElementById('console-logs');
  if (!consoleLogs) return;
  
  const entry = document.createElement('div');
  entry.className = `log-entry chat-log`;
  
  const time = new Date().toLocaleTimeString();
  entry.innerHTML = `<span class="log-time">[${time}]</span> <span class="chat-user">${user}:</span> <span class="chat-text">${text}</span>`;
  consoleLogs.appendChild(entry);
  consoleLogs.scrollTop = consoleLogs.scrollHeight;
}

// --- 3D SKETCHER ENGINE LOGIC ---
let isSketchMode = false;
let sketchMode = 'lathe'; // 'lathe' or 'extrude'
let sketchPoints = [];
let isSketchDrawing = false;
let sketchPreviewMesh = null;

function initSketcher() {
  const btnOpen = document.getElementById('btn-sketch-open');
  const btnExit = document.getElementById('btn-sketch-exit');
  const btnClear = document.getElementById('btn-sketch-clear');
  const btnSave = document.getElementById('btn-sketch-save');
  const btnLathe = document.getElementById('btn-sketch-lathe');
  const btnExtrude = document.getElementById('btn-sketch-extrude');
  const canvas = document.getElementById('sketch-canvas');
  
  if (btnOpen) btnOpen.addEventListener('click', enterSketchMode);
  if (btnExit) btnExit.addEventListener('click', exitSketchMode);
  if (btnClear) btnClear.addEventListener('click', clearSketch);
  if (btnSave) btnSave.addEventListener('click', saveSketch);
  
  if (btnLathe) {
    btnLathe.addEventListener('click', () => {
      setSketchMode('lathe');
    });
  }
  if (btnExtrude) {
    btnExtrude.addEventListener('click', () => {
      setSketchMode('extrude');
    });
  }
  
  if (canvas) {
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    
    // Mouse events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', drawMove);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);
    
    // Touch events
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        startDrawing({
          clientX: touch.clientX,
          clientY: touch.clientY,
          preventDefault: () => e.preventDefault()
        });
      }
    }, { passive: false });
    
    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        drawMove({
          clientX: touch.clientX,
          clientY: touch.clientY,
          preventDefault: () => e.preventDefault()
        });
      }
    }, { passive: false });
    
    canvas.addEventListener('touchend', stopDrawing);
  }
  
  window.addEventListener('resize', resizeSketchCanvas);
}

function enterSketchMode() {
  if (lockOwner && !isLockHolder) {
    showToast(currentLang === 'en' ? 'Only the lock holder can draw.' : 'Seul le détenteur du verrou peut dessiner.');
    return;
  }
  
  isSketchMode = true;
  sketchPoints = [];
  
  const canvas = document.getElementById('sketch-canvas');
  const toolbar = document.getElementById('sketch-toolbar');
  const instructions = document.getElementById('sketch-instructions');
  
  if (canvas) canvas.style.display = 'block';
  if (toolbar) toolbar.style.display = 'flex';
  if (instructions) instructions.style.display = 'block';
  
  resizeSketchCanvas();
  setSketchMode('lathe');
  
  if (controls) controls.enabled = false;
  
  if (camera && controls) {
    camera.position.set(0, 0, 20);
    controls.target.set(0, 0, 0);
    controls.update();
  }
  
  if (renderer) renderer.render(scene, camera);
  
  showToast(currentLang === 'en' ? '🎨 3D Sketcher Mode Enabled' : '🎨 Mode 3D Sketcher activé');
}

function exitSketchMode() {
  isSketchMode = false;
  isSketchDrawing = false;
  sketchPoints = [];
  
  const canvas = document.getElementById('sketch-canvas');
  const toolbar = document.getElementById('sketch-toolbar');
  const instructions = document.getElementById('sketch-instructions');
  
  if (canvas) canvas.style.display = 'none';
  if (toolbar) toolbar.style.display = 'none';
  if (instructions) instructions.style.display = 'none';
  
  if (sketchPreviewMesh) {
    scene.remove(sketchPreviewMesh);
    sketchPreviewMesh = null;
  }
  
  if (controls) controls.enabled = true;
  
  executeScript();
}

function setSketchMode(mode) {
  sketchMode = mode;
  sketchPoints = [];
  
  const btnLathe = document.getElementById('btn-sketch-lathe');
  const btnExtrude = document.getElementById('btn-sketch-extrude');
  
  if (mode === 'lathe') {
    if (btnLathe) btnLathe.classList.add('active');
    if (btnExtrude) btnExtrude.classList.remove('active');
  } else {
    if (btnLathe) btnLathe.classList.remove('active');
    if (btnExtrude) btnExtrude.classList.add('active');
  }
  
  updateSketchInstructions();
  clearSketchCanvas();
  
  if (sketchPreviewMesh) {
    scene.remove(sketchPreviewMesh);
    sketchPreviewMesh = null;
  }
  if (renderer) renderer.render(scene, camera);
}

function updateSketchInstructions() {
  const instructions = document.getElementById('sketch-instructions');
  if (!instructions) return;
  
  if (sketchMode === 'lathe') {
    instructions.innerText = currentLang === 'en' 
      ? 'Draw half-profile curve on the RIGHT side of the dotted axis Y' 
      : 'Dessinez le demi-profil sur le côté DROIT de l\'axe pointillé Y';
  } else {
    instructions.innerText = currentLang === 'en'
      ? 'Draw a closed shape (release mouse to auto-close)'
      : 'Dessinez o formă închisă (eliberați mouse-ul pentru închidere)';
  }
}

function resizeSketchCanvas() {
  const canvas = document.getElementById('sketch-canvas');
  const canvas3d = document.getElementById('canvas3d');
  if (!canvas || !canvas3d) return;
  
  canvas.width = canvas3d.clientWidth;
  canvas.height = canvas3d.clientHeight;
  
  if (isSketchMode) {
    clearSketchCanvas();
  }
}

function clearSketchCanvas() {
  const canvas = document.getElementById('sketch-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  if (sketchMode === 'lathe') {
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 8]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  
  if (sketchPoints.length > 1) {
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(sketchPoints[0].px, sketchPoints[0].py);
    for (let i = 1; i < sketchPoints.length; i++) {
      ctx.lineTo(sketchPoints[i].px, sketchPoints[i].py);
    }
    
    if (sketchMode === 'extrude' && !isSketchDrawing) {
      ctx.closePath();
    }
    
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

function clearSketch() {
  sketchPoints = [];
  clearSketchCanvas();
  if (sketchPreviewMesh) {
    scene.remove(sketchPreviewMesh);
    sketchPreviewMesh = null;
  }
  if (renderer) renderer.render(scene, camera);
}

function startDrawing(e) {
  if (e.preventDefault) e.preventDefault();
  isSketchDrawing = true;
  sketchPoints = [];
  
  const canvas = document.getElementById('sketch-canvas');
  const rect = canvas.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;
  
  addSketchPoint(px, py);
}

function drawMove(e) {
  if (!isSketchDrawing) return;
  if (e.preventDefault) e.preventDefault();
  
  const canvas = document.getElementById('sketch-canvas');
  const rect = canvas.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;
  
  const lastPt = sketchPoints[sketchPoints.length - 1];
  if (lastPt) {
    const dist = Math.hypot(px - lastPt.px, py - lastPt.py);
    if (dist < 5) return;
  }
  
  addSketchPoint(px, py);
}

function stopDrawing() {
  if (!isSketchDrawing) return;
  isSketchDrawing = false;
  
  if (sketchPoints.length > 2) {
    if (sketchMode === 'extrude') {
      clearSketchCanvas();
    }
    update3DPreview(true);
  }
}

function addSketchPoint(px, py) {
  const canvas = document.getElementById('sketch-canvas');
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const scale = 25;
  const x = (px - centerX) / scale;
  const y = (centerY - py) / scale;
  
  const finalX = sketchMode === 'lathe' ? Math.max(0.01, x) : x;
  
  sketchPoints.push({ px, py, x: finalX, y });
  clearSketchCanvas();
  update3DPreview(false);
}

function update3DPreview(isFinal = false) {
  if (sketchPoints.length < 2) return;
  
  if (sketchPreviewMesh) {
    scene.remove(sketchPreviewMesh);
    sketchPreviewMesh = null;
  }
  
  let geom = null;
  try {
    if (sketchMode === 'lathe') {
      const threePoints = sketchPoints.map(p => new THREE.Vector2(p.x, p.y));
      geom = new THREE.LatheGeometry(threePoints, 32);
    } else {
      const shape = new THREE.Shape();
      const p0 = sketchPoints[0];
      shape.moveTo(p0.x, p0.y);
      for (let i = 1; i < sketchPoints.length; i++) {
        shape.lineTo(sketchPoints[i].x, sketchPoints[i].y);
      }
      shape.closePath();
      
      geom = new THREE.ExtrudeGeometry(shape, {
        depth: 2.0,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.1,
        bevelThickness: 0.1
      });
      geom.center();
    }
    
    const mat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    
    sketchPreviewMesh = new THREE.Mesh(geom, mat);
    scene.add(sketchPreviewMesh);
    
    if (renderer) renderer.render(scene, camera);
  } catch (err) {
    console.error("Preview Mesh generation error: ", err);
  }
}

function saveSketch() {
  if (sketchPoints.length < 3) {
    showToast(currentLang === 'en' ? '⚠️ Draw a longer path first!' : '⚠️ Dessinez un chemin plus long d\'abord !');
    return;
  }
  
  const editor = document.getElementById('code-editor');
  if (!editor) return;
  
  let code = '';
  if (sketchMode === 'lathe') {
    code = `// Drawn 3D Lathe Mesh (Rotational Vase)\napi.clear();\n\nconst points = [\n`;
    sketchPoints.forEach(p => {
      code += `  { x: ${p.x.toFixed(2)}, y: ${p.y.toFixed(2)} },\n`;
    });
    code += `];\n\n// addLathe(points, segments)\napi.addLathe(points, 32);\n`;
  } else {
    code = `// Drawn 3D Extruded Mesh\napi.clear();\n\nconst points = [\n`;
    sketchPoints.forEach(p => {
      code += `  { x: ${p.x.toFixed(2)}, y: ${p.y.toFixed(2)} },\n`;
    });
    code += `];\n\n// addExtrude(points, depth, bevelEnabled)\napi.addExtrude(points, 2.0, true);\n`;
  }
  
  editor.value = code;
  updateHighlighting();
  updateLineNumbers();
  syncSlidersFromCode();
  
  if (isLockHolder) {
    collabChannel.postMessage({ type: 'CODE_SYNC', code: editor.value, userId: collabUser.id });
  }
  
  exitSketchMode();
  showToast(currentLang === 'en' ? '✅ Mesh generated successfully!' : '✅ Mesh généré avec succès !');
}
