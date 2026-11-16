// ==========================================
// ✍️ 3D TEXT & STENCIL STAMPER (CONFORMAL, WATERTIGHT, VISIBLE CARVED ENGRAVING)
// + RELIEF, CAVITY & DITHERED PHOTO DECAL PROJECTION
// ==========================================
const stampingColorPalette = [
    { name: "Pure White", hex: "#FFFFFF" },
    { name: "Carbon Black", hex: "#111827" },
    { name: "Flame Red", hex: "#EF4444" },
    { name: "Safety Orange", hex: "#F97316" },
    { name: "Cyber Yellow", hex: "#EAB308" },
    { name: "Emerald Green", hex: "#10B981" },
    { name: "Sky Cyan", hex: "#06B6D4" },
    { name: "Bambu Blue", hex: "#2563EB" },
    { name: "Royal Purple", hex: "#7C3AED" },
    { name: "Hot Magenta", hex: "#EC4899" },
    { name: "Rose Coral", hex: "#F43F5E" },
    { name: "Lime Neon", hex: "#84CC16" },
    { name: "Metallic Gold", hex: "#D4AF37" },
    { name: "Steel Gray", hex: "#64748B" },
    { name: "Chocolate Brown", hex: "#78350F" },
    { name: "Pastel Violet", hex: "#A78BFA" }
];

let isTextStampingMode = false;
let pendingTextConfig = { text: 'STUDIO 3D', mode: 'emboss', slot: 1, size: 14, font: 'impact' };
let selectedTextColorHex = "#FFFFFF";

let isStencilStampingMode = false;
let pendingStencilConfig = { mode: 'emboss', slot: 1, size: 16 };
let activeStencilCategory = 'gaming';
let activeStencilGlyphId = 'star';
let activeStencilData = null;
let selectedStencilColorHex = "#FFFFFF";

