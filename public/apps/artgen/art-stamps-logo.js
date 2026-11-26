/**
 * ArtGen Studio (v5.0) — 6 Geometric Shapes + ALL 33 Re-Engineered Fine-Art Vector Stamps
 * + TRUE Vector .SVG Logo Studio (20 Emblems, 12 Palettes, Zero 8-Char Truncation!)
 * + Fixed DXF Parser (Real ARCs & isolated CIRCLEs) + Connected Flood-Fill Magic Wand Cutout!
 */
(function (globalScope) {
  'use strict';

  function C() { return globalScope.ArtCore; }

  // =========================================================================
  // 1. ALL 6 SHAPES + ALL 33 FINE-ART VECTOR STAMPS (NORMALIZED [-1..1] SPACE!)
  // =========================================================================
  // Every stamp builds crisp proportional vector bezier geometry in [-1..1] space —
  // ZERO destination-out moon holes, ZERO anchor jumps, 5 artistic finish modes + Symmetry!

  function traceStampPath(ctx, id) {
    ctx.beginPath();
    switch (id) {
      case 'circle':
        ctx.arc(0, 0, 0.92, 0, Math.PI * 2);
        break;
      case 'rect':
        ctx.rect(-0.88, -0.88, 1.76, 1.76);
        break;
      case 'triangle':
        ctx.moveTo(0, -0.92); ctx.lineTo(0.92, 0.84); ctx.lineTo(-0.92, 0.84); ctx.closePath();
        break;
      case 'star':
        for (let i = 0; i < 10; i++) {
          const a = (i * Math.PI) / 5 - Math.PI / 2;
          const r = i % 2 === 0 ? 0.95 : 0.42;
          if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        break;
      case 'heart':
        ctx.moveTo(0, 0.82);
        ctx.bezierCurveTo(-1.1, 0.12, -1.05, -0.88, -0.42, -0.88);
        ctx.bezierCurveTo(-0.1, -0.88, 0, -0.52, 0, -0.45);
        ctx.bezierCurveTo(0, -0.52, 0.1, -0.88, 0.42, -0.88);
        ctx.bezierCurveTo(1.05, -0.88, 1.1, 0.12, 0, 0.82);
        ctx.closePath();
        break;
      case 'moon':
        // FIXED: True pure-Bezier crescent moon — ZERO destination-out canvas hole bug!
        ctx.arc(0, 0, 0.9, 0.55, Math.PI * 2 - 0.55, false);
        ctx.bezierCurveTo(0.1, -0.42, 0.1, 0.42, Math.cos(0.55) * 0.9, Math.sin(0.55) * 0.9);
        ctx.closePath();
        break;
      case 'bird':
        ctx.moveTo(-0.95, -0.2);
        ctx.bezierCurveTo(-0.55, -0.85, -0.1, -0.55, 0.05, -0.15);
        ctx.bezierCurveTo(0.25, -0.68, 0.72, -0.88, 0.96, -0.28);
        ctx.bezierCurveTo(0.58, -0.12, 0.35, 0.22, 0.18, 0.52);
        ctx.lineTo(0.35, 0.85); ctx.lineTo(0, 0.62); ctx.lineTo(-0.32, 0.84);
        ctx.bezierCurveTo(-0.22, 0.35, -0.55, 0.08, -0.95, -0.2);
        ctx.closePath();
        break;
      case 'butterfly':
        [-1, 1].forEach(s => {
          ctx.moveTo(0, -0.12);
          ctx.bezierCurveTo(s * 0.55, -1.0, s * 1.05, -0.65, s * 0.92, -0.05);
          ctx.bezierCurveTo(s * 0.78, 0.2, s * 0.3, 0.15, 0, 0.12);
          ctx.bezierCurveTo(s * 0.62, 0.18, s * 0.85, 0.68, s * 0.45, 0.88);
          ctx.bezierCurveTo(s * 0.15, 0.96, s * 0.06, 0.5, 0, 0.36);
        });
        ctx.closePath();
        break;
      case 'figure':
        // Graceful lotus meditation silhouette
        ctx.arc(0, -0.66, 0.2, 0, Math.PI * 2);
        ctx.moveTo(0, -0.42);
        ctx.bezierCurveTo(0.32, -0.38, 0.48, -0.05, 0.68, 0.32);
        ctx.bezierCurveTo(0.92, 0.48, 0.85, 0.82, 0.38, 0.82);
        ctx.lineTo(-0.38, 0.82);
        ctx.bezierCurveTo(-0.85, 0.82, -0.92, 0.48, -0.68, 0.32);
        ctx.bezierCurveTo(-0.48, -0.05, -0.32, -0.38, 0, -0.42);
        ctx.closePath();
        break;
      case 'tree':
        // Stylized sacred tree of life canopy + flared trunk
        ctx.moveTo(-0.14, 0.92); ctx.quadraticCurveTo(-0.08, 0.38, -0.12, 0.05);
        ctx.bezierCurveTo(-0.88, 0.12, -0.96, -0.55, -0.42, -0.72);
        ctx.bezierCurveTo(-0.32, -1.0, 0.32, -1.0, 0.42, -0.72);
        ctx.bezierCurveTo(0.96, -0.55, 0.88, 0.12, 0.12, 0.05);
        ctx.quadraticCurveTo(0.08, 0.38, 0.14, 0.92);
        ctx.closePath();
        break;
      case 'flower':
        // 8-petal botanical lotus bloom
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          const a1 = a - 0.32, a2 = a + 0.32;
          ctx.moveTo(0, 0);
          ctx.bezierCurveTo(Math.cos(a1) * 0.65, Math.sin(a1) * 0.65, Math.cos(a1) * 0.95, Math.sin(a1) * 0.95, Math.cos(a) * 0.95, Math.sin(a) * 0.95);
          ctx.bezierCurveTo(Math.cos(a2) * 0.95, Math.sin(a2) * 0.95, Math.cos(a2) * 0.65, Math.sin(a2) * 0.65, 0, 0);
        }
        break;
      case 'fish':
        // Flowing Japanese Koi silhouette
        ctx.moveTo(0.88, 0);
        ctx.bezierCurveTo(0.58, -0.52, -0.05, -0.48, -0.52, -0.08);
        ctx.lineTo(-0.95, -0.48); ctx.quadraticCurveTo(-0.74, 0, -0.95, 0.48);
        ctx.lineTo(-0.52, 0.08);
        ctx.bezierCurveTo(-0.05, 0.48, 0.58, 0.52, 0.88, 0);
        ctx.closePath();
        break;
      case 'robot':
        // Sleek sci-fi cybernetic crest visor
        ctx.moveTo(-0.58, -0.68); ctx.lineTo(0.58, -0.68); ctx.lineTo(0.74, -0.2);
        ctx.lineTo(0.58, 0.68); ctx.lineTo(0.24, 0.86); ctx.lineTo(-0.24, 0.86);
        ctx.lineTo(-0.58, 0.68); ctx.lineTo(-0.74, -0.2); ctx.closePath();
        ctx.moveTo(-0.46, -0.18); ctx.lineTo(0.46, -0.18); ctx.lineTo(0.36, 0.08); ctx.lineTo(-0.36, 0.08); ctx.closePath();
        break;
      case 'cat':
        // Regal geometric feline head silhouette
        ctx.moveTo(-0.68, -0.1); ctx.lineTo(-0.78, -0.88); ctx.lineTo(-0.24, -0.52);
        ctx.quadraticCurveTo(0, -0.58, 0.24, -0.52);
        ctx.lineTo(0.78, -0.88); ctx.lineTo(0.68, -0.1);
        ctx.bezierCurveTo(0.78, 0.45, 0.4, 0.86, 0, 0.88);
        ctx.bezierCurveTo(-0.4, 0.86, -0.78, 0.45, -0.68, -0.1);
        ctx.closePath();
        break;
      case 'dog':
        // Noble hound heraldic profile
        ctx.moveTo(-0.45, -0.75); ctx.lineTo(-0.18, -0.86); ctx.lineTo(0.22, -0.52);
        ctx.lineTo(0.84, -0.34); ctx.lineTo(0.88, -0.04); ctx.lineTo(0.42, 0.14);
        ctx.lineTo(0.24, 0.86); ctx.lineTo(-0.56, 0.86);
        ctx.bezierCurveTo(-0.84, 0.42, -0.82, -0.35, -0.45, -0.75);
        ctx.closePath();
        break;
      case 'eagle':
        // Imperial heraldic spread-wing eagle
        ctx.moveTo(0, -0.88); ctx.lineTo(0.16, -0.62); ctx.lineTo(0.96, -0.52);
        ctx.lineTo(0.78, -0.18); ctx.lineTo(0.9, 0.04); ctx.lineTo(0.55, 0.18);
        ctx.lineTo(0.2, 0.48); ctx.lineTo(0.32, 0.9); ctx.lineTo(0, 0.72);
        ctx.lineTo(-0.32, 0.9); ctx.lineTo(-0.2, 0.48); ctx.lineTo(-0.55, 0.18);
        ctx.lineTo(-0.9, 0.04); ctx.lineTo(-0.78, -0.18); ctx.lineTo(-0.96, -0.52);
        ctx.lineTo(-0.16, -0.62); ctx.closePath();
        break;
      case 'dragon':
        // Mythic winged dragon crest silhouette (head, horns, wings, coiled tail!)
        ctx.moveTo(0.18, -0.92); ctx.lineTo(0.48, -0.74); ctx.lineTo(0.26, -0.58);
        ctx.bezierCurveTo(0.68, -0.86, 0.98, -0.42, 0.88, 0.08);
        ctx.bezierCurveTo(0.56, -0.02, 0.34, 0.18, 0.28, 0.46);
        ctx.bezierCurveTo(0.46, 0.76, 0.18, 0.96, -0.25, 0.86);
        ctx.bezierCurveTo(-0.62, 0.78, -0.84, 0.42, -0.58, 0.18);
        ctx.bezierCurveTo(-0.96, 0.02, -0.96, -0.55, -0.32, -0.58);
        ctx.lineTo(-0.12, -0.88); ctx.closePath();
        break;
      case 'horse':
        // Noble chess-knight / mustang head & flowing mane!
        ctx.moveTo(-0.12, -0.92); ctx.lineTo(0.18, -0.68); ctx.lineTo(0.72, -0.18);
        ctx.lineTo(0.62, 0.08); ctx.lineTo(0.26, 0.02); ctx.lineTo(0.14, 0.38);
        ctx.lineTo(0.48, 0.88); ctx.lineTo(-0.62, 0.88);
        ctx.bezierCurveTo(-0.82, 0.25, -0.68, -0.58, -0.12, -0.92);
        ctx.closePath();
        break;
      case 'dolphin':
        // Leaping graceful arc dolphin
        ctx.moveTo(-0.85, 0.42);
        ctx.bezierCurveTo(-0.55, -0.78, 0.45, -0.88, 0.92, -0.05);
        ctx.bezierCurveTo(0.62, 0.12, 0.45, -0.04, 0.22, -0.12);
        ctx.bezierCurveTo(-0.1, -0.22, -0.45, 0.12, -0.56, 0.58);
        ctx.lineTo(-0.88, 0.78); ctx.lineTo(-0.76, 0.46); ctx.closePath();
        break;
      case 'crown':
        ctx.moveTo(-0.86, 0.64); ctx.lineTo(-0.94, -0.38); ctx.lineTo(-0.42, 0.06);
        ctx.lineTo(0, -0.72); ctx.lineTo(0.42, 0.06); ctx.lineTo(0.94, -0.38);
        ctx.lineTo(0.86, 0.64); ctx.closePath();
        ctx.rect(-0.84, 0.72, 1.68, 0.18);
        break;
      case 'sun':
        // Radiant 12-ray solar medallion
        for (let i = 0; i < 24; i++) {
          const a = (i * Math.PI) / 12;
          const r = i % 2 === 0 ? 0.96 : 0.56;
          if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        break;
      case 'alien':
        // Sleek astral silhouette + almond visor eyes
        ctx.moveTo(0, -0.92);
        ctx.bezierCurveTo(0.82, -0.92, 0.85, -0.08, 0.42, 0.48);
        ctx.bezierCurveTo(0.22, 0.76, 0.12, 0.92, 0, 0.92);
        ctx.bezierCurveTo(-0.12, 0.92, -0.22, 0.76, -0.42, 0.48);
        ctx.bezierCurveTo(-0.85, -0.08, -0.82, -0.92, 0, -0.92);
        ctx.closePath();
        break;
      case 'unicorn':
        // Heraldic unicorn with spiraled horn!
        ctx.moveTo(0.05, -0.62); ctx.lineTo(0.76, -0.96); ctx.lineTo(0.24, -0.46);
        ctx.lineTo(0.78, -0.05); ctx.lineTo(0.64, 0.18); ctx.lineTo(0.24, 0.10);
        ctx.lineTo(0.45, 0.88); ctx.lineTo(-0.62, 0.88);
        ctx.bezierCurveTo(-0.82, 0.2, -0.64, -0.58, 0.05, -0.62);
        ctx.closePath();
        break;
      case 'shark':
        ctx.moveTo(0.95, 0.04);
        ctx.bezierCurveTo(0.48, -0.28, 0.18, -0.22, 0.02, -0.78);
        ctx.bezierCurveTo(-0.12, -0.32, -0.35, -0.18, -0.68, -0.08);
        ctx.lineTo(-0.96, -0.48); ctx.lineTo(-0.78, 0.04); ctx.lineTo(-0.94, 0.44);
        ctx.lineTo(-0.62, 0.16);
        ctx.bezierCurveTo(-0.1, 0.36, 0.55, 0.36, 0.95, 0.04);
        ctx.closePath();
        break;
      case 'fox':
        // Origami low-poly geometric fox mask
        ctx.moveTo(0, 0.88); ctx.lineTo(0.84, -0.08); ctx.lineTo(0.68, -0.9);
        ctx.lineTo(0.22, -0.44); ctx.lineTo(-0.22, -0.44); ctx.lineTo(-0.68, -0.9);
        ctx.lineTo(-0.84, -0.08); ctx.closePath();
        break;
      case 'lion':
        // Royal heraldic sun-mane lion crest
        for (let i = 0; i < 16; i++) {
          const a = (i * Math.PI) / 8;
          const r = i % 2 === 0 ? 0.94 : 0.70;
          if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        break;
      case 'elephant':
        // Majestic silhouette with curved trunk & tusks
        ctx.moveTo(-0.78, 0.84); ctx.lineTo(-0.78, -0.22);
        ctx.bezierCurveTo(-0.78, -0.78, 0.12, -0.88, 0.46, -0.48);
        ctx.bezierCurveTo(0.82, -0.24, 0.92, 0.35, 0.72, 0.72);
        ctx.bezierCurveTo(0.58, 0.82, 0.42, 0.65, 0.54, 0.44);
        ctx.bezierCurveTo(0.62, 0.24, 0.46, 0.05, 0.32, 0.18);
        ctx.lineTo(0.32, 0.84); ctx.lineTo(0.04, 0.84); ctx.lineTo(0.04, 0.36);
        ctx.lineTo(-0.46, 0.36); ctx.lineTo(-0.46, 0.84); ctx.closePath();
        break;
      case 'house':
        // Modern architectural A-frame villa
        ctx.moveTo(0, -0.88); ctx.lineTo(0.92, -0.05); ctx.lineTo(0.72, -0.05);
        ctx.lineTo(0.72, 0.86); ctx.lineTo(-0.72, 0.86); ctx.lineTo(-0.72, -0.05);
        ctx.lineTo(-0.92, -0.05); ctx.closePath();
        break;
      case 'car':
        // Sleek GT supercar aerodynamic silhouette
        ctx.moveTo(-0.95, 0.28); ctx.lineTo(-0.88, -0.04); ctx.lineTo(-0.42, -0.18);
        ctx.bezierCurveTo(-0.18, -0.52, 0.26, -0.52, 0.54, -0.16);
        ctx.lineTo(0.92, -0.02); ctx.lineTo(0.95, 0.28); ctx.lineTo(0.68, 0.28);
        ctx.arc(0.52, 0.28, 0.18, 0, Math.PI, true);
        ctx.lineTo(-0.34, 0.28);
        ctx.arc(-0.52, 0.28, 0.18, 0, Math.PI, true);
        ctx.closePath();
        break;
      case 'plane':
        // Swept-wing supersonic jet
        ctx.moveTo(0, -0.94); ctx.lineTo(0.14, -0.32); ctx.lineTo(0.94, 0.16);
        ctx.lineTo(0.94, 0.34); ctx.lineTo(0.14, 0.14); ctx.lineTo(0.1, 0.64);
        ctx.lineTo(0.38, 0.86); ctx.lineTo(0.38, 0.94); ctx.lineTo(0, 0.82);
        ctx.lineTo(-0.38, 0.94); ctx.lineTo(-0.38, 0.86); ctx.lineTo(-0.1, 0.64);
        ctx.lineTo(-0.14, 0.14); ctx.lineTo(-0.94, 0.34); ctx.lineTo(-0.94, 0.16);
        ctx.lineTo(-0.14, -0.32); ctx.closePath();
        break;
      case 'rocket2':
        // Sleek orbital starship
        ctx.moveTo(0, -0.96);
        ctx.bezierCurveTo(0.36, -0.56, 0.38, 0.08, 0.3, 0.52);
        ctx.lineTo(0.68, 0.86); ctx.lineTo(0.24, 0.72); ctx.lineTo(0, 0.94);
        ctx.lineTo(-0.24, 0.72); ctx.lineTo(-0.68, 0.86); ctx.lineTo(-0.3, 0.52);
        ctx.bezierCurveTo(-0.38, 0.08, -0.36, -0.56, 0, -0.96);
        ctx.closePath();
        break;
      case 'anchor':
        ctx.arc(0, -0.72, 0.18, 0, Math.PI * 2);
        ctx.moveTo(-0.08, -0.54); ctx.lineTo(0.08, -0.54); ctx.lineTo(0.08, 0.62);
        ctx.bezierCurveTo(0.48, 0.56, 0.68, 0.25, 0.72, 0.04);
        ctx.lineTo(0.88, 0.12);
        ctx.bezierCurveTo(0.76, 0.68, 0.35, 0.92, 0, 0.94);
        ctx.bezierCurveTo(-0.35, 0.92, -0.76, 0.68, -0.88, 0.12);
        ctx.lineTo(-0.72, 0.04);
        ctx.bezierCurveTo(-0.68, 0.25, -0.48, 0.56, -0.08, 0.62);
        ctx.closePath();
        ctx.rect(-0.46, -0.36, 0.92, 0.12);
        break;
      case 'sword':
        ctx.moveTo(0, -0.96); ctx.lineTo(0.14, -0.68); ctx.lineTo(0.11, 0.34);
        ctx.lineTo(0.56, 0.34); ctx.lineTo(0.56, 0.48); ctx.lineTo(0.10, 0.48);
        ctx.lineTo(0.10, 0.82); ctx.lineTo(0.20, 0.94); ctx.lineTo(-0.20, 0.94);
        ctx.lineTo(-0.10, 0.82); ctx.lineTo(-0.10, 0.48); ctx.lineTo(-0.56, 0.48);
        ctx.lineTo(-0.56, 0.34); ctx.lineTo(-0.11, 0.34); ctx.lineTo(-0.14, -0.68);
        ctx.closePath();
        break;
      case 'mushroom':
        ctx.moveTo(-0.92, 0.06);
        ctx.bezierCurveTo(-0.92, -0.82, 0.92, -0.82, 0.92, 0.06);
        ctx.quadraticCurveTo(0, 0.24, -0.92, 0.06);
        ctx.moveTo(-0.26, 0.14); ctx.bezierCurveTo(-0.24, 0.55, -0.38, 0.86, -0.26, 0.92);
        ctx.lineTo(0.26, 0.92); ctx.bezierCurveTo(0.38, 0.86, 0.24, 0.55, 0.26, 0.14);
        ctx.closePath();
        break;
      case 'wave':
        // Hokusai-inspired Great Wave curl!
        ctx.moveTo(-0.95, 0.72);
        ctx.bezierCurveTo(-0.78, -0.58, 0.05, -0.98, 0.64, -0.52);
        ctx.bezierCurveTo(0.95, -0.28, 0.82, 0.22, 0.42, 0.16);
        ctx.bezierCurveTo(0.16, 0.12, 0.25, -0.24, 0.44, -0.18);
        ctx.bezierCurveTo(0.12, -0.45, -0.32, -0.18, -0.18, 0.36);
        ctx.lineTo(0.95, 0.72); ctx.closePath();
        break;
      case 'phoenix':
        // Rising flaming phoenix wings & tail plumage
        ctx.moveTo(0, -0.92); ctx.bezierCurveTo(0.28, -0.55, 0.85, -0.85, 0.96, -0.18);
        ctx.bezierCurveTo(0.68, 0.08, 0.42, 0.16, 0.24, 0.36);
        ctx.bezierCurveTo(0.44, 0.64, 0.38, 0.88, 0.12, 0.96);
        ctx.lineTo(0, 0.62); ctx.lineTo(-0.12, 0.96);
        ctx.bezierCurveTo(-0.38, 0.88, -0.44, 0.64, -0.24, 0.36);
        ctx.bezierCurveTo(-0.42, 0.16, -0.68, 0.08, -0.96, -0.18);
        ctx.bezierCurveTo(-0.85, -0.85, -0.28, -0.55, 0, -0.92);
        ctx.closePath();
        break;
      case 'octopus':
        ctx.arc(0, -0.34, 0.48, Math.PI, 0, false);
        ctx.bezierCurveTo(0.65, 0.08, 0.92, 0.38, 0.86, 0.78);
        ctx.bezierCurveTo(0.62, 0.68, 0.56, 0.22, 0.32, 0.24);
        ctx.bezierCurveTo(0.38, 0.62, 0.32, 0.92, 0.12, 0.92);
        ctx.bezierCurveTo(0.06, 0.6, 0.06, 0.3, 0, 0.3);
        ctx.bezierCurveTo(-0.06, 0.3, -0.06, 0.6, -0.12, 0.92);
        ctx.bezierCurveTo(-0.32, 0.92, -0.38, 0.62, -0.32, 0.24);
        ctx.bezierCurveTo(-0.56, 0.22, -0.62, 0.68, -0.86, 0.78);
        ctx.bezierCurveTo(-0.92, 0.38, -0.65, 0.08, -0.48, -0.34);
        ctx.closePath();
        break;
      case 'crab':
        ctx.ellipse(0, 0.14, 0.56, 0.38, 0, 0, Math.PI * 2);
        [-1, 1].forEach(s => {
          ctx.moveTo(s * 0.42, -0.12);
          ctx.bezierCurveTo(s * 0.92, -0.28, s * 0.96, -0.78, s * 0.55, -0.88);
          ctx.lineTo(s * 0.62, -0.58); ctx.lineTo(s * 0.35, -0.72);
          ctx.bezierCurveTo(s * 0.58, -0.42, s * 0.45, -0.25, s * 0.32, -0.18);
          for (let l = 0; l < 3; l++) {
            ctx.moveTo(s * 0.52, 0.1 + l * 0.15);
            ctx.lineTo(s * 0.92, 0.25 + l * 0.22);
          }
        });
        break;
      default:
        ctx.arc(0, 0, 0.85, 0, Math.PI * 2);
    }
  }

  function drawShapeOrStamp(ctx, id, x1, y1, x2, y2, opts) {
    const Core = C();
    const Brushes = globalScope.ArtBrushes;
    const transforms = Brushes ? Brushes.getSymmetryTransforms(opts.symMode, opts.symCx, opts.symCy) : [{ fn: (x, y) => [x, y] }];

    for (let t = 0; t < transforms.length; t++) {
      const p1 = transforms[t].fn(x1, y1);
      const p2 = transforms[t].fn(x2, y2);
      drawSingleShapeStamp(ctx, id, p1[0], p1[1], p2[0], p2[1], opts);
    }
  }

  function drawSingleShapeStamp(ctx, id, x1, y1, x2, y2, opts) {
    const Core = C();
    const pc = Core.normalizeHex(opts.pc || '#8b5cf6');
    const sc = Core.normalizeHex(opts.sc || '#38bdf8');
    const op = opts.opacity !== undefined ? opts.opacity : 0.95;
    const finish = opts.stampStyle || 'silk'; // 'silk' | 'outline' | 'gold' | 'watercolor' | 'constellation'

    ctx.save();
    ctx.globalAlpha = op;

    if (id === 'line') {
      ctx.strokeStyle = finish === 'gold' ? '#d4af37' : pc;
      ctx.lineWidth = Math.max(1.5, opts.size * 0.3);
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.restore();
      return;
    }

    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    let rx = Math.max(6, Math.abs(x2 - x1) / 2);
    let ry = Math.max(6, Math.abs(y2 - y1) / 2);
    // Keep figurative stamps proportional (never squashed cartoonishly!) unless Shift overrides
    const isBasic = id === 'rect' || id === 'circle' || id === 'triangle';
    if (!isBasic && !opts.freeAspect) {
      const r = Math.max(rx, ry);
      rx = r; ry = r;
    }

    ctx.translate(cx, cy);
    ctx.scale(rx, ry);
    const invScale = 1 / Math.max(rx, ry);

    traceStampPath(ctx, id);

    if (finish === 'gold') {
      const g = ctx.createLinearGradient(-1, -1, 1, 1);
      g.addColorStop(0, '#fef08a'); g.addColorStop(0.4, '#d4af37'); g.addColorStop(0.75, '#92400e'); g.addColorStop(1, '#fde047');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = '#fffbeb';
      ctx.lineWidth = Math.max(1.5, opts.size * 0.12) * invScale;
      ctx.stroke();
    } else if (finish === 'outline') {
      ctx.shadowColor = pc; ctx.shadowBlur = 14;
      ctx.strokeStyle = pc;
      ctx.lineWidth = Math.max(2, opts.size * 0.16) * invScale;
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(0.8, opts.size * 0.05) * invScale;
      ctx.stroke();
    } else if (finish === 'watercolor') {
      const g = ctx.createRadialGradient(-0.2, -0.2, 0.1, 0, 0, 1.1);
      g.addColorStop(0, Core.rgba(pc, 0.42));
      g.addColorStop(0.8, Core.rgba(sc, 0.58));
      g.addColorStop(1, Core.rgba(pc, 0.85));
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = Core.rgba(pc, 0.72);
      ctx.lineWidth = 2 * invScale;
      ctx.stroke();
    } else if (finish === 'constellation') {
      ctx.fillStyle = Core.rgba(pc, 0.12);
      ctx.fill();
      ctx.setLineDash([6 * invScale, 4 * invScale]);
      ctx.strokeStyle = sc;
      ctx.lineWidth = 1.6 * invScale;
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // 'silk' — sleek editorial metallic-silk gradient!
      const g = ctx.createLinearGradient(-1, -1, 1, 1);
      g.addColorStop(0, pc); g.addColorStop(1, sc);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = Core.rgba('#ffffff', 0.45);
      ctx.lineWidth = Math.max(1.2, opts.size * 0.08) * invScale;
      ctx.stroke();
    }
    ctx.restore();
  }

  // =========================================================================
  // 2. TRUE VECTOR .SVG LOGO STUDIO (ALL 20 EMBLEMS + 12 PALETTES + LIVE SVG!)
  // =========================================================================

  const LOGO_STYLES = [
    { id: 'cyber_shield',    en: '🛡️ Cyber Shield',      fr: '🛡️ Bouclier Cyber' },
    { id: 'beast_dragon',    en: '🐉 Mythic Dragon',     fr: '🐉 Dragon Mythique' },
    { id: 'alpha_wolf',      en: '🐺 Alpha Wolf',        fr: '🐺 Loup Alpha' },
    { id: 'phoenix_rise',    en: '🔥 Rising Phoenix',    fr: '🔥 Phénix Solaire' },
    { id: 'lion_crest',      en: '🦁 Royal Lion Crest',  fr: '🦁 Blason Lion Royal' },
    { id: 'eagle_wing',      en: '🦅 Imperial Eagle',    fr: '🦅 Aigle Impérial' },
    { id: 'luxury_crown',    en: '👑 Luxury Crown',      fr: '👑 Couronne Luxe' },
    { id: 'diamond_crystal', en: '💎 Diamond Prism',     fr: '💎 Prisme Diamant' },
    { id: 'viking_swords',   en: '⚔️ Crossed Blades',    fr: '⚔️ Lames Croisées' },
    { id: 'atom_quantum',    en: '⚛️ Quantum Atom',      fr: '⚛️ Atome Quantique' },
    { id: 'infinity_flow',   en: '♾️ Infinity Ribbon',   fr: '♾️ Ruban Infini' },
    { id: 'lotus_zen',       en: '🪷 Sacred Lotus',      fr: '🪷 Lotus Sacré' },
    { id: 'tree_of_life',    en: '🌳 Tree of Life',      fr: '🌳 Arbre de Vie' },
    { id: 'mountain_peak',   en: '⛰️ Alpine Summit',     fr: '⛰️ Sommet Alpin' },
    { id: 'wave_pulse',      en: '🌊 Ocean Wave',        fr: '🌊 Vague Océan' },
    { id: 'space_rocket',    en: '🚀 Orbital Rocket',    fr: '🚀 Fusée Orbitale' },
    { id: 'target_gaming',   en: '🎯 Precision Reticle', fr: '🎯 Viseur Précision' },
    { id: 'hex_tech',        en: '⬡ Hex Core Tech',      fr: '⬡ Noyau Hexa Tech' },
    { id: 'gear_forge',      en: '⚙️ Forge Precision',   fr: '⚙️ Engrenage Forge' },
    { id: 'rockstar_guitar', en: '🎸 Acoustic Crest',    fr: '🎸 Blason Guitare' }
  ];

  const LOGO_PALETTES = [
    { id: 'gold_royal',  name: 'Royal Gold & Obsidian', text: '#fef3c7', emblem: '#d4af37', frame: '#92400e', bg: '#090b12' },
    { id: 'cyber_neon',  name: 'Cyber Neon Pulse',      text: '#ffffff', emblem: '#00f5d4', frame: '#ff007f', bg: '#070414' },
    { id: 'azure_tech',  name: 'Titanium Azure',        text: '#f0f9ff', emblem: '#38bdf8', frame: '#2563eb', bg: '#081224' },
    { id: 'crimson_pro', name: 'Esports Crimson',       text: '#ffffff', emblem: '#f43f5e', frame: '#f97316', bg: '#12070d' },
    { id: 'emerald_zen', name: 'Emerald Botanical',     text: '#ecfdf5', emblem: '#10b981', frame: '#059669', bg: '#061512' },
    { id: 'violet_ai',   name: 'Quantum Violet',        text: '#f5f3ff', emblem: '#a855f7', frame: '#6366f1', bg: '#0d091c' },
    { id: 'rose_luxe',   name: 'Rose Gold Couture',     text: '#fff1f2', emblem: '#fb7185', frame: '#d4af37', bg: '#170c12' },
    { id: 'arctic_ice',  name: 'Arctic Platinum',       text: '#ffffff', emblem: '#bae6fd', frame: '#64748b', bg: '#0c1522' },
    { id: 'solar_forge', name: 'Solar Amber Forge',     text: '#fffbeb', emblem: '#f59e0b', frame: '#dc2626', bg: '#170c06' },
    { id: 'mono_noir',   name: 'Swiss Minimal Noir',    text: '#ffffff', emblem: '#e2e8f0', frame: '#475569', bg: '#09090b' },
    { id: 'ivory_serif', name: 'Gallery Ivory Ink',     text: '#0f172a', emblem: '#1e293b', frame: '#b45309', bg: '#faf7f0' },
    { id: 'mint_future', name: 'Electric Mint',         text: '#f0fdfa', emblem: '#2dd4bf', frame: '#818cf8', bg: '#08121a' }
  ];

  function escXml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function buildEmblemSVGMarkup(styleId, c1, c2) {
    // Centered cleanly around (512, 395) inside 1024x1024 viewBox!
    const grad = 'url(#emblemGrad)';
    const stroke = c2;
    switch (styleId) {
      case 'cyber_shield':
        // FIXED: All coordinates properly centered around 512 (no negative off-canvas dots!)
        return `
          <path d="M512 165 L720 235 L700 475 C690 565 605 635 512 670 C419 635 334 565 324 475 L304 235 Z" fill="rgba(15,23,42,0.55)" stroke="${grad}" stroke-width="14"/>
          <path d="M512 205 L678 262 L662 462 C654 534 585 592 512 622 C439 592 370 534 362 462 L346 262 Z" fill="none" stroke="${stroke}" stroke-width="5" opacity="0.7"/>
          <path d="M430 415 L490 320 L530 390 L595 305 L540 495 L498 418 L442 495 Z" fill="${grad}"/>
          <circle cx="352" cy="272" r="9" fill="${c1}"/><circle cx="672" cy="272" r="9" fill="${c1}"/>
          <circle cx="378" cy="488" r="9" fill="${c2}"/><circle cx="646" cy="488" r="9" fill="${c2}"/>`;
      case 'atom_quantum':
        // FIXED: Electrons strictly aligned ON the rotated elliptical orbits!
        return `
          <g transform="translate(512,395)">
            <ellipse rx="215" ry="76" fill="none" stroke="${grad}" stroke-width="10"/>
            <ellipse rx="215" ry="76" fill="none" stroke="${grad}" stroke-width="10" transform="rotate(60)"/>
            <ellipse rx="215" ry="76" fill="none" stroke="${grad}" stroke-width="10" transform="rotate(120)"/>
            <circle r="34" fill="${grad}"/><circle r="16" fill="#ffffff" opacity="0.8"/>
            <circle cx="215" cy="0" r="14" fill="${c2}"/>
            <circle cx="-107.5" cy="186.2" r="14" fill="${c1}"/>
            <circle cx="-107.5" cy="-186.2" r="14" fill="${c2}"/>
          </g>`;
      case 'luxury_crown':
        return `
          <path d="M295 510 L265 290 L405 390 L512 215 L619 390 L759 290 L729 510 Z" fill="${grad}" stroke="${stroke}" stroke-width="8" stroke-linejoin="round"/>
          <rect x="295" y="535" width="434" height="36" rx="12" fill="${grad}"/>
          <circle cx="512" cy="195" r="18" fill="${c1}"/><circle cx="265" cy="268" r="14" fill="${c2}"/><circle cx="759" cy="268" r="14" fill="${c2}"/>`;
      case 'diamond_crystal':
        return `
          <polygon points="512,175 720,335 512,625 304,335" fill="rgba(15,23,42,0.4)" stroke="${grad}" stroke-width="12" stroke-linejoin="round"/>
          <polygon points="512,175 616,335 512,625 408,335" fill="${grad}" opacity="0.82"/>
          <line x1="304" y1="335" x2="720" y2="335" stroke="#ffffff" stroke-width="5" opacity="0.7"/>`;
      case 'infinity_flow':
        return `
          <path d="M365 395 C365 305 465 305 512 395 C559 485 659 485 659 395 C659 305 559 305 512 395 C465 485 365 485 365 395 Z" fill="none" stroke="${grad}" stroke-width="34" stroke-linecap="round"/>
          <path d="M365 395 C365 305 465 305 512 395 C559 485 659 485 659 395" fill="none" stroke="#ffffff" stroke-width="7" opacity="0.55" stroke-linecap="round"/>`;
      case 'lotus_zen':
        return `
          <g transform="translate(512,435)">
            <path d="M0 95 C-75 25 -85 -130 0 -225 C85 -130 75 25 0 95 Z" fill="${grad}"/>
            <path d="M-20 95 C-155 45 -210 -65 -140 -175 C-55 -115 -15 -5 -20 95 Z" fill="${grad}" opacity="0.82"/>
            <path d="M20 95 C155 45 210 -65 140 -175 C55 -115 15 -5 20 95 Z" fill="${grad}" opacity="0.82"/>
            <path d="M-35 95 C-190 95 -245 15 -225 -65 C-135 -35 -60 25 -35 95 Z" fill="${c2}" opacity="0.72"/>
            <path d="M35 95 C190 95 245 15 225 -65 C135 -35 60 25 35 95 Z" fill="${c2}" opacity="0.72"/>
          </g>`;
      case 'mountain_peak':
        return `
          <polygon points="240,565 440,235 640,565" fill="${grad}" opacity="0.9"/>
          <polygon points="460,565 620,300 784,565" fill="${c2}" opacity="0.8"/>
          <polygon points="440,235 495,326 458,312 440,340 412,310 385,326" fill="#ffffff" opacity="0.9"/>`;
      case 'hex_tech':
        return `
          <polygon points="512,175 702,285 702,505 512,615 322,505 322,285" fill="none" stroke="${grad}" stroke-width="18"/>
          <polygon points="512,245 642,320 642,470 512,545 382,470 382,320" fill="${grad}" opacity="0.24" stroke="${c2}" stroke-width="8"/>
          <polygon points="512,315 582,355 582,435 512,475 442,435 442,355" fill="${grad}"/>`;
      case 'gear_forge': {
        let pts = '';
        for (let i = 0; i < 24; i++) {
          const a = (i * Math.PI) / 12;
          const r = i % 2 === 0 ? 205 : 162;
          pts += `${(512 + Math.cos(a) * r).toFixed(1)},${(395 + Math.sin(a) * r).toFixed(1)} `;
        }
        return `<polygon points="${pts}" fill="${grad}"/><circle cx="512" cy="395" r="88" fill="#090d16" stroke="${c2}" stroke-width="10"/><circle cx="512" cy="395" r="32" fill="${grad}"/>`;
      }
      case 'target_gaming':
        return `
          <circle cx="512" cy="395" r="195" fill="none" stroke="${grad}" stroke-width="14"/>
          <circle cx="512" cy="395" r="122" fill="none" stroke="${c2}" stroke-width="8" stroke-dasharray="28 18"/>
          <circle cx="512" cy="395" r="34" fill="${grad}"/>
          <line x1="512" y1="160" x2="512" y2="265" stroke="${c1}" stroke-width="12"/>
          <line x1="512" y1="525" x2="512" y2="630" stroke="${c1}" stroke-width="12"/>
          <line x1="277" y1="395" x2="382" y2="395" stroke="${c1}" stroke-width="12"/>
          <line x1="642" y1="395" x2="747" y2="395" stroke="${c1}" stroke-width="12"/>`;
      case 'viking_swords':
        return `
          <g transform="translate(512,395)">
            <g transform="rotate(40)"><polygon points="0,-225 22,-175 18,95 68,95 68,120 14,120 14,195 -14,195 -14,120 -68,120 -68,95 -18,95 -22,-175" fill="${grad}"/></g>
            <g transform="rotate(-40)"><polygon points="0,-225 22,-175 18,95 68,95 68,120 14,120 14,195 -14,195 -14,120 -68,120 -68,95 -18,95 -22,-175" fill="${c2}"/></g>
            <circle r="48" fill="#090d16" stroke="${grad}" stroke-width="10"/>
          </g>`;
      case 'wave_pulse':
        return `
          <path d="M275 495 C325 225 535 165 655 255 C740 318 710 435 615 415 C555 402 575 315 625 332 C545 270 435 335 475 455 L745 505 C620 565 375 565 275 495 Z" fill="${grad}"/>`;
      case 'space_rocket':
        return `
          <g transform="translate(512,395) rotate(28)">
            <path d="M0 -215 C82 -125 88 20 68 125 L145 198 L52 162 L0 218 L-52 162 L-145 198 L-68 125 C-88 20 -82 -125 0 -215 Z" fill="${grad}"/>
            <circle cy="-48" r="36" fill="#090d16" stroke="#ffffff" stroke-width="8"/>
          </g>`;
      case 'tree_of_life':
        return `
          <circle cx="512" cy="395" r="210" fill="none" stroke="${grad}" stroke-width="12"/>
          <path d="M488 575 Q502 455 488 380 C340 395 315 245 430 220 C455 165 569 165 594 220 C709 245 684 395 536 380 Q522 455 536 575 Z" fill="${grad}"/>`;
      case 'beast_dragon':
        return `
          <path d="M548 180 L620 225 L570 260 C665 195 745 295 720 415 C645 390 595 435 580 505 C620 575 555 620 450 595 C365 575 315 495 375 440 C285 400 285 265 440 260 L488 190 Z" fill="${grad}" stroke="${c2}" stroke-width="8"/>`;
      case 'alpha_wolf':
        return `
          <polygon points="512,615 695,385 655,185 560,295 464,295 369,185 329,385" fill="${grad}" stroke="${c2}" stroke-width="10" stroke-linejoin="round"/>
          <polygon points="415,365 482,395 430,425" fill="#090d16"/>
          <polygon points="609,365 542,395 594,425" fill="#090d16"/>
          <polygon points="512,545 546,485 478,485" fill="#090d16"/>`;
      case 'phoenix_rise':
        return `
          <path d="M512 185 C575 270 705 200 735 355 C665 415 605 435 565 482 C615 545 595 605 538 625 L512 545 L486 625 C429 605 409 545 459 482 C419 435 359 415 289 355 C319 200 449 270 512 185 Z" fill="${grad}"/>`;
      case 'lion_crest': {
        let pts = '';
        for (let i = 0; i < 16; i++) {
          const a = (i * Math.PI) / 8;
          const r = i % 2 === 0 ? 215 : 158;
          pts += `${(512 + Math.cos(a) * r).toFixed(1)},${(395 + Math.sin(a) * r).toFixed(1)} `;
        }
        return `<polygon points="${pts}" fill="${grad}"/><polygon points="512,515 595,375 565,295 459,295 429,375" fill="#090d16" opacity="0.65"/><polygon points="512,465 545,415 479,415" fill="${c1}"/>`;
      }
      case 'eagle_wing':
        return `
          <path d="M512 190 L552 250 L745 275 L700 355 L730 408 L645 440 L560 510 L590 612 L512 568 L434 612 L464 510 L379 440 L294 408 L324 355 L279 275 L472 250 Z" fill="${grad}"/>`;
      case 'rockstar_guitar':
        return `
          <g transform="translate(512,395) rotate(-32)">
            <rect x="-16" y="-225" width="32" height="230" rx="6" fill="${c2}"/>
            <rect x="-32" y="-245" width="64" height="52" rx="10" fill="${grad}"/>
            <path d="M0 -10 C75 -10 105 45 78 95 C128 135 112 225 0 225 C-112 225 -128 135 -78 95 C-105 45 -75 -10 0 -10 Z" fill="${grad}"/>
            <circle cy="85" r="32" fill="#090d16" stroke="#ffffff" stroke-width="5"/>
          </g>`;
      default:
        return `<circle cx="512" cy="395" r="180" fill="${grad}"/>`;
    }
  }

  function buildLogoSVG(cfg) {
    const brand = String(cfg.brand || 'ARTGEN').trim() || 'ARTGEN';
    const sub = String(cfg.tagline || '').trim();
    const styleId = cfg.styleId || 'cyber_shield';
    const cText = C().normalizeHex(cfg.textColor || '#fef3c7');
    const cEmb = C().normalizeHex(cfg.emblemColor || '#d4af37');
    const cFrm = C().normalizeHex(cfg.frameColor || '#92400e');
    const bgHex = C().normalizeHex(cfg.bgColor || '#090b12');
    const transparent = !!cfg.transparent;
    const fontFamily = cfg.fontFamily || "'Space Grotesk', 'Inter', sans-serif";

    // ZERO 8-char truncation! Smoothly auto-scales font size for ANY brand name length!
    const brandSize = Math.max(44, Math.min(108, Math.round(760 / Math.max(5.5, brand.length * 0.72))));
    const subSize = Math.max(22, Math.min(34, Math.round(620 / Math.max(10, sub.length * 0.65))));

    const emblemSvg = buildEmblemSVGMarkup(styleId, cEmb, cFrm);
    const frameRing = cfg.showFrame !== false
      ? `<circle cx="512" cy="400" r="285" fill="none" stroke="url(#emblemGrad)" stroke-width="6" opacity="0.45"/>
         <circle cx="512" cy="400" r="302" fill="none" stroke="${cFrm}" stroke-width="2" stroke-dasharray="12 10" opacity="0.5"/>`
      : '';

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <linearGradient id="emblemGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${cEmb}"/>
      <stop offset="100%" stop-color="${cFrm}"/>
    </linearGradient>
    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  ${transparent ? '' : `<rect width="1024" height="1024" rx="48" fill="${bgHex}"/>`}
  ${frameRing}
  <g filter="url(#softGlow)">${emblemSvg}</g>
  <text x="512" y="810" text-anchor="middle" fill="${cText}" font-family="${escXml(fontFamily)}" font-weight="800" font-size="${brandSize}" letter-spacing="6">${escXml(brand.toUpperCase())}</text>
  ${sub ? `
    <rect x="232" y="846" width="560" height="58" rx="29" fill="${cFrm}" opacity="0.25" stroke="${cEmb}" stroke-width="2"/>
    <text x="512" y="885" text-anchor="middle" fill="${cText}" font-family="${escXml(fontFamily)}" font-weight="600" font-size="${subSize}" letter-spacing="5">${escXml(sub.toUpperCase())}</text>
  ` : ''}
</svg>`;
  }

  // =========================================================================
  // 3. FIXED DXF PARSER (REAL ARCS & ISOLATED CIRCLES) & CONNECTED MAGIC WAND
  // =========================================================================

  function parseDXFEntities(dxfText) {
    const rawLines = String(dxfText || '').split(/\r?\n/);
    const entities = [];
    let cur = null;

    const flush = () => {
      if (cur && cur.type) entities.push(cur);
      cur = null;
    };

    for (let i = 0; i + 1 < rawLines.length; i += 2) {
      const code = rawLines[i].trim();
      const val = rawLines[i + 1].trim();
      if (code === '0') {
        flush();
        if (['LINE', 'CIRCLE', 'ARC', 'LWPOLYLINE'].includes(val)) {
          cur = { type: val, pts: [] };
        }
        continue;
      }
      if (!cur) continue;
      const num = parseFloat(val);
      if (cur.type === 'LWPOLYLINE') {
        if (code === '10') cur._px = num;
        else if (code === '20') { cur.pts.push([cur._px || 0, num]); }
        else if (code === '70') cur.closed = (parseInt(val, 10) & 1) === 1;
      } else {
        if (code === '10') cur.x1 = num;
        else if (code === '20') cur.y1 = num;
        else if (code === '11') cur.x2 = num;
        else if (code === '21') cur.y2 = num;
        else if (code === '40') cur.r = num;
        else if (code === '50') cur.a0 = num;
        else if (code === '51') cur.a1 = num;
      }
    }
    flush();
    return entities;
  }

  function renderDXFToCanvas(dxfText, strokeHex) {
    const entities = parseDXFEntities(dxfText);
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    const addB = (x, y) => { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; };
    entities.forEach(e => {
      if (e.type === 'LINE') { addB(e.x1 || 0, e.y1 || 0); addB(e.x2 || 0, e.y2 || 0); }
      else if (e.type === 'CIRCLE' || e.type === 'ARC') { const r = e.r || 1; addB((e.x1 || 0) - r, (e.y1 || 0) - r); addB((e.x1 || 0) + r, (e.y1 || 0) + r); }
      else if (e.type === 'LWPOLYLINE') e.pts.forEach(p => addB(p[0], p[1]));
    });
    if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 100; maxY = 100; }

    const bw = Math.max(1, maxX - minX), bh = Math.max(1, maxY - minY);
    const out = document.createElement('canvas');
    out.width = 1024; out.height = 1024;
    const ctx = out.getContext('2d');
    const sc = 900 / Math.max(bw, bh);
    const ox = (1024 - bw * sc) / 2, oy = (1024 - bh * sc) / 2;
    const tx = x => ox + (x - minX) * sc;
    const ty = y => oy + (maxY - y) * sc; // Flip CAD +Y up -> Canvas +Y down

    ctx.strokeStyle = C().normalizeHex(strokeHex || '#38bdf8');
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    entities.forEach(e => {
      // FIXED: Isolated beginPath() per entity & real partial ARC angles!
      ctx.beginPath();
      if (e.type === 'LINE') {
        ctx.moveTo(tx(e.x1 || 0), ty(e.y1 || 0));
        ctx.lineTo(tx(e.x2 || 0), ty(e.y2 || 0));
      } else if (e.type === 'CIRCLE') {
        ctx.arc(tx(e.x1 || 0), ty(e.y1 || 0), Math.max(1, (e.r || 1) * sc), 0, Math.PI * 2);
      } else if (e.type === 'ARC') {
        const a0 = -((e.a0 || 0) * Math.PI) / 180;
        const a1 = -((e.a1 || 360) * Math.PI) / 180;
        ctx.arc(tx(e.x1 || 0), ty(e.y1 || 0), Math.max(1, (e.r || 1) * sc), a0, a1, true);
      } else if (e.type === 'LWPOLYLINE' && e.pts.length > 1) {
        e.pts.forEach((pt, idx) => idx === 0 ? ctx.moveTo(tx(pt[0]), ty(pt[1])) : ctx.lineTo(tx(pt[0]), ty(pt[1])));
        if (e.closed) ctx.closePath();
      }
      ctx.stroke();
    });
    return { canvas: out, count: entities.length };
  }

  // FIXED Connected BFS Magic Wand Background Remover (zeroes RGB+Alpha so 3D relief has zero phantom walls!)
  function connectedMagicWandCutout(canvas, startX, startY, tolerance) {
    const w = canvas.width, h = canvas.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const sx = Math.max(0, Math.min(w - 1, Math.floor(startX)));
    const sy = Math.max(0, Math.min(h - 1, Math.floor(startY)));
    const si = (sy * w + sx) * 4;
    const sr = d[si], sg = d[si + 1], sb = d[si + 2], sa = d[si + 3];
    if (sa === 0) return;

    const tol = tolerance !== undefined ? tolerance : 38;
    const visited = new Uint8Array(w * h);
    const stack = new Int32Array(w * h);
    let top = 0;
    stack[top++] = sy * w + sx;
    visited[sy * w + sx] = 1;

    const ok = i4 =>
      d[i4 + 3] > 0 &&
      Math.abs(d[i4] - sr) <= tol &&
      Math.abs(d[i4 + 1] - sg) <= tol &&
      Math.abs(d[i4 + 2] - sb) <= tol;

    while (top > 0) {
      const pos = stack[--top];
      const py = (pos / w) | 0, px = pos - py * w, i4 = pos * 4;
      d[i4] = 0; d[i4 + 1] = 0; d[i4 + 2] = 0; d[i4 + 3] = 0;
      if (px > 0 && !visited[pos - 1] && ok(i4 - 4)) { visited[pos - 1] = 1; stack[top++] = pos - 1; }
      if (px < w - 1 && !visited[pos + 1] && ok(i4 + 4)) { visited[pos + 1] = 1; stack[top++] = pos + 1; }
      if (py > 0 && !visited[pos - w] && ok(i4 - w * 4)) { visited[pos - w] = 1; stack[top++] = pos - w; }
      if (py < h - 1 && !visited[pos + w] && ok(i4 + w * 4)) { visited[pos + w] = 1; stack[top++] = pos + w; }
    }
    ctx.putImageData(img, 0, 0);
  }

  const ArtStampsLogo = {
    drawShapeOrStamp,
    LOGO_STYLES,
    LOGO_PALETTES,
    buildLogoSVG,
    parseDXFEntities,
    renderDXFToCanvas,
    connectedMagicWandCutout
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = ArtStampsLogo;
  if (globalScope) globalScope.ArtStampsLogo = ArtStampsLogo;
})(typeof window !== 'undefined' ? window : globalThis);
