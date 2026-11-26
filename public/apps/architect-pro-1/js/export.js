/**
 * Architect Pro 1 (v2.0) — Complete CAD, 3D, PDF, Interactive HTML, Video & AR Export Suite
 * Fixes: Black 3D PDF/PNG, 100x AR Scale Explosion, GridHelper in STL/GLB, ReferenceError in Save HTML.
 */
(function () {
  'use strict';

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1800);
  }

  function arrayBufferToBase64(buf) {
    const bytes = new Uint8Array(buf);
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  }

  window.ArchExporter = {
    downloadBlob,

    // 1. Clean 1:1 Meter Binary GLB (no GridHelper, no hitboxes!)
    exportGLB(onArrayBuffer) {
      if (!window.THREE_ARCH || !window.Engine3D) return;
      const exporter = new window.THREE_ARCH.GLTFExporter();
      const group = Engine3D.getCleanExportGroup(0.01); // cm -> meters 1:1!
      exporter.parse(
        group,
        (result) => {
          if (onArrayBuffer) {
            onArrayBuffer(result);
            return;
          }
          const blob = (result instanceof ArrayBuffer)
            ? new Blob([result], { type: 'model/gltf-binary' })
            : new Blob([JSON.stringify(result)], { type: 'application/json' });
          downloadBlob(blob, 'architect_pro_1_model.glb');
          window.showToast && window.showToast('Exported 1:1m GLB 3D Model', 'Modèle 3D GLB 1:1m exporté');
        },
        (err) => {
          console.error('GLB export error:', err);
          window.showToast && window.showToast('GLB export failed', 'Échec export GLB');
        },
        { binary: true }
      );
    },

    // 2. Clean Binary STL Architectural Maquette (1:100 mm scale -> 10m house prints 100mm!)
    exportSTL(scaleMode) {
      if (!window.THREE_ARCH || !window.Engine3D) return;
      const factor = scaleMode === '1to50' ? 0.2 : 0.1; // cm -> mm at 1:50 or 1:100
      const group = Engine3D.getCleanExportGroup(factor);
      // Rotate Y-up -> Z-up for 3D Slicers (Bambu / Prusa / Cura)!
      group.rotation.x = Math.PI / 2;
      group.updateMatrixWorld(true);
      const exporter = new window.THREE_ARCH.STLExporter();
      const dv = exporter.parse(group, { binary: true });
      const bytes = dv instanceof DataView ? new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength) : dv;
      downloadBlob(new Blob([bytes], { type: 'application/octet-stream' }), `architect_pro_1_maquette_${scaleMode === '1to50' ? '1to50' : '1to100'}.stl`);
      window.showToast && window.showToast('Exported 3D Print Maquette (.STL)', 'Maquette 3D (.STL) exportée !');
    },

    // 3. Clean 1:1 Meter Wavefront OBJ
    exportOBJ() {
      if (!window.THREE_ARCH || !window.Engine3D) return;
      const group = Engine3D.getCleanExportGroup(0.01);
      const exporter = new window.THREE_ARCH.OBJExporter();
      const objStr = exporter.parse(group);
      downloadBlob(new Blob([objStr], { type: 'text/plain' }), 'architect_pro_1_model.obj');
      window.showToast && window.showToast('Exported Wavefront OBJ (1:1m)', 'Fichier OBJ (1:1m) exporté');
    },

    // 4. 2D AutoCAD DXF R12 (1:1 mm)
    exportDXF() {
      const dxf = ArchCore.exportFloorPlanDXF(STATE.elements, STATE.activeFloor);
      downloadBlob(new Blob([dxf], { type: 'application/dxf' }), `architect_floor_${STATE.activeFloor}_1to1mm.dxf`);
      window.showToast && window.showToast('Exported AutoCAD DXF R12 (1:1 mm)', 'Plan DXF AutoCAD R12 (1:1 mm) exporté');
    },

    // 5. 2D Dimensioned Vector SVG Blueprint
    exportSVG() {
      const svg = ArchCore.exportFloorPlanSVG(STATE.elements, STATE.activeFloor, STATE.unit);
      downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), `architect_floor_${STATE.activeFloor}.svg`);
      window.showToast && window.showToast('Exported Dimensioned Blueprint (.SVG)', 'Plan vectoriel coté (.SVG) exporté');
    },

    // 6. Standalone Interactive 3D HTML Viewer (FIXED ReferenceError!)
    exportInteractiveHTML() {
      this.exportGLB((buf) => {
        if (!(buf instanceof ArrayBuffer)) return;
        const b64 = arrayBufferToBase64(buf);
        const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Architect Pro 1 — Interactive 3D</title>
<style>html,body{margin:0;height:100%;overflow:hidden;background:#0b101b;font-family:Inter,sans-serif;color:#f1f5f9}.hud{position:fixed;top:14px;left:14px;background:rgba(15,23,42,.85);padding:10px 14px;border-radius:10px;border:1px solid rgba(148,163,184,.2);font-size:12px}</style>
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/"}}<\/script>
</head><body><div class="hud"><strong>Architect Pro 1</strong> — Drag to Orbit · Scroll to Zoom</div>
<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const scene=new THREE.Scene(); scene.background=new THREE.Color(0x0d1526);
const cam=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,0.05,500); cam.position.set(-12,11,14);
const ren=new THREE.WebGLRenderer({antialias:true}); ren.setSize(innerWidth,innerHeight); ren.setPixelRatio(Math.min(2,devicePixelRatio)); ren.toneMapping=THREE.ACESFilmicToneMapping; document.body.appendChild(ren.domElement);
const ctrl=new OrbitControls(cam,ren.domElement); ctrl.enableDamping=true;
scene.add(new THREE.HemisphereLight(0xdbeafe,0x1e293b,1.1));
const d=new THREE.DirectionalLight(0xffffff,1.8); d.position.set(12,20,10); scene.add(d);
scene.add(new THREE.GridHelper(30,30,0x334155,0x1e293b));
const bin=atob("${b64}"); const arr=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i);
new GLTFLoader().parse(arr.buffer,'',g=>{ scene.add(g.scene); const bb=new THREE.Box3().setFromObject(g.scene); const c=bb.getCenter(new THREE.Vector3()); ctrl.target.copy(c); });
addEventListener('resize',()=>{cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();ren.setSize(innerWidth,innerHeight);});
(function loop(){requestAnimationFrame(loop);ctrl.update();ren.render(scene,cam);})();
<\/script></body></html>`;
        downloadBlob(new Blob([html], { type: 'text/html' }), 'architect_pro_1_3d_viewer.html');
        window.showToast && window.showToast('Exported Standalone Interactive 3D HTML!', 'Visionneuse 3D HTML interactive exportée !');
      });
    },

    // 7. Professional Multi-Section Architectural Quote PDF (Zero Black Canvas!)
    exportPDF() {
      if (!window.jspdf) {
        window.showToast && window.showToast('jsPDF library unavailable', 'Librairie jsPDF indisponible');
        return;
      }
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('landscape', 'mm', 'a4');

      // Header Banner
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 297, 26, 'F');
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text('ARCHITECT PRO 1 — Architectural Presentation & Cost Quote', 14, 13);
      doc.setFontSize(9.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`Studios-Pro CAD Suite  |  Generated: ${new Date().toLocaleDateString()}  |  Active Floor: ${STATE.activeFloor}`, 14, 20);

      const bom = ArchCore.calculateBOM(STATE.elements);
      const rooms = ArchCore.detectRooms(STATE.elements, STATE.activeFloor);
      const areaSum = rooms.reduce((s, r) => s + r.areaSqM, 0) || bom.totalFloorAreaSqM;

      doc.setFontSize(13);
      doc.setTextColor(16, 185, 129);
      doc.text(`Est. Total: $${bom.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}   |   Area: ${ArchCore.formatArea(areaSum, STATE.unit)}`, 190, 16);

      // Force crisp redraw of BOTH canvases (preserveDrawingBuffer: true!)
      if (window.Editor2D) Editor2D.draw();
      if (window.Engine3D) Engine3D.render();

      try {
        const img2D = document.getElementById('canvas2D').toDataURL('image/png');
        const img3D = document.getElementById('canvas3D').toDataURL('image/png');
        doc.addImage(img2D, 'PNG', 14, 32, 132, 92);
        doc.setDrawColor(51, 65, 85); doc.rect(14, 32, 132, 92);
        doc.addImage(img3D, 'PNG', 151, 32, 132, 92);
        doc.rect(151, 32, 132, 92);
      } catch (e) {
        console.warn('PDF canvas capture warning:', e);
      }

      // Detailed BOM Table
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('Itemized Bill of Materials (BOM)', 14, 134);
      let y = 141;
      doc.setFontSize(9.5);
      doc.setTextColor(71, 85, 105);
      doc.text('Category', 14, y);
      doc.text('Count', 80, y);
      doc.text('Quantity', 115, y);
      doc.text('Estimated Cost', 165, y);
      y += 2;
      doc.setDrawColor(203, 213, 225);
      doc.line(14, y, 200, y);
      y += 6;

      Object.keys(bom.categories).forEach(k => {
        const c = bom.categories[k];
        if (c.count === 0) return;
        doc.setTextColor(15, 23, 42);
        doc.text(k, 14, y);
        doc.text(String(c.count), 80, y);
        doc.text(c.unit === 'm²' ? `${c.qty.toFixed(1)} m²` : `${c.qty} pcs`, 115, y);
        doc.text(`$${c.cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 165, y);
        y += 6.5;
      });

      // Room schedule on right
      if (rooms.length > 0) {
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text('Detected Room Schedule', 212, 134);
        let ry = 142;
        doc.setFontSize(9.5);
        rooms.slice(0, 8).forEach(r => {
          doc.setTextColor(51, 65, 85);
          doc.text(`${r.labelEn}:  ${ArchCore.formatArea(r.areaSqM, STATE.unit)}`, 212, ry);
          ry += 6.5;
        });
      }

      doc.save('architect_pro_1_quote.pdf');
      window.showToast && window.showToast('Architectural Quote PDF downloaded!', 'Devis PDF Architectural téléchargé !');
    },

    // 8. FREE High-Res PNG Render (capped safely at 2.5x DPR -> never black!)
    exportHighResPNG() {
      if (!window.Engine3D) return;
      const oldDpr = Engine3D.renderer.getPixelRatio();
      Engine3D.renderer.setPixelRatio(Math.min(2.5, (window.devicePixelRatio || 1) * 1.5));
      Engine3D.render();
      const url = Engine3D.canvas.toDataURL('image/png');
      Engine3D.renderer.setPixelRatio(oldDpr);
      Engine3D.render();
      const a = document.createElement('a');
      a.href = url; a.download = 'architect_pro_1_render.png';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.showToast && window.showToast('High-Res PNG Render saved (FREE)', 'Rendu PNG HD enregistré (GRATUIT)');
    },

    // 9. FREE Save Project (.sparch / .json)
    exportProjectJSON() {
      const payload = {
        format: 'studios-pro-architect-1',
        version: 2,
        unit: STATE.unit,
        globWallHeight: STATE.globWallHeight,
        globWallThick: STATE.globWallThick,
        activeFloor: STATE.activeFloor,
        elements: STATE.elements
      };
      downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), 'architect_pro_1_project.sparch');
      window.showToast && window.showToast('Project saved (.sparch FREE)', 'Projet sauvegardé (.sparch GRATUIT)');
    },

    // 10. FREE Virtual Tour Video (.webm)
    exportVideoTour() {
      const nodes = STATE.elements.filter(e => e.type === 'cameraNode');
      if (nodes.length < 2) {
        window.showToast && window.showToast('Add at least 2 Camera Path nodes first (🎥 tool)', 'Ajoutez au moins 2 points Caméra (🎥)');
        return;
      }
      Engine3D.startVideoTour(nodes, () => {
        window.showToast && window.showToast('Virtual Tour .WEBM downloaded (FREE)', 'Visite Virtuelle .WEBM téléchargée !');
      });
    },

    // 11. FREE View in AR (FIXED 100x Scale Bug! Supports 1:50 Tabletop Maquette OR 1:1 Real Meters!)
    async previewAR(mode) {
      if (!window.StudiosProAR || typeof window.StudiosProAR.sendModel !== 'function' || !window.THREE_ARCH) {
        window.showToast && window.showToast('AR Bridge unavailable in standalone mode', 'Pont RA indisponible hors hub');
        return;
      }
      const isMaquette = mode !== '1to1';
      // cm -> meters: 1:1 = 0.01; 1:50 Tabletop Maquette = 0.01 / 50 = 0.0002 (10m house -> 20cm tabletop model!)
      const scale = isMaquette ? 0.0002 : 0.01;
      const cleanGroup = Engine3D.getCleanExportGroup(scale);
      window.showToast && window.showToast(
        isMaquette ? 'Launching AR Tabletop Maquette (1:50)...' : 'Launching AR Real Scale (1:1 m)...',
        isMaquette ? 'Lancement RA Maquette 1:50...' : 'Lancement RA Échelle 1:1 m...'
      );
      const { THREE, GLTFExporter } = window.THREE_ARCH;
      const box = new THREE.Box3().setFromObject(cleanGroup);
      const sz = new THREE.Vector3();
      box.getSize(sz);
      const dimsMm = { x: Math.round(sz.x * 1000 * 10) / 10, y: Math.round(sz.y * 1000 * 10) / 10, z: Math.round(sz.z * 1000 * 10) / 10 };
      const exporter = new GLTFExporter();
      await new Promise((resolve, reject) => {
        exporter.parse(
          cleanGroup,
          res => {
            window.StudiosProAR.sendModel({
              modelData: res,
              extension: 'glb',
              isBinary: true,
              name: isMaquette ? 'architect_maquette_1to50.glb' : 'architect_real_1to1.glb',
              placement: 'floor',
              dimensionsMm: dimsMm,
              autoScale: isMaquette ? 'auto' : 'fixed',
              sourceStudio: 'architect-pro-1'
            });
            resolve(true);
          },
          err => reject(err),
          { binary: true }
        );
      });
    }
  };
})();