const stencilGlyphs = {
    gaming: [
        { id: 'star', name: 'Star', pathD: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z', svg: '<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="currentColor"/>' },
        { id: 'shield', name: 'Shield', pathD: 'M12 2L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-3z', svg: '<path d="M12 2L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-3z" fill="currentColor"/>' },
        { id: 'sword', name: 'Sword', pathD: 'M14.5 2l2.5 2.5L7 14.5 4.5 12 14.5 2zM3 17l4 4-2 2-4-4 2-2z', svg: '<path d="M14.5 2l2.5 2.5L7 14.5 4.5 12 14.5 2zM3 17l4 4-2 2-4-4 2-2z" fill="currentColor"/>' },
        { id: 'skull', name: 'Skull', pathD: 'M12 2C7.58 2 4 5.58 4 10c0 2.5 1.14 4.74 2.93 6.23V19a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2.77C18.86 14.74 20 12.5 20 10c0-4.42-3.58-8-8-8zm-3 10a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm6 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm-4 7v-2h2v2h-2z', svg: '<path d="M12 2C7.58 2 4 5.58 4 10c0 2.5 1.14 4.74 2.93 6.23V19a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2.77C18.86 14.74 20 12.5 20 10c0-4.42-3.58-8-8-8zm-3 10a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm6 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm-4 7v-2h2v2h-2z" fill="currentColor"/>' },
        { id: 'crown', name: 'Crown', pathD: 'M2 19h20v2H2zm1-15l4 7 5-8 5 8 4-7v13H3z', svg: '<path d="M2 19h20v2H2zm1-15l4 7 5-8 5 8 4-7v13H3z" fill="currentColor"/>' },
        { id: 'diamond', name: 'Diamond', pathD: 'M6 3h12l5 6-11 13L1 9l5-6z', svg: '<polygon points="6,3 18,3 23,9 12,22 1,9" fill="currentColor"/>' },
        { id: 'crosshair', name: 'Crosshair', pathD: 'M11 2h2v4h-2zm0 16h2v4h-2zm-9-9h4v2H2zm16 0h4v2h-4zm-1 1a6 6 0 1 1-12 0 6 6 0 0 1 12 0zm-2 0a4 4 0 1 0-8 0 4 4 0 0 0 8 0z', svg: '<path d="M11 2h2v4h-2zm0 16h2v4h-2zm-9-9h4v2H2zm16 0h4v2h-4zm-1 1a6 6 0 1 1-12 0 6 6 0 0 1 12 0zm-2 0a4 4 0 1 0-8 0 4 4 0 0 0 8 0z" fill="currentColor"/>' },
        { id: 'gamepad', name: 'Gamepad', pathD: 'M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H9v2H7v-2H5v-2h2V9h2v2h2v2zm6 1a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-3a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z', svg: '<path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H9v2H7v-2H5v-2h2V9h2v2h2v2zm6 1a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-3a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" fill="currentColor"/>' }
    ],
    shapes: [
        { id: 'heart', name: 'Heart', pathD: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z', svg: '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/>' },
        { id: 'lightning', name: 'Lightning', pathD: 'M7 2v11h3v9l7-12h-4l4-8z', svg: '<polygon points="7,2 7,13 10,13 10,22 17,10 13,10 17,2" fill="currentColor"/>' },
        { id: 'hexagon', name: 'Hexagon', pathD: 'M12 2l9 5v10l-9 5-9-5V7l9-5z', svg: '<polygon points="12,2 21,7 21,17 12,22 3,17 3,7" fill="currentColor"/>' },
        { id: 'gear', name: 'Gear', pathD: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8 3.2V8.8l-2.1-.4a7.1 7.1 0 0 0-.9-2.2l1.2-1.8-2.3-2.3-1.8 1.2a7.1 7.1 0 0 0-2.2-.9L11.5 0H9.5l-.4 2.4a7.1 7.1 0 0 0-2.2.9L5.1 2.1 2.8 4.4l1.2 1.8a7.1 7.1 0 0 0-.9 2.2L1 8.8v2.4l2.1.4a7.1 7.1 0 0 0 .9 2.2L2.8 15.6l2.3 2.3 1.8-1.2a7.1 7.1 0 0 0 2.2.9l.4 2.4h2l.4-2.4a7.1 7.1 0 0 0 2.2-.9l1.8 1.2 2.3-2.3-1.2-1.8a7.1 7.1 0 0 0 .9-2.2l2.1-.4z', svg: '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8 3.2V8.8l-2.1-.4a7.1 7.1 0 0 0-.9-2.2l1.2-1.8-2.3-2.3-1.8 1.2a7.1 7.1 0 0 0-2.2-.9L11.5 0H9.5l-.4 2.4a7.1 7.1 0 0 0-2.2.9L5.1 2.1 2.8 4.4l1.2 1.8a7.1 7.1 0 0 0-.9 2.2L1 8.8v2.4l2.1.4a7.1 7.1 0 0 0 .9 2.2L2.8 15.6l2.3 2.3 1.8-1.2a7.1 7.1 0 0 0 2.2.9l.4 2.4h2l.4-2.4a7.1 7.1 0 0 0 2.2-.9l1.8 1.2 2.3-2.3-1.2-1.8a7.1 7.1 0 0 0 .9-2.2l2.1-.4z" fill="currentColor"/>' },
        { id: 'target', name: 'Bullseye', pathD: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm0-14a6 6 0 1 0 6 6 6 6 0 0 0-6-6zm0 10a4 4 0 1 1 4-4 4 4 0 0 1-4 4zm0-6a2 2 0 1 0 2 2 2 2 0 0 0-2-2z', svg: '<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm0-14a6 6 0 1 0 6 6 6 6 0 0 0-6-6zm0 10a4 4 0 1 1 4-4 4 4 0 0 1-4 4zm0-6a2 2 0 1 0 2 2 2 2 0 0 0-2-2z" fill="currentColor"/>' },
        { id: 'starburst', name: 'Badge Crest', pathD: 'M12 1l3 6 7 2-5 5 1 7-6-3-6 3 1-7-5-5 7-2z', svg: '<polygon points="12,1 15,7 22,9 17,14 18,21 12,18 6,21 7,14 2,9 9,7" fill="currentColor"/>' }
    ],
    nature: [
        { id: 'flame', name: 'Flame', pathD: 'M12 2c-.5 2.5-3.5 4.5-3.5 8 0 2.5 1.5 4.5 3.5 4.5 1.5 0 2.5-1 2.5-2.5 0 3-2 6-5.5 6-3.5 0-6.5-2.8-6.5-6.5 0-4.5 4.5-8 7-9.5 0 0 2.5 3.5 2.5 5.5 0 1-.5 1.8-1 2.5 2-1 4.5-3.5 4.5-6 0-3-2.5-5.5-3.5-6.5z', svg: '<path d="M12 2c-.5 2.5-3.5 4.5-3.5 8 0 2.5 1.5 4.5 3.5 4.5 1.5 0 2.5-1 2.5-2.5 0 3-2 6-5.5 6-3.5 0-6.5-2.8-6.5-6.5 0-4.5 4.5-8 7-9.5 0 0 2.5 3.5 2.5 5.5 0 1-.5 1.8-1 2.5 2-1 4.5-3.5 4.5-6 0-3-2.5-5.5-3.5-6.5z" fill="currentColor"/>' },
        { id: 'paw', name: 'Paw', pathD: 'M12 11c-3 0-5.5 2-5.5 5 0 2 2 4 5.5 4s5.5-2 5.5-4c0-3-2.5-5-5.5-5zm-5-3a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm10 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm-5-3a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm-8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm16 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', svg: '<path d="M12 11c-3 0-5.5 2-5.5 5 0 2 2 4 5.5 4s5.5-2 5.5-4c0-3-2.5-5-5.5-5zm-5-3a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm10 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm-5-3a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm-8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm16 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" fill="currentColor"/>' },
        { id: 'leaf', name: 'Leaf', pathD: 'M17 3H7c-1.1 0-2 .9-2 2v14l7-3 7 3V5c0-1.1-.9-2-2-2zm0 13l-5-2.18L7 16V5h10v11z', svg: '<path d="M17 3H7c-1.1 0-2 .9-2 2v14l7-3 7 3V5c0-1.1-.9-2-2-2zm0 13l-5-2.18L7 16V5h10v11z" fill="currentColor"/>' },
        { id: 'tree', name: 'Pine Tree', pathD: 'M12 2l5 7h-3l5 7H5l5-7H7l5-7zm-1.5 14h3v6h-3z', svg: '<path d="M12 2l5 7h-3l5 7H5l5-7H7l5-7zm-1.5 14h3v6h-3z" fill="currentColor"/>' },
        { id: 'bat', name: 'Bat', pathD: 'M12 7c-2-3-7-4-10-1 1 3 3 5 5 5-2 2-3 5-2 7 3-1 5-3 7-5 2 2 4 4 7 5 1-2 0-5-2-7 2 0 4-2 5-5-3-3-8-2-10 1z', svg: '<path d="M12 7c-2-3-7-4-10-1 1 3 3 5 5 5-2 2-3 5-2 7 3-1 5-3 7-5 2 2 4 4 7 5 1-2 0-5-2-7 2 0 4-2 5-5-3-3-8-2-10 1z" fill="currentColor"/>' },
        { id: 'wings', name: 'Wings', pathD: 'M12 12C9 5 3 4 1 5c1 5 6 9 11 9zm0 0c3-7 9-8 11-7-1 5-6 9-11 9z', svg: '<path d="M12 12C9 5 3 4 1 5c1 5 6 9 11 9zm0 0c3-7 9-8 11-7-1 5-6 9-11 9z" fill="currentColor"/>' }
    ],
    tech: [
        { id: 'radiation', name: 'Radiation', pathD: 'M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0-8a10 10 0 0 0-5 1.34l2.5 4.33A5 5 0 0 1 12 7V2zm-7.66 4.34A10 10 0 0 0 2 12h5a5 5 0 0 1 1.34-3.33L4.34 6.34zM12 17a5 5 0 0 1-2.5-.67l-2.5 4.33A10 10 0 0 0 12 22v-5zm5-5h5a10 10 0 0 0-2.34-5.66l-4.33 2.5A5 5 0 0 1 17 12zm-2.5 4.33l2.5 4.33A10 10 0 0 0 22 12h-5a5 5 0 0 1-2.5 4.33z', svg: '<path d="M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0-8a10 10 0 0 0-5 1.34l2.5 4.33A5 5 0 0 1 12 7V2zm-7.66 4.34A10 10 0 0 0 2 12h5a5 5 0 0 1 1.34-3.33L4.34 6.34zM12 17a5 5 0 0 1-2.5-.67l-2.5 4.33A10 10 0 0 0 12 22v-5zm5-5h5a10 10 0 0 0-2.34-5.66l-4.33 2.5A5 5 0 0 1 17 12zm-2.5 4.33l2.5 4.33A10 10 0 0 0 22 12h-5a5 5 0 0 1-2.5 4.33z" fill="currentColor"/>' },
        { id: 'biohazard', name: 'Biohazard', pathD: 'M12 2a4 4 0 0 0-3.46 2A6 6 0 0 1 12 9a6 6 0 0 1 3.46-5A4 4 0 0 0 12 2zm-5.46 5.54A4 4 0 0 0 3 11a4 4 0 0 0 3.46 6A6 6 0 0 1 9 12a6 6 0 0 1-2.46-4.46zm10.92 0A6 6 0 0 1 15 12a6 6 0 0 1 2.54 5.08A4 4 0 0 0 21 11a4 4 0 0 0-3.54-3.46zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', svg: '<path d="M12 2a4 4 0 0 0-3.46 2A6 6 0 0 1 12 9a6 6 0 0 1 3.46-5A4 4 0 0 0 12 2zm-5.46 5.54A4 4 0 0 0 3 11a4 4 0 0 0 3.46 6A6 6 0 0 1 9 12a6 6 0 0 1-2.46-4.46zm10.92 0A6 6 0 0 1 15 12a6 6 0 0 1 2.54 5.08A4 4 0 0 0 21 11a4 4 0 0 0-3.54-3.46zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" fill="currentColor"/>' },
        { id: 'atom', name: 'Atom', pathD: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0-7C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z', svg: '<path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0-7C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="currentColor"/>' },
        { id: 'wifi', name: 'Wi-Fi', pathD: 'M12 3C7.03 3 2.62 5.09.28 8.44L12 21.72 23.72 8.44C21.38 5.09 16.97 3 12 3zm0 4c3.55 0 6.77 1.45 9.09 3.82L12 19.34 2.91 10.82C5.23 8.45 8.45 7 12 7zm0 4c2.25 0 4.3 1 5.71 2.6L12 18.2 6.29 13.6C7.7 12 9.75 11 12 11z', svg: '<path d="M12 3C7.03 3 2.62 5.09.28 8.44L12 21.72 23.72 8.44C21.38 5.09 16.97 3 12 3zm0 4c3.55 0 6.77 1.45 9.09 3.82L12 19.34 2.91 10.82C5.23 8.45 8.45 7 12 7zm0 4c2.25 0 4.3 1 5.71 2.6L12 18.2 6.29 13.6C7.7 12 9.75 11 12 11z" fill="currentColor"/>' },
        { id: 'power', name: 'Power', pathD: 'M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42A7.92 7.92 0 0 1 20 12a8 8 0 1 1-8-8c1.61 0 3.09.48 4.33 1.3l1.42-1.42A9.93 9.93 0 0 0 12 2a10 10 0 1 0 10 10c0-2.48-.91-4.74-2.41-6.49l-.76-.34z', svg: '<path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42A7.92 7.92 0 0 1 20 12a8 8 0 1 1-8-8c1.61 0 3.09.48 4.33 1.3l1.42-1.42A9.93 9.93 0 0 0 12 2a10 10 0 1 0 10 10c0-2.48-.91-4.74-2.41-6.49l-.76-.34z" fill="currentColor"/>' },
        { id: 'grid', name: 'Cyber Grid', pathD: 'M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z', svg: '<path d="M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z" fill="currentColor"/>' }
    ]
};

// Shared watertight conformal stamp generator (FIXED wTR1 typo, added back-cap, curved surface projection, and visible carved engraving!)
function applyBitmapStampToSurface(imgData, W, H, physW, physH, mode, targetSlot, rgb, hit, successToast) {
    saveHistory(true);

    const hitLocalPoint = currentMesh.worldToLocal(hit.point.clone());
    const N = (hit.face ? hit.face.normal.clone() : new THREE.Vector3(0, 1, 0)).normalize();
    const invMat = new THREE.Matrix4().copy(currentMesh.matrixWorld).invert();
    const camRightLocal = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).transformDirection(invMat);

    let T = camRightLocal.clone().addScaledVector(N, -camRightLocal.dot(N));
    if (T.lengthSq() < 0.001) {
        const camUpLocal = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).transformDirection(invMat);
        T = new THREE.Vector3().crossVectors(camUpLocal, N);
    }
    T.normalize();
    const B = new THREE.Vector3().crossVectors(N, T).normalize();

    const isSolid = (px, py) => {
        if (px < 0 || px >= W || py < 0 || py >= H) return false;
        const idx = (py * W + px) * 4;
        const r = imgData[idx], g = imgData[idx + 1], b = imgData[idx + 2], a = imgData[idx + 3];
        if (a < 50) return false;
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        return lum > 105 || (a > 120 && lum > 45);
    };

    // Case 1: 'paint' or 'engrave' mode -> Paint / Carve actual mesh triangles directly (watertight & visible!)
    if (mode === 'paint' || mode === 'engrave') {
        const stampRad = Math.hypot(physW * 0.5, physH * 0.5) * 1.1;
        // Refine local faces first so letters/icons look sharp even on coarse CAD faces!
        if (spatialGrid) {
            for (let pass = 0; pass < 3; pass++) {
                const curPos = currentMesh.geometry.attributes.position.array;
                const toSplit = new Set();
                const maxE = Math.max(0.45, Math.min(physW, physH) * 0.09);
                const maxESq = maxE * maxE;
                spatialGrid.querySphere(hitLocalPoint.x, hitLocalPoint.y, hitLocalPoint.z, stampRad, (f) => {
                    const p = f * 9;
                    const e0 = (curPos[p + 3] - curPos[p]) ** 2 + (curPos[p + 4] - curPos[p + 1]) ** 2 + (curPos[p + 5] - curPos[p + 2]) ** 2;
                    const e1 = (curPos[p + 6] - curPos[p + 3]) ** 2 + (curPos[p + 7] - curPos[p + 4]) ** 2 + (curPos[p + 8] - curPos[p + 5]) ** 2;
                    const e2 = (curPos[p] - curPos[p + 6]) ** 2 + (curPos[p + 1] - curPos[p + 7]) ** 2 + (curPos[p + 2] - curPos[p + 8]) ** 2;
                    if (e0 > maxESq || e1 > maxESq || e2 > maxESq) toSplit.add(f);
                });
                if (toSplit.size === 0 || !subdivideFacesLocal(toSplit, 1)) break;
            }
        }

        const geom = currentMesh.geometry;
        const posAttr = geom.attributes.position;
        const pos = posAttr.array;
        const normArr = geom.attributes.normal ? geom.attributes.normal.array : null;
        const colorAttr = geom.attributes.color;
        const colArr = colorAttr.array;
        const paintedVertKeys = new Set();
        let paintedFaces = 0;

        spatialGrid.querySphere(hitLocalPoint.x, hitLocalPoint.y, hitLocalPoint.z, stampRad, (f) => {
            if (normArr) {
                const nIdx = f * 9;
                const dot = normArr[nIdx] * N.x + normArr[nIdx + 1] * N.y + normArr[nIdx + 2] * N.z;
                if (dot < 0.25) return;
            }
            const f3 = f * 3;
            const cx = spatialGrid.faceCenters[f3] - hitLocalPoint.x;
            const cy = spatialGrid.faceCenters[f3 + 1] - hitLocalPoint.y;
            const cz = spatialGrid.faceCenters[f3 + 2] - hitLocalPoint.z;
            const lx = cx * T.x + cy * T.y + cz * T.z;
            const ly = cx * B.x + cy * B.y + cz * B.z;
            const px = Math.floor((lx / physW + 0.5) * W);
            const py = Math.floor((0.5 - ly / physH) * H);

            if (isSolid(px, py)) {
                triangleColors[f] = targetSlot;
                const base = f * 9;
                colArr[base]     = rgb[0]; colArr[base + 1] = rgb[1]; colArr[base + 2] = rgb[2];
                colArr[base + 3] = rgb[0]; colArr[base + 4] = rgb[1]; colArr[base + 5] = rgb[2];
                colArr[base + 6] = rgb[0]; colArr[base + 7] = rgb[1]; colArr[base + 8] = rgb[2];
                paintedFaces++;

                if (mode === 'engrave') {
                    for (let k = 0; k < 3; k++) {
                        const vi = base + k * 3;
                        const vk = `${Math.round(pos[vi] * 1000)}_${Math.round(pos[vi + 1] * 1000)}_${Math.round(pos[vi + 2] * 1000)}`;
                        paintedVertKeys.add(vk);
                    }
                }
            }
        });

        if (mode === 'engrave' && paintedVertKeys.size > 0) {
            const totalVerts = (pos.length / 3) | 0;
            for (let v = 0; v < totalVerts; v++) {
                const vi = v * 3;
                const vk = `${Math.round(pos[vi] * 1000)}_${Math.round(pos[vi + 1] * 1000)}_${Math.round(pos[vi + 2] * 1000)}`;
                if (paintedVertKeys.has(vk)) {
                    pos[vi]     -= N.x * 0.9;
                    pos[vi + 1] -= N.y * 0.9;
                    pos[vi + 2] -= N.z * 0.9;
                }
            }
            posAttr.needsUpdate = true;
            geom.computeVertexNormals();
            if (geom.disposeBoundsTree) geom.disposeBoundsTree();
            if (geom.computeBoundsTree) geom.computeBoundsTree();
            spatialGrid = new SpatialGrid(geom, 32);
            meshTopology = buildMeshTopology(geom);
        }

        if (paintedFaces === 0) {
            showToast(currentLang === 'fr' ? "Zone trop petite pour imprimer ce motif." : "Area too small to stamp motif.");
            return;
        }
        colorAttr.needsUpdate = true;
        if (typeof updateStats === 'function') updateStats();
        saveHistory(true);
        showToast(successToast);
        return;
    }

    // Case 2: 'emboss' mode (+1.2mm raised, conformal to curved surfaces, closed bottom cap & fixed wTR1!)
    const extrudeZ = 1.2;
    const baseEmbedZ = -0.15; // Slight overlap into base solid for clean manifold union

    // Sample surface height offsets across grid via raycast so text/stencils wrap smoothly on curved parts
    const surfOffsets = new Float32Array((W + 1) * (H + 1));
    const localRay = new THREE.Raycaster();
    localRay.firstHitOnly = true;
    const tmpOrigin = new THREE.Vector3();
    const rayDirWorld = N.clone().negate().transformDirection(currentMesh.matrixWorld).normalize();
    const probeDist = Math.max(physW, physH) * 0.35 + 4;

    for (let gy = 0; gy <= H; gy++) {
        for (let gx = 0; gx <= W; gx++) {
            const lx = (gx / W - 0.5) * physW;
            const ly = (0.5 - gy / H) * physH;
            tmpOrigin.copy(hitLocalPoint).addScaledVector(T, lx).addScaledVector(B, ly).addScaledVector(N, probeDist);
            const worldOrig = tmpOrigin.clone().applyMatrix4(currentMesh.matrixWorld);
            localRay.set(worldOrig, rayDirWorld);
            const hits = localRay.intersectObject(currentMesh);
            if (hits.length > 0) {
                const hitLocal = currentMesh.worldToLocal(hits[0].point.clone());
                const relZ = hitLocal.sub(hitLocalPoint).dot(N);
                surfOffsets[gy * (W + 1) + gx] = Math.abs(relZ) < probeDist ? relZ : 0;
            } else {
                surfOffsets[gy * (W + 1) + gx] = 0;
            }
        }
    }

    const getLocal3D = (px, py, pz) => {
        const cx = Math.max(0, Math.min(W, px));
        const cy = Math.max(0, Math.min(H, py));
        const surfZ = surfOffsets[cy * (W + 1) + cx];
        const lx = (px / W - 0.5) * physW;
        const ly = (0.5 - py / H) * physH;
        return new THREE.Vector3()
            .copy(hitLocalPoint)
            .addScaledVector(T, lx)
            .addScaledVector(B, ly)
            .addScaledVector(N, surfZ + pz);
    };

    const newPositions = [];
    const addQuad = (p0, p1, p2, p3) => {
        newPositions.push(
            p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z,
            p0.x, p0.y, p0.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z
        );
    };

    for (let y = 0; y < H; y++) {
        let inSpan = false;
        let startX = 0;
        for (let x = 0; x <= W; x++) {
            const solid = isSolid(x, y);
            if (solid && !inSpan) {
                inSpan = true;
                startX = x;
            } else if (!solid && inSpan) {
                inSpan = false;
                const endX = x;

                // Top cap (+extrudeZ)
                const TL_top = getLocal3D(startX, y, extrudeZ);
                const TR_top = getLocal3D(endX, y, extrudeZ);
                const BR_top = getLocal3D(endX, y + 1, extrudeZ);
                const BL_top = getLocal3D(startX, y + 1, extrudeZ);
                addQuad(BL_top, BR_top, TR_top, TL_top);

                // Bottom cap (closed watertight back at baseEmbedZ!)
                const TL_bot = getLocal3D(startX, y, baseEmbedZ);
                const TR_bot = getLocal3D(endX, y, baseEmbedZ);
                const BR_bot = getLocal3D(endX, y + 1, baseEmbedZ);
                const BL_bot = getLocal3D(startX, y + 1, baseEmbedZ);
                addQuad(TL_bot, TR_bot, BR_bot, BL_bot);

                // Side walls per pixel segment where boundary opens
                for (let sx = startX; sx < endX; sx++) {
                    if (!isSolid(sx, y - 1)) {
                        addQuad(getLocal3D(sx, y, baseEmbedZ), getLocal3D(sx + 1, y, baseEmbedZ), getLocal3D(sx + 1, y, extrudeZ), getLocal3D(sx, y, extrudeZ));
                    }
                    if (!isSolid(sx, y + 1)) {
                        addQuad(getLocal3D(sx + 1, y + 1, baseEmbedZ), getLocal3D(sx, y + 1, baseEmbedZ), getLocal3D(sx, y + 1, extrudeZ), getLocal3D(sx + 1, y + 1, extrudeZ));
                    }
                }
                if (!isSolid(startX - 1, y)) {
                    addQuad(getLocal3D(startX, y + 1, baseEmbedZ), getLocal3D(startX, y, baseEmbedZ), getLocal3D(startX, y, extrudeZ), getLocal3D(startX, y + 1, extrudeZ));
                }
                // FIXED: wTR1 uses (endX, y, extrudeZ), previously (endX, y + 1, extrudeZ)!
                if (!isSolid(endX, y)) {
                    addQuad(getLocal3D(endX, y, baseEmbedZ), getLocal3D(endX, y + 1, baseEmbedZ), getLocal3D(endX, y + 1, extrudeZ), getLocal3D(endX, y, extrudeZ));
                }
            }
        }
    }

    const addedCoords = newPositions.length;
    const addedTris = (addedCoords / 9) | 0;
    if (addedTris === 0) {
        showToast(currentLang === 'fr' ? "Aucun pixel généré." : "No pixels generated.");
        return;
    }

    const geom = currentMesh.geometry;
    const posAttr = geom.attributes.position;
    const colorAttr = geom.attributes.color;
    const oldPosArr = posAttr.array;
    const oldColorArr = colorAttr.array;
    const oldFaceCount = (oldPosArr.length / 9) | 0;
    const newFaceCount = oldFaceCount + addedTris;

    const combinedPositions = new Float32Array(newFaceCount * 9);
    combinedPositions.set(oldPosArr, 0);
    for (let i = 0; i < addedCoords; i++) combinedPositions[oldPosArr.length + i] = newPositions[i];

    const combinedColors = new Float32Array(newFaceCount * 9);
    combinedColors.set(oldColorArr, 0);
    const colorStart = oldColorArr.length;
    for (let i = 0; i < addedTris; i++) {
        const base = colorStart + i * 9;
        combinedColors[base]     = rgb[0]; combinedColors[base + 1] = rgb[1]; combinedColors[base + 2] = rgb[2];
        combinedColors[base + 3] = rgb[0]; combinedColors[base + 4] = rgb[1]; combinedColors[base + 5] = rgb[2];
        combinedColors[base + 6] = rgb[0]; combinedColors[base + 7] = rgb[1]; combinedColors[base + 8] = rgb[2];
    }

    const newTriangleColors = new Uint8Array(newFaceCount);
    newTriangleColors.set(triangleColors, 0);
    for (let i = 0; i < addedTris; i++) newTriangleColors[oldFaceCount + i] = targetSlot;

    triangleColors = newTriangleColors;
    const newGeom = new THREE.BufferGeometry();
    newGeom.setAttribute('position', new THREE.BufferAttribute(combinedPositions, 3));
    newGeom.setAttribute('color', new THREE.BufferAttribute(combinedColors, 3));
    newGeom.computeVertexNormals();
    newGeom.computeBoundingBox();
    if (newGeom.computeBoundsTree) newGeom.computeBoundsTree();

    if (geom.disposeBoundsTree) geom.disposeBoundsTree();
    geom.dispose();
    currentMesh.geometry = newGeom;

    spatialGrid = new SpatialGrid(newGeom, 32);
    meshTopology = buildMeshTopology(newGeom);
    precomputeGeometryMetrics(newGeom);
    if (typeof updateStats === 'function') updateStats();
    saveHistory(true);
    showToast(successToast);
}

// ==========================================
// ✍️ 3D TEXT STAMPER UI & HANDLERS
// ==========================================
function initTextPalette() {
    const container = document.getElementById('text-palette-swatches');
    if (!container) return;
    container.innerHTML = '';
    stampingColorPalette.forEach(swatch => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'text-swatch-item';
        btn.dataset.hex = swatch.hex.toLowerCase();
        btn.title = swatch.name;
        btn.style.cssText = `background:${swatch.hex};width:100%;height:22px;border-radius:4px;border:1px solid rgba(255,255,255,0.25);cursor:pointer;outline:none;transition:transform 0.15s, box-shadow 0.15s;`;
        btn.onclick = () => selectTextColorHex(swatch.hex);
        container.appendChild(btn);
    });
    const slotSelect = document.getElementById('text-color-slot');
    const slotIdx = slotSelect ? (parseInt(slotSelect.value, 10) || 0) : 0;
    const initColor = (filamentSlots[slotIdx] && filamentSlots[slotIdx].color) ? filamentSlots[slotIdx].color : "#ffffff";
    selectTextColorHex(initColor, false);
}

function selectTextColorHex(hex, autoSyncSlot = true) {
    selectedTextColorHex = normalizeHex(hex, '#FFFFFF');
    const prev = document.getElementById('text-color-preview');
    if (prev) prev.style.background = selectedTextColorHex;
    const picker = document.getElementById('text-custom-color');
    if (picker) picker.value = selectedTextColorHex.toLowerCase();

    document.querySelectorAll('#text-palette-swatches .text-swatch-item').forEach(btn => {
        const match = btn.dataset.hex === selectedTextColorHex.toLowerCase();
        btn.style.borderColor = match ? '#38bdf8' : 'rgba(255,255,255,0.25)';
        btn.style.boxShadow = match ? '0 0 6px #38bdf8' : 'none';
        btn.style.transform = match ? 'scale(1.12)' : 'scale(1)';
    });

    if (autoSyncSlot) {
        const cTarget = hexToRgb(selectedTextColorHex);
        const bestSlot = findClosestSlotPerceptual(cTarget.r / 255, cTarget.g / 255, cTarget.b / 255);
        const slotSelect = document.getElementById('text-color-slot');
        if (slotSelect) slotSelect.value = bestSlot;
    }
}

function onTextColorCustomPick(hex) { selectTextColorHex(hex, true); }
function onTextColorSlotChange(val) {
    const idx = parseInt(val, 10) || 0;
    if (filamentSlots[idx]) selectTextColorHex(filamentSlots[idx].color, false);
}

function openTextModal() {
    if (!currentMesh) { showToast(currentLang === 'fr' ? "Chargez un modèle 3D !" : "Please load a 3D model first!"); return; }
    populateSlotDropdowns();
    initTextPalette();
    document.getElementById('text-stamp-modal').style.display = 'flex';
    refreshIcons();
}

function closeTextModal() {
    document.getElementById('text-stamp-modal').style.display = 'none';
}

function startTextStampingMode() {
    const txt = (document.getElementById('text-stamp-input').value || '').trim() || '3D';
    const mode = document.getElementById('text-stamp-mode').value;
    const slot = parseInt(document.getElementById('text-color-slot').value, 10) || 0;
    const size = parseFloat(document.getElementById('slider-text-size').value) || 14;
    const font = document.getElementById('text-stamp-font')?.value || 'impact';
    const hex = filamentSlots[slot] ? filamentSlots[slot].color : selectedTextColorHex;
    const rgbObj = hexToRgb(hex);

    pendingTextConfig = { text: txt, mode, slot, size, font, hex, rgb: [rgbObj.r / 255, rgbObj.g / 255, rgbObj.b / 255] };
    closeTextModal();

    isStencilStampingMode = false;
    isTextStampingMode = true;
    controls.enabled = true;
    if (controls.mouseButtons) controls.mouseButtons.LEFT = null;
    if (controls.touches && typeof THREE.TOUCH !== 'undefined') controls.touches.ONE = null;
    document.getElementById('viewport-container').style.cursor = 'crosshair';
    showToast(translations[currentLang].toastTextStampReady);
}

function applyTextStampAtHit(hit) {
    isTextStampingMode = false;
    selectTool(activeTool);
    if (!hit || !currentMesh || !triangleColors) return;

    const text = (pendingTextConfig.text || '').trim() || '3D';
    const sizeMm = Math.max(4, pendingTextConfig.size || 14);
    const mode = pendingTextConfig.mode || 'emboss';
    const targetSlot = pendingTextConfig.slot !== undefined ? pendingTextConfig.slot : activeSlotIndex;
    const rgb = slotRgbFloats[targetSlot] || pendingTextConfig.rgb || [0.97, 0.98, 0.99];

    const H = Math.max(36, Math.min(72, Math.round(sizeMm * 3.2)));
    const offCanvas = document.createElement('canvas');
    const ctx = offCanvas.getContext('2d');
    const fontPx = Math.round(H * 0.78);
    const fontFam = pendingTextConfig.font || 'impact';
    let fontCSS = `Impact, "Arial Black", sans-serif`;
    if (fontFam === 'sans-serif') fontCSS = `"Segoe UI", -apple-system, Arial, sans-serif`;
    else if (fontFam === 'serif') fontCSS = `Georgia, "Times New Roman", serif`;
    else if (fontFam === 'monospace') fontCSS = `"Consolas", "Courier New", monospace`;

    ctx.font = `900 ${fontPx}px ${fontCSS}`;
    const textW = Math.ceil(ctx.measureText(text).width);
    const padX = Math.round(H * 0.15);
    const W = Math.max(8, textW + padX * 2);
    offCanvas.width = W;
    offCanvas.height = H;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);
    ctx.font = `900 ${fontPx}px ${fontCSS}`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, W / 2, H / 2);

    const imgData = ctx.getImageData(0, 0, W, H).data;
    const physH = sizeMm;
    const physW = (W / H) * physH;

    applyBitmapStampToSurface(imgData, W, H, physW, physH, mode, targetSlot, rgb, hit, translations[currentLang].toastTextStamped);
}

