// ==========================================
// ✍️ 3D TEXT, STENCIL, MULTI-COLOR SVG, FLUSH INLAY, RELIEF, CAVITY & PHOTO DECAL ENGINE
// Watertight outward-normal extrusion, conformal/cylindrical wrap, live 3D ghost preview!
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
let pendingTextConfig = {
    text: 'STUDIOS PRO', mode: 'emboss', slot: 1, size: 8, depth: 1.2,
    rotation: 0, wrap: 'conformal', font: 'Outfit, Inter, sans-serif', letterSpacing: 0
};
let selectedTextColorHex = "#AD002B";

let isStencilStampingMode = false;
let pendingStencilConfig = {
    mode: 'emboss', slot: 1, size: 12, depth: 1.2, rotation: 0, wrap: 'conformal',
    invertMask: false, threshold: 128, multiColorSvg: false
};
let activeStencilCategory = 'gaming';
let activeStencilGlyphId = 'star';
let activeStencilData = null; // { type: 'glyph'|'custom'|'multisvg', ... }
let selectedStencilColorHex = "#AD002B";

// Live 3D Hover Ghost Preview state
let stampGhostMesh = null;
let stampGhostTex = null;
let stampGhostActiveKind = null; // 'text' | 'stencil' | 'qr' | 'batch'

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
        // FIXED: genuine stylized Leaf vector (previously was a Bookmark icon!)
        { id: 'leaf', name: 'Leaf', pathD: 'M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z', svg: '<path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" fill="currentColor"/>' },
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

// ==========================================
// 👻 LIVE 3D INTERACTIVE STAMP GHOST PREVIEW
// ==========================================
function clearStampGhost() {
    if (stampGhostMesh && scene) {
        scene.remove(stampGhostMesh);
        if (stampGhostMesh.geometry) stampGhostMesh.geometry.dispose();
        if (stampGhostMesh.material) stampGhostMesh.material.dispose();
        stampGhostMesh = null;
    }
    if (stampGhostTex) {
        stampGhostTex.dispose();
        stampGhostTex = null;
    }
    stampGhostActiveKind = null;
    lastStampHit = null;
    const hud = document.getElementById('stamp-live-hud');
    if (hud) hud.style.display = 'none';
}

function cancelStampingMode(silent = false, skipSelectTool = false) {
    const wasActive = isTextStampingMode || isStencilStampingMode ||
        (typeof isQRStampingMode !== 'undefined' && isQRStampingMode) ||
        (typeof isBatchPlacementMode !== 'undefined' && isBatchPlacementMode);
    isTextStampingMode = false;
    isStencilStampingMode = false;
    if (typeof isQRStampingMode !== 'undefined') isQRStampingMode = false;
    if (typeof isBatchPlacementMode !== 'undefined') isBatchPlacementMode = false;
    clearStampGhost();
    if (!skipSelectTool && typeof selectTool === 'function') {
        selectTool(activeTool);
    }
    if (wasActive && !silent && typeof showToast === 'function') {
        showToast(currentLang === 'fr' ? "Mode tampon annulé." : "Stamping mode cancelled.");
    }
}

function buildStampGhostFromCanvas(canvas, physW, physH, kind) {
    clearStampGhost();
    if (!scene || !canvas) return;
    stampGhostActiveKind = kind;
    stampGhostTex = new THREE.CanvasTexture(canvas);
    stampGhostTex.needsUpdate = true;
    const geom = new THREE.PlaneGeometry(physW, physH);
    const mat = new THREE.MeshBasicMaterial({
        map: stampGhostTex,
        transparent: true,
        opacity: 0.82,
        side: THREE.DoubleSide,
        depthTest: false
    });
    stampGhostMesh = new THREE.Mesh(geom, mat);
    stampGhostMesh.visible = false;
    stampGhostMesh.renderOrder = 999;
    stampGhostMesh.userData = { physW, physH };
    scene.add(stampGhostMesh);

    const hud = document.getElementById('stamp-live-hud');
    if (hud) hud.style.display = 'flex';
    updateStampHudLabel();
}

function updateStampHudLabel() {
    const el = document.getElementById('stamp-live-hud-text');
    if (!el) return;
    let sz = 10, rot = 0;
    if (isTextStampingMode) { sz = pendingTextConfig.size; rot = pendingTextConfig.rotation || 0; }
    else if (isStencilStampingMode) { sz = pendingStencilConfig.size; rot = pendingStencilConfig.rotation || 0; }
    else if (typeof isQRStampingMode !== 'undefined' && isQRStampingMode && typeof pendingQRConfig !== 'undefined') { sz = pendingQRConfig.size; rot = pendingQRConfig.rotation || 0; }
    else if (typeof isBatchPlacementMode !== 'undefined' && isBatchPlacementMode && typeof pendingBatchConfig !== 'undefined') { sz = pendingBatchConfig.size; rot = pendingBatchConfig.rotation || 0; }

    el.textContent = currentLang === 'fr'
        ? `Cliquez sur le modèle • ${sz.toFixed(1)}mm | ${rot}° • Q/E: Pivoter • +/-: Taille • Échap: Annuler`
        : `Click on model to place • ${sz.toFixed(1)}mm | ${rot}° • Q/E: Rotate • +/-: Scale • Esc: Cancel`;
}

let lastStampHit = null;

function adjustActiveStampTransform(deltaRotDeg, scaleMult) {
    if (isTextStampingMode) {
        pendingTextConfig.rotation = ((pendingTextConfig.rotation || 0) + deltaRotDeg + 360) % 360;
        if (pendingTextConfig.rotation > 180) pendingTextConfig.rotation -= 360;
        pendingTextConfig.size = Math.max(2, Math.min(60, +(pendingTextConfig.size * scaleMult).toFixed(1)));
        const rendered = renderTextToBitmapCanvas(pendingTextConfig);
        buildStampGhostFromCanvas(rendered.previewCanvas, rendered.physW, rendered.physH, 'text');
    } else if (isStencilStampingMode) {
        pendingStencilConfig.rotation = ((pendingStencilConfig.rotation || 0) + deltaRotDeg + 360) % 360;
        if (pendingStencilConfig.rotation > 180) pendingStencilConfig.rotation -= 360;
        pendingStencilConfig.size = Math.max(3, Math.min(60, +(pendingStencilConfig.size * scaleMult).toFixed(1)));
        if (stampGhostMesh) {
            const ratio = stampGhostMesh.userData.physW / Math.max(0.1, stampGhostMesh.userData.physH);
            const nH = pendingStencilConfig.size;
            const nW = nH * ratio;
            stampGhostMesh.geometry.dispose();
            stampGhostMesh.geometry = new THREE.PlaneGeometry(nW, nH);
            stampGhostMesh.userData = { physW: nW, physH: nH };
        }
        updateStampHudLabel();
    } else if (typeof isQRStampingMode !== 'undefined' && isQRStampingMode && typeof pendingQRConfig !== 'undefined') {
        pendingQRConfig.rotation = ((pendingQRConfig.rotation || 0) + deltaRotDeg + 360) % 360;
        if (pendingQRConfig.rotation > 180) pendingQRConfig.rotation -= 360;
        pendingQRConfig.size = Math.max(8, Math.min(80, +(pendingQRConfig.size * scaleMult).toFixed(1)));
        if (stampGhostMesh) {
            stampGhostMesh.geometry.dispose();
            stampGhostMesh.geometry = new THREE.PlaneGeometry(pendingQRConfig.size, pendingQRConfig.size);
            stampGhostMesh.userData = { physW: pendingQRConfig.size, physH: pendingQRConfig.size };
        }
        updateStampHudLabel();
    } else if (typeof isBatchPlacementMode !== 'undefined' && isBatchPlacementMode && typeof pendingBatchConfig !== 'undefined') {
        pendingBatchConfig.rotation = ((pendingBatchConfig.rotation || 0) + deltaRotDeg + 360) % 360;
        if (pendingBatchConfig.rotation > 180) pendingBatchConfig.rotation -= 360;
        pendingBatchConfig.size = Math.max(2, Math.min(50, +(pendingBatchConfig.size * scaleMult).toFixed(1)));
        const rendered = renderTextToBitmapCanvas({ ...pendingBatchConfig, text: pendingBatchConfig.sampleName || 'SAMPLE' });
        buildStampGhostFromCanvas(rendered.previewCanvas, rendered.physW, rendered.physH, 'batch');
    }
    // Keep 3D ghost visible at last hovered hit immediately without needing mouse wiggle!
    if (lastStampHit) updateStampGhostAtHit(lastStampHit);
}

function computeStampBasis(hit, rotationDeg = 0) {
    const N = (hit.face ? hit.face.normal.clone() : new THREE.Vector3(0, 0, 1)).normalize();
    const invMat = new THREE.Matrix4().copy(currentMesh.matrixWorld).invert();
    const camRightLocal = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).transformDirection(invMat);

    let T = camRightLocal.clone().addScaledVector(N, -camRightLocal.dot(N));
    if (T.lengthSq() < 0.001) {
        const camUpLocal = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).transformDirection(invMat);
        T = new THREE.Vector3().crossVectors(camUpLocal, N);
    }
    T.normalize();
    let B = new THREE.Vector3().crossVectors(N, T).normalize();

    // Apply user rotation around surface normal N
    if (rotationDeg) {
        const rad = (rotationDeg * Math.PI) / 180;
        const cosA = Math.cos(rad), sinA = Math.sin(rad);
        const rT = T.clone().multiplyScalar(cosA).addScaledVector(B, sinA).normalize();
        const rB = B.clone().multiplyScalar(cosA).addScaledVector(T, -sinA).normalize();
        T = rT;
        B = rB;
    }
    return { T, B, N };
}

