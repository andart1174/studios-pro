// Polyfill FileReader for Node.js environment
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then(buf => {
        this.result = buf;
        if (this.onloadend) this.onloadend();
        if (this.onload) this.onload();
      });
    }
  };
}

import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import fs from 'fs';
import path from 'path';

// 1. Generate CAD Mechanical Gear
function createGearScene() {
  const numTeeth = 16;
  const outerR = 0.22;
  const innerR = 0.17;
  const toothH = 0.04;
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

  // Central axle bore hole
  const hole = new THREE.Path();
  hole.absarc(0, 0, 0.065, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: 0.06,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.01,
    bevelSegments: 3
  });
  geom.center();

  const mat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    metalness: 0.88,
    roughness: 0.2
  });
  const mesh = new THREE.Mesh(geom, mat);
  const scene = new THREE.Scene();
  scene.add(mesh);
  return scene;
}

// 2. Generate Authentic Wood Sculpted Relief Panel
function createReliefScene() {
  const group = new THREE.Group();

  // 1. Backing board (Solid Oak/Walnut wood base)
  const boardGeom = new THREE.BoxGeometry(0.28, 0.21, 0.02);
  const boardMat = new THREE.MeshStandardMaterial({
    color: 0x8a5229,
    roughness: 0.72,
    metalness: 0.04
  });
  const boardMesh = new THREE.Mesh(boardGeom, boardMat);
  group.add(boardMesh);

  // 2. Beveled frame moulding around the border
  const frameShape = new THREE.Shape();
  frameShape.moveTo(-0.14, -0.105);
  frameShape.lineTo(0.14, -0.105);
  frameShape.lineTo(0.14, 0.105);
  frameShape.lineTo(-0.14, 0.105);
  frameShape.closePath();

  const holePath = new THREE.Path();
  holePath.moveTo(-0.12, -0.085);
  holePath.lineTo(0.12, -0.085);
  holePath.lineTo(0.12, 0.085);
  holePath.lineTo(-0.12, 0.085);
  holePath.closePath();
  frameShape.holes.push(holePath);

  const frameGeom = new THREE.ExtrudeGeometry(frameShape, {
    depth: 0.012,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.005,
    bevelSegments: 3
  });
  frameGeom.center();
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x76421e,
    roughness: 0.65,
    metalness: 0.05
  });
  const frameMesh = new THREE.Mesh(frameGeom, frameMat);
  frameMesh.position.z = 0.012;
  group.add(frameMesh);

  // 3. Central Carved Rosette Medallion with detailed classical carving
  const reliefGeom = new THREE.PlaneGeometry(0.23, 0.16, 96, 72);
  const pos = reliefGeom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const r = Math.sqrt(x * x + y * y);
    const theta = Math.atan2(y, x);
    let h = 0;
    const maxR = 0.075;
    if (r < maxR) {
      const normR = r / maxR;
      // Classical carved dome
      const dome = Math.cos(normR * Math.PI * 0.5) * 0.014;
      // 12 sculpted rosette petals
      const petals = Math.sin(normR * Math.PI * 2) * Math.cos(12 * theta) * 0.006 * (1 - normR * 0.35);
      // Concentric fluting rings
      const ring = Math.sin(normR * Math.PI * 6) * 0.0025;
      // Center raised jewel / boss
      const boss = Math.exp(-normR * normR * 35) * 0.008;
      h = dome + petals + ring + boss;
    } else {
      // Beveled inner margin with wave pattern
      const edgeDist = Math.min(0.115 - Math.abs(x), 0.08 - Math.abs(y));
      if (edgeDist > 0 && edgeDist < 0.04) {
        h = Math.sin((0.04 - edgeDist) * 80) * 0.002;
      }
    }
    pos.setZ(i, h);
  }
  reliefGeom.computeVertexNormals();

  const reliefMat = new THREE.MeshStandardMaterial({
    color: 0x965a32,
    roughness: 0.62,
    metalness: 0.05
  });
  const reliefMesh = new THREE.Mesh(reliefGeom, reliefMat);
  reliefMesh.position.z = 0.011;
  group.add(reliefMesh);

  const scene = new THREE.Scene();
  scene.add(group);
  return scene;
}

async function exportSceneToGlb(scene, outputPath) {
  const exporter = new GLTFExporter();
  return new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      (gltf) => {
        let buffer;
        if (gltf instanceof ArrayBuffer) {
          buffer = Buffer.from(gltf);
        } else {
          buffer = Buffer.from(JSON.stringify(gltf));
        }
        fs.writeFileSync(outputPath, buffer);
        console.log(`Saved GLB (${(buffer.length / 1024).toFixed(1)} KB) to ${outputPath}`);
        resolve();
      },
      (error) => {
        reject(error);
      },
      { binary: true }
    );
  });
}

async function main() {
  const targetDir = path.resolve('public/ar/models');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  console.log('Generating cad-gear.glb...');
  const gearScene = createGearScene();
  await exportSceneToGlb(gearScene, path.join(targetDir, 'cad-gear.glb'));

  console.log('Generating relief-wood.glb...');
  const reliefScene = createReliefScene();
  await exportSceneToGlb(reliefScene, path.join(targetDir, 'relief-wood.glb'));

  console.log('Done!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