// ==========================================
// 🔖 3D VECTOR STENCIL & LOGO STAMPER
// ==========================================
function filterStencilCategory(cat, btn) {
    activeStencilCategory = cat;
    document.querySelectorAll('#stencil-modal .demo-filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderStencilGlyphGrid(cat);
}

function renderStencilGlyphGrid(cat) {
    const grid = document.getElementById('stencil-glyph-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const list = stencilGlyphs[cat] || stencilGlyphs.gaming;
    list.forEach(g => {
        const isSel = (activeStencilGlyphId === g.id);
        const el = document.createElement('div');
        el.style.cssText = `cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px 4px;border-radius:6px;background:${isSel ? 'rgba(244,114,182,0.22)' : 'rgba(255,255,255,0.05)'};border:1px solid ${isSel ? '#f472b6' : 'rgba(255,255,255,0.1)'};transition:all 0.15s ease;`;
        el.title = g.name;
        el.innerHTML = `<svg viewBox="0 0 24 24" width="26" height="26" style="pointer-events:none;color:${isSel ? '#f472b6' : '#cbd5e1'};">${g.svg}</svg><span style="font-size:9px;margin-top:4px;color:${isSel ? '#f472b6' : 'var(--text-sub)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:55px;">${g.name}</span>`;
        el.onclick = () => {
            activeStencilGlyphId = g.id;
            activeStencilData = { type: 'glyph', glyph: g };
            renderStencilGlyphGrid(cat);
        };
        grid.appendChild(el);
    });
}

function handleCustomStencilUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        const img = new Image();
        img.onload = () => {
            activeStencilData = { type: 'custom', img, name: file.name };
            activeStencilGlyphId = 'custom';
            document.querySelectorAll('#stencil-glyph-grid > div').forEach(el => {
                el.style.background = 'rgba(255,255,255,0.05)';
                el.style.borderColor = 'rgba(255,255,255,0.1)';
            });
            showToast(currentLang === 'fr' ? `Logo chargé : ${file.name}` : `Custom logo loaded: ${file.name}`);
        };
        img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
}

function initStencilPalette() {
    const container = document.getElementById('stencil-palette-swatches');
    if (!container) return;
    container.innerHTML = '';
    stampingColorPalette.forEach(swatch => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'stencil-swatch-item';
        btn.dataset.hex = swatch.hex.toLowerCase();
        btn.title = swatch.name;
        btn.style.cssText = `background:${swatch.hex};width:100%;height:22px;border-radius:4px;border:1px solid rgba(255,255,255,0.25);cursor:pointer;outline:none;transition:transform 0.15s, box-shadow 0.15s;`;
        btn.onclick = () => selectStencilColorHex(swatch.hex);
        container.appendChild(btn);
    });
    const slotSelect = document.getElementById('stencil-color-slot');
    const slotIdx = slotSelect ? (parseInt(slotSelect.value, 10) || 0) : 0;
    const initColor = (filamentSlots[slotIdx] && filamentSlots[slotIdx].color) ? filamentSlots[slotIdx].color : "#ffffff";
    selectStencilColorHex(initColor, false);
}