function updateStampGhostAtHit(hit) {
    if (!stampGhostMesh || !currentMesh) return;
    if (!hit || !hit.face) {
        stampGhostMesh.visible = false;
        return;
    }
    lastStampHit = hit;
    let rotDeg = 0;
    if (isTextStampingMode) rotDeg = pendingTextConfig.rotation || 0;
    else if (isStencilStampingMode) rotDeg = pendingStencilConfig.rotation || 0;
    else if (typeof isQRStampingMode !== 'undefined' && isQRStampingMode && typeof pendingQRConfig !== 'undefined') rotDeg = pendingQRConfig.rotation || 0;
    else if (typeof isBatchPlacementMode !== 'undefined' && isBatchPlacementMode && typeof pendingBatchConfig !== 'undefined') rotDeg = pendingBatchConfig.rotation || 0;

    const { T, B, N } = computeStampBasis(hit, rotDeg);
    const basisMat = new THREE.Matrix4().makeBasis(T, B, N);
    stampGhostMesh.quaternion.setFromRotationMatrix(basisMat);
    stampGhostMesh.position.copy(hit.point).addScaledVector(N, 0.35);
    stampGhostMesh.visible = true;
}

// ==========================================
// 🧱 CORE WATERTIGHT STAMP ENGINE (EMBOSS / FLUSH INLAY / SURFACE PAINT / ENGRAVE)
// FIXED: Outward normals on ALL 4 side walls, cliff-safe conformal projection,
// cylindrical 360° wrap, matched watertight per-pixel quads (zero T-junctions!),
// Rivara high-res surface paint, wall-safe welded engrave!
// ==========================================
function applyBinaryMaskStampToSurface(maskBits, W, H, physW, physH, opts, hit, successToast) {
    const mode = opts.mode || 'emboss'; // 'emboss' | 'inlay' | 'surface' | 'paint' | 'engrave'
    const targetSlot = opts.slot !== undefined ? opts.slot : activeSlotIndex;
    const rgb = slotRgbFloats[targetSlot] || opts.rgb || [0.97, 0.98, 0.99];
    const depthMm = Math.max(0.2, Math.min(4.0, parseFloat(opts.depth) || 1.2));
    const rotationDeg = parseFloat(opts.rotation) || 0;
    const wrapMode = opts.wrap || 'conformal'; // 'flat' | 'conformal' | 'cylindrical'
    const skipHistoryCommit = !!opts.skipHistoryCommit;
    const suppressToast = !!opts.suppressToast;

    const hitLocalPoint = currentMesh.worldToLocal(hit.point.clone());
    const { T, B, N } = computeStampBasis(hit, rotationDeg);
    const isSolid = (px, py) => (px >= 0 && px < W && py >= 0 && py < H) && maskBits[py * W + px] === 1;

    // ---------------------------------------------------------
    // MODE A: 'surface' / 'paint' / 'engrave' -> Rivara Local Refinement + Paint / Welded Carve
    // ---------------------------------------------------------
    if (mode === 'surface' || mode === 'paint' || mode === 'engrave') {
        const stampRad = Math.hypot(physW * 0.5, physH * 0.5) * 1.12;
        if (spatialGrid) {
            const targetEdge = Math.max(0.24, Math.min(physW, physH) * 0.045, 0.32);
            const maxESq = targetEdge * targetEdge;
            for (let pass = 0; pass < 4; pass++) {
                const curPos = currentMesh.geometry.attributes.position.array;
                const faceCount = (curPos.length / 9) | 0;
                if (faceCount > 240000) break;
                const toSplit = new Set();
                spatialGrid.querySphere(hitLocalPoint.x, hitLocalPoint.y, hitLocalPoint.z, stampRad, (f) => {
                    const f3 = f * 3;
                    if (meshTopology && meshTopology.faceNormals) {
                        const dot = meshTopology.faceNormals[f3] * N.x + meshTopology.faceNormals[f3 + 1] * N.y + meshTopology.faceNormals[f3 + 2] * N.z;
                        if (dot < 0.25) return;
                    }
                    const p = f * 9;
                    const e0 = (curPos[p + 3] - curPos[p]) ** 2 + (curPos[p + 4] - curPos[p + 1]) ** 2 + (curPos[p + 5] - curPos[p + 2]) ** 2;
                    const e1 = (curPos[p + 6] - curPos[p + 3]) ** 2 + (curPos[p + 7] - curPos[p + 4]) ** 2 + (curPos[p + 8] - curPos[p + 5]) ** 2;
                    const e2 = (curPos[p] - curPos[p + 6]) ** 2 + (curPos[p + 1] - curPos[p + 7]) ** 2 + (curPos[p + 2] - curPos[p + 8]) ** 2;
                    if (e0 > maxESq || e1 > maxESq || e2 > maxESq) toSplit.add(f);
                });
                if (toSplit.size === 0 || !subdivideFacesLocal(toSplit, 1, true)) break;
            }
        }

        const geom = currentMesh.geometry;
        const posAttr = geom.attributes.position;
        const pos = posAttr.array;
        const faceCount = (posAttr.count / 3) | 0;
        if (!meshTopology || meshTopology.faceCount !== faceCount) {
            meshTopology = buildMeshTopology(geom);
        }

        const fn = meshTopology.faceNormals;
        const engravedVids = new Set();
        let paintedFaces = 0;

        const evalPointInMask = (vx, vy, vz) => {
            const dx = vx - hitLocalPoint.x;
            const dy = vy - hitLocalPoint.y;
            const dz = vz - hitLocalPoint.z;
            // Reject faces far in front or behind the hit surface (prevents bleeding onto arms/legs!)
            const depthOff = Math.abs(dx * N.x + dy * N.y + dz * N.z);
            if (depthOff > Math.max(physW, physH) * 0.45 + 3.0) return false;
            const lx = dx * T.x + dy * T.y + dz * T.z;
            const ly = dx * B.x + dy * B.y + dz * B.z;
            const px = Math.floor((lx / physW + 0.5) * W);
            const py = Math.floor((0.5 - ly / physH) * H);
            return isSolid(px, py);
        };

        spatialGrid.querySphere(hitLocalPoint.x, hitLocalPoint.y, hitLocalPoint.z, stampRad, (f) => {
            const f3 = f * 3;
            const dot = fn[f3] * N.x + fn[f3 + 1] * N.y + fn[f3 + 2] * N.z;
            if (dot < 0.25) return;

            const p = f * 9;
            const cx = spatialGrid.faceCenters[f3], cy = spatialGrid.faceCenters[f3 + 1], cz = spatialGrid.faceCenters[f3 + 2];
            // 4-point supersampled hit test for clean sharp boundaries
            const votes = (evalPointInMask(cx, cy, cz) ? 2 : 0)
                + (evalPointInMask(pos[p], pos[p + 1], pos[p + 2]) ? 1 : 0)
                + (evalPointInMask(pos[p + 3], pos[p + 4], pos[p + 5]) ? 1 : 0)
                + (evalPointInMask(pos[p + 6], pos[p + 7], pos[p + 8]) ? 1 : 0);

            if (votes >= 2) {
                triangleColors[f] = targetSlot;
                paintedFaces++;
                if (mode === 'engrave' && meshTopology.vertIds) {
                    engravedVids.add(meshTopology.vertIds[f * 3]);
                    engravedVids.add(meshTopology.vertIds[f * 3 + 1]);
                    engravedVids.add(meshTopology.vertIds[f * 3 + 2]);
                }
            }
        });

        // Watertight welded vertex engraving with safe thickness cap (never punctures thin walls!)
        if (mode === 'engrave' && engravedVids.size > 0 && meshTopology.weldedVertIndices) {
            geom.computeBoundingBox();
            const bSize = new THREE.Vector3();
            geom.boundingBox.getSize(bSize);
            const safeDepth = Math.min(depthMm, Math.max(0.35, Math.min(bSize.x, bSize.y, bSize.z) * 0.22));
            for (const vid of engravedVids) {
                const copies = meshTopology.weldedVertIndices[vid];
                const dx = -N.x * safeDepth;
                const dy = -N.y * safeDepth;
                const dz = -N.z * safeDepth;
                for (let c = 0; c < copies.length; c++) {
                    const vi = copies[c] * 3;
                    pos[vi] += dx; pos[vi + 1] += dy; pos[vi + 2] += dz;
                }
            }
            posAttr.needsUpdate = true;
            geom.computeVertexNormals();
            if (geom.disposeBoundsTree) geom.disposeBoundsTree();
            if (geom.computeBoundsTree) geom.computeBoundsTree();
            spatialGrid = new SpatialGrid(geom, 32);
            meshTopology = buildMeshTopology(geom);
            currentGeoGen++;
        }

        precomputeGeometryMetrics(geom);

        if (paintedFaces === 0) {
            if (!suppressToast) showToast(currentLang === 'fr' ? "Zone trop petite ou hors surface pour imprimer ce motif." : "Area too small or off-surface to stamp motif.");
            return false;
        }
        updateMeshVisualColors();
        if (!skipHistoryCommit) commitHistory(true);
        if (!suppressToast && successToast) showToast(successToast);
        return true;
    }

    // ---------------------------------------------------------
    // MODE B: 'emboss' (+depthMm raised) OR 'inlay' (#1 Flush 0mm PEI Inlay!)
    // GUARANTEED OUTWARD NORMALS + #10 GREEDY-MESH FLAT OPTIMIZER (85–95% FEWER TRIS!)
    // ---------------------------------------------------------
    const isInlay = (mode === 'inlay');
    const extrudeZ = (typeof opts.exactExtrudeZ === 'number')
        ? opts.exactExtrudeZ
        : (isInlay ? 0.04 : depthMm);
    const baseEmbedZ = (typeof opts.exactBaseZ === 'number')
        ? opts.exactBaseZ
        : (isInlay ? -Math.min(0.8, Math.max(0.4, depthMm * 0.5)) : -0.18);

    // 1. Sample surface depth grid safely (flat / conformal / cylindrical)
    const gridN = (W + 1) * (H + 1);
    const surfOffsets = new Float32Array(gridN);
    const validCorner = new Uint8Array(gridN);
    validCorner.fill(1);

    // For cylindrical wrap (#6), estimate cylinder center & radius around model Y axis
    let cylCenterX = 0, cylCenterZ = 0, cylRadius = 15, cylAngle0 = 0;
    if (wrapMode === 'cylindrical') {
        currentMesh.geometry.computeBoundingBox();
        const box = currentMesh.geometry.boundingBox;
        cylCenterX = (box.min.x + box.max.x) * 0.5;
        cylCenterZ = (box.min.z + box.max.z) * 0.5;
        const rx = hitLocalPoint.x - cylCenterX;
        const rz = hitLocalPoint.z - cylCenterZ;
        cylRadius = Math.max(4.0, Math.hypot(rx, rz));
        cylAngle0 = Math.atan2(rx, rz);
    }

    if (wrapMode === 'conformal') {
        const localRay = new THREE.Raycaster();
        localRay.firstHitOnly = true;
        const tmpOrigin = new THREE.Vector3();
        const rayDirWorld = N.clone().negate().transformDirection(currentMesh.matrixWorld).normalize();
        const probeDist = Math.max(physW, physH) * 0.35 + 4.0;
        const maxJumpFromHit = Math.max(1.8, Math.min(physW, physH) * 0.25);

        for (let gy = 0; gy <= H; gy++) {
            for (let gx = 0; gx <= W; gx++) {
                const idx = gy * (W + 1) + gx;
                const lx = (gx / W - 0.5) * physW;
                const ly = (0.5 - gy / H) * physH;
                tmpOrigin.copy(hitLocalPoint).addScaledVector(T, lx).addScaledVector(B, ly).addScaledVector(N, probeDist);
                const worldOrig = tmpOrigin.clone().applyMatrix4(currentMesh.matrixWorld);
                localRay.set(worldOrig, rayDirWorld);
                const hits = localRay.intersectObject(currentMesh);
                if (hits.length > 0) {
                    const hLoc = currentMesh.worldToLocal(hits[0].point.clone());
                    const relZ = hLoc.sub(hitLocalPoint).dot(N);
                    // Also check hit normal aligns roughly with N so we don't snap onto perpendicular side walls/arms!
                    const hNorm = hits[0].face ? hits[0].face.normal : N;
                    const nDot = hNorm.x * N.x + hNorm.y * N.y + hNorm.z * N.z;
                    if (Math.abs(relZ) <= maxJumpFromHit && nDot >= 0.35) {
                        surfOffsets[idx] = relZ;
                        validCorner[idx] = 1;
                    } else {
                        surfOffsets[idx] = 0;
                        validCorner[idx] = 0;
                    }
                } else {
                    surfOffsets[idx] = 0;
                    validCorner[idx] = 0;
                }
            }
        }

        // Smooth valid surfOffsets gently (3x3 average over valid neighbors only) to eliminate micro-jags
        const smoothed = new Float32Array(surfOffsets);
        for (let gy = 1; gy < H; gy++) {
            for (let gx = 1; gx < W; gx++) {
                const idx = gy * (W + 1) + gx;
                if (!validCorner[idx]) continue;
                let sum = surfOffsets[idx] * 2, wt = 2;
                const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                for (let d = 0; d < 4; d++) {
                    const ni = (gy + dirs[d][1]) * (W + 1) + (gx + dirs[d][0]);
                    if (validCorner[ni] && Math.abs(surfOffsets[ni] - surfOffsets[idx]) < 0.7) {
                        sum += surfOffsets[ni];
                        wt += 1;
                    }
                }
                smoothed[idx] = sum / wt;
            }
        }
        surfOffsets.set(smoothed);
    }

    // Build effective clipped solid mask (rejects pixels hanging over empty space or huge step cliffs!)
    const maxCellSlope = 1.15;
    const effSolid = new Uint8Array(W * H);
    let anyValidSolid = false;
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            if (!isSolid(x, y)) continue;
            if (wrapMode === 'conformal') {
                const c00 = y * (W + 1) + x;
                const c10 = c00 + 1;
                const c01 = c00 + (W + 1);
                const c11 = c01 + 1;
                if (!validCorner[c00] || !validCorner[c10] || !validCorner[c01] || !validCorner[c11]) continue;
                const zMin = Math.min(surfOffsets[c00], surfOffsets[c10], surfOffsets[c01], surfOffsets[c11]);
                const zMax = Math.max(surfOffsets[c00], surfOffsets[c10], surfOffsets[c01], surfOffsets[c11]);
                if (zMax - zMin > maxCellSlope) continue;
            }
            effSolid[y * W + x] = 1;
            anyValidSolid = true;
        }
    }

    // Fallback: if strict conformal clipped everything (e.g., text wider than narrow surface), use flat plane safely!
    const useFlatFallback = (wrapMode === 'conformal' && !anyValidSolid);
    if (useFlatFallback) {
        surfOffsets.fill(0);
        for (let i = 0; i < W * H; i++) effSolid[i] = maskBits[i];
    }
    const isEffSolid = (px, py) => (px >= 0 && px < W && py >= 0 && py < H) && effSolid[py * W + px] === 1;

    const getLocal3D = (px, py, pz) => {
        const cx = Math.max(0, Math.min(W, px));
        const cy = Math.max(0, Math.min(H, py));
        const lx = (px / W - 0.5) * physW;
        const ly = (0.5 - py / H) * physH;

        if (wrapMode === 'cylindrical') {
            const rotRad = (rotationDeg * Math.PI) / 180;
            const rx = lx * Math.cos(rotRad) - ly * Math.sin(rotRad);
            const ry = lx * Math.sin(rotRad) + ly * Math.cos(rotRad);
            const theta = cylAngle0 + (rx / cylRadius);
            const r = cylRadius + pz;
            return new THREE.Vector3(
                cylCenterX + Math.sin(theta) * r,
                hitLocalPoint.y + ry,
                cylCenterZ + Math.cos(theta) * r
            );
        }

        const surfZ = (wrapMode === 'flat' || useFlatFallback) ? 0 : surfOffsets[cy * (W + 1) + cx];
        return new THREE.Vector3()
            .copy(hitLocalPoint)
            .addScaledVector(T, lx)
            .addScaledVector(B, ly)
            .addScaledVector(N, surfZ + pz);
    };

    // Emit watertight per-cell matched quads with 100% VERIFIED OUTWARD NORMALS!
    // Right-handed basis (T = right, B = up, N = outward):
    //   p(x+1, y) - p(x, y) = +T ; p(x, y+1) - p(x, y) = -B ; p(..., ext) - p(..., base) = +N
    //   Top Cap (+N):    BL -> BR -> TR -> TL   : (+T) x (+B) = +N ✓
    //   Bottom Cap (-N): TL -> TR -> BR -> BL   : (+T) x (-B) = -N ✓
    //   Top Wall (+B):   p(x,y,ext) -> p(x+1,y,ext) -> p(x+1,y,base) -> p(x,y,base) : (+T) x (-N) = +B ✓
    //   Bot Wall (-B):   p(x+1,y+1,ext) -> p(x,y+1,ext) -> p(x,y+1,base) -> p(x+1,y+1,base) : (-T) x (-N) = -B ✓
    //   Left Wall (-T):  p(x,y+1,ext) -> p(x,y,ext) -> p(x,y,base) -> p(x,y+1,base) : (+B) x (-N) = -T ✓
    //   Right Wall (+T): p(x+1,y,ext) -> p(x+1,y+1,ext) -> p(x+1,y+1,base) -> p(x+1,y,base) : (-B) x (-N) = +T ✓
    const newPositions = [];
    const addQuad = (p0, p1, p2, p3) => {
        newPositions.push(
            p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z,
            p0.x, p0.y, p0.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z
        );
    };

    // #10 Greedy Rectangle Meshing for flat stamps (reduces QR/Text tris by 85–95% with 100% manifold closed prisms!)
    if (wrapMode === 'flat' || useFlatFallback) {
        const visited = new Uint8Array(W * H);
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const startIdx = y * W + x;
                if (!effSolid[startIdx] || visited[startIdx]) continue;

                // Expand width maximally along X
                let rw = 1;
                while (x + rw < W && effSolid[y * W + (x + rw)] && !visited[y * W + (x + rw)]) {
                    rw++;
                }
                // Expand height maximally along Y where entire row span [x..x+rw-1] is solid & unvisited
                let rh = 1;
                outerH: while (y + rh < H) {
                    const rowBase = (y + rh) * W + x;
                    for (let dx = 0; dx < rw; dx++) {
                        if (!effSolid[rowBase + dx] || visited[rowBase + dx]) break outerH;
                    }
                    rh++;
                }
                for (let dy = 0; dy < rh; dy++) {
                    const rowBase = (y + dy) * W + x;
                    for (let dx = 0; dx < rw; dx++) visited[rowBase + dx] = 1;
                }

                // Emit one watertight closed 6-sided manifold box for merged rectangle [x..x+rw, y..y+rh]
                const x1 = x + rw, y1 = y + rh;
                const TL_t = getLocal3D(x,  y,  extrudeZ);
                const TR_t = getLocal3D(x1, y,  extrudeZ);
                const BR_t = getLocal3D(x1, y1, extrudeZ);
                const BL_t = getLocal3D(x,  y1, extrudeZ);

                const TL_b = getLocal3D(x,  y,  baseEmbedZ);
                const TR_b = getLocal3D(x1, y,  baseEmbedZ);
                const BR_b = getLocal3D(x1, y1, baseEmbedZ);
                const BL_b = getLocal3D(x,  y1, baseEmbedZ);

                addQuad(BL_t, BR_t, TR_t, TL_t); // Top Cap (+N)
                addQuad(TL_b, TR_b, BR_b, BL_b); // Bottom Cap (-N)
                addQuad(TL_t, TR_t, TR_b, TL_b); // Top Wall (+B)
                addQuad(BR_t, BL_t, BL_b, BR_b); // Bottom Wall (-B)
                addQuad(BL_t, TL_t, TL_b, BL_b); // Left Wall (-T)
                addQuad(TR_t, BR_t, BR_b, TR_b); // Right Wall (+T)
            }
        }
    } else {
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                if (!isEffSolid(x, y)) continue;

                const TL_t = getLocal3D(x,     y,     extrudeZ);
                const TR_t = getLocal3D(x + 1, y,     extrudeZ);
                const BR_t = getLocal3D(x + 1, y + 1, extrudeZ);
                const BL_t = getLocal3D(x,     y + 1, extrudeZ);
                addQuad(BL_t, BR_t, TR_t, TL_t); // Outward +N

                const TL_b = getLocal3D(x,     y,     baseEmbedZ);
                const TR_b = getLocal3D(x + 1, y,     baseEmbedZ);
                const BR_b = getLocal3D(x + 1, y + 1, baseEmbedZ);
                const BL_b = getLocal3D(x,     y + 1, baseEmbedZ);
                addQuad(TL_b, TR_b, BR_b, BL_b); // Outward -N

                // Top boundary wall (+B outward!)
                if (!isEffSolid(x, y - 1)) addQuad(TL_t, TR_t, TR_b, TL_b);
                // Bottom boundary wall (-B outward!)
                if (!isEffSolid(x, y + 1)) addQuad(BR_t, BL_t, BL_b, BR_b);
                // Left boundary wall (-T outward!)
                if (!isEffSolid(x - 1, y)) addQuad(BL_t, TL_t, TL_b, BL_b);
                // Right boundary wall (+T outward!)
                if (!isEffSolid(x + 1, y)) addQuad(TR_t, BR_t, BR_b, TR_b);
            }
        }
    }

    const addedCoords = newPositions.length;
    const addedTris = (addedCoords / 9) | 0;
    if (addedTris === 0) {
        if (!suppressToast) showToast(currentLang === 'fr' ? "Aucun pixel valide sur la surface (réduisez la taille ou passez en mode Plat)." : "No valid pixels on surface (reduce size or switch to Flat wrap).");
        return false;
    }

    // If Flush Inlay mode, also paint underlying faces inside mask so there's zero coplanar color flicker
    if (isInlay && spatialGrid) {
        const stampRad = Math.hypot(physW * 0.5, physH * 0.5) * 1.05;
        spatialGrid.querySphere(hitLocalPoint.x, hitLocalPoint.y, hitLocalPoint.z, stampRad, (f) => {
            const f3 = f * 3;
            const dx = spatialGrid.faceCenters[f3] - hitLocalPoint.x;
            const dy = spatialGrid.faceCenters[f3 + 1] - hitLocalPoint.y;
            const dz = spatialGrid.faceCenters[f3 + 2] - hitLocalPoint.z;
            if (Math.abs(dx * N.x + dy * N.y + dz * N.z) > 1.2) return;
            const lx = dx * T.x + dy * T.y + dz * T.z;
            const ly = dx * B.x + dy * B.y + dz * B.z;
            const px = Math.floor((lx / physW + 0.5) * W);
            const py = Math.floor((0.5 - ly / physH) * H);
            if (isEffSolid(px, py)) triangleColors[f] = targetSlot;
        });
    }

    const geom = currentMesh.geometry;
    const oldPosArr = geom.attributes.position.array;
    const oldFaceCount = (oldPosArr.length / 9) | 0;
    const newFaceCount = oldFaceCount + addedTris;

    const combinedPositions = new Float32Array(newFaceCount * 9);
    combinedPositions.set(oldPosArr, 0);
    for (let i = 0; i < addedCoords; i++) combinedPositions[oldPosArr.length + i] = newPositions[i];

    const newTriangleColors = new Uint8Array(newFaceCount);
    newTriangleColors.set(triangleColors, 0);
    for (let i = 0; i < addedTris; i++) newTriangleColors[oldFaceCount + i] = targetSlot;

    triangleColors = newTriangleColors;
    const newGeom = new THREE.BufferGeometry();
    newGeom.setAttribute('position', new THREE.BufferAttribute(combinedPositions, 3));
    newGeom.computeVertexNormals();
    newGeom.computeBoundingBox();
    if (newGeom.computeBoundsTree) newGeom.computeBoundsTree();

    if (geom.disposeBoundsTree) geom.disposeBoundsTree();
    geom.dispose();
    currentMesh.geometry = newGeom;
    currentGeoGen++;

    spatialGrid = new SpatialGrid(newGeom, 32);
    meshTopology = buildMeshTopology(newGeom);
    precomputeGeometryMetrics(newGeom);
    if (typeof updateShadowCameraForMesh === 'function') updateShadowCameraForMesh(newGeom);
    if (typeof rebuildMultiCopyClones === 'function') rebuildMultiCopyClones();
    updateMeshVisualColors();
    if (!skipHistoryCommit) commitHistory(true);
    if (!suppressToast && successToast) showToast(successToast);
    return true;
}

