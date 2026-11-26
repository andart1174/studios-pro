/**
 * Design Pro Studio v4.0 — Photorealistic Three.js r165 Interior Architecture Engine
 * Highlights:
 *  - True 1:1 Real-World Scale (1 Three.js unit = 1 meter -> fixes 20x AR dollhouse bug!)
 *  - Real 18cm thick extruded walls with TRUE Shape.holes cutouts for Doors & Windows!
 *  - Bright Sunlit Sky Dome + Exterior Garden Terrace + RoomEnvironment PMREM IBL (ZERO black bars!)
 *  - Smart Auto-Cutaway Walls in Dollhouse view + Immersive 1st-Person Walk Mode (WASD + Look at 1.60m!)
 *  - Practical Lighting (Floor Lamps, Chandeliers, Bedside Lamps, Backlit Mirrors & Fireplace emit warm light!)
 *  - 58 Crafted Multi-Part Architectural Furniture Meshes (ZERO floating legless chairs or solid-box lamps!)
 *  - Strict GPU Disposal + ResizeObserver + Preserved Camera across edits + 3D Raycast Selection!
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  createFloorMaterial, createWallMaterial, createFabricMaterial,
  createWoodMaterial, createMetalMaterial
} from './materials-pbr.js';

function DC() { return window.DesignCore; }

function disposeObjectTree(root) {
  if (!root) return;
  root.traverse(obj => {
    if (obj.geometry) try { obj.geometry.dispose(); } catch (_) {}
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach(m => {
        if (!m) return;
        // Note: shared cached PBR CanvasTextures live in materials-pbr.js cache (do NOT dispose shared maps here!)
        try { m.dispose(); } catch (_) {}
      });
    }
  });
}

function addBox(parent, w, h, d, x, y, z, mat, cast = true, recv = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = cast;
  mesh.receiveShadow = recv;
  parent.add(mesh);
  return mesh;
}

function addCyl(parent, rt, rb, h, segs, x, y, z, mat, cast = true, recv = true) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segs), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = cast;
  mesh.receiveShadow = recv;
  parent.add(mesh);
  return mesh;
}

// =========================================================================
// MULTI-PART ARCHITECTURAL FURNITURE GEOMETRY BUILDER (1:1 METERS!)
// =========================================================================

function buildDetailedFurnitureGroup(item, lampsOn) {
  const def = DC().getCatalogItem(item.id);
  const w = item.w * 0.01;
  const d = item.d * 0.01;
  const h = item.h * 0.01;
  const grp = new THREE.Group();
  grp.userData.uid = item.uid;

  const mainCol = item.color || def.color;
  const fabricMat = createFabricMaterial(mainCol, 2);
  const woodMat = createWoodMaterial(mainCol, 1.5);
  const oakMat = createWoodMaterial('#b5895a', 1.5);
  const darkMetal = createMetalMaterial('#1e222b', 0.34);
  const brassMat = createMetalMaterial('#d4af5e', 0.22);
  const chromeMat = createMetalMaterial('#e2e8f0', 0.14);
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.28, metalness: 0.02 });
  const matteWhite = new THREE.MeshStandardMaterial({ color: 0xf1eee8, roughness: 0.82, metalness: 0.0 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xdcf4ff, roughness: 0.06, metalness: 0.05, transparent: true, opacity: 0.34
  });
  const mirrorMat = new THREE.MeshStandardMaterial({ color: 0xe6eef5, roughness: 0.04, metalness: 0.96 });
  const warmGlow = new THREE.MeshStandardMaterial({
    color: 0xfff3d6, emissive: 0xffd28a, emissiveIntensity: lampsOn ? 1.8 : 0.1, roughness: 0.4
  });

  const id = def.id;

  if (id === 'sofa' || id === 'sofa2' || id === 'sofa_office' || id === 'sofa_l' || id === 'armchair') {
    const legH = 0.13;
    const baseH = 0.16;
    const seatH = 0.16;
    const armW = Math.min(0.16, w * 0.12);
    const backD = Math.min(0.20, d * 0.24);
    const bodyD = id === 'sofa_l' ? d * 0.56 : d;
    const zBack = -d * 0.5 + backD * 0.5;
    const zSeat = -d * 0.5 + bodyD * 0.5;

    // 4 Tapered Oak Legs
    const lx = w * 0.5 - 0.08, lz1 = -d * 0.5 + 0.08, lz2 = -d * 0.5 + bodyD - 0.08;
    [[-lx, lz1], [lx, lz1], [-lx, lz2], [lx, lz2]].forEach(([x, z]) => addCyl(grp, 0.024, 0.015, legH, 10, x, legH * 0.5, z, oakMat));
    // Base plinth + Backrest + Armrests
    addBox(grp, w, baseH, bodyD, 0, legH + baseH * 0.5, zSeat, fabricMat);
    addBox(grp, w - armW * 0.4, h - legH - baseH, backD, 0, legH + baseH + (h - legH - baseH) * 0.5, zBack, fabricMat);
    addBox(grp, armW, h * 0.52, bodyD, -w * 0.5 + armW * 0.5, legH + h * 0.26, zSeat, fabricMat);
    addBox(grp, armW, h * 0.52, bodyD, w * 0.5 - armW * 0.5, legH + h * 0.26, zSeat, fabricMat);
    // Individual Seat & Back Cushions
    const innerW = w - armW * 2 - 0.03;
    const nCush = id === 'armchair' ? 1 : (id === 'sofa2' ? 2 : 3);
    const cw = innerW / nCush - 0.018;
    const pillowMat = createFabricMaterial('#e6dfd3', 2);
    for (let i = 0; i < nCush; i++) {
      const cx = -innerW * 0.5 + (i + 0.5) * (innerW / nCush);
      addBox(grp, cw, seatH, bodyD - backD - 0.02, cx, legH + baseH + seatH * 0.5, zSeat + backD * 0.45, fabricMat);
      addBox(grp, cw * 0.96, h * 0.36, 0.14, cx, legH + baseH + seatH + h * 0.16, zBack + backD * 0.5 + 0.06, fabricMat);
    }
    // Designer Throw Pillows!
    addBox(grp, 0.34, 0.32, 0.11, -innerW * 0.38, legH + baseH + seatH + 0.16, zBack + backD * 0.5 + 0.14, pillowMat).rotation.z = 0.16;
    if (nCush >= 2) {
      addBox(grp, 0.34, 0.32, 0.11, innerW * 0.38, legH + baseH + seatH + 0.16, zBack + backD * 0.5 + 0.14, pillowMat).rotation.z = -0.16;
    }
    // Chaise lounge extension for L-Shape Sectional
    if (id === 'sofa_l') {
      const chW = w * 0.36, chD = d - bodyD;
      const chX = w * 0.5 - chW * 0.5, chZ = d * 0.5 - chD * 0.5;
      addBox(grp, chW, baseH + seatH, chD, chX, legH + (baseH + seatH) * 0.5, chZ, fabricMat);
      addCyl(grp, 0.024, 0.015, legH, 10, chX - chW * 0.38, legH * 0.5, d * 0.5 - 0.08, oakMat);
      addCyl(grp, 0.024, 0.015, legH, 10, chX + chW * 0.38, legH * 0.5, d * 0.5 - 0.08, oakMat);
    }
  } else if (id === 'tv_stand') {
    const cabH = 0.48, legH = 0.14;
    // Credenza body + slender legs + fluted drawer fronts + brass handles
    addBox(grp, w, cabH - legH, d, 0, legH + (cabH - legH) * 0.5, 0, woodMat);
    [[-w * 0.44, -d * 0.38], [w * 0.44, -d * 0.38], [-w * 0.44, d * 0.38], [w * 0.44, d * 0.38]]
      .forEach(([x, z]) => addCyl(grp, 0.018, 0.012, legH, 10, x, legH * 0.5, z, darkMetal));
    for (let i = -1; i <= 1; i++) {
      addBox(grp, w * 0.30, (cabH - legH) * 0.78, 0.018, i * w * 0.32, legH + (cabH - legH) * 0.5, d * 0.5 + 0.008, woodMat);
      addBox(grp, 0.12, 0.014, 0.022, i * w * 0.32, cabH - 0.08, d * 0.5 + 0.022, brassMat);
    }
    // 65" Ultra-Thin 4K OLED TV Mounted Above!
    const tvW = Math.min(w * 0.82, 1.48), tvH = tvW * 0.56;
    const tvY = cabH + 0.18 + tvH * 0.5;
    addBox(grp, tvW + 0.03, tvH + 0.03, 0.028, 0, tvY, -d * 0.18, darkMetal);
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0x0f1b2e, emissive: 0x1e3a5f, emissiveIntensity: 0.45, roughness: 0.08, metalness: 0.25
    });
    addBox(grp, tvW, tvH, 0.008, 0, tvY, -d * 0.18 + 0.016, screenMat, false, false);
    // TV Center Stand Stem
    addBox(grp, 0.18, 0.22, 0.06, 0, cabH + 0.10, -d * 0.18, darkMetal);
  } else if (id === 'coffee_table' || id === 'dining_table' || id === 'kitchen_table' || id === 'meeting_table' || id === 'desk' || id === 'office_desk') {
    const topH = 0.042;
    const tableH = id === 'office_desk' ? 0.75 : h;
    const topMat = id === 'coffee_table' ? new THREE.MeshStandardMaterial({ color: new THREE.Color(mainCol), roughness: 0.18, metalness: 0.06 }) : woodMat;
    addBox(grp, w, topH, d, 0, tableH - topH * 0.5, 0, topMat);
    const legH = tableH - topH;
    const legMat = (id === 'coffee_table' || id === 'office_desk' || id === 'meeting_table') ? darkMetal : woodMat;
    const lx = w * 0.5 - 0.08, lz = d * 0.5 - 0.08;
    [[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]].forEach(([x, z]) => {
      addBox(grp, 0.045, legH, 0.045, x, legH * 0.5, z, legMat);
    });
    if (id === 'office_desk') {
      // Dual 4K Studio Monitors + Keyboard!
      [-0.32, 0.32].forEach(mx => {
        const mon = addBox(grp, 0.58, 0.34, 0.02, mx, tableH + 0.28, -d * 0.26, darkMetal);
        mon.rotation.y = mx < 0 ? 0.12 : -0.12;
        addBox(grp, 0.06, 0.16, 0.04, mx, tableH + 0.08, -d * 0.28, darkMetal);
      });
      addBox(grp, 0.42, 0.012, 0.14, 0, tableH + 0.008, d * 0.12, darkMetal);
    }
  } else if (id === 'round_dining' || id === 'side_table') {
    addCyl(grp, w * 0.5, w * 0.5, 0.04, 32, 0, h - 0.02, 0, woodMat);
    addCyl(grp, w * 0.10, w * 0.16, h - 0.05, 20, 0, (h - 0.05) * 0.5, 0, id === 'side_table' ? brassMat : woodMat);
    addCyl(grp, w * 0.28, w * 0.30, 0.03, 24, 0, 0.015, 0, darkMetal);
  } else if (id === 'dining_chair' || id === 'kitchen_chair' || id === 'bar_stool') {
    // REAL 4-LEGGED ARCHITECTURAL CHAIR (ZERO FLOATING SEATS!)
    const seatY = id === 'bar_stool' ? 0.66 : 0.46;
    const legMat = id === 'bar_stool' ? darkMetal : oakMat;
    const lx = w * 0.40, lz = d * 0.40;
    [[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]].forEach(([x, z]) => {
      addCyl(grp, 0.016, 0.012, seatY, 10, x, seatY * 0.5, z, legMat);
    });
    if (id === 'bar_stool') {
      addBox(grp, w * 0.78, 0.016, 0.016, 0, 0.22, lz, darkMetal);
      addBox(grp, w * 0.78, 0.016, 0.016, 0, 0.22, -lz, darkMetal);
    }
    addBox(grp, w * 0.90, 0.055, d * 0.88, 0, seatY + 0.025, 0, fabricMat);
    addBox(grp, w * 0.86, h - seatY - 0.05, 0.055, 0, seatY + 0.05 + (h - seatY - 0.05) * 0.5, -d * 0.40, fabricMat);
  } else if (id === 'office_chair') {
    // 5-Star Ergonomic Swivel Chair!
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const leg = addBox(grp, 0.032, 0.028, 0.30, Math.sin(a) * 0.14, 0.06, Math.cos(a) * 0.14, darkMetal);
      leg.rotation.y = a;
      addCyl(grp, 0.024, 0.024, 0.04, 10, Math.sin(a) * 0.28, 0.025, Math.cos(a) * 0.28, darkMetal);
    }
    addCyl(grp, 0.026, 0.026, 0.42, 12, 0, 0.26, 0, chromeMat);
    addBox(grp, 0.50, 0.07, 0.48, 0, 0.48, 0, fabricMat);
    addBox(grp, 0.46, 0.58, 0.06, 0, 0.82, -0.22, fabricMat);
    addBox(grp, 0.05, 0.04, 0.30, -0.27, 0.66, -0.04, darkMetal);
    addBox(grp, 0.05, 0.04, 0.30, 0.27, 0.66, -0.04, darkMetal);
  } else if (id === 'bed_king' || id === 'bed_double' || id === 'bed_single') {
    const legH = 0.10, frameH = 0.22, mattH = 0.22;
    [[-w * 0.44, -d * 0.45], [w * 0.44, -d * 0.45], [-w * 0.44, d * 0.45], [w * 0.44, d * 0.45]]
      .forEach(([x, z]) => addCyl(grp, 0.025, 0.018, legH, 10, x, legH * 0.5, z, oakMat));
    // Upholstered platform frame + tall tufted headboard
    addBox(grp, w, frameH, d, 0, legH + frameH * 0.5, 0, fabricMat);
    addBox(grp, w + 0.04, h - legH, 0.11, 0, legH + (h - legH) * 0.5, -d * 0.5 + 0.055, fabricMat);
    // Crisp White Mattress + Folded Duvet Blanket
    addBox(grp, w - 0.08, mattH, d - 0.16, 0, legH + frameH + mattH * 0.5 - 0.03, 0.05, matteWhite);
    const duvetMat = createFabricMaterial(mainCol, 2);
    addBox(grp, w - 0.04, mattH * 0.65, d * 0.58, 0, legH + frameH + mattH * 0.62, d * 0.16, duvetMat);
    // Layered Pillows
    const nPil = id === 'bed_single' ? 1 : 2;
    for (let i = 0; i < nPil; i++) {
      const px = nPil === 1 ? 0 : (i === 0 ? -w * 0.23 : w * 0.23);
      addBox(grp, w * 0.38, 0.14, 0.38, px, legH + frameH + mattH + 0.04, -d * 0.5 + 0.34, matteWhite);
    }
  } else if (id === 'nightstand') {
    const cabH = 0.54;
    addBox(grp, w, cabH - 0.10, d, 0, 0.10 + (cabH - 0.10) * 0.5, 0, woodMat);
    [[-w * 0.4, -d * 0.38], [w * 0.4, -d * 0.38], [-w * 0.4, d * 0.38], [w * 0.4, d * 0.38]]
      .forEach(([x, z]) => addCyl(grp, 0.015, 0.01, 0.10, 8, x, 0.05, z, brassMat));
    addBox(grp, 0.10, 0.012, 0.02, 0, cabH - 0.12, d * 0.5 + 0.01, brassMat);
    addBox(grp, 0.10, 0.012, 0.02, 0, cabH - 0.28, d * 0.5 + 0.01, brassMat);
    // Bedside Lamp on Top!
    addCyl(grp, 0.06, 0.08, 0.16, 16, 0, cabH + 0.08, 0, brassMat);
    addCyl(grp, 0.10, 0.14, 0.18, 20, 0, cabH + 0.25, 0, warmGlow, false, false);
    if (lampsOn) {
      const pl = new THREE.PointLight(0xffcf88, 1.35, 3.8, 1.8);
      pl.position.set(0, cabH + 0.26, 0);
      grp.add(pl);
    }
  } else if (id === 'bookshelf' || id === 'bookshelf_office' || id === 'display_cabinet') {
    const t = 0.03;
    addBox(grp, t, h, d, -w * 0.5 + t * 0.5, h * 0.5, 0, woodMat);
    addBox(grp, t, h, d, w * 0.5 - t * 0.5, h * 0.5, 0, woodMat);
    addBox(grp, w, t, d, 0, h - t * 0.5, 0, woodMat);
    addBox(grp, w, t, d, 0, t * 0.5, 0, woodMat);
    addBox(grp, w, h, 0.02, 0, h * 0.5, -d * 0.5 + 0.01, woodMat);
    const shelves = 5;
    const bookColors = [0xc95d46, 0x3b6e8c, 0xd4a373, 0x4b7f52, 0x2f3b52, 0xe0b660];
    for (let s = 1; s < shelves; s++) {
      const sy = (s / shelves) * h;
      addBox(grp, w - t * 2, 0.024, d - 0.02, 0, sy, 0, woodMat);
      // Decorate shelf with realistic colorful hardcover books!
      const nBooks = Math.max(3, Math.floor(w * 7));
      for (let b = 0; b < nBooks; b++) {
        if ((b + s) % 4 === 0) continue;
        const bx = -w * 0.42 + (b / nBooks) * (w * 0.82);
        const bh = 0.18 + ((b * 7 + s * 3) % 5) * 0.022;
        const bMat = new THREE.MeshStandardMaterial({ color: bookColors[(b + s) % bookColors.length], roughness: 0.72 });
        addBox(grp, 0.032, bh, d * 0.55, bx, sy + 0.012 + bh * 0.5, 0.02, bMat);
      }
    }
    if (id === 'display_cabinet') {
      addBox(grp, w - 0.06, h - 0.08, 0.015, 0, h * 0.5, d * 0.5 - 0.01, glassMat, false, false);
    }
  } else if (id === 'wardrobe' || id === 'dresser' || id === 'sideboard' || id === 'filing_cabinet' || id === 'bath_cabinet') {
    const legH = id === 'wardrobe' ? 0.06 : 0.14;
    addBox(grp, w, h - legH, d, 0, legH + (h - legH) * 0.5, 0, woodMat);
    if (legH >= 0.12) {
      [[-w * 0.44, -d * 0.4], [w * 0.44, -d * 0.4], [-w * 0.44, d * 0.4], [w * 0.44, d * 0.4]]
        .forEach(([x, z]) => addCyl(grp, 0.018, 0.012, legH, 10, x, legH * 0.5, z, darkMetal));
    }
    const cols = Math.max(1, Math.round(w / 0.65));
    for (let c = 0; c < cols; c++) {
      const cx = -w * 0.5 + (c + 0.5) * (w / cols);
      addBox(grp, w / cols - 0.02, h - legH - 0.04, 0.016, cx, legH + (h - legH) * 0.5, d * 0.5 + 0.008, woodMat);
      addBox(grp, 0.016, Math.min(0.24, (h - legH) * 0.35), 0.022, cx + (c % 2 === 0 ? 0.04 : -0.04), legH + (h - legH) * 0.52, d * 0.5 + 0.022, brassMat);
    }
  } else if (id === 'kitchen_counter' || id === 'kitchen_base' || id === 'island') {
    const cntH = 0.90;
    addBox(grp, w, cntH - 0.04, d - 0.04, 0, (cntH - 0.04) * 0.5, 0, woodMat);
    // Polished Quartz Countertop Slab
    addBox(grp, w + 0.02, 0.04, d + 0.02, 0, cntH - 0.02, 0, whiteMat);
    // Stainless Recessed Sink + Gooseneck Faucet on kitchen_counter!
    if (id === 'kitchen_counter') {
      addBox(grp, 0.64, 0.015, 0.42, 0.15, cntH + 0.004, 0.02, chromeMat);
      addCyl(grp, 0.014, 0.016, 0.28, 12, 0.15, cntH + 0.14, -0.18, chromeMat);
      addBox(grp, 0.028, 0.028, 0.14, 0.15, cntH + 0.27, -0.11, chromeMat);
      // Upper wall cabinets + warm under-cabinet LED strip!
      addBox(grp, w, 0.72, 0.34, 0, cntH + 0.56 + 0.36, -d * 0.5 + 0.17, woodMat);
      addBox(grp, w - 0.1, 0.016, 0.04, 0, cntH + 0.55, -d * 0.5 + 0.22, warmGlow, false, false);
    }
  } else if (id === 'fridge') {
    addBox(grp, w, h, d, 0, h * 0.5, 0, chromeMat);
    // French door seam + handles + water dispenser
    addBox(grp, 0.012, h * 0.66, 0.01, 0, h * 0.67, d * 0.5 + 0.004, darkMetal);
    addBox(grp, w, 0.012, 0.01, 0, h * 0.34, d * 0.5 + 0.004, darkMetal);
    addBox(grp, 0.022, 0.52, 0.032, -0.05, h * 0.65, d * 0.5 + 0.02, darkMetal);
    addBox(grp, 0.022, 0.52, 0.032, 0.05, h * 0.65, d * 0.5 + 0.02, darkMetal);
    addBox(grp, 0.20, 0.28, 0.018, -w * 0.24, h * 0.68, d * 0.5 + 0.008, darkMetal);
  } else if (id === 'stove') {
    addBox(grp, w, 0.88, d, 0, 0.44, 0, darkMetal);
    addBox(grp, w * 0.84, 0.42, 0.02, 0, 0.42, d * 0.5 + 0.008, glassMat);
    // 4 Induction Burners
    [[-0.18, -0.14], [0.18, -0.14], [-0.18, 0.14], [0.18, 0.14]].forEach(([x, z]) => {
      addCyl(grp, 0.09, 0.09, 0.008, 20, x, 0.885, z, chromeMat);
    });
    // Chimney Range Hood Above
    addBox(grp, w, 0.12, d * 0.72, 0, 1.58, -d * 0.14, chromeMat);
    addBox(grp, w * 0.34, 0.55, 0.28, 0, 1.90, -d * 0.26, chromeMat);
  } else if (id === 'dishwasher' || id === 'washer') {
    addBox(grp, w, h, d, 0, h * 0.5, 0, whiteMat);
    addBox(grp, w * 0.94, 0.12, 0.015, 0, h - 0.07, d * 0.5 + 0.006, darkMetal);
    if (id === 'washer') {
      const drum = addCyl(grp, w * 0.32, w * 0.32, 0.03, 24, 0, h * 0.46, d * 0.5 + 0.01, darkMetal);
      drum.rotation.x = Math.PI / 2;
      const win = addCyl(grp, w * 0.24, w * 0.24, 0.035, 24, 0, h * 0.46, d * 0.5 + 0.012, glassMat);
      win.rotation.x = Math.PI / 2;
    }
  } else if (id === 'bathtub') {
    // TRUE HOLLOW FREESTANDING SOAKING BATHTUB + CHROME FLOOR FILLER!
    const wallT = 0.08;
    addBox(grp, w, 0.08, d, 0, 0.04, 0, whiteMat); // bottom
    addBox(grp, w, h, wallT, 0, h * 0.5, -d * 0.5 + wallT * 0.5, whiteMat);
    addBox(grp, w, h, wallT, 0, h * 0.5, d * 0.5 - wallT * 0.5, whiteMat);
    addBox(grp, wallT, h, d - wallT * 2, -w * 0.5 + wallT * 0.5, h * 0.5, 0, whiteMat);
    addBox(grp, wallT, h, d - wallT * 2, w * 0.5 - wallT * 0.5, h * 0.5, 0, whiteMat);
    // Calm azure water surface inside!
    const waterMat = new THREE.MeshPhysicalMaterial({ color: 0x7dd3fc, roughness: 0.08, transparent: true, opacity: 0.52 });
    addBox(grp, w - wallT * 2.1, 0.02, d - wallT * 2.1, 0, h * 0.72, 0, waterMat, false, false);
    // Freestanding Chrome Floor-Mount Filler Faucet
    addCyl(grp, 0.022, 0.032, h + 0.28, 14, -w * 0.34, (h + 0.28) * 0.5, -d * 0.5 + 0.05, chromeMat);
    addBox(grp, 0.026, 0.024, 0.16, -w * 0.34, h + 0.26, -d * 0.5 + 0.12, chromeMat);
  } else if (id === 'shower') {
    // REAL WALK-IN GLASS SHOWER ENCLOSURE + RAINFALL HEAD!
    addBox(grp, w, 0.06, d, 0, 0.03, 0, whiteMat); // Stone tray
    // Matte black perimeter frame + transparent glass panels
    addBox(grp, w, h, 0.018, 0, h * 0.5, d * 0.5 - 0.01, glassMat, false, false);
    addBox(grp, 0.018, h, d, w * 0.5 - 0.01, h * 0.5, 0, glassMat, false, false);
    addBox(grp, w, 0.035, 0.035, 0, h, d * 0.5 - 0.01, darkMetal);
    addBox(grp, 0.035, 0.035, d, w * 0.5 - 0.01, h, 0, darkMetal);
    addBox(grp, 0.035, h, 0.035, w * 0.5 - 0.01, h * 0.5, d * 0.5 - 0.01, darkMetal);
    // Rainfall Shower Column + Overhead Disk
    addCyl(grp, 0.014, 0.014, h * 0.82, 12, 0, h * 0.52, -d * 0.44, chromeMat);
    addBox(grp, 0.024, 0.024, 0.34, 0, h * 0.92, -d * 0.28, chromeMat);
    addCyl(grp, 0.14, 0.14, 0.018, 24, 0, h * 0.90, -d * 0.12, chromeMat);
  } else if (id === 'toilet') {
    addBox(grp, w * 0.9, 0.42, 0.18, 0, 0.56, -d * 0.5 + 0.10, whiteMat);
    addCyl(grp, w * 0.44, w * 0.32, 0.38, 20, 0, 0.20, 0.06, whiteMat);
    addBox(grp, w * 0.86, 0.04, d * 0.65, 0, 0.40, 0.06, whiteMat);
  } else if (id === 'sink' || id === 'double_sink') {
    // Floating Wood Vanity + Vessel Basins + Chrome Mixers + Backlit LED Mirror!
    addBox(grp, w, 0.52, d, 0, 0.58, 0, woodMat);
    addBox(grp, w + 0.02, 0.035, d + 0.02, 0, 0.85, 0, whiteMat);
    const basins = id === 'double_sink' ? [-w * 0.26, w * 0.26] : [0];
    basins.forEach(bx => {
      addCyl(grp, 0.20, 0.15, 0.12, 24, bx, 0.92, 0.03, whiteMat);
      addCyl(grp, 0.014, 0.016, 0.20, 12, bx, 0.96, -0.16, chromeMat);
      addBox(grp, 0.02, 0.02, 0.10, bx, 1.05, -0.12, chromeMat);
    });
    // Backlit LED Mirror mounted above vanity
    addBox(grp, w * 0.88, 0.78, 0.025, 0, 1.50, -d * 0.45, mirrorMat);
    addBox(grp, w * 0.92, 0.82, 0.012, 0, 1.50, -d * 0.47, warmGlow, false, false);
    if (lampsOn) {
      const pl = new THREE.PointLight(0xfff1d6, 1.1, 3.2, 2);
      pl.position.set(0, 1.52, -d * 0.25);
      grp.add(pl);
    }
  } else if (id === 'lamp') {
    // REAL DESIGNER ARC FLOOR LAMP THAT ACTUALLY CASTS WARM LIGHT!
    addCyl(grp, 0.18, 0.20, 0.04, 24, 0, 0.02, 0, whiteMat);
    addCyl(grp, 0.016, 0.02, h - 0.34, 12, 0, (h - 0.34) * 0.5 + 0.04, 0, brassMat);
    addCyl(grp, 0.18, 0.24, 0.30, 24, 0, h - 0.18, 0, warmGlow, false, false);
    if (lampsOn) {
      const pl = new THREE.PointLight(0xffd08a, 2.2, 6.2, 1.6);
      pl.position.set(0, h - 0.22, 0);
      grp.add(pl);
    }
  } else if (id === 'chandelier') {
    // Designer Brass & Opal Globe Pendant Chandelier + Practical PointLight!
    addCyl(grp, 0.08, 0.08, 0.03, 16, 0, h, 0, brassMat);
    addCyl(grp, 0.01, 0.01, h * 0.65, 8, 0, h * 0.68, 0, brassMat);
    const bar = addBox(grp, w * 0.85, 0.02, 0.02, 0, h * 0.36, 0, brassMat);
    bar.rotation.y = 0.4;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const g = new THREE.Mesh(new THREE.SphereGeometry(0.095, 16, 16), warmGlow);
      g.position.set(Math.cos(a) * w * 0.32, h * 0.30, Math.sin(a) * w * 0.32);
      grp.add(g);
    }
    if (lampsOn) {
      const pl = new THREE.PointLight(0xffe0ad, 2.8, 8.5, 1.5);
      pl.position.set(0, h * 0.22, 0);
      grp.add(pl);
    }
  } else if (id === 'plant' || id === 'olive_tree') {
    // Architectural Ceramic Planter + Real Trunk + Layered Organic Foliage Clusters!
    addCyl(grp, w * 0.38, w * 0.28, 0.36, 20, 0, 0.18, 0, matteWhite);
    addCyl(grp, w * 0.34, w * 0.34, 0.04, 16, 0, 0.35, 0, createWoodMaterial('#4a3525'));
    addCyl(grp, 0.024, 0.038, h * 0.56, 10, 0, 0.35 + h * 0.26, 0, createWoodMaterial('#634731'));
    const leafMat1 = new THREE.MeshStandardMaterial({ color: new THREE.Color(mainCol), roughness: 0.72 });
    const leafMat2 = new THREE.MeshStandardMaterial({ color: new THREE.Color(mainCol).multiplyScalar(1.18), roughness: 0.68 });
    const clusters = [
      [0, h * 0.82, 0, 0.24], [-0.15, h * 0.72, 0.11, 0.18], [0.16, h * 0.74, -0.10, 0.19],
      [0.08, h * 0.64, 0.15, 0.17], [-0.14, h * 0.66, -0.13, 0.16], [0, h * 0.92, 0.04, 0.15]
    ];
    clusters.forEach(([x, y, z, r], idx) => {
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), idx % 2 === 0 ? leafMat1 : leafMat2);
      m.position.set(x, y, z);
      m.castShadow = true; m.receiveShadow = true;
      grp.add(m);
    });
  } else if (id === 'wall_art' || id === 'wall_art_trio') {
    const panels = id === 'wall_art_trio' ? 3 : 1;
    const gap = 0.06;
    const pw = (w - gap * (panels - 1)) / panels;
    for (let i = 0; i < panels; i++) {
      const px = -w * 0.5 + pw * 0.5 + i * (pw + gap);
      addBox(grp, pw, h, 0.035, px, h * 0.5, 0, oakMat);
      addBox(grp, pw - 0.06, h - 0.06, 0.02, px, h * 0.5, 0.015, matteWhite);
      // Abstract warm minimalist geometric composition
      addBox(grp, pw * 0.58, h * 0.48, 0.008, px, h * 0.54, 0.026, fabricMat, false, false);
    }
  } else if (id === 'mirror') {
    addBox(grp, w, h, 0.035, 0, h * 0.5, 0, brassMat);
    addBox(grp, w - 0.06, h - 0.06, 0.02, 0, h * 0.5, 0.014, mirrorMat, false, false);
  } else if (id === 'fireplace') {
    addBox(grp, w, h, d, 0, h * 0.5, 0, matteWhite);
    addBox(grp, w * 0.62, h * 0.48, d * 0.5, 0, h * 0.34, d * 0.28, darkMetal);
    const ember = new THREE.MeshStandardMaterial({ color: 0xff6b2b, emissive: 0xff5514, emissiveIntensity: lampsOn ? 2.4 : 0.2 });
    addBox(grp, w * 0.44, 0.14, 0.12, 0, 0.22, d * 0.30, ember, false, false);
    if (lampsOn) {
      const pl = new THREE.PointLight(0xff7d3b, 2.0, 4.8, 1.8);
      pl.position.set(0, 0.38, d * 0.52);
      grp.add(pl);
    }
  } else if (id === 'rug' || id === 'rug_round') {
    if (id === 'rug_round') {
      addCyl(grp, w * 0.5, w * 0.5, 0.014, 36, 0, 0.007, 0, fabricMat, false, true);
    } else {
      addBox(grp, w, 0.014, d, 0, 0.007, 0, fabricMat, false, true);
    }
  } else if (id === 'towel_rack') {
    addCyl(grp, 0.014, 0.014, h, 10, -w * 0.46, h * 0.5, 0, darkMetal);
    addCyl(grp, 0.014, 0.014, h, 10, w * 0.46, h * 0.5, 0, darkMetal);
    for (let i = 0; i < 6; i++) {
      addCyl(grp, 0.01, 0.01, w * 0.92, 8, 0, 0.12 + i * (h * 0.15), 0, darkMetal).rotation.z = Math.PI / 2;
    }
  } else if (id === 'bar_cart') {
    [[-w * 0.46, -d * 0.42], [w * 0.46, -d * 0.42], [-w * 0.46, d * 0.42], [w * 0.46, d * 0.42]]
      .forEach(([x, z]) => addCyl(grp, 0.014, 0.014, h, 10, x, h * 0.5, z, brassMat));
    addBox(grp, w, 0.02, d, 0, h * 0.85, 0, glassMat);
    addBox(grp, w, 0.02, d, 0, h * 0.25, 0, glassMat);
  } else if (id === 'ottoman') {
    addCyl(grp, w * 0.5, w * 0.48, h - 0.04, 28, 0, (h - 0.04) * 0.5 + 0.04, 0, fabricMat);
    addCyl(grp, w * 0.44, w * 0.44, 0.04, 24, 0, 0.02, 0, brassMat);
  } else if (id === 'bench') {
    addBox(grp, w, 0.14, d, 0, h - 0.07, 0, fabricMat);
    [[-w * 0.42, -d * 0.36], [w * 0.42, -d * 0.36], [-w * 0.42, d * 0.36], [w * 0.42, d * 0.36]]
      .forEach(([x, z]) => addCyl(grp, 0.018, 0.013, h - 0.14, 10, x, (h - 0.14) * 0.5, z, oakMat));
  } else if (id === 'vanity') {
    addBox(grp, w, 0.14, d, 0, 0.72, 0, woodMat);
    [[-w * 0.44, -d * 0.4], [w * 0.44, -d * 0.4], [-w * 0.44, d * 0.4], [w * 0.44, d * 0.4]]
      .forEach(([x, z]) => addCyl(grp, 0.016, 0.012, 0.66, 10, x, 0.33, z, brassMat));
    addCyl(grp, 0.28, 0.28, 0.025, 28, 0, 1.12, -d * 0.38, mirrorMat).rotation.x = Math.PI / 2;
  } else if (id === 'curtains') {
    addCyl(grp, 0.012, 0.012, w + 0.16, 10, 0, h, 0, darkMetal).rotation.z = Math.PI / 2;
    addBox(grp, w * 0.26, h, d * 0.7, -w * 0.36, h * 0.5, 0, fabricMat);
    addBox(grp, w * 0.26, h, d * 0.7, w * 0.36, h * 0.5, 0, fabricMat);
  } else {
    addBox(grp, w, h, d, 0, h * 0.5, 0, woodMat);
  }

  return grp;
}

// =========================================================================
// MAIN PHOTOREALISTIC 3D SCENE ENGINE
// =========================================================================

export class InteriorScene3D {
  constructor(containerEl, callbacks = {}) {
    this.container = containerEl;
    this.cb = callbacks;
    this.cameraMode = 'dollhouse'; // 'dollhouse' | 'interior' | 'walk' | 'top'
    this.showCeiling = true;
    this.hasFramedOnce = false;
    this.wallAssemblies = []; // { group, nx, nz, isPartition } for smart auto-cutaway!
    this.furnitureMap = new Map(); // uid -> THREE.Group
    this.walkKeys = { w: false, a: false, s: false, d: false };
    this.walkYaw = 0;
    this.walkPitch = 0;
    this.walkDragging = false;
    this.walkLastX = 0;
    this.walkLastY = 0;

    this._initRenderer();
    this._bindEvents();
    this._animate();
  }

  _initRenderer() {
    const w = Math.max(320, this.container.clientWidth || 720);
    const h = Math.max(240, this.container.clientHeight || 520);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xdbeafe);
    this.scene.fog = new THREE.Fog(0xdbeafe, 24, 65);

    this.camera = new THREE.PerspectiveCamera(48, w / h, 0.08, 120);
    this.camera.position.set(5.5, 4.6, 6.8);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true, // Required for 2K PNG & Client PDF!
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // Photorealistic PMREM Studio Room Environment IBL (reflections on wood/marble/brass/glass!)
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRT.texture;
    pmrem.dispose();

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.minDistance = 1.2;
    this.controls.maxDistance = 24;

    // Lights
    this.hemiLight = new THREE.HemisphereLight(0xf6f9ff, 0xcab99f, 0.85);
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
    this.sunLight = new THREE.DirectionalLight(0xfff5e4, 2.0);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.normalBias = 0.025;
    this.scene.add(this.hemiLight, this.ambientLight, this.sunLight, this.sunLight.target);

    // Exterior Horizon Ground Plane (seen through real cutout windows — ZERO black void!)
    const lawn = new THREE.Mesh(
      new THREE.CircleGeometry(42, 48),
      new THREE.MeshStandardMaterial({ color: 0x6f8c66, roughness: 0.95 })
    );
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.y = -0.14;
    lawn.receiveShadow = true;
    this.scene.add(lawn);

    // Architectural Exportable Root Group (strictly room + furniture, NO lights/lawn -> clean GLB/AR!)
    this.archRoot = new THREE.Group();
    this.archRoot.name = 'DesignProStudio_Interior';
    this.roomGroup = new THREE.Group();
    this.furnitureGroup = new THREE.Group();
    this.archRoot.add(this.roomGroup, this.furnitureGroup);
    this.scene.add(this.archRoot);

    this.raycaster = new THREE.Raycaster();
    this.clock = new THREE.Clock();

    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(() => this.handleResize());
      this._ro.observe(this.container);
    }
    window.addEventListener('resize', () => this.handleResize());
  }

  _bindEvents() {
    const dom = this.renderer.domElement;
    let downX = 0, downY = 0;

    dom.addEventListener('pointerdown', e => {
      downX = e.clientX; downY = e.clientY;
      if (this.cameraMode === 'walk') {
        this.walkDragging = true;
        this.walkLastX = e.clientX; this.walkLastY = e.clientY;
      }
    });
    dom.addEventListener('pointermove', e => {
      if (this.cameraMode === 'walk' && this.walkDragging) {
        const dx = e.clientX - this.walkLastX;
        const dy = e.clientY - this.walkLastY;
        this.walkLastX = e.clientX; this.walkLastY = e.clientY;
        this.walkYaw -= dx * 0.0045;
        this.walkPitch = Math.max(-0.55, Math.min(0.55, this.walkPitch - dy * 0.004));
      }
    });
    dom.addEventListener('pointerup', e => {
      this.walkDragging = false;
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
      // 3D Click Selection via Raycaster!
      const rect = dom.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      this.raycaster.setFromCamera(ndc, this.camera);
      const hits = this.raycaster.intersectObjects(this.furnitureGroup.children, true);
      if (hits.length) {
        let obj = hits[0].object;
        while (obj && !obj.userData.uid) obj = obj.parent;
        if (obj && obj.userData.uid && this.cb.onSelect3D) {
          this.cb.onSelect3D({ kind: 'furniture', uid: obj.userData.uid });
        }
      }
    });

    window.addEventListener('keydown', e => {
      if (this.cameraMode !== 'walk') return;
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') this.walkKeys.w = true;
      if (k === 's' || k === 'arrowdown') this.walkKeys.s = true;
      if (k === 'a' || k === 'arrowleft') this.walkKeys.a = true;
      if (k === 'd' || k === 'arrowright') this.walkKeys.d = true;
    });
    window.addEventListener('keyup', e => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') this.walkKeys.w = false;
      if (k === 's' || k === 'arrowdown') this.walkKeys.s = false;
      if (k === 'a' || k === 'arrowleft') this.walkKeys.a = false;
      if (k === 'd' || k === 'arrowright') this.walkKeys.d = false;
    });
  }

  // =========================================================================
  // FULL ARCHITECTURAL ROOM REBUILD (TRUE SHAPE HOLES + REAL TRIM + CUTAWAY!)
  // =========================================================================

  rebuildAll(state, resetCamera = false) {
    if (!state || !state.room) return;
    this.lastState = state;
    const geom = DC().buildRoomGeometry(state.room);
    const RW = geom.W * 0.01, RD = geom.D * 0.01, RH = geom.H * 0.01;
    const WT = DC().WALL_THICKNESS_CM * 0.01; // 0.18 m thick walls!

    // Cleanly dispose previous room meshes (ZERO VRAM LEAK!)
    disposeObjectTree(this.roomGroup);
    this.roomGroup.clear();
    this.wallAssemblies = [];

    // 1. Thick Architectural Floor Slab matching EXACT Room Polygon (Rect / L-Shape / Alcove!)
    const floorShape = new THREE.Shape();
    geom.poly.forEach(([px, py], i) => {
      const x = px * 0.01, y = -py * 0.01;
      if (i === 0) floorShape.moveTo(x, y); else floorShape.lineTo(x, y);
    });
    floorShape.closePath();

    const floorGeo = new THREE.ExtrudeGeometry(floorShape, { depth: 0.12, bevelEnabled: false });
    floorGeo.rotateX(-Math.PI / 2);
    // Normalize UV to 1:1 meters so PBR wood/marble/tile tiles cleanly!
    const uvAttr = floorGeo.attributes.uv;
    for (let i = 0; i < uvAttr.count; i++) uvAttr.setXY(i, uvAttr.getX(i) / RW, uvAttr.getY(i) / RD);

    const floorMat = createFloorMaterial(state.room.floorMaterial, state.room.floorColor, RW, RD);
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = -0.12;
    floorMesh.receiveShadow = true;
    this.roomGroup.add(floorMesh);

    // 2. Architectural Ceiling Slab + Recessed Warm Downlight Disks
    const ceilGeo = new THREE.ExtrudeGeometry(floorShape, { depth: 0.08, bevelEnabled: false });
    ceilGeo.rotateX(-Math.PI / 2);
    const ceilMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(state.room.ceilingColor || '#faf9f7'),
      roughness: 0.9, metalness: 0.0
    });
    this.ceilingMesh = new THREE.Mesh(ceilGeo, ceilMat);
    this.ceilingMesh.position.y = RH;
    this.ceilingMesh.receiveShadow = true;
    this.roomGroup.add(this.ceilingMesh);

    // 3. Build Each Wall with TRUE Shape.holes Cutouts for Doors & Windows + Baseboards + Molding!
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xf7f6f2, roughness: 0.55 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xdff5ff, roughness: 0.05, transparent: true, opacity: 0.24 });

    geom.walls.forEach(wall => {
      const wallGrp = new THREE.Group();
      const lenM = wall.len * 0.01;
      const wallThick = wall.isPartition ? 0.12 : WT;

      const doorsOnWall = (state.doors || []).filter(d => d.wallId === wall.id);
      const winsOnWall = (state.windows || []).filter(w => w.wallId === wall.id);

      // Build Wall 2D Profile Shape with REAL Rectangular Holes!
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(lenM, 0);
      shape.lineTo(lenM, RH);
      shape.lineTo(0, RH);
      shape.closePath();

      doorsOnWall.forEach(d => {
        const x0 = Math.max(0.05, d.offset * 0.01);
        const x1 = Math.min(lenM - 0.05, (d.offset + d.w) * 0.01);
        const h1 = Math.min(RH - 0.12, d.h * 0.01);
        if (x1 > x0 + 0.1) {
          const hole = new THREE.Path();
          hole.moveTo(x0, 0); hole.lineTo(x1, 0); hole.lineTo(x1, h1); hole.lineTo(x0, h1); hole.closePath();
          shape.holes.push(hole);
        }
      });

      winsOnWall.forEach(w => {
        const x0 = Math.max(0.05, w.offset * 0.01);
        const x1 = Math.min(lenM - 0.05, (w.offset + w.w) * 0.01);
        const y0 = Math.max(0.15, (w.sill || 82) * 0.01);
        const y1 = Math.min(RH - 0.15, y0 + w.h * 0.01);
        if (x1 > x0 + 0.1 && y1 > y0 + 0.1) {
          const hole = new THREE.Path();
          hole.moveTo(x0, y0); hole.lineTo(x1, y0); hole.lineTo(x1, y1); hole.lineTo(x0, y1); hole.closePath();
          shape.holes.push(hole);
        }
      });

      const wGeo = new THREE.ExtrudeGeometry(shape, { depth: wallThick, bevelEnabled: false });
      const wUv = wGeo.attributes.uv;
      for (let i = 0; i < wUv.count; i++) wUv.setXY(i, wUv.getX(i) / Math.max(1, lenM), wUv.getY(i) / Math.max(1, RH));

      const wMat = createWallMaterial(wall.material, wall.color, lenM, RH);
      const wallMesh = new THREE.Mesh(wGeo, wMat);
      wallMesh.position.z = -wallThick; // Wall extrudes OUTWARD so interior face sits cleanly at local z=0!
      wallMesh.castShadow = true;
      wallMesh.receiveShadow = true;
      wallGrp.add(wallMesh);

      // Segmented Architectural Baseboard (cleanly breaks around Doors!)
      const intervals = [[0, lenM]];
      doorsOnWall.forEach(d => {
        const dx0 = d.offset * 0.01, dx1 = (d.offset + d.w) * 0.01;
        for (let idx = intervals.length - 1; idx >= 0; idx--) {
          const [a, b] = intervals[idx];
          if (dx1 <= a || dx0 >= b) continue;
          intervals.splice(idx, 1);
          if (dx0 > a + 0.04) intervals.push([a, dx0]);
          if (dx1 < b - 0.04) intervals.push([dx1, b]);
        }
      });
      intervals.forEach(([a, b]) => {
        addBox(wallGrp, b - a, 0.095, 0.018, (a + b) * 0.5, 0.0475, 0.009, trimMat, false, true);
      });
      // Ceiling Crown Molding along interior top edge
      addBox(wallGrp, lenM, 0.06, 0.032, lenM * 0.5, RH - 0.03, 0.016, trimMat, false, true);

      // Build Real Framed Doors inside the Cutout Hole!
      doorsOnWall.forEach(d => {
        const dx = d.offset * 0.01, dw = d.w * 0.01, dh = Math.min(RH - 0.12, d.h * 0.01);
        const frameMat = createWoodMaterial(d.color || '#8f6b47', 1);
        const brass = createMetalMaterial('#d4af5e', 0.2);
        // Casing frame (left, right, head)
        addBox(wallGrp, 0.055, dh, wallThick + 0.03, dx + 0.025, dh * 0.5, -wallThick * 0.5, frameMat);
        addBox(wallGrp, 0.055, dh, wallThick + 0.03, dx + dw - 0.025, dh * 0.5, -wallThick * 0.5, frameMat);
        addBox(wallGrp, dw + 0.04, 0.06, wallThick + 0.03, dx + dw * 0.5, dh + 0.02, -wallThick * 0.5, frameMat);
        // Hinged Door Leaf (opens cleanly INWARD +Z — NEVER backwards through solid wall!)
        const pivot = new THREE.Group();
        pivot.position.set(d.hinge === 'right' ? dx + dw - 0.04 : dx + 0.04, 0, -0.02);
        const leafW = dw - 0.08;
        const dirSign = d.hinge === 'right' ? -1 : 1;
        addBox(pivot, leafW, dh - 0.02, 0.04, dirSign * leafW * 0.5, (dh - 0.02) * 0.5, 0, frameMat);
        // Brass Door Lever Handle
        addBox(pivot, 0.11, 0.02, 0.08, dirSign * (leafW - 0.10), 1.02, 0, brass);
        pivot.rotation.y = dirSign * (-0.32); // Slightly ajar inward (+Z)
        wallGrp.add(pivot);
      });

      // Build Real Cutout Architectural Windows (Frame + Mullions + Sill + Reflective Glass!)
      winsOnWall.forEach(w => {
        const wx = w.offset * 0.01, ww = w.w * 0.01, wh = w.h * 0.01, sy = (w.sill || 82) * 0.01;
        const frameMat = createMetalMaterial(w.color || '#2b303a', 0.36);
        const ft = 0.055;
        addBox(wallGrp, ww, ft, wallThick + 0.02, wx + ww * 0.5, sy + ft * 0.5, -wallThick * 0.5, frameMat);
        addBox(wallGrp, ww, ft, wallThick + 0.02, wx + ww * 0.5, sy + wh - ft * 0.5, -wallThick * 0.5, frameMat);
        addBox(wallGrp, ft, wh, wallThick + 0.02, wx + ft * 0.5, sy + wh * 0.5, -wallThick * 0.5, frameMat);
        addBox(wallGrp, ft, wh, wallThick + 0.02, wx + ww - ft * 0.5, sy + wh * 0.5, -wallThick * 0.5, frameMat);
        if (w.style === 'double') {
          addBox(wallGrp, 0.04, wh - ft * 2, 0.06, wx + ww * 0.5, sy + wh * 0.5, -wallThick * 0.5, frameMat);
        }
        // Deep Interior Architectural Window Sill
        addBox(wallGrp, ww + 0.10, 0.035, wallThick + 0.08, wx + ww * 0.5, sy - 0.01, -wallThick * 0.5 + 0.03, trimMat);
        // Clear Glazing Pane
        addBox(wallGrp, ww - ft * 2, wh - ft * 2, 0.012, wx + ww * 0.5, sy + wh * 0.5, -wallThick * 0.5, glassMat, false, false);
      });

      // Position & Rotate Wall into Room World Coordinates (local +X along wall, local +Z = inward normal!)
      wallGrp.position.set(wall.x1 * 0.01, 0, wall.y1 * 0.01);
      wallGrp.rotation.y = -wall.angle;
      this.roomGroup.add(wallGrp);
      this.wallAssemblies.push({ group: wallGrp, nx: wall.nx, nz: wall.ny, isPartition: wall.isPartition });
    });

    // 4. Rebuild All 3D Furniture Meshes cleanly
    this.rebuildFurniture(state);

    // 5. Update Lighting & Shadows for exact room bounds
    this.updateLighting(state, geom);

    // 6. Frame camera ONLY on initial launch or explicit reset — NEVER snaps back on drag!
    if (!this.hasFramedOnce || resetCamera) {
      this.setCameraPreset(this.cameraMode, geom);
      this.hasFramedOnce = true;
    }
  }

  rebuildFurniture(state) {
    disposeObjectTree(this.furnitureGroup);
    this.furnitureGroup.clear();
    this.furnitureMap.clear();

    const lampsOn = state.lighting ? state.lighting.lampsOn !== false : true;
    (state.furniture || []).forEach(item => {
      const grp = buildDetailedFurnitureGroup(item, lampsOn);
      grp.position.set(item.x * 0.01, (item.z || 0) * 0.01, item.y * 0.01);
      grp.rotation.y = -(item.rot || 0) * Math.PI / 180;
      this.furnitureGroup.add(grp);
      this.furnitureMap.set(item.uid, grp);
    });
  }

  // Fast incremental transform update while dragging in 2D (ZERO rebuild stutter!)
  updateItemTransform(item) {
    const grp = this.furnitureMap.get(item.uid);
    if (!grp) return false;
    grp.position.set(item.x * 0.01, (item.z || 0) * 0.01, item.y * 0.01);
    grp.rotation.y = -(item.rot || 0) * Math.PI / 180;
    return true;
  }

  updateLighting(state, geomOpt) {
    const geom = geomOpt || DC().buildRoomGeometry(state.room);
    const cx = geom.W * 0.005, cz = geom.D * 0.005;
    const maxDim = Math.max(geom.W, geom.D) * 0.01;
    const hour = state.lighting?.timeOfDay ?? 14;
    const amb = state.lighting?.ambient ?? 0.72;

    // Accurate solar arc & real golden-hour / twilight / night color temperature!
    const solarAngle = ((hour - 6) / 14) * Math.PI; // 06:00 sunrise -> 13:00 zenith -> 20:00 sunset
    const sunElev = Math.max(0.18, Math.sin(Math.max(0, Math.min(Math.PI, solarAngle))));
    const sunDist = maxDim * 2.2;
    this.sunLight.position.set(cx - Math.cos(solarAngle) * sunDist, Math.max(2.5, sunElev * sunDist * 1.1), cz + sunDist * 0.45);
    this.sunLight.target.position.set(cx, 0.5, cz);

    // Tight room-fitted shadow frustum (razor-sharp shadows!)
    const pad = maxDim * 0.78;
    const sc = this.sunLight.shadow.camera;
    sc.left = -pad; sc.right = pad; sc.top = pad; sc.bottom = -pad;
    sc.near = 0.5; sc.far = sunDist * 3.5;
    sc.updateProjectionMatrix();

    let skyHex = 0xd8e8fa, sunHex = 0xfff8ec, sunInt = 2.0, hemiSky = 0xf4f8ff, hemiGnd = 0xcab69b;
    if (hour >= 19.5 || hour < 6.5) {
      // Cozy Architectural Evening / Night (warm lamps shine!)
      skyHex = 0x162038; sunHex = 0x7da4e0; sunInt = 0.35; hemiSky = 0x4b6394; hemiGnd = 0x2c2520;
    } else if (hour >= 17.5) {
      // Blue Hour Twilight
      skyHex = 0x4b6b9e; sunHex = 0xffa66b; sunInt = 0.85; hemiSky = 0x89a8d8; hemiGnd = 0x615044;
    } else if (hour >= 15.8 || hour < 8.5) {
      // True Golden Hour Sunset / Sunrise (warm amber — NOT cyan!)
      skyHex = 0xf7d8bc; sunHex = 0xffab6b; sunInt = 1.85; hemiSky = 0xffe4c4; hemiGnd = 0xb59172;
    }

    this.scene.background.setHex(skyHex);
    this.scene.fog.color.setHex(skyHex);
    this.sunLight.color.setHex(sunHex);
    this.sunLight.intensity = sunInt;
    this.hemiLight.color.setHex(hemiSky);
    this.hemiLight.groundColor.setHex(hemiGnd);
    this.hemiLight.intensity = 0.55 + amb * 0.55;
    this.ambientLight.intensity = 0.12 + amb * 0.32;
  }

  setCameraPreset(mode, geomOpt) {
    this.cameraMode = mode;
    const geom = geomOpt || (this.lastState ? DC().buildRoomGeometry(this.lastState.room) : { W: 560, D: 440, H: 270 });
    const RW = geom.W * 0.01, RD = geom.D * 0.01, RH = geom.H * 0.01;
    const cx = RW * 0.5, cz = RD * 0.5;
    const span = Math.max(RW, RD);

    if (mode === 'walk') {
      // 1st-Person Human Eye-Level Walkthrough (1.60 m inside the room!)
      this.controls.enabled = false;
      this.camera.fov = 62;
      this.camera.updateProjectionMatrix();
      this.camera.position.set(cx, 1.60, RD - 0.75);
      this.walkYaw = 0;
      this.walkPitch = -0.05;
    } else if (mode === 'interior') {
      // Dramatic Architectural Interior Corner Perspective (real estate photo angle!)
      this.controls.enabled = true;
      this.camera.fov = 56;
      this.camera.updateProjectionMatrix();
      this.camera.position.set(RW - 0.55, 1.65, RD - 0.55);
      this.controls.target.set(cx * 0.72, 0.92, cz * 0.65);
      this.controls.update();
    } else if (mode === 'top') {
      this.controls.enabled = true;
      this.camera.fov = 44;
      this.camera.updateProjectionMatrix();
      this.camera.position.set(cx, span * 1.45, cz + 0.01);
      this.controls.target.set(cx, 0, cz);
      this.controls.update();
    } else {
      // Classic Architectural Dollhouse Cutaway (fills viewport richly — ZERO black bars!)
      this.controls.enabled = true;
      this.camera.fov = 44;
      this.camera.updateProjectionMatrix();
      this.camera.position.set(cx + span * 0.72, RH * 1.48, cz + span * 0.92);
      this.controls.target.set(cx, RH * 0.36, cz);
      this.controls.update();
    }
  }

  setCeilingVisible(v) { this.showCeiling = !!v; }

  _updateAutoCutaway() {
    const insideMode = (this.cameraMode === 'walk' || this.cameraMode === 'interior');
    if (this.ceilingMesh) {
      this.ceilingMesh.visible = insideMode ? true : (this.cameraMode === 'top' ? false : this.showCeiling && this.camera.position.y < 2.55);
    }
    if (!this.lastState) return;
    const geom = DC().buildRoomGeometry(this.lastState.room);
    const cx = geom.W * 0.005, cz = geom.D * 0.005;
    const camDirX = this.camera.position.x - cx;
    const camDirZ = this.camera.position.z - cz;

    this.wallAssemblies.forEach(wa => {
      if (insideMode || this.cameraMode === 'top' || wa.isPartition) {
        wa.group.visible = true;
      } else {
        // Hide ONLY walls blocking the camera's line of sight into the room (dot < -0.22)!
        const dot = wa.nx * camDirX + wa.nz * camDirZ;
        wa.group.visible = dot > -0.35;
      }
    });
  }

  _animate() {
    this._rafId = requestAnimationFrame(() => this._animate());
    if (document.hidden || !this.renderer || !this.scene || !this.camera) return;

    const dt = Math.min(0.05, this.clock.getDelta());
    if (this.cameraMode === 'walk') {
      const speed = 2.4 * dt;
      const fwdX = -Math.sin(this.walkYaw), fwdZ = -Math.cos(this.walkYaw);
      const rightX = Math.cos(this.walkYaw), rightZ = -Math.sin(this.walkYaw);
      if (this.walkKeys.w) { this.camera.position.x += fwdX * speed; this.camera.position.z += fwdZ * speed; }
      if (this.walkKeys.s) { this.camera.position.x -= fwdX * speed; this.camera.position.z -= fwdZ * speed; }
      if (this.walkKeys.d) { this.camera.position.x += rightX * speed; this.camera.position.z += rightZ * speed; }
      if (this.walkKeys.a) { this.camera.position.x -= rightX * speed; this.camera.position.z -= rightZ * speed; }
      if (this.lastState) {
        const RW = this.lastState.room.w * 0.01, RD = this.lastState.room.d * 0.01;
        this.camera.position.x = Math.max(0.35, Math.min(RW - 0.35, this.camera.position.x));
        this.camera.position.z = Math.max(0.35, Math.min(RD - 0.35, this.camera.position.z));
      }
      this.camera.position.y = 1.60;
      const lookX = this.camera.position.x + fwdX * Math.cos(this.walkPitch);
      const lookY = this.camera.position.y + Math.sin(this.walkPitch);
      const lookZ = this.camera.position.z + fwdZ * Math.cos(this.walkPitch);
      this.camera.lookAt(lookX, lookY, lookZ);
    } else if (this.controls) {
      this.controls.update();
    }

    this._updateAutoCutaway();
    this.renderer.render(this.scene, this.camera);
  }

  handleResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w <= 0 || h <= 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  // Capture crisp 2K HD 1920x1080 Photorealistic Render without disturbing live viewport!
  renderHDDataURL(width = 1920, height = 1080) {
    const prevW = this.container.clientWidth;
    const prevH = this.container.clientHeight;
    const prevPR = this.renderer.getPixelRatio();
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this._updateAutoCutaway();
    this.renderer.render(this.scene, this.camera);
    const url = this.renderer.domElement.toDataURL('image/png');
    this.renderer.setPixelRatio(prevPR);
    this.renderer.setSize(Math.max(100, prevW), Math.max(100, prevH), false);
    this.camera.aspect = Math.max(100, prevW) / Math.max(100, prevH);
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);
    return url;
  }

  // Prepare clean architectural root centered at (0, 0, 0) flush on Y=0 for GLB / AR / OBJ / STL!
  prepareExportRoot(opts = {}) {
    this.wallAssemblies.forEach(wa => { wa.group.visible = true; });
    if (this.ceilingMesh) this.ceilingMesh.visible = false; // Open ceiling looks much cleaner in AR & 3D viewers!
    if (this.lastState) {
      const rw = (this.lastState.room.w || 500) * 0.01;
      const rd = (this.lastState.room.d || 400) * 0.01;
      const maxD = Math.max(rw, rd);
      const s = (opts.maxExtentM && maxD > opts.maxExtentM) ? (opts.maxExtentM / maxD) : 1.0;
      this.archRoot.scale.setScalar(s);
      this.archRoot.position.set(-rw * 0.5 * s, 0.12 * s, -rd * 0.5 * s);
    }
    this.archRoot.updateMatrixWorld(true);
    return this.archRoot;
  }

  restoreAfterExport() {
    this.archRoot.scale.setScalar(1);
    this.archRoot.position.set(0, 0, 0);
    this.archRoot.updateMatrixWorld(true);
    this._updateAutoCutaway();
  }
}