function selectStencilColorHex(hex, autoSyncSlot = true) {
    selectedStencilColorHex = normalizeHex(hex, '#FFFFFF');
    const prev = document.getElementById('stencil-color-preview');
    if (prev) prev.style.background = selectedStencilColorHex;
    const picker = document.getElementById('stencil-custom-color');
    if (picker) picker.value = selectedStencilColorHex.toLowerCase();

    document.querySelectorAll('#stencil-palette-swatches .stencil-swatch-item').forEach(btn => {
        const match = btn.dataset.hex === selectedStencilColorHex.toLowerCase();
        btn.style.borderColor = match ? '#f472b6' : 'rgba(255,255,255,0.25)';
        btn.style.boxShadow = match ? '0 0 6px #f472b6' : 'none';
        btn.style.transform = match ? 'scale(1.12)' : 'scale(1)';
    });

    if (autoSyncSlot) {
        const cTarget = hexToRgb(selectedStencilColorHex);
        const bestSlot = findClosestSlotPerceptual(cTarget.r / 255, cTarget.g / 255, cTarget.b / 255);
        const slotSelect = document.getElementById('stencil-color-slot');
        if (slotSelect) slotSelect.value = bestSlot;
    }
}

function onStencilColorCustomPick(hex) { selectStencilColorHex(hex, true); }
function onStencilColorSlotChange(val) {
    const idx = parseInt(val, 10) || 0;
    if (filamentSlots[idx]) selectStencilColorHex(filamentSlots[idx].color, false);
}