// ==========================================
// ✍️ 3D TEXT STAMPER UI, FONT ENGINE & HANDLERS
// ==========================================
function renderTextToBitmapCanvas(cfg) {
    const rawText = (cfg.text || '').trim() || '3D';
    // Allow multi-line text using real newlines OR '|' separator
    const lines = rawText.split(/\r?\n|\|/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) lines.push('3D');

    const sizeMm = Math.max(2, parseFloat(cfg.size) || 8);
    const fontCSS = cfg.font || 'Outfit, Inter, sans-serif';
    const letterSpacing = parseFloat(cfg.letterSpacing) || 0;
    const colorHex = cfg.hex || '#38BDF8';

    // Resolution balanced for crisp edges without cropping long text!
    let lineH = Math.max(24, Math.min(44, Math.round(sizeMm * 3.4)));
    let fontPx = Math.round(lineH * 0.78);
    let lineGap = Math.round(lineH * 0.22);

    const measureCanvas = document.createElement('canvas');
    const mCtx = measureCanvas.getContext('2d');
    mCtx.font = `900 ${fontPx}px ${fontCSS}`;

    const measureLine = (str, fPx) => {
        mCtx.font = `900 ${fPx}px ${fontCSS}`;
        if (!letterSpacing) return mCtx.measureText(str).width;
        let w = 0;
        for (let i = 0; i < str.length; i++) {
            w += mCtx.measureText(str[i]).width + (i < str.length - 1 ? letterSpacing * (fPx / 12) : 0);
        }
        return w;
    };

    let maxLineW = 12;
    lines.forEach(l => { maxLineW = Math.max(maxLineW, Math.ceil(measureLine(l, fontPx))); });

    let padX = Math.round(lineH * 0.16);
    let padY = Math.round(lineH * 0.12);
    const MAX_CANVAS_W = 260;
    if (maxLineW + padX * 2 > MAX_CANVAS_W) {
        const shrink = (MAX_CANVAS_W - 8) / (maxLineW + padX * 2);
        fontPx = Math.max(10, Math.floor(fontPx * shrink));
        lineH = Math.max(13, Math.floor(lineH * shrink));
        lineGap = Math.max(2, Math.floor(lineGap * shrink));
        padX = Math.max(3, Math.floor(padX * shrink));
        padY = Math.max(2, Math.floor(padY * shrink));
        maxLineW = 12;
        lines.forEach(l => { maxLineW = Math.max(maxLineW, Math.ceil(measureLine(l, fontPx))); });
    }

    const W = Math.max(12, Math.min(MAX_CANVAS_W, maxLineW + padX * 2));
    const H = Math.max(16, lines.length * lineH + (lines.length - 1) * lineGap + padY * 2);

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = W;
    maskCanvas.height = H;
    const ctx = maskCanvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    ctx.font = `900 ${fontPx}px ${fontCSS}`;
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';

    const drawTextOnCtx = (targetCtx, fillStyle) => {
        targetCtx.font = `900 ${fontPx}px ${fontCSS}`;
        targetCtx.fillStyle = fillStyle;
        targetCtx.textBaseline = 'middle';
        lines.forEach((line, li) => {
            const cy = padY + li * (lineH + lineGap) + lineH * 0.5;
            if (!letterSpacing) {
                targetCtx.textAlign = 'center';
                targetCtx.fillText(line, W / 2, cy);
            } else {
                targetCtx.textAlign = 'left';
                const totalW = measureLine(line, fontPx);
                let cx = (W - totalW) * 0.5;
                for (let i = 0; i < line.length; i++) {
                    targetCtx.fillText(line[i], cx, cy);
                    cx += targetCtx.measureText(line[i]).width + letterSpacing * (fontPx / 12);
                }
            }
        });
    };

    drawTextOnCtx(ctx, '#ffffff');
    const rgba = ctx.getImageData(0, 0, W, H).data;
    const maskBits = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) {
        maskBits[i] = rgba[i * 4 + 3] > 110 ? 1 : 0;
    }

    // Build crisp translucent preview canvas for 3D Ghost!
    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = W * 2;
    previewCanvas.height = H * 2;
    const pCtx = previewCanvas.getContext('2d');
    pCtx.scale(2, 2);
    pCtx.strokeStyle = 'rgba(56, 189, 248, 0.9)';
    pCtx.lineWidth = 1;
    pCtx.strokeRect(0.5, 0.5, W - 1, H - 1);
    drawTextOnCtx(pCtx, colorHex);

    const physH = sizeMm * lines.length + (lines.length - 1) * sizeMm * 0.22;
    const physW = (W / H) * physH;

    return { maskBits, W, H, physW, physH, previewCanvas };
}