function openStencilModal() {
    if (!currentMesh) { showToast(currentLang === 'fr' ? "Chargez un modèle 3D !" : "Please load a 3D model first!"); return; }
    populateSlotDropdowns();
    initStencilPalette();
    renderStencilGlyphGrid(activeStencilCategory || 'gaming');
    document.getElementById('stencil-modal').style.display = 'flex';
    refreshIcons();
}

function closeStencilModal() {
    document.getElementById('stencil-modal').style.display = 'none';
}

function startStencilStampingMode() {
    const mode = document.getElementById('stencil-stamp-mode').value;
    const slot = parseInt(document.getElementById('stencil-color-slot').value, 10) || 0;
    const size = parseFloat(document.getElementById('slider-stencil-size').value) || 16;
    const hex = filamentSlots[slot] ? filamentSlots[slot].color : selectedStencilColorHex;
    const rgbObj = hexToRgb(hex);

    pendingStencilConfig = { mode, slot, size, hex, rgb: [rgbObj.r / 255, rgbObj.g / 255, rgbObj.b / 255] };
    closeStencilModal();

    isTextStampingMode = false;
    isStencilStampingMode = true;
    controls.enabled = true;
    if (controls.mouseButtons) controls.mouseButtons.LEFT = null;
    if (controls.touches && typeof THREE.TOUCH !== 'undefined') controls.touches.ONE = null;
    document.getElementById('viewport-container').style.cursor = 'crosshair';
    showToast(translations[currentLang].toastStencilReady);
}