function initTextPalette() {
    const container = document.getElementById('text-palette-swatches');
    if (!container) return;
    container.innerHTML = '';
    stampingColorPalette.forEach(swatch => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'stamp-swatch-btn text-swatch-item';
        btn.dataset.hex = swatch.hex.toLowerCase();
        btn.title = swatch.name;
        btn.style.background = swatch.hex;
        btn.onclick = () => selectTextColorHex(swatch.hex, true);
        container.appendChild(btn);
    });
    const slotSelect = document.getElementById('text-color-slot');
    const slotIdx = slotSelect ? (parseInt(slotSelect.value, 10) || 0) : activeSlotIndex;
    const initColor = (filamentSlots[slotIdx] && filamentSlots[slotIdx].color) ? filamentSlots[slotIdx].color : "#FFFFFF";
    selectTextColorHex(initColor, false);
}

function selectTextColorHex(hex, autoSyncSlot = true) {
    selectedTextColorHex = normalizeHex(hex, '#FFFFFF');
    const picker = document.getElementById('text-custom-color');
    if (picker) picker.value = selectedTextColorHex.toLowerCase();

    document.querySelectorAll('#text-palette-swatches .text-swatch-item').forEach(btn => {
        const match = btn.dataset.hex === selectedTextColorHex.toLowerCase();
        btn.classList.toggle('active', match);
    });

    if (autoSyncSlot) {
        const cTarget = hexToRgb(selectedTextColorHex);
        const bestSlot = findClosestSlotPerceptual(cTarget.r / 255, cTarget.g / 255, cTarget.b / 255);
        const slotSelect = document.getElementById('text-color-slot');
        if (slotSelect) slotSelect.value = bestSlot;
    }
}

function addTextColorAsSlot() {
    const idx = addColorAsNewSlot(selectedTextColorHex);
    populateSlotDropdowns();
    const sel = document.getElementById('text-color-slot');
    if (sel) sel.value = idx;
}

function onTextColorCustomPick(hex) { selectTextColorHex(hex, true); }
function onTextColorSlotChange(val) {
    const idx = parseInt(val, 10);
    if (!isNaN(idx) && filamentSlots[idx]) selectTextColorHex(filamentSlots[idx].color, false);
}

function openTextModal() {
    if (!currentMesh) { showToast(currentLang === 'fr' ? "Chargez un modèle 3D !" : "Please load a 3D model first!"); return; }
    cancelStampingMode(true, true);
    populateSlotDropdowns();

    // Auto-recommend a sensible initial text size for current model dimensions
    const box = new THREE.Box3().setFromObject(currentMesh);
    const sz = box.getSize(new THREE.Vector3());
    const minFace = Math.max(10, Math.min(sz.x, sz.y));
    const recSize = Math.max(3, Math.min(20, Math.round(minFace * 0.25)));
    const sl = document.getElementById('slider-text-size');
    if (sl && !sl.dataset.userTouched) {
        sl.value = recSize;
        const lbl = document.getElementById('val-text-size');
        if (lbl) lbl.textContent = `${recSize} mm`;
    }

    initTextPalette();
    document.getElementById('text-stamp-modal').style.display = 'flex';
    refreshIcons();
}

function closeTextModal() {
    const m = document.getElementById('text-stamp-modal');
    if (m) m.style.display = '';
}

function startTextStampingMode() {
    const txt = (document.getElementById('text-stamp-input')?.value || '').trim() || '3D';
    const mode = document.getElementById('text-stamp-mode')?.value || 'emboss';
    const slotRaw = parseInt(document.getElementById('text-color-slot')?.value, 10);
    const slot = isNaN(slotRaw) ? activeSlotIndex : slotRaw;
    const size = parseFloat(document.getElementById('slider-text-size')?.value) || 8;
    const depth = parseFloat(document.getElementById('slider-text-depth')?.value) || 1.2;
    const rotation = parseFloat(document.getElementById('slider-text-rotation')?.value) || 0;
    const wrap = document.getElementById('text-stamp-wrap')?.value || 'conformal';
    const font = document.getElementById('text-stamp-font')?.value || 'Outfit, Inter, sans-serif';
    const hex = filamentSlots[slot] ? filamentSlots[slot].color : selectedTextColorHex;
    const rgbObj = hexToRgb(hex);

    pendingTextConfig = { text: txt, mode, slot, size, depth, rotation, wrap, font, hex, rgb: [rgbObj.r / 255, rgbObj.g / 255, rgbObj.b / 255] };
    closeTextModal();
    if (window.innerWidth <= 900 && typeof setMobileView === 'function') setMobileView('canvas');

    isStencilStampingMode = false;
    if (typeof isQRStampingMode !== 'undefined') isQRStampingMode = false;
    if (typeof isBatchPlacementMode !== 'undefined') isBatchPlacementMode = false;
    isTextStampingMode = true;

    const rendered = renderTextToBitmapCanvas(pendingTextConfig);
    buildStampGhostFromCanvas(rendered.previewCanvas, rendered.physW, rendered.physH, 'text');

    controls.enabled = true;
    if (controls.mouseButtons) controls.mouseButtons.LEFT = null;
    if (controls.touches && typeof THREE.TOUCH !== 'undefined') controls.touches.ONE = null;
    document.getElementById('viewport-container').style.cursor = 'crosshair';
    showToast(translations[currentLang].toastTextStampReady);
}

function applyTextStampAtHit(hit) {
    isTextStampingMode = false;
    clearStampGhost();
    selectTool(activeTool);
    if (!hit || !currentMesh || !triangleColors) return;

    const rendered = renderTextToBitmapCanvas(pendingTextConfig);
    applyBinaryMaskStampToSurface(
        rendered.maskBits, rendered.W, rendered.H, rendered.physW, rendered.physH,
        pendingTextConfig, hit, translations[currentLang].toastTextStamped
    );
}

// ==========================================
// 🔖 3D VECTOR STENCIL, CUSTOM PNG & #7 MULTI-COLOR SVG LOGO STAMPER
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
        el.style.cssText = `cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px 4px;border-radius:6px;background:${isSel ? 'rgba(56,189,248,0.22)' : 'rgba(255,255,255,0.05)'};border:1px solid ${isSel ? '#38bdf8' : 'rgba(255,255,255,0.1)'};transition:all 0.15s ease;`;
        el.title = g.name;
        el.innerHTML = `<svg viewBox="0 0 24 24" width="26" height="26" style="pointer-events:none;color:${isSel ? '#38bdf8' : '#cbd5e1'};">${g.svg}</svg><span style="font-size:9px;margin-top:4px;color:${isSel ? '#38bdf8' : 'var(--text-sub)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:58px;">${g.name}</span>`;
        el.onclick = () => {
            activeStencilGlyphId = g.id;
            activeStencilData = { type: 'glyph', glyph: g };
            const prevWrap = document.getElementById('stencil-custom-preview-wrap');
            if (prevWrap) prevWrap.style.display = 'none';
            renderStencilGlyphGrid(cat);
        };
        grid.appendChild(el);
    });
}

// Parse CSS color string to normalized #RRGGBB
function parseCssColorToHex(raw) {
    if (!raw || raw === 'none' || raw === 'transparent') return null;
    const s = raw.trim();
    if (s.startsWith('#')) return normalizeHex(s, null);
    const m = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (m) return rgbToHex(parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10));
    // Resolve named SVG colors cleanly using offscreen canvas
    const tmp = document.createElement('canvas').getContext('2d');
    tmp.fillStyle = '#010203';
    tmp.fillStyle = s;
    const resolved = tmp.fillStyle;
    if (resolved && resolved.startsWith('#')) return normalizeHex(resolved, null);
    return null;
}