function applyStencilStampAtHit(hit) {
    isStencilStampingMode = false;
    selectTool(activeTool);
    if (!hit || !currentMesh || !triangleColors) return;

    const sizeMm = Math.max(6, pendingStencilConfig.size || 16);
    const mode = pendingStencilConfig.mode || 'emboss';
    const targetSlot = pendingStencilConfig.slot !== undefined ? pendingStencilConfig.slot : activeSlotIndex;
    const rgb = slotRgbFloats[targetSlot] || pendingStencilConfig.rgb || [0.97, 0.98, 0.99];

    const S = 72;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = S;
    offCanvas.height = S;
    const ctx = offCanvas.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, S, S);

    if (activeStencilData && activeStencilData.type === 'custom' && activeStencilData.img) {
        const pad = 6;
        ctx.drawImage(activeStencilData.img, pad, pad, S - pad * 2, S - pad * 2);
        const imgData = ctx.getImageData(0, 0, S, S).data;
        applyBitmapStampToSurface(imgData, S, S, sizeMm, sizeMm, mode, targetSlot, rgb, hit, translations[currentLang].toastStencilStamped);
    } else {
        let glyph = null;
        for (const cat in stencilGlyphs) {
            const found = stencilGlyphs[cat].find(g => g.id === activeStencilGlyphId);
            if (found) { glyph = found; break; }
        }
        if (!glyph) glyph = stencilGlyphs.gaming[0];

        if (glyph.pathD && typeof Path2D !== 'undefined') {
            const p = new Path2D(glyph.pathD);
            ctx.save();
            ctx.translate(6, 6);
            ctx.scale((S - 12) / 24, (S - 12) / 24);
            ctx.fillStyle = '#ffffff';
            ctx.fill(p);
            ctx.restore();
            const imgData = ctx.getImageData(0, 0, S, S).data;
            applyBitmapStampToSurface(imgData, S, S, sizeMm, sizeMm, mode, targetSlot, rgb, hit, translations[currentLang].toastStencilStamped);
        } else {
            const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${S}" height="${S}">${glyph.svg}</svg>`;
            const img = new Image();
            const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            img.onload = () => {
                ctx.drawImage(img, 4, 4, S - 8, S - 8);
                URL.revokeObjectURL(url);
                const imgData = ctx.getImageData(0, 0, S, S).data;
                applyBitmapStampToSurface(imgData, S, S, sizeMm, sizeMm, mode, targetSlot, rgb, hit, translations[currentLang].toastStencilStamped);
            };
            img.src = url;
        }
    }
}

// ==========================================
// 🪄 RELIEF, CAVITY & 1-CLICK MEDALLION MASTER
// ==========================================
let reliefDepthAxis = 'z';
let reliefMinVal = 0, reliefMaxVal = 1, reliefSpan = 1;
let reliefPreviewRaf = null;
let cavityPreviewRaf = null;

function openReliefModal() {
    if (!currentMesh) { showToast(currentLang === 'fr' ? "Chargez un modèle !" : "Please load a 3D model first!"); return; }
    const geom = currentMesh.geometry;
    geom.computeBoundingBox();
    const box = geom.boundingBox;
    const size = new THREE.Vector3();
    box.getSize(size);

    reliefDepthAxis = 'z';
    let minDim = size.z;
    if (size.y < minDim) { reliefDepthAxis = 'y'; minDim = size.y; }
    if (size.x < minDim) { reliefDepthAxis = 'x'; minDim = size.x; }

    reliefMinVal = box.min[reliefDepthAxis];
    reliefMaxVal = box.max[reliefDepthAxis];
    reliefSpan = Math.max(0.001, reliefMaxVal - reliefMinVal);

    document.getElementById('slider-relief-depth').value = 50;
    populateSlotDropdowns();
    previewReliefThreshold(50);
    document.getElementById('relief-modal').style.display = 'flex';
}

function closeReliefModal() {
    if (reliefPreviewRaf) cancelAnimationFrame(reliefPreviewRaf);
    document.getElementById('relief-modal').style.display = 'none';
    updateMeshVisualColors();
}