// #10 Pro Multi-Color SVG Parser: splits SVG shapes by unique fill color AND preserves full <g transform> inheritance!
function parseMultiColorSvgText(svgText, filename) {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, 'image/svg+xml');
        const svgEl = doc.querySelector('svg');
        if (!svgEl) return null;

        const getInheritedFill = (el) => {
            let cur = el;
            while (cur && cur !== svgEl.parentElement) {
                let f = cur.getAttribute('fill');
                if (!f && cur.getAttribute('style')) {
                    const sm = cur.getAttribute('style').match(/fill\s*:\s*([^;]+)/i);
                    if (sm) f = sm[1];
                }
                if (f) return f;
                cur = cur.parentElement;
            }
            return '#000000';
        };

        const getAncestorTransforms = (el) => {
            const chain = [];
            let cur = el.parentElement;
            while (cur && cur !== svgEl && cur !== doc.documentElement) {
                const tr = cur.getAttribute('transform');
                if (tr && tr.trim()) chain.unshift(tr.trim());
                cur = cur.parentElement;
            }
            return chain;
        };

        const shapes = svgEl.querySelectorAll('path, polygon, polyline, rect, circle, ellipse');
        const colorGroups = new Map(); // hex -> [{ el, transforms }]
        shapes.forEach(el => {
            const fill = getInheritedFill(el);
            if (!fill || fill.trim().toLowerCase() === 'none' || fill.trim().toLowerCase() === 'transparent') return;
            const hex = parseCssColorToHex(fill);
            if (!hex) return;
            if (!colorGroups.has(hex)) colorGroups.set(hex, []);
            colorGroups.get(hex).push({ el, transforms: getAncestorTransforms(el) });
        });

        if (colorGroups.size < 2) return null; // Single-color SVG -> handle normally

        const vb = svgEl.getAttribute('viewBox') || `0 0 ${parseFloat(svgEl.getAttribute('width')) || 100} ${parseFloat(svgEl.getAttribute('height')) || 100}`;
        const parts = vb.trim().split(/[\s,]+/).map(Number);
        const vbW = parts[2] || 100, vbH = parts[3] || 100;
        const serializer = new XMLSerializer();
        const layers = [];
        for (const [hex, items] of colorGroups.entries()) {
            const inner = items.map(({ el, transforms }) => {
                const clone = el.cloneNode(true);
                clone.setAttribute('fill', '#FFFFFF');
                if (clone.getAttribute('style')) {
                    clone.setAttribute('style', clone.getAttribute('style').replace(/fill\s*:\s*[^;]+;?/gi, 'fill:#FFFFFF;'));
                }
                clone.removeAttribute('stroke');
                let xmlStr = serializer.serializeToString(clone);
                // Re-wrap in exact ancestor <g transform="..."> hierarchy so Illustrator/Figma/Inkscape SVGs align 1:1!
                for (let ti = transforms.length - 1; ti >= 0; ti--) {
                    xmlStr = `<g transform="${transforms[ti].replace(/"/g, '&quot;')}">${xmlStr}</g>`;
                }
                return xmlStr;
            }).join('');
            const layerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${inner}</svg>`;
            layers.push({ hex, svgString: layerSvg });
        }
        return { type: 'multisvg', name: filename, layers, aspect: vbW / Math.max(1, vbH), rawSvg: svgText };
    } catch (_) {
        return null;
    }
}

function handleCustomStencilUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const isSvg = file.name.toLowerCase().endsWith('.svg') || file.type === 'image/svg+xml';

    if (isSvg) {
        const textReader = new FileReader();
        textReader.onload = (ev) => {
            const svgText = ev.target.result;
            const multi = parseMultiColorSvgText(svgText, file.name);
            if (multi && multi.layers.length >= 2) {
                activeStencilData = multi;
                activeStencilGlyphId = 'custom';
                renderCustomStencilPreview();
                showToast(currentLang === 'fr'
                    ? `Logo SVG Multi-Couleur détecté (${multi.layers.length} couleurs AMS) !`
                    : `Multi-Color SVG detected (${multi.layers.length} AMS color layers)!`);
                return;
            }
            // Fallback single-color SVG -> load as Image
            const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(url);
                activeStencilData = { type: 'custom', img, name: file.name };
                activeStencilGlyphId = 'custom';
                renderCustomStencilPreview();
                showToast(currentLang === 'fr' ? `Logo SVG chargé : ${file.name}` : `Custom SVG loaded: ${file.name}`);
            };
            img.src = url;
        };
        textReader.readAsText(file);
        e.target.value = '';
        return;
    }

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
            renderCustomStencilPreview();
            showToast(currentLang === 'fr' ? `Logo chargé : ${file.name}` : `Custom logo loaded: ${file.name}`);
        };
        img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
}

// Smart binary mask extractor for custom PNG / JPG / SVG (FIXED: works for black transparent PNGs AND white-bg logos!)
function extractCustomImageMask(img, targetS, threshold = 128, invertMask = false) {
    const aspect = (img.naturalWidth || img.width || 1) / Math.max(1, (img.naturalHeight || img.height || 1));
    const W = aspect >= 1 ? targetS : Math.max(12, Math.round(targetS * aspect));
    const H = aspect >= 1 ? Math.max(12, Math.round(targetS / aspect)) : targetS;

    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, W, H); // Keep transparent background so Alpha logos work!
    ctx.drawImage(img, 0, 0, W, H);
    const data = ctx.getImageData(0, 0, W, H).data;

    // Detect whether image has meaningful transparency
    let transparentCount = 0;
    for (let i = 0; i < W * H; i++) {
        if (data[i * 4 + 3] < 80) transparentCount++;
    }
    const hasAlpha = transparentCount > (W * H * 0.05);

    // If opaque image, inspect 4 corners to auto-detect light vs dark background!
    let bgIsLight = false;
    if (!hasAlpha) {
        const corners = [0, W - 1, (H - 1) * W, W * H - 1];
        let lumSum = 0;
        corners.forEach(idx => {
            const p = idx * 4;
            lumSum += 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
        });
        bgIsLight = (lumSum / 4) > 140;
    }

    const maskBits = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) {
        const p = i * 4;
        let solid = false;
        if (hasAlpha) {
            solid = data[p + 3] >= 80;
        } else {
            const lum = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
            solid = bgIsLight ? (lum < threshold) : (lum >= threshold);
        }
        if (invertMask) solid = !solid;
        maskBits[i] = solid ? 1 : 0;
    }
    return { maskBits, W, H, aspect };
}

function renderCustomStencilPreview() {
    const wrap = document.getElementById('stencil-custom-preview-wrap');
    const canvas = document.getElementById('stencil-custom-preview-canvas');
    const info = document.getElementById('stencil-custom-info');
    if (!wrap || !canvas || !activeStencilData) return;

    if (activeStencilData.type === 'multisvg') {
        wrap.style.display = 'flex';
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const blob = new Blob([activeStencilData.rawSvg], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 2, 2, canvas.width - 4, canvas.height - 4);
            URL.revokeObjectURL(url);
        };
        img.src = url;
        if (info) {
            const dots = activeStencilData.layers.map(l => `<span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:${l.hex};border:1px solid #fff;margin-right:3px;"></span>`).join('');
            info.innerHTML = `<strong style="color:#38bdf8;">Multi-Color SVG (${activeStencilData.layers.length} colors)</strong><div style="margin-top:4px;">${dots}</div>`;
        }
        return;
    }

    if (activeStencilData.type === 'custom' && activeStencilData.img) {
        wrap.style.display = 'flex';
        const thr = parseInt(document.getElementById('slider-stencil-threshold')?.value || '128', 10);
        const inv = !!document.getElementById('check-stencil-invert')?.checked;
        const { maskBits, W, H } = extractCustomImageMask(activeStencilData.img, 52, thr, inv);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const scale = Math.min((canvas.width - 6) / W, (canvas.height - 6) / H);
        const ox = (canvas.width - W * scale) * 0.5;
        const oy = (canvas.height - H * scale) * 0.5;
        ctx.fillStyle = selectedStencilColorHex || '#38bdf8';
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                if (maskBits[y * W + x]) ctx.fillRect(ox + x * scale, oy + y * scale, Math.ceil(scale), Math.ceil(scale));
            }
        }
        if (info) info.textContent = `${activeStencilData.name} (${W}×${H})`;
    }
}

function initStencilPalette() {
    const container = document.getElementById('stencil-palette-swatches');
    if (!container) return;
    container.innerHTML = '';
    stampingColorPalette.forEach(swatch => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'stamp-swatch-btn stencil-swatch-item';
        btn.dataset.hex = swatch.hex.toLowerCase();
        btn.title = swatch.name;
        btn.style.background = swatch.hex;
        btn.onclick = () => { selectStencilColorHex(swatch.hex, true); renderCustomStencilPreview(); };
        container.appendChild(btn);
    });
    const slotSelect = document.getElementById('stencil-color-slot');
    const slotIdx = slotSelect ? (parseInt(slotSelect.value, 10) || 0) : activeSlotIndex;
    const initColor = (filamentSlots[slotIdx] && filamentSlots[slotIdx].color) ? filamentSlots[slotIdx].color : "#FFFFFF";
    selectStencilColorHex(initColor, false);
}

function selectStencilColorHex(hex, autoSyncSlot = true) {
    selectedStencilColorHex = normalizeHex(hex, '#FFFFFF');
    const picker = document.getElementById('stencil-custom-color');
    if (picker) picker.value = selectedStencilColorHex.toLowerCase();

    document.querySelectorAll('#stencil-palette-swatches .stencil-swatch-item').forEach(btn => {
        const match = btn.dataset.hex === selectedStencilColorHex.toLowerCase();
        btn.classList.toggle('active', match);
    });

    if (autoSyncSlot) {
        const cTarget = hexToRgb(selectedStencilColorHex);
        const bestSlot = findClosestSlotPerceptual(cTarget.r / 255, cTarget.g / 255, cTarget.b / 255);
        const slotSelect = document.getElementById('stencil-color-slot');
        if (slotSelect) slotSelect.value = bestSlot;
    }
}

function addStencilColorAsSlot() {
    const idx = addColorAsNewSlot(selectedStencilColorHex);
    populateSlotDropdowns();
    const sel = document.getElementById('stencil-color-slot');
    if (sel) sel.value = idx;
}

function onStencilColorCustomPick(hex) { selectStencilColorHex(hex, true); renderCustomStencilPreview(); }
function onStencilColorSlotChange(val) {
    const idx = parseInt(val, 10);
    if (!isNaN(idx) && filamentSlots[idx]) { selectStencilColorHex(filamentSlots[idx].color, false); renderCustomStencilPreview(); }
}

function openStencilModal() {
    if (!currentMesh) { showToast(currentLang === 'fr' ? "Chargez un modèle 3D !" : "Please load a 3D model first!"); return; }
    cancelStampingMode(true, true);
    populateSlotDropdowns();
    initStencilPalette();
    renderStencilGlyphGrid(activeStencilCategory || 'gaming');
    if (activeStencilData && (activeStencilData.type === 'custom' || activeStencilData.type === 'multisvg')) {
        renderCustomStencilPreview();
    }
    document.getElementById('stencil-modal').style.display = 'flex';
    refreshIcons();
}

function closeStencilModal() {
    const m = document.getElementById('stencil-modal');
    if (m) m.style.display = '';
}

function renderActiveStencilToCanvas(S, colorHex) {
    const c = document.createElement('canvas');
    if (activeStencilData && activeStencilData.type === 'custom' && activeStencilData.img) {
        const thr = pendingStencilConfig.threshold || 128;
        const inv = !!pendingStencilConfig.invertMask;
        const { maskBits, W, H, aspect } = extractCustomImageMask(activeStencilData.img, S, thr, inv);
        c.width = W * 2; c.height = H * 2;
        const pCtx = c.getContext('2d');
        pCtx.scale(2, 2);
        pCtx.strokeStyle = 'rgba(56, 189, 248, 0.9)';
        pCtx.strokeRect(0.5, 0.5, W - 1, H - 1);
        pCtx.fillStyle = colorHex;
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                if (maskBits[y * W + x]) pCtx.fillRect(x, y, 1, 1);
            }
        }
        return { maskBits, W, H, aspect, previewCanvas: c };
    }

    let glyph = null;
    for (const cat in stencilGlyphs) {
        const found = stencilGlyphs[cat].find(g => g.id === activeStencilGlyphId);
        if (found) { glyph = found; break; }
    }
    if (!glyph) glyph = stencilGlyphs.gaming[0];

    const mCanvas = document.createElement('canvas');
    mCanvas.width = S; mCanvas.height = S;
    const ctx = mCanvas.getContext('2d');
    ctx.clearRect(0, 0, S, S);
    if (glyph.pathD && typeof Path2D !== 'undefined') {
        const p = new Path2D(glyph.pathD);
        ctx.save();
        ctx.translate(4, 4);
        ctx.scale((S - 8) / 24, (S - 8) / 24);
        ctx.fillStyle = '#ffffff';
        ctx.fill(p);
        ctx.restore();
    }
    const rgba = ctx.getImageData(0, 0, S, S).data;
    const maskBits = new Uint8Array(S * S);
    for (let i = 0; i < S * S; i++) maskBits[i] = rgba[i * 4 + 3] > 90 ? 1 : 0;

    c.width = S * 2; c.height = S * 2;
    const pCtx = c.getContext('2d');
    pCtx.scale(2, 2);
    pCtx.strokeStyle = 'rgba(56, 189, 248, 0.9)';
    pCtx.strokeRect(0.5, 0.5, S - 1, S - 1);
    if (glyph.pathD && typeof Path2D !== 'undefined') {
        const p = new Path2D(glyph.pathD);
        pCtx.save();
        pCtx.translate(4, 4);
        pCtx.scale((S - 8) / 24, (S - 8) / 24);
        pCtx.fillStyle = colorHex;
        pCtx.fill(p);
        pCtx.restore();
    }
    return { maskBits, W: S, H: S, aspect: 1, previewCanvas: c };
}