function autoDetectReliefPlate() {
    if (!currentMesh) return;
    const geom = currentMesh.geometry;
    const posAttr = geom.attributes.position;
    const faceCount = (posAttr.count / 3) | 0;
    const getter = reliefDepthAxis === 'x' ? 'getX' : (reliefDepthAxis === 'y' ? 'getY' : 'getZ');

    const bins = new Uint32Array(50);
    for (let f = 0; f < faceCount; f++) {
        const idx = f * 3;
        const avg = (posAttr[getter](idx) + posAttr[getter](idx + 1) + posAttr[getter](idx + 2)) * 0.3333333;
        const ratio = Math.max(0, Math.min(0.999, (avg - reliefMinVal) / reliefSpan));
        bins[(ratio * 50) | 0]++;
    }
    let maxBin = 0, maxVal = 0;
    for (let i = 0; i < 35; i++) {
        if (bins[i] > maxVal) { maxVal = bins[i]; maxBin = i; }
    }
    const detectedPct = Math.min(95, Math.max(5, Math.round(((maxBin + 2) / 50) * 100)));
    document.getElementById('slider-relief-depth').value = detectedPct;
    previewReliefThreshold(detectedPct);
    showToast(currentLang === 'fr' ? `Plaque détectée à ${detectedPct}%` : `Base plate detected at ${detectedPct}% height!`);
}

function invertReliefSlots() {
    const b = document.getElementById('relief-base-slot');
    const e = document.getElementById('relief-emboss-slot');
    const temp = b.value; b.value = e.value; e.value = temp;
    previewReliefThreshold();
}

function previewReliefThreshold(pct) {
    if (pct === undefined) pct = parseFloat(document.getElementById('slider-relief-depth').value);
    const threshold = reliefMinVal + reliefSpan * (pct / 100);
    const mmFromBase = (reliefSpan * (pct / 100)).toFixed(2);
    document.getElementById('relief-val-readout').innerText = `${mmFromBase} mm (${pct}%)`;

    if (reliefPreviewRaf) cancelAnimationFrame(reliefPreviewRaf);
    reliefPreviewRaf = requestAnimationFrame(() => {
        if (!currentMesh) return;
        const geom = currentMesh.geometry;
        const posAttr = geom.attributes.position;
        const colorAttr = geom.attributes.color;
        if (!colorAttr) return;
        const colArr = colorAttr.array;
        const faceCount = (posAttr.count / 3) | 0;
        const getter = reliefDepthAxis === 'x' ? 'getX' : (reliefDepthAxis === 'y' ? 'getY' : 'getZ');

        const baseSlot = parseInt(document.getElementById('relief-base-slot').value, 10) || 0;
        const embossSlot = parseInt(document.getElementById('relief-emboss-slot').value, 10) || 1;
        const rgbBase = slotRgbFloats[baseSlot] || slotRgbFloats[0];
        const rgbEmboss = slotRgbFloats[embossSlot] || slotRgbFloats[0];

        for (let f = 0; f < faceCount; f++) {
            const idx = f * 3;
            const avg = (posAttr[getter](idx) + posAttr[getter](idx + 1) + posAttr[getter](idx + 2)) * 0.3333333;
            const rgb = avg > threshold ? rgbEmboss : rgbBase;
            const base = f * 9;
            colArr[base]     = rgb[0]; colArr[base + 1] = rgb[1]; colArr[base + 2] = rgb[2];
            colArr[base + 3] = rgb[0]; colArr[base + 4] = rgb[1]; colArr[base + 5] = rgb[2];
            colArr[base + 6] = rgb[0]; colArr[base + 7] = rgb[1]; colArr[base + 8] = rgb[2];
        }
        colorAttr.needsUpdate = true;
    });
}

function applyReliefColoring() {
    saveHistory();
    const pct = parseFloat(document.getElementById('slider-relief-depth').value);
    const threshold = reliefMinVal + reliefSpan * (pct / 100);
    const geom = currentMesh.geometry;
    const posAttr = geom.attributes.position;
    const faceCount = (posAttr.count / 3) | 0;
    const getter = reliefDepthAxis === 'x' ? 'getX' : (reliefDepthAxis === 'y' ? 'getY' : 'getZ');

    const baseSlot = parseInt(document.getElementById('relief-base-slot').value, 10) || 0;
    const embossSlot = parseInt(document.getElementById('relief-emboss-slot').value, 10) || 1;

    for (let f = 0; f < faceCount; f++) {
        const idx = f * 3;
        const avg = (posAttr[getter](idx) + posAttr[getter](idx + 1) + posAttr[getter](idx + 2)) * 0.3333333;
        triangleColors[f] = avg > threshold ? embossSlot : baseSlot;
    }

    if (reliefPreviewRaf) cancelAnimationFrame(reliefPreviewRaf);
    document.getElementById('relief-modal').style.display = 'none';
    updateMeshVisualColors();
    showToast(translations[currentLang].toastReliefApplied);
}

function openCavityModal() {
    if (!currentMesh) { showToast(currentLang === 'fr' ? "Chargez un modèle !" : "Please load a 3D model first!"); return; }
    populateSlotDropdowns();
    document.getElementById('slider-cavity-depth').value = 40;
    previewCavityLines(40);
    document.getElementById('cavity-modal').style.display = 'flex';
}

function closeCavityModal() {
    if (cavityPreviewRaf) cancelAnimationFrame(cavityPreviewRaf);
    document.getElementById('cavity-modal').style.display = 'none';
    updateMeshVisualColors();
}

function previewCavityLines(pct) {
    if (pct === undefined) pct = parseFloat(document.getElementById('slider-cavity-depth').value);
    document.getElementById('cavity-val-readout').innerText = `${pct}%`;

    if (cavityPreviewRaf) cancelAnimationFrame(cavityPreviewRaf);
    cavityPreviewRaf = requestAnimationFrame(() => {
        if (!currentMesh || !curvatureScores) return;
        const geom = currentMesh.geometry;
        const colorAttr = geom.attributes.color;
        if (!colorAttr) return;

        const colArr = colorAttr.array;
        const faceCount = curvatureScores.length;
        const targetSlot = parseInt(document.getElementById('cavity-slot-select').value, 10) || 2;
        const rgbCavity = slotRgbFloats[targetSlot] || slotRgbFloats[0];
        // Sensitivity 5..95 -> threshold 0.65..0.05 on true concave curvatureScores
        const threshold = Math.max(0.03, (100 - pct) * 0.0068);

        for (let f = 0; f < faceCount; f++) {
            const isCavity = curvatureScores[f] > threshold;
            const rgb = isCavity ? rgbCavity : (slotRgbFloats[triangleColors[f]] || slotRgbFloats[0]);
            const base = f * 9;
            colArr[base]     = rgb[0]; colArr[base + 1] = rgb[1]; colArr[base + 2] = rgb[2];
            colArr[base + 3] = rgb[0]; colArr[base + 4] = rgb[1]; colArr[base + 5] = rgb[2];
            colArr[base + 6] = rgb[0]; colArr[base + 7] = rgb[1]; colArr[base + 8] = rgb[2];
        }
        colorAttr.needsUpdate = true;
    });
}

function applyCavityColoring() {
    if (!currentMesh || !curvatureScores) return;
    saveHistory();
    const pct = parseFloat(document.getElementById('slider-cavity-depth').value);
    const faceCount = curvatureScores.length;
    const targetSlot = parseInt(document.getElementById('cavity-slot-select').value, 10) || 2;
    const threshold = Math.max(0.03, (100 - pct) * 0.0068);

    for (let f = 0; f < faceCount; f++) {
        if (curvatureScores[f] > threshold) triangleColors[f] = targetSlot;
    }

    if (cavityPreviewRaf) cancelAnimationFrame(cavityPreviewRaf);
    document.getElementById('cavity-modal').style.display = 'none';
    updateMeshVisualColors();
    showToast(translations[currentLang].toastCavityApplied);
}

function oneClickMedallionMaster() {
    if (!currentMesh || !triangleColors) { showToast("Please load a 3D model first!"); return; }
    saveHistory();

    const geom = currentMesh.geometry;
    geom.computeBoundingBox();
    const box = geom.boundingBox;
    const size = new THREE.Vector3();
    box.getSize(size);

    let depthAxis = 'z';
    let minDim = size.z;
    if (size.y < minDim) { depthAxis = 'y'; minDim = size.y; }
    if (size.x < minDim) { depthAxis = 'x'; minDim = size.x; }

    const minVal = box.min[depthAxis];
    const maxVal = box.max[depthAxis];
    const depthSpan = Math.max(0.001, maxVal - minVal);
    const posAttr = geom.attributes.position;
    const faceCount = (posAttr.count / 3) | 0;
    const getter = depthAxis === 'x' ? 'getX' : (depthAxis === 'y' ? 'getY' : 'getZ');

    const bins = new Uint32Array(50);
    for (let f = 0; f < faceCount; f++) {
        const idx = f * 3;
        const avg = (posAttr[getter](idx) + posAttr[getter](idx + 1) + posAttr[getter](idx + 2)) * 0.3333333;
        const ratio = Math.max(0, Math.min(0.999, (avg - minVal) / depthSpan));
        bins[(ratio * 50) | 0]++;
    }
    let maxBin = 0, maxValCount = 0;
    for (let i = 0; i < 35; i++) {
        if (bins[i] > maxValCount) { maxValCount = bins[i]; maxBin = i; }
    }
    const plateThreshold = minVal + depthSpan * ((maxBin + 1.5) / 50);

    const baseSlot = 0;
    const reliefSlot = Math.min(1, filamentSlots.length - 1);
    const cavitySlot = Math.min(2, filamentSlots.length - 1);

    for (let f = 0; f < faceCount; f++) {
        const idx = f * 3;
        const avg = (posAttr[getter](idx) + posAttr[getter](idx + 1) + posAttr[getter](idx + 2)) * 0.3333333;
        const isEngraved = curvatureScores && curvatureScores[f] > 0.25;

        if (isEngraved) triangleColors[f] = cavitySlot;
        else if (avg > plateThreshold) triangleColors[f] = reliefSlot;
        else triangleColors[f] = baseSlot;
    }

    updateMeshVisualColors();
    showToast(translations[currentLang].toastMasterApplied);
}

// ==========================================
// 🖼️ PHOTO DECAL PROJECTION (FIT ASPECT + FRONT-ONLY + BAYER DITHERING!)
// ==========================================
let loadedDecalImage = null;

function openDecalModal() {
    if (!currentMesh) { showToast(currentLang === 'fr' ? "Chargez un modèle !" : "Please load a 3D model first!"); return; }
    document.getElementById('decal-modal').style.display = 'flex';
}

function closeDecalModal() {
    document.getElementById('decal-modal').style.display = 'none';
}

function handleDecalImageUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
            loadedDecalImage = img;
            document.getElementById('decal-img-preview').src = ev.target.result;
            document.getElementById('decal-preview-container').style.display = 'block';
            document.getElementById('btn-apply-decal').disabled = false;
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
}

function applyDecalProjection() {
    if (!currentMesh || !loadedDecalImage) return;
    saveHistory();

    const canvas = document.createElement('canvas');
    const w = loadedDecalImage.width;
    const h = loadedDecalImage.height;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(loadedDecalImage, 0, 0);
    const imgData = ctx.getImageData(0, 0, w, h).data;

    const axisMode = document.getElementById('decal-project-axis').value;
    const scaleMode = document.getElementById('decal-scale-mode')?.value || 'fit';
    const ditherMode = document.getElementById('decal-dither-mode')?.value || 'direct';
    const frontOnly = document.getElementById('decal-front-only')?.checked !== false;

    const geom = currentMesh.geometry;
    geom.computeBoundingBox();
    const box = geom.boundingBox;
    const posAttr = geom.attributes.position;
    const faceCount = (posAttr.count / 3) | 0;
    if (!meshTopology || meshTopology.faceCount !== faceCount) {
        meshTopology = buildMeshTopology(geom);
    }

    let uAxis = 'x', vAxis = 'y', viewDir = new THREE.Vector3(0, 0, 1);
    if (axisMode === 'top') { uAxis = 'x'; vAxis = 'z'; viewDir.set(0, 1, 0); }
    else if (axisMode === 'side') { uAxis = 'z'; vAxis = 'y'; viewDir.set(1, 0, 0); }

    const uMin = box.min[uAxis], uSpan = (box.max[uAxis] - uMin) || 1;
    const vMin = box.min[vAxis], vSpan = (box.max[vAxis] - vMin) || 1;
    const uGetter = uAxis === 'x' ? 'getX' : (uAxis === 'y' ? 'getY' : 'getZ');
    const vGetter = vAxis === 'x' ? 'getX' : (vAxis === 'y' ? 'getY' : 'getZ');

    // Aspect ratio adjustment for 'fit' mode!
    const imgAspect = w / Math.max(1, h);
    const boxAspect = uSpan / Math.max(0.001, vSpan);
    let uScale = 1, vScale = 1, uOffset = 0, vOffset = 0;
    if (scaleMode === 'fit') {
        if (boxAspect > imgAspect) {
            uScale = boxAspect / imgAspect;
            uOffset = (1 - uScale) * 0.5;
        } else {
            vScale = imgAspect / boxAspect;
            vOffset = (1 - vScale) * 0.5;
        }
    }

    // 4x4 Bayer ordered dithering matrix normalized to [-0.5, 0.5]
    const bayer4 = [
        [ 0 / 16 - 0.5,  8 / 16 - 0.5,  2 / 16 - 0.5, 10 / 16 - 0.5],
        [12 / 16 - 0.5,  4 / 16 - 0.5, 14 / 16 - 0.5,  6 / 16 - 0.5],
        [ 3 / 16 - 0.5, 11 / 16 - 0.5,  1 / 16 - 0.5,  9 / 16 - 0.5],
        [15 / 16 - 0.5,  7 / 16 - 0.5, 13 / 16 - 0.5,  5 / 16 - 0.5]
    ];

    for (let f = 0; f < faceCount; f++) {
        // Front-only guard: skip back-facing surfaces!
        if (frontOnly && meshTopology) {
            const f3 = f * 3;
            const dot = meshTopology.faceNormals[f3] * viewDir.x
                      + meshTopology.faceNormals[f3 + 1] * viewDir.y
                      + meshTopology.faceNormals[f3 + 2] * viewDir.z;
            if (dot <= 0.1) continue;
        }

        const idx = f * 3;
        const uAvg = (posAttr[uGetter](idx) + posAttr[uGetter](idx + 1) + posAttr[uGetter](idx + 2)) * 0.3333333;
        const vAvg = (posAttr[vGetter](idx) + posAttr[vGetter](idx + 1) + posAttr[vGetter](idx + 2)) * 0.3333333;

        const rawU = (uAvg - uMin) / uSpan;
        const rawV = (axisMode === 'top') ? ((vAvg - vMin) / vSpan) : (1 - (vAvg - vMin) / vSpan);

        const uNorm = rawU * uScale + uOffset;
        const vNorm = rawV * vScale + vOffset;
        if (scaleMode === 'fit' && (uNorm < 0 || uNorm > 1 || vNorm < 0 || vNorm > 1)) continue;

        const px = Math.min(w - 1, Math.max(0, (uNorm * w) | 0));
        const py = Math.min(h - 1, Math.max(0, (vNorm * h) | 0));
        const pIdx = (py * w + px) * 4;
        if (imgData[pIdx + 3] < 50) continue;

        let r = imgData[pIdx] / 255;
        let g = imgData[pIdx + 1] / 255;
        let b = imgData[pIdx + 2] / 255;

        if (ditherMode === 'dither') {
            const ditherAmt = bayer4[py & 3][px & 3] * 0.18;
            r = Math.max(0, Math.min(1, r + ditherAmt));
            g = Math.max(0, Math.min(1, g + ditherAmt));
            b = Math.max(0, Math.min(1, b + ditherAmt));
        }

        triangleColors[f] = findClosestSlotPerceptual(r, g, b);
    }

    updateMeshVisualColors();
    closeDecalModal();
    showToast(translations[currentLang].toastDecalApplied);
}