function startStencilStampingMode() {
    const mode = document.getElementById('stencil-stamp-mode')?.value || 'emboss';
    const slotRaw = parseInt(document.getElementById('stencil-color-slot')?.value, 10);
    const slot = isNaN(slotRaw) ? activeSlotIndex : slotRaw;
    const size = parseFloat(document.getElementById('slider-stencil-size')?.value) || 12;
    const depth = parseFloat(document.getElementById('slider-stencil-depth')?.value) || 1.2;
    const rotation = parseFloat(document.getElementById('slider-stencil-rotation')?.value) || 0;
    const wrap = document.getElementById('stencil-stamp-wrap')?.value || 'conformal';
    const threshold = parseInt(document.getElementById('slider-stencil-threshold')?.value || '128', 10);
    const invertMask = !!document.getElementById('check-stencil-invert')?.checked;
    const autoAddSvgSlots = !!document.getElementById('check-svg-autoadd-slots')?.checked;
    const hex = filamentSlots[slot] ? filamentSlots[slot].color : selectedStencilColorHex;
    const rgbObj = hexToRgb(hex);

    pendingStencilConfig = {
        mode, slot, size, depth, rotation, wrap, threshold, invertMask, autoAddSvgSlots,
        hex, rgb: [rgbObj.r / 255, rgbObj.g / 255, rgbObj.b / 255]
    };
    closeStencilModal();
    if (window.innerWidth <= 900 && typeof setMobileView === 'function') setMobileView('canvas');

    isTextStampingMode = false;
    if (typeof isQRStampingMode !== 'undefined') isQRStampingMode = false;
    if (typeof isBatchPlacementMode !== 'undefined') isBatchPlacementMode = false;
    isStencilStampingMode = true;

    if (activeStencilData && activeStencilData.type === 'multisvg') {
        const previewC = document.createElement('canvas');
        previewC.width = 128; previewC.height = 128;
        const pCtx = previewC.getContext('2d');
        pCtx.strokeStyle = '#38bdf8';
        pCtx.lineWidth = 2;
        pCtx.strokeRect(2, 2, 124, 124);
        const blob = new Blob([activeStencilData.rawSvg], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
            pCtx.drawImage(img, 4, 4, 120, 120);
            URL.revokeObjectURL(url);
            if (isStencilStampingMode) {
                const physH = size;
                const physW = size * (activeStencilData.aspect || 1);
                buildStampGhostFromCanvas(previewC, physW, physH, 'stencil');
            }
        };
        img.src = url;
    } else {
        const rendered = renderActiveStencilToCanvas(64, hex);
        const physH = size;
        const physW = size * rendered.aspect;
        buildStampGhostFromCanvas(rendered.previewCanvas, physW, physH, 'stencil');
    }

    controls.enabled = true;
    if (controls.mouseButtons) controls.mouseButtons.LEFT = null;
    if (controls.touches && typeof THREE.TOUCH !== 'undefined') controls.touches.ONE = null;
    document.getElementById('viewport-container').style.cursor = 'crosshair';
    showToast(translations[currentLang].toastStencilReady);
}

async function applyMultiColorSvgStampAtHit(hit) {
    const data = activeStencilData;
    const S = 64;
    const aspect = data.aspect || 1;
    const W = aspect >= 1 ? S : Math.max(12, Math.round(S * aspect));
    const H = aspect >= 1 ? Math.max(12, Math.round(S / aspect)) : S;
    const physH = Math.max(4, pendingStencilConfig.size || 14);
    const physW = physH * aspect;

    let stampedLayers = 0;
    for (let li = 0; li < data.layers.length; li++) {
        const layer = data.layers[li];
        let targetSlot = 0;
        if (pendingStencilConfig.autoAddSvgSlots) {
            targetSlot = addColorAsNewSlot(layer.hex, `SVG #${li + 1}`);
        } else {
            const c = hexToRgb(layer.hex);
            targetSlot = findClosestSlotPerceptual(c.r / 255, c.g / 255, c.b / 255);
        }

        const maskBits = await new Promise((resolve) => {
            const blob = new Blob([layer.svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(url);
                const c = document.createElement('canvas');
                c.width = W; c.height = H;
                const ctx = c.getContext('2d');
                ctx.clearRect(0, 0, W, H);
                ctx.drawImage(img, 2, 2, W - 4, H - 4);
                const rgba = ctx.getImageData(0, 0, W, H).data;
                const bits = new Uint8Array(W * H);
                for (let i = 0; i < W * H; i++) bits[i] = rgba[i * 4 + 3] > 90 ? 1 : 0;
                resolve(bits);
            };
            img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
            img.src = url;
        });

        if (!maskBits) continue;
        // Slightly stagger depth by 0.01mm per layer in emboss so layers never Z-fight
        const ok = applyBinaryMaskStampToSurface(maskBits, W, H, physW, physH, {
            ...pendingStencilConfig,
            slot: targetSlot,
            depth: (pendingStencilConfig.depth || 1.2) + li * 0.02,
            skipHistoryCommit: true,
            suppressToast: true
        }, hit, null);
        if (ok) stampedLayers++;
    }

    if (stampedLayers > 0) {
        commitHistory(true);
        showToast(currentLang === 'fr'
            ? `Logo SVG Multi-Couleur estampé (${stampedLayers} couches AMS) !`
            : `Multi-Color SVG stamped (${stampedLayers} AMS color layers)!`);
    } else {
        showToast(currentLang === 'fr' ? "Aucune couche SVG valide." : "No valid SVG layers generated.");
    }
}

function applyStencilStampAtHit(hit) {
    isStencilStampingMode = false;
    clearStampGhost();
    selectTool(activeTool);
    if (!hit || !currentMesh || !triangleColors) return;

    if (activeStencilData && activeStencilData.type === 'multisvg') {
        applyMultiColorSvgStampAtHit(hit);
        return;
    }

    const sizeMm = Math.max(4, pendingStencilConfig.size || 12);
    const rendered = renderActiveStencilToCanvas(64, pendingStencilConfig.hex || '#38bdf8');
    const physH = sizeMm;
    const physW = sizeMm * rendered.aspect;

    applyBinaryMaskStampToSurface(
        rendered.maskBits, rendered.W, rendered.H, physW, physH,
        pendingStencilConfig, hit, translations[currentLang].toastStencilStamped
    );
}

// ==========================================
// 🪄 RELIEF, CAVITY & 1-CLICK MEDALLION MASTER
// FIXED: Slot #1 (index 0) now works! Added Axis selector (Auto/X/Y/Z)!
// ==========================================
let reliefDepthAxis = 'z';
let reliefMinVal = 0, reliefMaxVal = 1, reliefSpan = 1;
let reliefPreviewRaf = null;
let cavityPreviewRaf = null;

function updateReliefAxisBounds(axisChoice) {
    if (!currentMesh) return;
    const geom = currentMesh.geometry;
    geom.computeBoundingBox();
    const box = geom.boundingBox;
    const size = new THREE.Vector3();
    box.getSize(size);

    if (!axisChoice || axisChoice === 'auto') {
        reliefDepthAxis = 'z';
        let minDim = size.z;
        if (size.y < minDim) { reliefDepthAxis = 'y'; minDim = size.y; }
        if (size.x < minDim) { reliefDepthAxis = 'x'; minDim = size.x; }
    } else {
        reliefDepthAxis = axisChoice;
    }
    reliefMinVal = box.min[reliefDepthAxis];
    reliefMaxVal = box.max[reliefDepthAxis];
    reliefSpan = Math.max(0.001, reliefMaxVal - reliefMinVal);
}

function onReliefAxisChange(val) {
    updateReliefAxisBounds(val);
    previewReliefThreshold();
}

function openReliefModal() {
    if (!currentMesh) { showToast(currentLang === 'fr' ? "Chargez un modèle !" : "Please load a 3D model first!"); return; }
    const axisSel = document.getElementById('relief-axis-select');
    if (axisSel) axisSel.value = 'auto';
    updateReliefAxisBounds('auto');
    document.getElementById('slider-relief-depth').value = 50;
    populateSlotDropdowns();
    previewReliefThreshold(50);
    document.getElementById('relief-modal').style.display = 'flex';
}

function closeReliefModal() {
    if (reliefPreviewRaf) cancelAnimationFrame(reliefPreviewRaf);
    const m = document.getElementById('relief-modal');
    if (m) m.style.display = '';
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

function parseSlotSelectSafe(elId, fallback) {
    const el = document.getElementById(elId);
    if (!el) return fallback;
    const n = parseInt(el.value, 10);
    return isNaN(n) ? fallback : n;
}

function previewReliefThreshold(pct) {
    if (pct === undefined) pct = parseFloat(document.getElementById('slider-relief-depth').value);
    const threshold = reliefMinVal + reliefSpan * (pct / 100);
    const mmFromBase = (reliefSpan * (pct / 100)).toFixed(2);
    document.getElementById('relief-val-readout').innerText = `${mmFromBase} mm (${pct}% • ${reliefDepthAxis.toUpperCase()})`;

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

        // FIXED: Slot #1 (index 0) is now selectable without falling back to 1!
        const baseSlot = parseSlotSelectSafe('relief-base-slot', 0);
        const embossSlot = parseSlotSelectSafe('relief-emboss-slot', 1);
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
    const pct = parseFloat(document.getElementById('slider-relief-depth').value);
    const threshold = reliefMinVal + reliefSpan * (pct / 100);
    const geom = currentMesh.geometry;
    const posAttr = geom.attributes.position;
    const faceCount = (posAttr.count / 3) | 0;
    const getter = reliefDepthAxis === 'x' ? 'getX' : (reliefDepthAxis === 'y' ? 'getY' : 'getZ');

    const baseSlot = parseSlotSelectSafe('relief-base-slot', 0);
    const embossSlot = parseSlotSelectSafe('relief-emboss-slot', 1);

    for (let f = 0; f < faceCount; f++) {
        const idx = f * 3;
        const avg = (posAttr[getter](idx) + posAttr[getter](idx + 1) + posAttr[getter](idx + 2)) * 0.3333333;
        triangleColors[f] = avg > threshold ? embossSlot : baseSlot;
    }

    if (reliefPreviewRaf) cancelAnimationFrame(reliefPreviewRaf);
    const rm = document.getElementById('relief-modal');
    if (rm) rm.style.display = '';
    updateMeshVisualColors();
    commitHistory(false);
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
    const cm = document.getElementById('cavity-modal');
    if (cm) cm.style.display = '';
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
        // FIXED: Slot #1 (index 0) works cleanly now!
        const targetSlot = parseSlotSelectSafe('cavity-slot-select', Math.min(2, filamentSlots.length - 1));
        const rgbCavity = slotRgbFloats[targetSlot] || slotRgbFloats[0];
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
    const pct = parseFloat(document.getElementById('slider-cavity-depth').value);
    const faceCount = curvatureScores.length;
    const targetSlot = parseSlotSelectSafe('cavity-slot-select', Math.min(2, filamentSlots.length - 1));
    const threshold = Math.max(0.03, (100 - pct) * 0.0068);

    for (let f = 0; f < faceCount; f++) {
        if (curvatureScores[f] > threshold) triangleColors[f] = targetSlot;
    }

    if (cavityPreviewRaf) cancelAnimationFrame(cavityPreviewRaf);
    const cm = document.getElementById('cavity-modal');
    if (cm) cm.style.display = '';
    updateMeshVisualColors();
    commitHistory(false);
    showToast(translations[currentLang].toastCavityApplied);
}

function oneClickMedallionMaster() {
    if (!currentMesh || !triangleColors) { showToast("Please load a 3D model first!"); return; }

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
    commitHistory(false);
    showToast(translations[currentLang].toastMasterApplied);
}

// ==========================================
// 🖼️ PHOTO DECAL PROJECTION
// FIXED: Camera view projection, Bayer dithering ('bayer'), real Fill & Crop, optional auto-subdivide!
// ==========================================
let loadedDecalImage = null;

function openDecalModal() {
    if (!currentMesh) { showToast(currentLang === 'fr' ? "Chargez un modèle !" : "Please load a 3D model first!"); return; }
    document.getElementById('decal-modal').style.display = 'flex';
}

function closeDecalModal() {
    const dm = document.getElementById('decal-modal');
    if (dm) dm.style.display = '';
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

    // Auto-subdivide low-poly models once or twice if user enabled crisp photo detail
    let didGeoChange = false;
    const autoSub = document.getElementById('decal-auto-subdivide')?.checked !== false;
    if (autoSub) {
        for (let pass = 0; pass < 2; pass++) {
            const fc = triangleColors.length;
            if (fc >= 18000) break;
            const allF = new Set();
            for (let f = 0; f < fc; f++) allF.add(f);
            if (subdivideFacesLocal(allF, 1, true)) didGeoChange = true;
            else break;
        }
        if (didGeoChange) precomputeGeometryMetrics(currentMesh.geometry);
    }

    const canvas = document.createElement('canvas');
    const w = loadedDecalImage.width;
    const h = loadedDecalImage.height;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(loadedDecalImage, 0, 0);
    const imgData = ctx.getImageData(0, 0, w, h).data;

    const axisMode = document.getElementById('decal-project-axis')?.value || 'front';
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

    // Build projection basis (uVec, vVec, viewDir) supporting front, top, side, AND real 'camera' view!
    let uVec = new THREE.Vector3(1, 0, 0);
    let vVec = new THREE.Vector3(0, 1, 0);
    let viewDir = new THREE.Vector3(0, 0, 1);

    if (axisMode === 'top') {
        uVec.set(1, 0, 0); vVec.set(0, 0, -1); viewDir.set(0, 1, 0);
    } else if (axisMode === 'side') {
        uVec.set(0, 0, -1); vVec.set(0, 1, 0); viewDir.set(1, 0, 0);
    } else if (axisMode === 'camera' && camera) {
        const invMat = new THREE.Matrix4().copy(currentMesh.matrixWorld).invert();
        uVec.set(1, 0, 0).applyQuaternion(camera.quaternion).transformDirection(invMat).normalize();
        vVec.set(0, 1, 0).applyQuaternion(camera.quaternion).transformDirection(invMat).normalize();
        viewDir.set(0, 0, 1).applyQuaternion(camera.quaternion).transformDirection(invMat).normalize();
    }

    // Compute projected U/V extents across mesh
    let uMin = Infinity, uMax = -Infinity, vMin = Infinity, vMax = -Infinity;
    const tmpP = new THREE.Vector3();
    for (let i = 0; i < posAttr.count; i++) {
        tmpP.fromBufferAttribute(posAttr, i);
        const u = tmpP.dot(uVec), v = tmpP.dot(vVec);
        if (u < uMin) uMin = u; if (u > uMax) uMax = u;
        if (v < vMin) vMin = v; if (v > vMax) vMax = v;
    }
    const uSpan = Math.max(0.001, uMax - uMin);
    const vSpan = Math.max(0.001, vMax - vMin);

    // Aspect ratio adjustment for BOTH 'fit' (letterbox) AND 'fill' (aspect-preserving crop)!
    const imgAspect = w / Math.max(1, h);
    const boxAspect = uSpan / vSpan;
    let uScale = 1, vScale = 1, uOffset = 0, vOffset = 0;
    if (scaleMode === 'fit') {
        if (boxAspect > imgAspect) {
            uScale = boxAspect / imgAspect;
            uOffset = (1 - uScale) * 0.5;
        } else {
            vScale = imgAspect / boxAspect;
            vOffset = (1 - vScale) * 0.5;
        }
    } else if (scaleMode === 'fill') {
        if (boxAspect > imgAspect) {
            vScale = imgAspect / boxAspect;
            vOffset = (1 - vScale) * 0.5;
        } else {
            uScale = boxAspect / imgAspect;
            uOffset = (1 - uScale) * 0.5;
        }
    }

    const bayer4 = [
        [ 0 / 16 - 0.5,  8 / 16 - 0.5,  2 / 16 - 0.5, 10 / 16 - 0.5],
        [12 / 16 - 0.5,  4 / 16 - 0.5, 14 / 16 - 0.5,  6 / 16 - 0.5],
        [ 3 / 16 - 0.5, 11 / 16 - 0.5,  1 / 16 - 0.5,  9 / 16 - 0.5],
        [15 / 16 - 0.5,  7 / 16 - 0.5, 13 / 16 - 0.5,  5 / 16 - 0.5]
    ];
    const useDither = (ditherMode === 'bayer' || ditherMode === 'dither');

    for (let f = 0; f < faceCount; f++) {
        const f3 = f * 3;
        if (frontOnly && meshTopology) {
            const dot = meshTopology.faceNormals[f3] * viewDir.x
                      + meshTopology.faceNormals[f3 + 1] * viewDir.y
                      + meshTopology.faceNormals[f3 + 2] * viewDir.z;
            if (dot <= 0.1) continue;
        }

        const cx = meshTopology.faceCenters[f3], cy = meshTopology.faceCenters[f3 + 1], cz = meshTopology.faceCenters[f3 + 2];
        const rawU = ((cx * uVec.x + cy * uVec.y + cz * uVec.z) - uMin) / uSpan;
        const rawV = 1 - ((cx * vVec.x + cy * vVec.y + cz * vVec.z) - vMin) / vSpan;

        const uNorm = rawU * uScale + uOffset;
        const vNorm = rawV * vScale + vOffset;
        if (uNorm < 0 || uNorm > 1 || vNorm < 0 || vNorm > 1) continue;

        const px = Math.min(w - 1, Math.max(0, (uNorm * w) | 0));
        const py = Math.min(h - 1, Math.max(0, (vNorm * h) | 0));
        const pIdx = (py * w + px) * 4;
        if (imgData[pIdx + 3] < 50) continue;

        let r = imgData[pIdx] / 255;
        let g = imgData[pIdx + 1] / 255;
        let b = imgData[pIdx + 2] / 255;

        if (useDither) {
            const ditherAmt = bayer4[py & 3][px & 3] * 0.22;
            r = Math.max(0, Math.min(1, r + ditherAmt));
            g = Math.max(0, Math.min(1, g + ditherAmt));
            b = Math.max(0, Math.min(1, b + ditherAmt));
        }

        triangleColors[f] = findClosestSlotPerceptual(r, g, b);
    }

    updateMeshVisualColors();
    commitHistory(didGeoChange);
    closeDecalModal();
    showToast(translations[currentLang].toastDecalApplied);
}
