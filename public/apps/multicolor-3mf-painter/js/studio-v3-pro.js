// =========================================================================
// STUDIOS-PRO MULTICOLOR 3MF PAINTER — V3 PRO SUITE
// #1 AMS Layer-Build Time-Lapse Video (.WEBM 9:16 & 1:1)
// #2 Smart 26-Axis AMS Zero-Waste Auto-Orient Optimizer
// #3 Interactive AMS Flush Matrix (mm³) & Auto-Order
// #4 Virtual Print-Bed Selector & Multi-Copy Plate Waste Saver (1x-9x)
// #5 Shared 256-Spool "My Spool Rack" + PBR Material Finishes
// #6 3D Printability Preflight Inspector (Overhangs, <0.4mm Speckles, Floating)
// #8 Etsy / MakerWorld Cost & Profit Calculator
// #9 Offline Standalone HTML 3D Client Proof & 4K Studio Gallery Mockups
// =========================================================================

function _v3Esc(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function _v3IsFr() {
    return typeof currentLang !== 'undefined' && currentLang === 'fr';
}

// =========================================================================
// #5 SHARED 256-SPOOL COMMERCIAL CATALOG + MY SPOOL RACK + PBR FINISHES
// (100% Shared localStorage Key with Filament Painting Studio!)
// =========================================================================
const V3_SPOOL_RACK_KEY = 'studios_pro_my_spool_rack_v1';

const _V3_CATALOG_RAW = [
    // --- BAMBU LAB PLA BASIC (30) ---
    ['Bambu Lab', 'PLA Basic Black', '#10141c', 0.6],
    ['Bambu Lab', 'PLA Basic Jade White', '#f8fafc', 5.0],
    ['Bambu Lab', 'PLA Basic Gray', '#8b929a', 2.0],
    ['Bambu Lab', 'PLA Basic Light Gray', '#cbd5e1', 3.5],
    ['Bambu Lab', 'PLA Basic Blue Gray', '#5b6778', 3.0],
    ['Bambu Lab', 'PLA Basic Silver', '#a6a9aa', 2.5],
    ['Bambu Lab', 'PLA Basic Red', '#c12e1f', 4.0],
    ['Bambu Lab', 'PLA Basic Maroon Red', '#7b1d26', 2.2],
    ['Bambu Lab', 'PLA Basic Magenta', '#ec008c', 3.0],
    ['Bambu Lab', 'PLA Basic Pink', '#f55a74', 4.5],
    ['Bambu Lab', 'PLA Basic Hot Pink', '#e83e8c', 3.8],
    ['Bambu Lab', 'PLA Basic Orange', '#ff6a13', 5.0],
    ['Bambu Lab', 'PLA Basic Pumpkin Orange', '#ff8c00', 4.8],
    ['Bambu Lab', 'PLA Basic Sunflower Yellow', '#fec600', 6.0],
    ['Bambu Lab', 'PLA Basic Yellow', '#f4ee2a', 6.0],
    ['Bambu Lab', 'PLA Basic Gold', '#e4bd68', 3.5],
    ['Bambu Lab', 'PLA Basic Bronze', '#847d48', 2.0],
    ['Bambu Lab', 'PLA Basic Brown', '#9d432c', 2.0],
    ['Bambu Lab', 'PLA Basic Cocoa Brown', '#6f5034', 1.2],
    ['Bambu Lab', 'PLA Basic Beige', '#f7e6de', 5.5],
    ['Bambu Lab', 'PLA Basic Bambu Green', '#00ae42', 4.0],
    ['Bambu Lab', 'PLA Basic Mistletoe Green', '#3f8e43', 2.5],
    ['Bambu Lab', 'PLA Basic Bright Green', '#86efac', 5.0],
    ['Bambu Lab', 'PLA Basic Turquoise', '#00b1b7', 4.5],
    ['Bambu Lab', 'PLA Basic Cyan', '#0086d6', 4.0],
    ['Bambu Lab', 'PLA Basic Blue', '#0a2989', 4.0],
    ['Bambu Lab', 'PLA Basic Cobalt Blue', '#0056b8', 3.6],
    ['Bambu Lab', 'PLA Basic Indigo Purple', '#482960', 1.8],
    ['Bambu Lab', 'PLA Basic Purple', '#5e43b7', 2.5],
    ['Bambu Lab', 'PLA Basic Lavender', '#b497d6', 4.8],
    // --- BAMBU LAB PLA MATTE (24) ---
    ['Bambu Matte', 'Matte Charcoal', '#0e1116', 0.6],
    ['Bambu Matte', 'Matte Ivory White', '#ffffff', 4.0],
    ['Bambu Matte', 'Matte Ash Gray', '#9b9ea0', 1.5],
    ['Bambu Matte', 'Matte Nardo Gray', '#757575', 1.2],
    ['Bambu Matte', 'Matte Scarlet Red', '#de4343', 3.0],
    ['Bambu Matte', 'Matte Dark Red', '#992222', 1.6],
    ['Bambu Matte', 'Matte Sakura Pink', '#e8afc2', 3.5],
    ['Bambu Matte', 'Matte Mandarin Orange', '#f99963', 3.0],
    ['Bambu Matte', 'Matte Terracotta', '#b15533', 1.8],
    ['Bambu Matte', 'Matte Desert Tan', '#e8dbb7', 3.5],
    ['Bambu Matte', 'Matte Latte Brown', '#d3b7a7', 2.2],
    ['Bambu Matte', 'Matte Dark Brown', '#4d3324', 0.9],
    ['Bambu Matte', 'Matte Lemon Yellow', '#f7d959', 4.0],
    ['Bambu Matte', 'Matte Apple Green', '#c2e189', 3.5],
    ['Bambu Matte', 'Matte Grass Green', '#61c680', 3.0],
    ['Bambu Matte', 'Matte Dark Green', '#2e5d40', 1.2],
    ['Bambu Matte', 'Matte Ice Blue', '#a3d8e1', 3.5],
    ['Bambu Matte', 'Matte Marine Blue', '#0078bf', 2.5],
    ['Bambu Matte', 'Matte Dark Blue', '#042f56', 1.0],
    ['Bambu Matte', 'Matte Midnight Navy', '#162844', 1.0],
    ['Bambu Matte', 'Matte Lilac Purple', '#ae96d4', 3.0],
    ['Bambu Matte', 'Matte Plum', '#6b2d5c', 1.4],
    ['Bambu Matte', 'Matte Bone White', '#ece6d8', 3.8],
    ['Bambu Matte', 'Matte Caramel', '#bc7a44', 2.0],
    // --- BAMBU LAB SILK / METAL / CMYK / PETG (24) ---
    ['Bambu Silk', 'Silk Gold', '#f4a925', 3.5],
    ['Bambu Silk', 'Silk Silver', '#c8ccd0', 2.8],
    ['Bambu Silk', 'Silk Copper', '#b86843', 2.2],
    ['Bambu Silk', 'Silk Rose Gold', '#e09f97', 3.0],
    ['Bambu Silk', 'Silk Candy Red', '#d61c38', 3.2],
    ['Bambu Silk', 'Silk Blue', '#1d66c2', 3.4],
    ['Bambu Silk', 'Silk Green', '#2ca85c', 3.5],
    ['Bambu Silk', 'Silk Purple', '#7b4cc2', 2.6],
    ['Bambu Silk', 'Silk White', '#f5f6f8', 4.5],
    ['Bambu Metal', 'Iridium Gold Metallic', '#b39b84', 1.8],
    ['Bambu Metal', 'Iron Gray Metallic', '#43403d', 0.9],
    ['Bambu Metal', 'Cobalt Blue Metallic', '#39699e', 1.6],
    ['Bambu Metal', 'Oxide Green Metallic', '#1d7c6a', 1.4],
    ['Bambu CMYK', 'CMYK Lithophane Cyan', '#0096d6', 5.5],
    ['Bambu CMYK', 'CMYK Lithophane Magenta', '#e5007d', 5.0],
    ['Bambu CMYK', 'CMYK Lithophane Yellow', '#ffe600', 7.5],
    ['Bambu CMYK', 'CMYK Lithophane White', '#ffffff', 5.0],
    ['Bambu PETG', 'PETG HF Black', '#14171d', 0.8],
    ['Bambu PETG', 'PETG HF White', '#f8fafc', 6.5],
    ['Bambu PETG', 'PETG HF Red', '#c92a2a', 5.5],
    ['Bambu PETG', 'PETG HF Blue', '#1c5db5', 5.0],
    ['Bambu PETG', 'PETG Translucent Clear', '#e2e8f0', 14.0],
    ['Bambu PETG', 'PETG Translucent Teal', '#38bdf8', 11.0],
    ['Bambu PETG', 'PETG Translucent Orange', '#fb923c', 10.5],
    // --- POLYMAKER (42) ---
    ['Polymaker', 'PolyLite Black', '#111111', 0.5],
    ['Polymaker', 'PolyLite White', '#f5f5f5', 5.0],
    ['Polymaker', 'PolyLite Natural', '#ede8dc', 9.5],
    ['Polymaker', 'PolyLite Grey', '#7a8086', 2.0],
    ['Polymaker', 'PolyLite Cold White', '#ffffff', 5.2],
    ['Polymaker', 'PolyLite Warm White', '#fdf5e6', 5.8],
    ['Polymaker', 'PolyLite Red', '#dc2626', 4.2],
    ['Polymaker', 'PolyLite Crimson Red', '#8b1e24', 2.4],
    ['Polymaker', 'PolyLite Magenta', '#db2777', 4.5],
    ['Polymaker', 'PolyLite Pink', '#f472b6', 5.0],
    ['Polymaker', 'PolyLite Orange', '#f97316', 5.5],
    ['Polymaker', 'PolyLite Yellow', '#eab308', 6.5],
    ['Polymaker', 'PolyLite Metallic Gold', '#d4a64a', 2.6],
    ['Polymaker', 'PolyLite Green', '#22c55e', 4.0],
    ['Polymaker', 'PolyLite Lime Green', '#84cc16', 5.5],
    ['Polymaker', 'PolyLite Teal', '#14b8a6', 3.5],
    ['Polymaker', 'PolyLite Cyan', '#06b6d4', 4.8],
    ['Polymaker', 'PolyLite Blue', '#1d4ed8', 3.5],
    ['Polymaker', 'PolyLite Starlight Mercury', '#4b5563', 1.2],
    ['Polymaker', 'PolyLite Purple', '#7c3aed', 2.8],
    ['Polymaker', 'PolyLite Silk Gold', '#eab308', 3.5],
    ['Polymaker', 'PolyLite Silk Silver', '#d1d5db', 2.6],
    ['Polymaker', 'PolyTerra Charcoal Black', '#14171a', 0.4],
    ['Polymaker', 'PolyTerra Cotton White', '#f3f4f6', 3.5],
    ['Polymaker', 'PolyTerra Fossil Grey', '#8d9299', 1.8],
    ['Polymaker', 'PolyTerra Army Red', '#a1302e', 1.5],
    ['Polymaker', 'PolyTerra Lava Red', '#d93829', 2.8],
    ['Polymaker', 'PolyTerra Sunrise Orange', '#f27830', 3.5],
    ['Polymaker', 'PolyTerra Savanna Yellow', '#e8b931', 4.2],
    ['Polymaker', 'PolyTerra Peanut', '#c29263', 2.0],
    ['Polymaker', 'PolyTerra Earth Brown', '#7c4d32', 1.1],
    ['Polymaker', 'PolyTerra Wood Brown', '#a67b5b', 1.6],
    ['Polymaker', 'PolyTerra Forest Green', '#2d6a4f', 1.8],
    ['Polymaker', 'PolyTerra Mint', '#80ed99', 4.2],
    ['Polymaker', 'PolyTerra Army Green', '#546a47', 1.4],
    ['Polymaker', 'PolyTerra Sapphire Blue', '#1e40af', 2.5],
    ['Polymaker', 'PolyTerra Artic Teal', '#4cc9f0', 4.0],
    ['Polymaker', 'PolyTerra Muted Blue', '#577399', 2.0],
    ['Polymaker', 'PolyTerra Lavender Purple', '#9d8df1', 3.2],
    ['Polymaker', 'PolyTerra Pastel Peach', '#f7b29c', 3.8],
    ['Polymaker', 'Panchroma Matte Army Beige', '#c7b89c', 2.4],
    ['Polymaker', 'Panchroma Matte Sakura Pink', '#f2b5c4', 3.6],
    // --- SUNLU (30) ---
    ['Sunlu', 'PLA+ Black', '#0d0f12', 0.5],
    ['Sunlu', 'PLA+ White', '#fafafa', 5.5],
    ['Sunlu', 'PLA+ Grey', '#80848a', 2.2],
    ['Sunlu', 'PLA+ Silver', '#b0b5bc', 2.5],
    ['Sunlu', 'PLA+ Red', '#cc2929', 4.0],
    ['Sunlu', 'PLA+ Cherry Red', '#a61c2e', 3.0],
    ['Sunlu', 'PLA+ Pink', '#f472b6', 5.0],
    ['Sunlu', 'PLA+ Magenta', '#d946ef', 4.2],
    ['Sunlu', 'PLA+ Orange', '#f97316', 5.8],
    ['Sunlu', 'PLA+ Yellow', '#facc15', 7.0],
    ['Sunlu', 'PLA+ Sunny Orange', '#fb923c', 6.0],
    ['Sunlu', 'PLA+ Coffee Brown', '#5c3a21', 1.2],
    ['Sunlu', 'PLA+ Skin Beige', '#e8c4a2', 4.5],
    ['Sunlu', 'PLA+ Green', '#16a34a', 3.8],
    ['Sunlu', 'PLA+ Grass Green', '#4ade80', 5.0],
    ['Sunlu', 'PLA+ Olive Green', '#556b2f', 1.6],
    ['Sunlu', 'PLA+ Cyan', '#06b6d4', 4.8],
    ['Sunlu', 'PLA+ Blue', '#1d4ed8', 3.5],
    ['Sunlu', 'PLA+ Sky Blue', '#38bdf8', 5.2],
    ['Sunlu', 'PLA+ Purple', '#7e22ce', 2.8],
    ['Sunlu', 'PLA Meta Black', '#12151a', 0.6],
    ['Sunlu', 'PLA Meta White', '#f8fafc', 5.0],
    ['Sunlu', 'PLA Meta Cream White', '#f5ecd7', 4.8],
    ['Sunlu', 'PLA Meta Teal', '#0d9488', 3.6],
    ['Sunlu', 'Matte PLA Black', '#141418', 0.5],
    ['Sunlu', 'Matte PLA White', '#f0f0ec', 3.6],
    ['Sunlu', 'Matte PLA Terracotta', '#c45b3b', 2.0],
    ['Sunlu', 'Silk Gold', '#eab308', 3.2],
    ['Sunlu', 'Silk Silver', '#cbd5e1', 2.6],
    ['Sunlu', 'Silk Copper', '#b86f49', 2.1],
    // --- eSUN (28) ---
    ['eSUN', 'PLA+ Black', '#0f0f0f', 0.5],
    ['eSUN', 'PLA+ Cold White', '#ffffff', 5.5],
    ['eSUN', 'PLA+ Warm White', '#f6efe2', 5.2],
    ['eSUN', 'PLA+ Bone White', '#e8e0cf', 4.2],
    ['eSUN', 'PLA+ Grey', '#7e848c', 2.1],
    ['eSUN', 'PLA+ Silver', '#b5bac2', 2.4],
    ['eSUN', 'PLA+ Fire Engine Red', '#b91c1c', 3.5],
    ['eSUN', 'PLA+ Magenta', '#c026d3', 3.8],
    ['eSUN', 'PLA+ Pink', '#f9a8d4', 5.0],
    ['eSUN', 'PLA+ Orange', '#ea580c', 5.5],
    ['eSUN', 'PLA+ Yellow', '#fde047', 6.8],
    ['eSUN', 'PLA+ Gold', '#d9a441', 3.2],
    ['eSUN', 'PLA+ Brown', '#6b4226', 1.3],
    ['eSUN', 'PLA+ Light Brown', '#b5835a', 2.8],
    ['eSUN', 'PLA+ Beige', '#dfc5a4', 4.0],
    ['eSUN', 'PLA+ Peak Green', '#16a34a', 3.8],
    ['eSUN', 'PLA+ Pine Green', '#1e4d36', 1.5],
    ['eSUN', 'PLA+ Olive Green', '#6b7042', 1.8],
    ['eSUN', 'PLA+ Light Blue', '#38bdf8', 5.0],
    ['eSUN', 'PLA+ Blue', '#1e40af', 3.2],
    ['eSUN', 'PLA+ Dark Blue', '#172554', 1.4],
    ['eSUN', 'PLA+ Purple', '#6d28d9', 2.6],
    ['eSUN', 'PLA+ Very Peri', '#6667ab', 3.0],
    ['eSUN', 'ePLA-Matte Deep Black', '#141619', 0.4],
    ['eSUN', 'ePLA-Matte Milky White', '#f4f4f0', 3.5],
    ['eSUN', 'ePLA-Matte Almond Yellow', '#e9d3a3', 3.8],
    ['eSUN', 'ePLA-Matte Mint Green', '#8ad6b4', 3.6],
    ['eSUN', 'eSilk Gold', '#e6ae36', 3.0],
    // --- ELEGOO (22) ---
    ['Elegoo', 'Rapid PLA+ Black', '#101216', 0.5],
    ['Elegoo', 'Rapid PLA+ White', '#f9fafb', 5.2],
    ['Elegoo', 'Rapid PLA+ Grey', '#828890', 2.0],
    ['Elegoo', 'Rapid PLA+ Space Grey', '#4f545c', 1.2],
    ['Elegoo', 'Rapid PLA+ Red', '#c82333', 3.8],
    ['Elegoo', 'Rapid PLA+ Orange', '#f97316', 5.2],
    ['Elegoo', 'Rapid PLA+ Yellow', '#facc15', 6.5],
    ['Elegoo', 'Rapid PLA+ Green', '#16a34a', 3.8],
    ['Elegoo', 'Rapid PLA+ Sea Green', '#2dd4bf', 4.5],
    ['Elegoo', 'Rapid PLA+ Blue', '#2563eb', 3.6],
    ['Elegoo', 'Rapid PLA+ Sky Blue', '#60a5fa', 5.0],
    ['Elegoo', 'Rapid PLA+ Purple', '#7c3aed', 2.8],
    ['Elegoo', 'Rapid PLA+ Pink', '#f472b6', 4.8],
    ['Elegoo', 'Rapid PLA+ Brown', '#6e4730', 1.4],
    ['Elegoo', 'Rapid PLA+ Beige', '#e3cfb4', 4.2],
    ['Elegoo', 'Matte PLA Black', '#14171a', 0.4],
    ['Elegoo', 'Matte PLA White', '#f3f2ed', 3.4],
    ['Elegoo', 'Matte PLA Ruby Red', '#a82936', 2.0],
    ['Elegoo', 'Matte PLA Navy Blue', '#1d3557', 1.2],
    ['Elegoo', 'Matte PLA Sunshine Yellow', '#f4d35e', 4.0],
    ['Elegoo', 'Silk PLA Gold', '#e5b23a', 3.0],
    ['Elegoo', 'Silk PLA Silver', '#cfd4dc', 2.5],
    // --- OVERTURE (22) ---
    ['Overture', 'Matte PLA Black', '#131518', 0.4],
    ['Overture', 'Matte PLA White', '#f5f5f2', 3.5],
    ['Overture', 'Matte PLA Light Gray', '#b8bcc2', 2.2],
    ['Overture', 'Matte PLA Cement Gray', '#7a7e85', 1.5],
    ['Overture', 'Matte PLA Red', '#c93434', 2.6],
    ['Overture', 'Matte PLA Brick Red', '#9c3a32', 1.6],
    ['Overture', 'Matte PLA Pink', '#f3a4b5', 3.8],
    ['Overture', 'Matte PLA Orange', '#ee7a36', 3.5],
    ['Overture', 'Matte PLA Yellow', '#f2cf52', 4.5],
    ['Overture', 'Matte PLA Chocolate', '#593a28', 0.9],
    ['Overture', 'Matte PLA Light Brown', '#b88b61', 2.2],
    ['Overture', 'Matte PLA Grass Green', '#58a85c', 2.8],
    ['Overture', 'Matte PLA Olive Green', '#5d6b47', 1.4],
    ['Overture', 'Matte PLA Army Green', '#3f523a', 1.1],
    ['Overture', 'Matte PLA Light Blue', '#7cc4e8', 3.8],
    ['Overture', 'Matte PLA Blue', '#2458a6', 2.4],
    ['Overture', 'Matte PLA Navy Blue', '#1c2e4a', 1.0],
    ['Overture', 'Matte PLA Purple', '#6d4c9c', 2.2],
    ['Overture', 'PLA Pro White', '#ffffff', 5.0],
    ['Overture', 'PLA Pro Black', '#101010', 0.5],
    ['Overture', 'PLA Pro Red', '#d62828', 4.0],
    ['Overture', 'Silk Gold', '#e0a938', 3.1],
    // --- PRUSAMENT (20) ---
    ['Prusament', 'PLA Jet Black', '#111215', 0.5],
    ['Prusament', 'PLA Galaxy Black', '#1f2228', 0.7],
    ['Prusament', 'PLA Pristine White', '#fafaf8', 5.2],
    ['Prusament', 'PLA Vanilla White', '#f2ead7', 4.8],
    ['Prusament', 'PLA Galaxy Silver', '#9ea3aa', 2.0],
    ['Prusament', 'PLA Lipstick Red', '#c81d25', 3.8],
    ['Prusament', 'PLA Carmine Red', '#9b1c26', 2.4],
    ['Prusament', 'PLA Prusa Orange', '#fa6831', 5.5],
    ['Prusament', 'PLA Pineapple Yellow', '#f7d136', 6.2],
    ['Prusament', 'PLA Oh My Gold', '#c99b3b', 2.8],
    ['Prusament', 'PLA Viva La Bronze', '#8c673c', 1.8],
    ['Prusament', 'PLA Simply Green', '#279b48', 3.6],
    ['Prusament', 'PLA Opal Green', '#207567', 2.5],
    ['Prusament', 'PLA Azure Blue', '#1e78c8', 4.2],
    ['Prusament', 'PLA Royal Blue', '#1a3c8c', 2.4],
    ['Prusament', 'PLA Galaxy Purple', '#4f2c6e', 1.6],
    ['Prusament', 'PLA Mystic Brown', '#5c4033', 1.3],
    ['Prusament', 'PETG Signal White', '#f8fafc', 6.5],
    ['Prusament', 'PETG Prusa Orange', '#ff6600', 7.5],
    ['Prusament', 'PETG Carmine Red Translucent', '#b91c1c', 9.0],
    // --- HATCHBOX / CREALITY / VOXELPLA (24) ---
    ['Hatchbox', 'PLA True Black', '#0f1114', 0.5],
    ['Hatchbox', 'PLA True White', '#f8f9fa', 5.0],
    ['Hatchbox', 'PLA Cool Gray', '#8c929a', 2.2],
    ['Hatchbox', 'PLA True Red', '#cc2229', 3.8],
    ['Hatchbox', 'PLA True Orange', '#f47216', 5.2],
    ['Hatchbox', 'PLA True Yellow', '#f7d417', 6.4],
    ['Hatchbox', 'PLA True Green', '#1a9e49', 3.6],
    ['Hatchbox', 'PLA Mint Green', '#7ad7b0', 4.8],
    ['Hatchbox', 'PLA True Blue', '#1b57b5', 3.4],
    ['Hatchbox', 'PLA Midnight Purple', '#48286b', 1.6],
    ['Hatchbox', 'PLA Brown', '#6e472b', 1.4],
    ['Hatchbox', 'PLA Beige', '#dfcaa8', 4.2],
    ['Hatchbox', 'Matte Terracotta', '#b85c3e', 1.8],
    ['Hatchbox', 'Matte Ash Gray', '#92969c', 1.6],
    ['Creality', 'Hyper PLA Black', '#101216', 0.6],
    ['Creality', 'Hyper PLA White', '#f9fafb', 5.0],
    ['Creality', 'Hyper PLA Red', '#d62828', 4.0],
    ['Creality', 'Hyper PLA Blue', '#1e5bb8', 3.6],
    ['Creality', 'Hyper PLA Yellow', '#f5cb22', 6.2],
    ['Creality', 'Hyper PLA Grey', '#858a92', 2.2],
    ['VoxelPLA', 'PLA Pro Black', '#0e1014', 0.5],
    ['VoxelPLA', 'PLA Pro White', '#f7f8fa', 5.0],
    ['VoxelPLA', 'PLA Pro Red', '#c92a2a', 3.8],
    ['VoxelPLA', 'PLA Pro Blue', '#1c4ed8', 3.5]
];

const V3_COMMERCIAL_CATALOG = _V3_CATALOG_RAW.map((item, idx) => ({
    id: `cat_${idx}_${item[0].toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${item[1].toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    brand: item[0],
    name: `${item[0]} ${item[1]}`,
    shortName: item[1],
    color: item[2],
    hex: item[2],
    td: item[3],
    type: /silk/i.test(item[0] + ' ' + item[1]) ? 'PLA Silk'
        : (/matte|polyterra/i.test(item[0] + ' ' + item[1]) ? 'PLA Matte'
        : (/metal/i.test(item[0] + ' ' + item[1]) ? 'PLA Metallic'
        : (/petg/i.test(item[0] + ' ' + item[1]) ? 'PETG' : 'PLA Basic')))
}));

let v3OwnedSpoolIds = new Set();
let v3CustomSpools = [];
let activePBRFinish = 'auto'; // 'auto' | 'standard' | 'matte' | 'silk' | 'metallic' | 'translucent'

function loadV3SpoolRack() {
    try {
        if (typeof localStorage === 'undefined') return;
        const raw = localStorage.getItem(V3_SPOOL_RACK_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.ownedIds)) {
            v3OwnedSpoolIds = new Set(parsed.ownedIds.map(String));
        }
        if (Array.isArray(parsed.customSpools)) {
            v3CustomSpools = parsed.customSpools.filter(s => s && (s.hex || s.color)).map((s, idx) => {
                const hx = /^#[0-9a-f]{6}$/i.test(String(s.hex || s.color)) ? String(s.hex || s.color) : '#38bdf8';
                return {
                    id: String(s.id || `custom_${Date.now()}_${idx}`),
                    brand: String(s.brand || 'Custom').slice(0, 32),
                    name: String(s.name || 'Custom Spool').slice(0, 48),
                    shortName: String(s.shortName || s.name || 'Custom Spool').slice(0, 40),
                    color: hx,
                    hex: hx,
                    td: parseFloat(s.td) || 2.0,
                    type: String(s.type || 'PLA Basic'),
                    isCustom: true
                };
            });
        }
    } catch (_) {}
}

function saveV3SpoolRack() {
    try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(V3_SPOOL_RACK_KEY, JSON.stringify({
            ownedIds: Array.from(v3OwnedSpoolIds),
            customSpools: v3CustomSpools
        }));
    } catch (_) {}
}

function getAllV3Spools() {
    return [...v3CustomSpools, ...V3_COMMERCIAL_CATALOG];
}

function getOwnedV3Spools() {
    return getAllV3Spools().filter(s => v3OwnedSpoolIds.has(s.id));
}

function getActivePBRParams() {
    if (activePBRFinish === 'matte') return { roughness: 0.84, metalness: 0.02, opacity: 1.0, transparent: false };
    if (activePBRFinish === 'silk') return { roughness: 0.22, metalness: 0.42, opacity: 1.0, transparent: false };
    if (activePBRFinish === 'metallic') return { roughness: 0.30, metalness: 0.68, opacity: 1.0, transparent: false };
    if (activePBRFinish === 'translucent') return { roughness: 0.18, metalness: 0.05, opacity: 0.84, transparent: true };
    if (activePBRFinish === 'standard') return { roughness: 0.42, metalness: 0.08, opacity: 1.0, transparent: false };

    // 'auto': infer from active filamentSlots types
    const types = (typeof filamentSlots !== 'undefined' && Array.isArray(filamentSlots))
        ? filamentSlots.map(s => String(s.type || 'PLA Basic').toLowerCase())
        : [];
    const silkCount = types.filter(t => t.includes('silk')).length;
    const matteCount = types.filter(t => t.includes('matte')).length;
    const metalCount = types.filter(t => t.includes('metal')).length;
    if (metalCount >= Math.max(1, types.length * 0.4)) return { roughness: 0.32, metalness: 0.58, opacity: 1.0, transparent: false };
    if (silkCount >= Math.max(1, types.length * 0.4)) return { roughness: 0.24, metalness: 0.38, opacity: 1.0, transparent: false };
    if (matteCount >= Math.max(1, types.length * 0.5)) return { roughness: 0.78, metalness: 0.02, opacity: 1.0, transparent: false };
    return { roughness: 0.42, metalness: 0.08, opacity: 1.0, transparent: false };
}

function applyActivePBRMaterialToMesh() {
    if (typeof currentMesh === 'undefined' || !currentMesh || !currentMesh.material) return;
    const p = getActivePBRParams();
    currentMesh.material.roughness = p.roughness;
    currentMesh.material.metalness = p.metalness;
    currentMesh.material.opacity = p.opacity;
    currentMesh.material.transparent = p.transparent;
    currentMesh.material.needsUpdate = true;
}

function setActivePBRFinish(mode) {
    activePBRFinish = mode || 'auto';
    const sel = document.getElementById('select-pbr-finish');
    if (sel) sel.value = activePBRFinish;
    applyActivePBRMaterialToMesh();
    showToast(_v3IsFr()
        ? `✨ Finition PBR : ${activePBRFinish.toUpperCase()}`
        : `✨ PBR Filament Finish: ${activePBRFinish.toUpperCase()}`);
}

function openSpoolRackModal() {
    loadV3SpoolRack();
    const modal = document.getElementById('spool-rack-modal');
    if (!modal) return;
    renderSpoolRackList();
    modal.classList.add('open');
    if (typeof refreshIcons === 'function') refreshIcons();
}

function closeSpoolRackModal() {
    const modal = document.getElementById('spool-rack-modal');
    if (modal) modal.classList.remove('open');
}

function renderSpoolRackList() {
    const container = document.getElementById('spool-rack-grid');
    const countEl = document.getElementById('spool-rack-owned-count');
    if (!container) return;
    const q = (document.getElementById('spool-rack-search')?.value || '').trim().toLowerCase();
    const brandFilter = document.getElementById('spool-rack-brand-filter')?.value || 'all';
    const ownedOnly = !!document.getElementById('spool-rack-owned-only')?.checked;

    const all = getAllV3Spools();
    const ownedTotal = all.filter(s => v3OwnedSpoolIds.has(s.id)).length;
    if (countEl) {
        countEl.textContent = _v3IsFr()
            ? `${ownedTotal} bobines possédées • ${all.length} catalogue`
            : `${ownedTotal} owned spools • ${all.length} catalog`;
    }

    const filtered = all.filter(s => {
        if (ownedOnly && !v3OwnedSpoolIds.has(s.id)) return false;
        if (brandFilter !== 'all' && s.brand !== brandFilter) return false;
        if (q && !(s.name.toLowerCase().includes(q) || s.brand.toLowerCase().includes(q) || s.hex.toLowerCase().includes(q))) return false;
        return true;
    }).slice(0, 120);

    if (filtered.length === 0) {
        container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:24px;color:var(--text-dim);font-size:0.8rem;">${_v3IsFr() ? 'Aucune bobine trouvée.' : 'No spools match your filter.'}</div>`;
        return;
    }

    container.innerHTML = filtered.map(s => {
        const owned = v3OwnedSpoolIds.has(s.id);
        return `
            <div class="rack-spool-card ${owned ? 'owned' : ''}">
                <div class="rack-swatch" style="background:${_v3Esc(s.hex)};"></div>
                <div class="rack-info">
                    <div class="rack-name" title="${_v3Esc(s.name)}">${_v3Esc(s.shortName)}</div>
                    <div class="rack-meta">${_v3Esc(s.brand)} • ${_v3Esc(s.type || 'PLA')}</div>
                </div>
                <div class="rack-actions">
                    <button type="button" class="rack-btn ${owned ? 'active' : ''}" onclick="toggleRackSpoolOwned('${_v3Esc(s.id)}')" title="${_v3IsFr() ? 'Je possède cette bobine' : 'Mark as Owned'}">${owned ? '★' : '☆'}</button>
                    <button type="button" class="rack-btn apply" onclick="applyRackSpoolToActiveSlot('${_v3Esc(s.id)}')" title="${_v3IsFr() ? 'Charger dans le slot actif' : 'Load into active AMS slot'}">+</button>
                </div>
            </div>
        `;
    }).join('');
}

function toggleRackSpoolOwned(id) {
    if (v3OwnedSpoolIds.has(id)) v3OwnedSpoolIds.delete(id);
    else v3OwnedSpoolIds.add(id);
    saveV3SpoolRack();
    renderSpoolRackList();
}

function applyRackSpoolToActiveSlot(id) {
    const sp = getAllV3Spools().find(s => s.id === id);
    if (!sp || !Array.isArray(filamentSlots)) return;
    const idx = Math.max(0, Math.min(filamentSlots.length - 1, activeSlotIndex || 0));
    filamentSlots[idx].color = sp.hex.toUpperCase();
    filamentSlots[idx].hex = sp.hex.toUpperCase();
    filamentSlots[idx].name = sp.shortName.slice(0, 32);
    filamentSlots[idx].type = sp.type || 'PLA Basic';
    filamentSlots[idx].brand = sp.brand || 'Generic';
    if (typeof refreshSlotRgbFloats === 'function') refreshSlotRgbFloats();
    if (typeof renderFilamentGrid === 'function') renderFilamentGrid();
    if (typeof updateMeshVisualColors === 'function') updateMeshVisualColors();
    applyActivePBRMaterialToMesh();
    if (typeof commitHistory === 'function') commitHistory(false);
    showToast(_v3IsFr()
        ? `Slot #${idx + 1} ➔ ${sp.name}`
        : `Slot #${idx + 1} ➔ ${sp.name}`);
}

function addCustomRackSpoolUI() {
    const nameEl = document.getElementById('rack-custom-name');
    const brandEl = document.getElementById('rack-custom-brand');
    const hexEl = document.getElementById('rack-custom-hex');
    const typeEl = document.getElementById('rack-custom-type');
    const hex = /^#[0-9a-f]{6}$/i.test((hexEl?.value || '').trim()) ? hexEl.value.trim() : '#38bdf8';
    const brand = (brandEl?.value || 'Custom').trim() || 'Custom';
    const shortName = (nameEl?.value || 'My Filament').trim() || 'My Filament';
    const type = typeEl?.value || 'PLA Basic';

    const entry = {
        id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        brand,
        name: `${brand} ${shortName}`,
        shortName,
        color: hex,
        hex,
        td: 2.5,
        type,
        isCustom: true
    };
    v3CustomSpools.unshift(entry);
    v3OwnedSpoolIds.add(entry.id);
    saveV3SpoolRack();
    if (nameEl) nameEl.value = '';
    renderSpoolRackList();
    showToast(_v3IsFr() ? `Bobine ajoutée : ${entry.name}` : `Custom spool added: ${entry.name}`);
}

function exportMySpoolRackJSON() {
    const payload = JSON.stringify({
        format: 'studios-pro-spool-rack-v1',
        exportedAt: new Date().toISOString(),
        ownedSpools: getOwnedV3Spools(),
        customSpools: v3CustomSpools
    }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    if (typeof downloadBlob === 'function') downloadBlob(blob, 'StudiosPro_MySpoolRack.json', true);
    showToast(_v3IsFr() ? 'Backup My Spool Rack exporté (JSON) !' : 'My Spool Rack backup exported (JSON)!');
}

function importSpoolRackFile(e) {
    const file = e && e.target && e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const raw = String(ev.target.result || '').trim();
            let count = 0;
            if (raw.startsWith('{') || raw.startsWith('[')) {
                const obj = JSON.parse(raw);
                const list = obj.filament_set || obj.filaments || obj.ownedSpools || obj.spools || (Array.isArray(obj) ? obj : []);
                list.forEach((item, idx) => {
                    if (!item || typeof item !== 'object') return;
                    let hex = item.Color || item.color || item.hex || item.Hex || item.hex_color;
                    if (hex && !String(hex).startsWith('#')) hex = '#' + hex;
                    if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return;
                    const brand = String(item.Brand || item.brand || 'Imported').slice(0, 32);
                    const shortName = String(item.shortName || item.Name || item.name || `Spool ${idx + 1}`).slice(0, 40);
                    const entry = {
                        id: `custom_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 5)}`,
                        brand,
                        name: `${brand} ${shortName}`,
                        shortName,
                        color: hex,
                        hex,
                        td: parseFloat(item.td || item.Transmissivity) || 2.0,
                        type: String(item.type || 'PLA Basic'),
                        isCustom: true
                    };
                    v3CustomSpools.unshift(entry);
                    v3OwnedSpoolIds.add(entry.id);
                    count++;
                });
            } else {
                raw.split(/\r?\n/).forEach((line, idx) => {
                    if (idx === 0 && /brand|name|hex/i.test(line)) return;
                    const cols = line.split(/[;,]/).map(c => c.trim().replace(/^"|"$/g, ''));
                    if (cols.length < 3) return;
                    const [brand, shortName, rawHex] = cols.length >= 4 ? cols : ['Imported', cols[0], cols[1]];
                    let hex = rawHex.startsWith('#') ? rawHex : ('#' + rawHex);
                    if (!/^#[0-9a-f]{6}$/i.test(hex)) return;
                    const entry = {
                        id: `custom_${Date.now()}_${idx}`,
                        brand,
                        name: `${brand} ${shortName}`,
                        shortName,
                        color: hex,
                        hex,
                        td: 2.0,
                        type: 'PLA Basic',
                        isCustom: true
                    };
                    v3CustomSpools.unshift(entry);
                    v3OwnedSpoolIds.add(entry.id);
                    count++;
                });
            }
            saveV3SpoolRack();
            renderSpoolRackList();
            showToast(_v3IsFr()
                ? `✅ ${count} bobines importées dans My Spool Rack !`
                : `✅ Imported ${count} spools into My Spool Rack!`);
        } catch (err) {
            console.error(err);
            showToast(_v3IsFr() ? 'Format .hfp/JSON/CSV invalide.' : 'Invalid .hfp / JSON / CSV file.');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

function matchModelToOwnedSpools() {
    const owned = getOwnedV3Spools();
    if (owned.length === 0) {
        showToast(_v3IsFr()
            ? 'Marquez d\'abord vos bobines (★) dans My Spool Rack !'
            : 'Star (★) the spools you own in My Spool Rack first!');
        return;
    }
    const ownedLabs = owned.map(s => {
        const rgb = typeof hexToRgb === 'function' ? hexToRgb(s.hex) : { r: 255, g: 255, b: 255 };
        const lab = typeof srgb01ToLab === 'function' ? srgb01ToLab(rgb.r / 255, rgb.g / 255, rgb.b / 255) : [50, 0, 0];
        return { spool: s, lab };
    });

    const usedOwned = new Set();
    for (let i = 0; i < filamentSlots.length; i++) {
        const rgb = typeof hexToRgb === 'function' ? hexToRgb(filamentSlots[i].color) : { r: 255, g: 255, b: 255 };
        const lab = typeof srgb01ToLab === 'function' ? srgb01ToLab(rgb.r / 255, rgb.g / 255, rgb.b / 255) : [50, 0, 0];

        let best = null, bestD = Infinity;
        for (let k = 0; k < ownedLabs.length; k++) {
            const cand = ownedLabs[k];
            const d = (lab[0] - cand.lab[0]) ** 2 + (lab[1] - cand.lab[1]) ** 2 + (lab[2] - cand.lab[2]) ** 2;
            const penalty = usedOwned.has(cand.spool.id) ? 140 : 0;
            if (d + penalty < bestD) {
                bestD = d + penalty;
                best = cand.spool;
            }
        }
        if (best) {
            usedOwned.add(best.id);
            filamentSlots[i].color = best.hex.toUpperCase();
            filamentSlots[i].hex = best.hex.toUpperCase();
            filamentSlots[i].name = best.shortName.slice(0, 32);
            filamentSlots[i].type = best.type || 'PLA Basic';
            filamentSlots[i].brand = best.brand || 'Generic';
        }
    }

    if (typeof refreshSlotRgbFloats === 'function') refreshSlotRgbFloats();
    if (typeof renderFilamentGrid === 'function') renderFilamentGrid();
    if (typeof updateMeshVisualColors === 'function') updateMeshVisualColors();
    applyActivePBRMaterialToMesh();
    if (typeof commitHistory === 'function') commitHistory(false);
    closeSpoolRackModal();
    showToast(_v3IsFr()
        ? `✅ Modèle adapté à vos ${owned.length} bobines réelles (CIELAB ΔE) !`
        : `✅ Model matched to your ${owned.length} owned spools (CIELAB ΔE)!`);
}

// =========================================================================
// #3 INTERACTIVE AMS FLUSH MATRIX (mm³) & AUTO-ORDER OPTIMIZER
// =========================================================================
let flushMatrixMap = new Map(); // "from_to" -> mm3
let flushMultiplier = 1.0;
let flushIntoInfill = false;

function computeDefaultFlushMm3(fromSlot, toSlot) {
    if (fromSlot === toSlot) return 0;
    const lumF = typeof getSlotLum === 'function' ? getSlotLum(fromSlot) : 0.5;
    const lumT = typeof getSlotLum === 'function' ? getSlotLum(toSlot) : 0.5;
    const cF = new THREE.Color(filamentSlots[fromSlot]?.color || '#888');
    const cT = new THREE.Color(filamentSlots[toSlot]?.color || '#888');
    const dist = Math.hypot(cF.r - cT.r, cF.g - cT.g, cF.b - cT.b);

    let base = 240;
    if (lumF < 0.22 && lumT > 0.72) base = 620;          // Black -> White (max purge!)
    else if (lumF < lumT - 0.35) base = 460;             // Dark -> Light
    else if (cF.r > 0.55 && cF.g < 0.25 && lumT > 0.7) base = 510; // Red -> White/Yellow bleed!
    else if (lumF > 0.72 && lumT < 0.25) base = 160;     // White -> Black (minimal purge!)
    else if (dist < 0.28) base = 150;                    // Similar hues
    else base = Math.round(200 + dist * 160);
    return Math.max(80, Math.min(800, Math.round(base / 10) * 10));
}

function getFlushVolumeMm3(fromSlot, toSlot) {
    if (fromSlot === toSlot) return 0;
    const key = `${fromSlot}_${toSlot}`;
    const raw = flushMatrixMap.has(key) ? flushMatrixMap.get(key) : computeDefaultFlushMm3(fromSlot, toSlot);
    const infillFactor = flushIntoInfill ? 0.65 : 1.0;
    return Math.round(raw * flushMultiplier * infillFactor);
}

function getBambuFlushMatrixFlatArray(slotCount) {
    const n = Math.max(2, slotCount || filamentSlots.length);
    const flat = [];
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            flat.push(String(r === c ? 0 : getFlushVolumeMm3(r, c)));
        }
    }
    return flat;
}

function getFlushSettingsForSlicer() {
    return { multiplier: flushMultiplier, flushIntoInfill };
}

function openFlushMatrixModal() {
    const modal = document.getElementById('flush-matrix-modal');
    if (!modal) return;
    renderFlushMatrixTable();
    modal.classList.add('open');
    if (typeof refreshIcons === 'function') refreshIcons();
}

function closeFlushMatrixModal() {
    const modal = document.getElementById('flush-matrix-modal');
    if (modal) modal.classList.remove('open');
}

function autoCalculateBambuFlushMatrix() {
    flushMatrixMap.clear();
    renderFlushMatrixTable();
    if (typeof updateStats === 'function') updateStats();
    showToast(_v3IsFr() ? 'Matrice de purge Bambu recalculée !' : 'Bambu Lab Flush Matrix auto-calculated!');
}

function setFlushMultiplier(val) {
    flushMultiplier = Math.max(0.4, Math.min(1.5, parseFloat(val) || 1.0));
    const lbl = document.getElementById('val-flush-mult');
    if (lbl) lbl.textContent = `${flushMultiplier.toFixed(2)}×`;
    renderFlushMatrixTable();
    if (typeof updateStats === 'function') updateStats();
}

function toggleFlushIntoInfill(checked) {
    flushIntoInfill = !!checked;
    renderFlushMatrixTable();
    if (typeof updateStats === 'function') updateStats();
}

function updateFlushMatrixCell(fromSlot, toSlot, rawVal) {
    const mm3 = Math.max(0, Math.min(999, parseInt(rawVal, 10) || 0));
    // Store unscaled base so multiplier still works predictably
    const base = Math.round(mm3 / Math.max(0.1, flushMultiplier * (flushIntoInfill ? 0.65 : 1.0)));
    flushMatrixMap.set(`${fromSlot}_${toSlot}`, base);
    if (typeof updateStats === 'function') updateStats();
    const sumEl = document.getElementById('flush-matrix-summary');
    if (sumEl && typeof analyzePrintForAxis === 'function') {
        const rep = analyzePrintForAxis(0, 1, 0, 0.2);
        if (rep) {
            sumEl.textContent = _v3IsFr()
                ? `Purge estimée : ${rep.purgeGrams}g (${rep.totalSwaps} changements AMS)`
                : `Estimated Flush Waste: ${rep.purgeGrams}g (${rep.totalSwaps} AMS swaps)`;
        }
    }
}

function optimizeSlotOrderLightToDark() {
    if (!Array.isArray(filamentSlots) || filamentSlots.length < 2 || !triangleColors) return;
    const order = filamentSlots.map((s, idx) => ({ idx, slot: s, lum: typeof getSlotLum === 'function' ? getSlotLum(idx) : 0.5 }));
    order.sort((a, b) => b.lum - a.lum); // Lightest -> Darkest reduces dark-into-light bleed
    const oldToNew = new Int32Array(filamentSlots.length);
    order.forEach((o, newIdx) => { oldToNew[o.idx] = newIdx; });

    filamentSlots = order.map((o, newIdx) => ({ ...o.slot, id: newIdx + 1 }));
    for (let f = 0; f < triangleColors.length; f++) {
        triangleColors[f] = oldToNew[triangleColors[f]] ?? 0;
    }
    flushMatrixMap.clear();
    activeSlotIndex = oldToNew[activeSlotIndex] ?? 0;
    if (typeof refreshSlotRgbFloats === 'function') refreshSlotRgbFloats();
    if (typeof renderFilamentGrid === 'function') renderFilamentGrid();
    if (typeof updateMeshVisualColors === 'function') updateMeshVisualColors();
    if (typeof commitHistory === 'function') commitHistory(false);
    renderFlushMatrixTable();
    showToast(_v3IsFr()
        ? '✅ Bobines triées Clair ➔ Sombre (purge réduite) !'
        : '✅ Spools sorted Light ➔ Dark to minimize purge bleed!');
}

function renderFlushMatrixTable() {
    const wrap = document.getElementById('flush-matrix-table-wrap');
    const sumEl = document.getElementById('flush-matrix-summary');
    if (!wrap || !Array.isArray(filamentSlots)) return;
    const n = Math.min(8, filamentSlots.length); // Keep grid crisp & readable up to 8 visible slots
    let html = '<table class="flush-table"><thead><tr><th>From \\ To</th>';
    for (let c = 0; c < n; c++) {
        html += `<th><span class="fm-dot" style="background:${_v3Esc(filamentSlots[c].color)}"></span>#${c + 1}</th>`;
    }
    html += '</tr></thead><tbody>';
    for (let r = 0; r < n; r++) {
        html += `<tr><th><span class="fm-dot" style="background:${_v3Esc(filamentSlots[r].color)}"></span>#${r + 1}</th>`;
        for (let c = 0; c < n; c++) {
            if (r === c) {
                html += '<td class="fm-diag">—</td>';
            } else {
                const v = getFlushVolumeMm3(r, c);
                const heatClass = v >= 450 ? 'fm-hot' : (v >= 280 ? 'fm-med' : 'fm-low');
                html += `<td class="${heatClass}"><input type="number" min="0" max="999" step="10" value="${v}" onchange="updateFlushMatrixCell(${r},${c},this.value)"></td>`;
            }
        }
        html += '</tr>';
    }
    html += '</tbody></table>';
    wrap.innerHTML = html;

    if (sumEl && typeof analyzePrintForAxis === 'function') {
        const rep = analyzePrintForAxis(0, 1, 0, 0.2);
        if (rep) {
            sumEl.textContent = _v3IsFr()
                ? `Purge estimée : ${rep.purgeGrams}g (${rep.totalSwaps} changements AMS) • Injectée dans le .3mf`
                : `Estimated Flush Waste: ${rep.purgeGrams}g (${rep.totalSwaps} AMS swaps) • Exported into .3mf`;
        }
    }
}

// =========================================================================
// #4 VIRTUAL PRINT-BED SELECTOR & MULTI-COPY PLATE WASTE SAVER (1×–9×)
// =========================================================================
const PRINT_BED_PRESETS = {
    bambu_a1_mini: { id: 'bambu_a1_mini', label: 'Bambu A1 Mini (180×180)', w: 180, d: 180, h: 180, printerModel: 'Bambu Lab A1 mini' },
    bambu_x1c:     { id: 'bambu_x1c',     label: 'Bambu X1C / P1S / A1 (256×256)', w: 256, d: 256, h: 256, printerModel: 'Bambu Lab X1 Carbon' },
    prusa_mk4:     { id: 'prusa_mk4',     label: 'Prusa MK4 / Core One (250×210)', w: 250, d: 210, h: 220, printerModel: 'Original Prusa MK4' },
    creality_k1max:{ id: 'creality_k1max',label: 'Creality K1 Max / K2 (300×300)', w: 300, d: 300, h: 300, printerModel: 'Creality K1 Max' }
};

let activePrintBedId = 'bambu_x1c';
let multiCopyCount = 1; // 1..9 copies on same plate!
let virtualBedGroup = null;
let multiCopyGroup = null;

function getActivePrintBedDims() {
    return PRINT_BED_PRESETS[activePrintBedId] || PRINT_BED_PRESETS.bambu_x1c;
}

function setPrintBedPreset(presetId) {
    if (!PRINT_BED_PRESETS[presetId]) return;
    activePrintBedId = presetId;
    const sel = document.getElementById('select-print-bed');
    if (sel) sel.value = presetId;
    updateVirtualPrintBedVisual();
    rebuildMultiCopyClones();
    showToast(_v3IsFr()
        ? `🖨️ Plateau : ${PRINT_BED_PRESETS[presetId].label}`
        : `🖨️ Build Plate: ${PRINT_BED_PRESETS[presetId].label}`);
}

function getMultiCopyPlateOffsets() {
    const n = Math.max(1, Math.min(9, parseInt(multiCopyCount, 10) || 1));
    if (n === 1 || !currentMesh || !currentMesh.geometry) return [{ x: 0, y: 0 }];
    currentMesh.geometry.computeBoundingBox();
    const sz = new THREE.Vector3();
    currentMesh.geometry.boundingBox.getSize(sz);
    const gap = 8.0; // 8mm spacing between models on build plate
    const stepX = Math.max(12, sz.x + gap);
    const stepY = Math.max(12, sz.z + gap); // Three.js Z = CAD Y depth

    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    const offsets = [];
    for (let i = 0; i < n; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const ox = (col - (cols - 1) * 0.5) * stepX;
        const oy = (row - (rows - 1) * 0.5) * stepY;
        offsets.push({ x: ox, y: oy });
    }
    return offsets;
}

function updateVirtualPrintBedVisual() {
    if (typeof scene === 'undefined' || !scene) return;
    const bed = getActivePrintBedDims();

    if (virtualBedGroup) {
        virtualBedGroup.traverse(o => {
            if (o.geometry) o.geometry.dispose();
            if (o.material) o.material.dispose();
        });
        scene.remove(virtualBedGroup);
        virtualBedGroup = null;
    }

    // Check if model + multi-copy array exceeds bed dimensions
    let overflow = false;
    if (currentMesh && currentMesh.geometry) {
        currentMesh.geometry.computeBoundingBox();
        const sz = new THREE.Vector3();
        currentMesh.geometry.boundingBox.getSize(sz);
        const offsets = getMultiCopyPlateOffsets();
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        offsets.forEach(o => {
            minX = Math.min(minX, o.x - sz.x * 0.5);
            maxX = Math.max(maxX, o.x + sz.x * 0.5);
            minZ = Math.min(minZ, o.y - sz.z * 0.5);
            maxZ = Math.max(maxZ, o.y + sz.z * 0.5);
        });
        if ((maxX - minX) > bed.w - 2 || (maxZ - minZ) > bed.d - 2 || sz.y > bed.h) {
            overflow = true;
        }
    }

    virtualBedGroup = new THREE.Group();
    const borderCol = overflow ? 0xef4444 : 0x38bdf8;

    // Subtle PEI plate deck slightly below Y=0 so gridHelper sits cleanly on top
    const plateGeo = new THREE.PlaneGeometry(bed.w, bed.d);
    plateGeo.rotateX(-Math.PI / 2);
    const plateMat = new THREE.MeshStandardMaterial({
        color: overflow ? 0x260c14 : 0x0b1220,
        roughness: 0.92,
        metalness: 0.05,
        transparent: true,
        opacity: 0.72
    });
    const plateMesh = new THREE.Mesh(plateGeo, plateMat);
    plateMesh.position.y = -0.18;
    plateMesh.receiveShadow = true;
    virtualBedGroup.add(plateMesh);

    // Crisp outer build plate border
    const hw = bed.w * 0.5, hd = bed.d * 0.5;
    const borderPts = [
        new THREE.Vector3(-hw, -0.05, -hd),
        new THREE.Vector3(hw, -0.05, -hd),
        new THREE.Vector3(hw, -0.05, hd),
        new THREE.Vector3(-hw, -0.05, hd),
        new THREE.Vector3(-hw, -0.05, -hd)
    ];
    const bGeo = new THREE.BufferGeometry().setFromPoints(borderPts);
    const bMat = new THREE.LineBasicMaterial({ color: borderCol, transparent: true, opacity: overflow ? 0.95 : 0.6 });
    virtualBedGroup.add(new THREE.Line(bGeo, bMat));

    // Front purge-line indicator bar
    const purgePts = [
        new THREE.Vector3(-hw * 0.72, -0.02, hd - 6),
        new THREE.Vector3(hw * 0.72, -0.02, hd - 6)
    ];
    const pGeo = new THREE.BufferGeometry().setFromPoints(purgePts);
    const pMat = new THREE.LineBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.55 });
    virtualBedGroup.add(new THREE.Line(pGeo, pMat));

    virtualBedGroup.visible = (typeof isGridVisible !== 'undefined') ? isGridVisible : true;
    scene.add(virtualBedGroup);

    // Hide legacy static bedOutline to prevent double borders
    if (typeof bedOutline !== 'undefined' && bedOutline) bedOutline.visible = false;

    const warnEl = document.getElementById('bed-overflow-badge');
    if (warnEl) {
        warnEl.style.display = overflow ? 'block' : 'none';
        warnEl.textContent = _v3IsFr()
            ? `⚠ Hors plateau (${bed.w}×${bed.d}mm) — cliquez "Ajuster Plateau"`
            : `⚠ Exceeds ${bed.w}×${bed.d}mm bed — click "Fit Bed"`;
    }
}

function fitModelToPrintBed() {
    if (!currentMesh || !currentMesh.geometry) return;
    const bed = getActivePrintBedDims();
    const geom = currentMesh.geometry;
    geom.computeBoundingBox();
    const sz = new THREE.Vector3();
    geom.boundingBox.getSize(sz);
    const n = Math.max(1, multiCopyCount);
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    const maxWPerCopy = (bed.w * 0.90 - (cols - 1) * 8) / cols;
    const maxDPerCopy = (bed.d * 0.90 - (rows - 1) * 8) / rows;
    const scale = Math.min(maxWPerCopy / Math.max(1, sz.x), maxDPerCopy / Math.max(1, sz.z), (bed.h * 0.92) / Math.max(1, sz.y));
    if (scale > 0.05 && Math.abs(scale - 1.0) > 0.01 && typeof scaleModel === 'function') {
        scaleModel(scale);
        updateVirtualPrintBedVisual();
        rebuildMultiCopyClones();
    } else {
        updateVirtualPrintBedVisual();
        rebuildMultiCopyClones();
    }
}

function setMultiCopyCount(n) {
    multiCopyCount = Math.max(1, Math.min(9, parseInt(n, 10) || 1));
    const lbl = document.getElementById('val-multicopy-count');
    if (lbl) lbl.textContent = `${multiCopyCount}×`;
    const sl = document.getElementById('slider-multicopy-count');
    if (sl) sl.value = multiCopyCount;
    rebuildMultiCopyClones();
    updateVirtualPrintBedVisual();
    if (typeof analyzePrintForAxis === 'function') {
        updateMultiCopySavingsUI(analyzePrintForAxis(0, 1, 0, 0.2));
    }
}

function rebuildMultiCopyClones() {
    if (multiCopyGroup && scene) {
        multiCopyGroup.traverse(o => {
            if (o.material) o.material.dispose();
        });
        scene.remove(multiCopyGroup);
        multiCopyGroup = null;
    }
    if (multiCopyCount <= 1 || !currentMesh || !currentMesh.geometry || !scene) return;

    const offsets = getMultiCopyPlateOffsets();
    // Place interactive primary mesh at offset[0] visually or keep primary at origin and place extra copies around it?
    // Keep primary mesh at (0,0,0) so painting raycasts never shift, and offset ghost clones relative to offsets[0]!
    const originOff = offsets[0] || { x: 0, y: 0 };
    multiCopyGroup = new THREE.Group();
    const ghostMat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.45,
        metalness: 0.08,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide
    });

    for (let i = 1; i < offsets.length; i++) {
        const m = new THREE.Mesh(currentMesh.geometry, ghostMat);
        // CAD Y offset maps to Three.js -Z
        m.position.set(offsets[i].x - originOff.x, 0, -(offsets[i].y - originOff.y));
        multiCopyGroup.add(m);
    }
    scene.add(multiCopyGroup);
}

function updateMultiCopySavingsUI(analysis) {
    const el = document.getElementById('multicopy-savings-badge');
    if (!el || !analysis) return;
    if (multiCopyCount <= 1) {
        el.innerHTML = _v3IsFr()
            ? `1 copie • Purge/pièce : <b>${analysis.purgeGrams}g</b>`
            : `1 copy • Purge/unit: <b>${analysis.purgeGrams}g</b>`;
        return;
    }
    const purgePerUnit = +(analysis.purgeGrams / multiCopyCount).toFixed(1);
    const savedPct = Math.round((1 - 1 / multiCopyCount) * 100);
    el.innerHTML = _v3IsFr()
        ? `🔥 <b>${multiCopyCount}× sur le plateau :</b> Purge/pièce <b>${purgePerUnit}g</b> (<span style="color:#34d399;">-${savedPct}% déchet AMS !</span>)`
        : `🔥 <b>${multiCopyCount}× on plate:</b> Purge/unit <b>${purgePerUnit}g</b> (<span style="color:#34d399;">-${savedPct}% AMS waste!</span>)`;
}

// =========================================================================
// #2 SMART 26-AXIS AMS ZERO-WASTE AUTO-ORIENT OPTIMIZER
// =========================================================================
let lastSmartOrientCandidates = [];

function _evaluate26Axes(layerH) {
    if (!currentMesh || !currentMesh.geometry || !triangleColors) return [];
    const geom = currentMesh.geometry;
    const pos = geom.attributes.position.array;
    const triCount = (pos.length / 9) | 0;
    if (!meshTopology || meshTopology.faceCount !== triCount) {
        meshTopology = buildMeshTopology(geom);
    }
    const fn = meshTopology.faceNormals;
    const triAreas = new Float32Array(triCount);
    let totalArea = 0;
    for (let f = 0; f < triCount; f++) {
        const b = f * 9;
        const ax = pos[b + 3] - pos[b], ay = pos[b + 4] - pos[b + 1], az = pos[b + 5] - pos[b + 2];
        const bx = pos[b + 6] - pos[b], by = pos[b + 7] - pos[b + 1], bz = pos[b + 8] - pos[b + 2];
        const a = 0.5 * Math.hypot(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx);
        triAreas[f] = a;
        totalArea += a;
    }

    // Build all 26 unique directions on the unit cube (6 face + 12 edge + 8 corner)
    const dirs = [];
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dz = -1; dz <= 1; dz++) {
                if (dx === 0 && dy === 0 && dz === 0) continue;
                const len = Math.hypot(dx, dy, dz);
                const ux = dx / len, uy = dy / len, uz = dz / len;
                let label = '';
                if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) === 1) {
                    if (dy === 1) label = _v3IsFr() ? '+Y (Actuel)' : '+Y (Current)';
                    else if (dy === -1) label = _v3IsFr() ? '-Y (Retourné)' : '-Y (Upside Down)';
                    else if (dz === 1) label = _v3IsFr() ? '+Z (Face Haut)' : '+Z (Front Up)';
                    else if (dz === -1) label = _v3IsFr() ? '-Z (Dos Haut)' : '-Z (Back Up)';
                    else if (dx === 1) label = _v3IsFr() ? '+X (Droite Haut)' : '+X (Right Up)';
                    else label = _v3IsFr() ? '-X (Gauche Haut)' : '-X (Left Up)';
                } else {
                    const tag = `${dx > 0 ? '+X' : (dx < 0 ? '-X' : '')}${dy > 0 ? '+Y' : (dy < 0 ? '-Y' : '')}${dz > 0 ? '+Z' : (dz < 0 ? '-Z' : '')}`;
                    label = _v3IsFr() ? `Incliné 45° (${tag})` : `Tilted 45° (${tag})`;
                }
                dirs.push({ ux, uy, uz, label, isCardinal: (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) === 1) });
            }
        }
    }

    const results = [];
    const cosOverhang = -Math.cos((50 * Math.PI) / 180); // > 50° downward overhang from vertical

    for (let i = 0; i < dirs.length; i++) {
        const d = dirs[i];
        const rep = analyzePrintForAxis(d.ux, d.uy, d.uz, layerH);
        if (!rep) continue;

        let bedArea = 0;
        let overhangArea = 0;
        const bedBand = rep.minH + 0.55;
        for (let f = 0; f < triCount; f++) {
            const b = f * 9;
            const h0 = pos[b] * d.ux + pos[b + 1] * d.uy + pos[b + 2] * d.uz;
            const h1 = pos[b + 3] * d.ux + pos[b + 4] * d.uy + pos[b + 5] * d.uz;
            const h2 = pos[b + 6] * d.ux + pos[b + 7] * d.uy + pos[b + 8] * d.uz;
            const dot = fn[f * 3] * d.ux + fn[f * 3 + 1] * d.uy + fn[f * 3 + 2] * d.uz;
            if (dot < -0.92 && Math.max(h0, h1, h2) <= bedBand) {
                bedArea += triAreas[f];
            } else if (dot < cosOverhang && Math.min(h0, h1, h2) > bedBand) {
                overhangArea += triAreas[f];
            }
        }

        const bedPct = totalArea > 1e-4 ? (bedArea / totalArea) * 100 : 0;
        const overhangPct = totalArea > 1e-4 ? (overhangArea / totalArea) * 100 : 0;
        results.push({
            ...d,
            swaps: rep.totalSwaps,
            purgeGrams: rep.purgeGrams,
            totalMinutes: rep.totalMinutes,
            bedPct: +bedPct.toFixed(1),
            overhangPct: +overhangPct.toFixed(1)
        });
    }

    if (results.length === 0) return [];
    const maxSwaps = Math.max(1, ...results.map(r => r.swaps));
    const maxPurge = Math.max(1, ...results.map(r => r.purgeGrams));

    results.forEach(r => {
        const swapScore = (1 - r.swaps / maxSwaps) * 45;
        const purgeScore = (1 - r.purgeGrams / maxPurge) * 25;
        const overhangScore = Math.max(0, 1 - r.overhangPct / 35) * 20;
        const bedScore = Math.min(1, r.bedPct / 15) * 10 + (r.isCardinal ? 2 : 0);
        r.score = Math.min(100, Math.round(swapScore + purgeScore + overhangScore + bedScore));
    });

    results.sort((a, b) => b.score - a.score || a.swaps - b.swaps);
    return results;
}

function openSmartOrientModal() {
    if (!currentMesh || !currentMesh.geometry) {
        showToast(t('aiNoModel', 'Load a 3D model first.'));
        return;
    }
    const modal = document.getElementById('smart-orient-modal');
    if (!modal) return;
    modal.classList.add('open');
    runSmart26AxisAutoOrient();
    if (typeof refreshIcons === 'function') refreshIcons();
}

function closeSmartOrientModal() {
    const modal = document.getElementById('smart-orient-modal');
    if (modal) modal.classList.remove('open');
}

function runSmart26AxisAutoOrient() {
    const listEl = document.getElementById('smart-orient-results');
    const summaryEl = document.getElementById('smart-orient-summary');
    if (!listEl) return;
    const layerH = parseFloat(document.getElementById('purge-layer-height')?.value || '0.2') || 0.2;

    const current = analyzePrintForAxis(0, 1, 0, layerH);
    const ranked = _evaluate26Axes(layerH);
    lastSmartOrientCandidates = ranked.slice(0, 5);

    if (!current || lastSmartOrientCandidates.length === 0) return;
    const best = lastSmartOrientCandidates[0];
    const swapsSaved = Math.max(0, current.totalSwaps - best.swaps);
    const gramsSaved = Math.max(0, +(current.purgeGrams - best.purgeGrams).toFixed(1));

    if (summaryEl) {
        summaryEl.innerHTML = _v3IsFr()
            ? `Actuel : <b>${current.totalSwaps} swaps (~${current.purgeGrams}g)</b> ➔ Meilleur (26 axes) : <b style="color:#34d399;">${best.swaps} swaps (~${best.purgeGrams}g)</b> • Économie : <b style="color:#fbbf24;">-${swapsSaved} swaps (-${gramsSaved}g)</b>`
            : `Current: <b>${current.totalSwaps} swaps (~${current.purgeGrams}g)</b> ➔ Best (26-axis): <b style="color:#34d399;">${best.swaps} swaps (~${best.purgeGrams}g)</b> • Savings: <b style="color:#fbbf24;">-${swapsSaved} swaps (-${gramsSaved}g)</b>`;
    }

    listEl.innerHTML = lastSmartOrientCandidates.map((c, idx) => `
        <div class="orient-card ${idx === 0 ? 'best' : ''}">
            <div class="orient-card-main">
                <div class="orient-title">
                    <span class="orient-rank">#${idx + 1}</span>
                    <strong>${_v3Esc(c.label)}</strong>
                    <span class="orient-score">${c.score}/100</span>
                </div>
                <div class="orient-metrics">
                    <span>🔄 <b>${c.swaps}</b> swaps</span>
                    <span>🗑 <b>${c.purgeGrams}g</b></span>
                    <span>📐 ${_v3IsFr() ? 'Porte-à-faux' : 'Overhang'}: <b>${c.overhangPct}%</b></span>
                    <span>🧱 ${_v3IsFr() ? 'Base' : 'Bed'}: <b>${c.bedPct}%</b></span>
                </div>
            </div>
            <button type="button" class="btn-primary" style="padding:6px 12px;font-size:0.74rem;" onclick="applySmartOrientationByIndex(${idx})">
                ${_v3IsFr() ? 'Appliquer' : 'Apply'}
            </button>
        </div>
    `).join('');
}

function applySmartOrientationByIndex(idx = 0) {
    const cand = lastSmartOrientCandidates[idx];
    if (!cand || !currentMesh || !currentMesh.geometry) return;

    const geom = currentMesh.geometry;
    const fromDir = new THREE.Vector3(cand.ux, cand.uy, cand.uz).normalize();
    const targetUp = new THREE.Vector3(0, 1, 0);
    const dot = fromDir.dot(targetUp);
    if (dot < 0.9999) {
        const q = new THREE.Quaternion();
        if (dot < -0.9999) {
            q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
        } else {
            q.setFromUnitVectors(fromDir, targetUp);
        }
        geom.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(q));
        geom.computeVertexNormals();
        if (typeof alignGeometryToBed === 'function') alignGeometryToBed(geom);
        if (geom.disposeBoundsTree) geom.disposeBoundsTree();
        if (geom.computeBoundsTree) geom.computeBoundsTree();
        if (typeof currentGeoGen !== 'undefined') currentGeoGen++;
        spatialGrid = new SpatialGrid(geom, 32);
        meshTopology = buildMeshTopology(geom);
        precomputeGeometryMetrics(geom);
        if (typeof updateShadowCameraForMesh === 'function') updateShadowCameraForMesh(geom);
        updateVirtualPrintBedVisual();
        rebuildMultiCopyClones();
        if (typeof updateMirrorPlaneHelper === 'function') updateMirrorPlaneHelper();
        if (typeof updateStats === 'function') updateStats();
        if (typeof resetCamera === 'function') resetCamera();
        if (typeof commitHistory === 'function') commitHistory(true);
    }
    closeSmartOrientModal();
    showToast(_v3IsFr()
        ? `🧭 Orientation appliquée : ${cand.label} (${cand.swaps} swaps, score ${cand.score}/100) !`
        : `🧭 Orientation applied: ${cand.label} (${cand.swaps} swaps, score ${cand.score}/100)!`);
}

// =========================================================================
// #6 3D PRINTABILITY PREFLIGHT INSPECTOR (OVERHANGS / <0.4mm SPECKLES / FLOATING)
// =========================================================================
let activePreflightMode = 'none'; // 'none' | 'overhang' | 'speckle' | 'floating'
let preflightSubNozzleIslands = [];

function setPreflightMode(mode) {
    const next = (mode === activePreflightMode && mode !== 'none') ? 'none' : (mode || 'none');
    activePreflightMode = next;

    document.querySelectorAll('.preflight-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.mode === activePreflightMode);
    });
    const banner = document.getElementById('preflight-status-box');
    const cleanBtn = document.getElementById('btn-preflight-clean-speckles');
    if (cleanBtn) cleanBtn.style.display = 'none';

    if (!currentMesh || !currentMesh.geometry || !triangleColors) return;

    if (activePreflightMode === 'none') {
        if (banner) banner.style.display = 'none';
        if (typeof updateMeshVisualColors === 'function') updateMeshVisualColors();
        return;
    }

    if (typeof isShowingPurgeHeatmap !== 'undefined') {
        isShowingPurgeHeatmap = false;
        const hBtn = document.getElementById('btn-purge-heatmap');
        if (hBtn) hBtn.classList.remove('active');
    }

    const geom = currentMesh.geometry;
    geom.computeBoundingBox();
    const minY = geom.boundingBox.min.y;
    const pos = geom.attributes.position.array;
    const colAttr = geom.attributes.color;
    const triCount = (pos.length / 9) | 0;
    if (!meshTopology || meshTopology.faceCount !== triCount) {
        meshTopology = buildMeshTopology(geom);
    }
    const fn = meshTopology.faceNormals;
    const adj = meshTopology.faceNeighbors;
    const colArr = colAttr.array;

    const paintFace = (f, r, g, b) => {
        const k = f * 9;
        colArr[k] = r; colArr[k + 1] = g; colArr[k + 2] = b;
        colArr[k + 3] = r; colArr[k + 4] = g; colArr[k + 5] = b;
        colArr[k + 6] = r; colArr[k + 7] = g; colArr[k + 8] = b;
    };

    if (activePreflightMode === 'overhang') {
        let warnCnt = 0, critCnt = 0;
        const cos45 = -Math.cos((45 * Math.PI) / 180); // -0.707
        const cos55 = -Math.cos((55 * Math.PI) / 180); // -0.573 (steep > 55 deg from vertical means ny < -sin(35)?)
        // Wait: overhang angle from horizontal = 90 - angle_from_down.
        // Vertical wall: ny = 0 (0° overhang). 45° overhang: ny = -sin(45°) = -0.707.
        // 55° overhang from vertical: normal tilts further down -> ny < -cos(35°) = -0.819! Wait:
        // Angle from vertical axis Y: cos(theta_v) = -ny (for downward facing). Actually overhang angle alpha from vertical = arcsin(-ny)!
        // At alpha=45° -> -ny = sin(45°) = 0.707. At alpha=55° -> -ny = sin(55°) = 0.819!
        const sin45 = Math.sin((45 * Math.PI) / 180);
        const sin55 = Math.sin((55 * Math.PI) / 180);

        for (let f = 0; f < triCount; f++) {
            const b = f * 9;
            const minFaceY = Math.min(pos[b + 1], pos[b + 4], pos[b + 7]);
            const ny = fn[f * 3 + 1];
            if (minFaceY <= minY + 0.45) {
                paintFace(f, 0.08, 0.72, 0.50); // Flat bed contact = safe emerald
            } else if (-ny >= sin55) {
                paintFace(f, 0.94, 0.25, 0.25); // >55° critical overhang = red
                critCnt++;
            } else if (-ny >= sin45) {
                paintFace(f, 0.96, 0.62, 0.07); // 45–55° caution = amber
                warnCnt++;
            } else {
                paintFace(f, 0.16, 0.56, 0.48); // Safe printable angle
            }
        }
        colAttr.needsUpdate = true;
        if (banner) {
            banner.style.display = 'block';
            banner.innerHTML = _v3IsFr()
                ? `⚠️ <b>Porte-à-faux :</b> <span style="color:#f87171;">${critCnt} faces >55°</span> • <span style="color:#fbbf24;">${warnCnt} faces 45–55°</span>`
                : `⚠️ <b>Overhangs:</b> <span style="color:#f87171;">${critCnt} faces >55°</span> • <span style="color:#fbbf24;">${warnCnt} faces 45–55°</span>`;
        }
    } else if (activePreflightMode === 'speckle') {
        const visited = new Uint8Array(triCount);
        const q = new Int32Array(triCount);
        preflightSubNozzleIslands = [];
        const speckleFlag = new Uint8Array(triCount);
        const nozzleThreshMm = 0.48; // Anything < 0.48mm across cannot be cleanly extruded with 0.4mm nozzle

        for (let start = 0; start < triCount; start++) {
            if (visited[start]) continue;
            const slot = triangleColors[start];
            let head = 0, tail = 0;
            q[tail++] = start;
            visited[start] = 1;
            const tris = [];
            const borderVotes = new Map();
            let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity;

            while (head < tail) {
                const f = q[head++];
                tris.push(f);
                const p = f * 9;
                for (let k = 0; k < 3; k++) {
                    const vx = pos[p + k * 3], vy = pos[p + k * 3 + 1], vz = pos[p + k * 3 + 2];
                    if (vx < x0) x0 = vx; if (vx > x1) x1 = vx;
                    if (vy < y0) y0 = vy; if (vy > y1) y1 = vy;
                    if (vz < z0) z0 = vz; if (vz > z1) z1 = vz;
                }
                const nbs = adj[f];
                for (let i = 0; i < nbs.length; i++) {
                    const nb = nbs[i];
                    if (triangleColors[nb] === slot) {
                        if (!visited[nb]) { visited[nb] = 1; q[tail++] = nb; }
                    } else {
                        borderVotes.set(triangleColors[nb], (borderVotes.get(triangleColors[nb]) || 0) + 1);
                    }
                }
            }

            if (borderVotes.size === 0) continue;
            const diag = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
            if (diag < nozzleThreshMm || (tris.length <= 3 && diag < 1.1)) {
                let domSlot = slot, bestV = -1;
                borderVotes.forEach((cnt, s) => { if (cnt > bestV) { bestV = cnt; domSlot = s; } });
                preflightSubNozzleIslands.push({ tris, domSlot });
                for (let i = 0; i < tris.length; i++) speckleFlag[tris[i]] = 1;
            }
        }

        for (let f = 0; f < triCount; f++) {
            if (speckleFlag[f]) {
                paintFace(f, 0.96, 0.12, 0.78); // Neon Magenta highlight!
            } else {
                const rgb = slotRgbFloats[triangleColors[f]] || [0.5, 0.5, 0.5];
                paintFace(f, rgb[0] * 0.38, rgb[1] * 0.38, rgb[2] * 0.38);
            }
        }
        colAttr.needsUpdate = true;
        if (cleanBtn) cleanBtn.style.display = preflightSubNozzleIslands.length > 0 ? 'flex' : 'none';
        if (banner) {
            banner.style.display = 'block';
            banner.innerHTML = preflightSubNozzleIslands.length > 0
                ? (_v3IsFr()
                    ? `🔍 <b style="color:#f472b6;">${preflightSubNozzleIslands.length} micro-points &lt;0.4mm</b> détectés (trop fins pour buse 0.4mm).`
                    : `🔍 <b style="color:#f472b6;">${preflightSubNozzleIslands.length} sub-nozzle speckles (&lt;0.4mm)</b> detected.`)
                : (_v3IsFr()
                    ? `✅ <span style="color:#34d399;">Aucun micro-point &lt;0.4mm — prêt pour buse 0.4mm !</span>`
                    : `✅ <span style="color:#34d399;">Zero sub-nozzle speckles — 0.4mm nozzle clean!</span>`);
        }
    } else if (activePreflightMode === 'floating') {
        const visited = new Uint8Array(triCount);
        const q = new Int32Array(triCount);
        let shellCount = 0;
        let floatingShells = 0;

        for (let start = 0; start < triCount; start++) {
            if (visited[start]) continue;
            shellCount++;
            let head = 0, tail = 0;
            q[tail++] = start;
            visited[start] = 1;
            const tris = [];
            let compMinY = Infinity;

            while (head < tail) {
                const f = q[head++];
                tris.push(f);
                const p = f * 9;
                const fy = Math.min(pos[p + 1], pos[p + 4], pos[p + 7]);
                if (fy < compMinY) compMinY = fy;
                const nbs = adj[f];
                for (let i = 0; i < nbs.length; i++) {
                    const nb = nbs[i];
                    if (!visited[nb]) { visited[nb] = 1; q[tail++] = nb; }
                }
            }

            const isFloating = compMinY > minY + 0.65;
            if (isFloating) floatingShells++;
            for (let i = 0; i < tris.length; i++) {
                if (isFloating) paintFace(tris[i], 0.95, 0.22, 0.18);
                else paintFace(tris[i], 0.12, 0.72, 0.52);
            }
        }
        colAttr.needsUpdate = true;
        if (banner) {
            banner.style.display = 'block';
            banner.innerHTML = floatingShells > 0
                ? (_v3IsFr()
                    ? `🧩 <b>${shellCount} coques :</b> <span style="color:#f87171;">${floatingShells} pièce(s) flottante(s) détectée(s) !</span>`
                    : `🧩 <b>${shellCount} shells:</b> <span style="color:#f87171;">${floatingShells} floating mid-air part(s) detected!</span>`)
                : (_v3IsFr()
                    ? `✅ <span style="color:#34d399;">${shellCount} coque(s) — 100% posée(s) sur le plateau !</span>`
                    : `✅ <span style="color:#34d399;">${shellCount} shell(s) — 100% grounded on build plate!</span>`);
        }
    }
}

function autoCleanSubNozzleSpeckles() {
    if (!preflightSubNozzleIslands.length || !triangleColors) return;
    let fixedTris = 0;
    preflightSubNozzleIslands.forEach(isl => {
        for (let i = 0; i < isl.tris.length; i++) {
            triangleColors[isl.tris[i]] = isl.domSlot;
            fixedTris++;
        }
    });
    const cleanedIslands = preflightSubNozzleIslands.length;
    preflightSubNozzleIslands = [];
    activePreflightMode = 'none';
    setPreflightMode('none');
    if (typeof commitHistory === 'function') commitHistory(false);
    showToast(_v3IsFr()
        ? `✨ ${cleanedIslands} micro-points (${fixedTris} tris) nettoyés !`
        : `✨ Auto-cleaned ${cleanedIslands} sub-nozzle speckles (${fixedTris} tris)!`);
}

// =========================================================================
// #8 ETSY / MAKERWORLD COST & PROFIT CALCULATOR
// =========================================================================
let lastCostQuoteText = '';

function openCostCalculatorModal() {
    if (!currentMesh || !currentMesh.geometry) {
        showToast(t('aiNoModel', 'Load a 3D model first.'));
        return;
    }
    const modal = document.getElementById('cost-calc-modal');
    if (!modal) return;
    modal.classList.add('open');
    updateCostCalculatorUI();
    if (typeof refreshIcons === 'function') refreshIcons();
}

function closeCostCalculatorModal() {
    const modal = document.getElementById('cost-calc-modal');
    if (modal) modal.classList.remove('open');
}

function updateCostCalculatorUI(cachedAnalysis) {
    const outEl = document.getElementById('cost-calc-output');
    if (!outEl || !currentMesh || !currentMesh.geometry) return;
    const analysis = cachedAnalysis || (typeof analyzePrintForAxis === 'function' ? analyzePrintForAxis(0, 1, 0, 0.2) : null);
    if (!analysis) return;

    const copies = Math.max(1, multiCopyCount || 1);
    const kgPrice = Math.max(5, parseFloat(document.getElementById('cost-filament-kg')?.value || '24') || 24);
    const kwhPrice = Math.max(0, parseFloat(document.getElementById('cost-elec-kwh')?.value || '0.18') || 0.18);
    const watts = Math.max(20, parseFloat(document.getElementById('cost-printer-watts')?.value || '120') || 120);
    const packCost = Math.max(0, parseFloat(document.getElementById('cost-packaging')?.value || '2.00') || 2.00);
    const feePct = Math.max(0, Math.min(45, parseFloat(document.getElementById('cost-etsy-fee')?.value || '12') || 12));
    const marginMult = Math.max(1.2, parseFloat(document.getElementById('cost-markup')?.value || '3.0') || 3.0);

    const primeTowerG = analysis.usedSlots.length > 1 ? Math.max(6, +(analysis.spanMm * 0.22).toFixed(1)) : 0;
    const totalPlateModelG = analysis.partGrams * copies;
    const totalPlateWasteG = analysis.purgeGrams + primeTowerG;
    const totalPlateG = totalPlateModelG + totalPlateWasteG;
    const gramsPerUnit = totalPlateG / copies;

    const totalHours = ((analysis.partGrams * 1.8 * copies) + (analysis.totalSwaps * 1.35)) / 60;
    const filamentCostPerUnit = (gramsPerUnit / 1000) * kgPrice;
    const elecCostPerUnit = ((totalHours * (watts / 1000)) * kwhPrice) / copies;
    const unitProdCost = filamentCostPerUnit + elecCostPerUnit + packCost;
    const recommendedRetail = Math.max(unitProdCost * marginMult, (unitProdCost + 2.5) / Math.max(0.2, 1 - feePct / 100));
    const platformFee = recommendedRetail * (feePct / 100);
    const netProfit = recommendedRetail - unitProdCost - platformFee;
    const plateProfit = netProfit * copies;

    const isFr = _v3IsFr();
    outEl.innerHTML = `
        <div class="cost-kpi-grid">
            <div class="cost-kpi">
                <span>${isFr ? 'Coût / Pièce' : 'Unit Cost'}</span>
                <strong>$${unitProdCost.toFixed(2)}</strong>
                <small>${gramsPerUnit.toFixed(1)}g (${copies}× plate)</small>
            </div>
            <div class="cost-kpi highlight">
                <span>${isFr ? 'Prix Conseillé' : 'Retail Price'}</span>
                <strong>$${recommendedRetail.toFixed(2)}</strong>
                <small>${isFr ? `Frais ${feePct}% : -$${platformFee.toFixed(2)}` : `${feePct}% fee: -$${platformFee.toFixed(2)}`}</small>
            </div>
            <div class="cost-kpi profit">
                <span>${isFr ? 'Profit Net / Pièce' : 'Net Profit / Unit'}</span>
                <strong>+$${netProfit.toFixed(2)}</strong>
                <small>${isFr ? `Plateau (${copies}×) : +$${plateProfit.toFixed(2)}` : `Full plate (${copies}×): +$${plateProfit.toFixed(2)}`}</small>
            </div>
        </div>
        <div class="cost-breakdown">
            <div><span>${isFr ? 'Filament modèle' : 'Model filament'} (${copies}×)</span><b>${totalPlateModelG.toFixed(1)} g</b></div>
            <div><span>${isFr ? 'Purge AMS + Tour' : 'AMS Purge + Prime Tower'}</span><b>${totalPlateWasteG.toFixed(1)} g (${(totalPlateWasteG / copies).toFixed(1)}g/u)</b></div>
            <div><span>${isFr ? 'Temps plateau estimé' : 'Est. plate print time'}</span><b>${totalHours.toFixed(1)} h</b></div>
            <div><span>${isFr ? 'Électricité + Emballage / u' : 'Power + Packaging / u'}</span><b>$${(elecCostPerUnit + packCost).toFixed(2)}</b></div>
        </div>
    `;

    lastCostQuoteText = isFr
        ? `Devis Impression 3D Multi-Couleurs (${currentModelTitle || 'Modèle'})\n• Couleurs AMS : ${analysis.usedSlots.length} bobines\n• Quantité plateau : ${copies}× | Poids/pièce : ${gramsPerUnit.toFixed(1)}g\n• Coût de production : $${unitProdCost.toFixed(2)}/u\n• Prix de vente conseillé : $${recommendedRetail.toFixed(2)}/u (Profit net : +$${netProfit.toFixed(2)}/u)`
        : `Multi-Color 3D Print Quote (${currentModelTitle || 'Model'})\n• AMS Colors: ${analysis.usedSlots.length} spools\n• Plate Batch: ${copies}× | Weight/unit: ${gramsPerUnit.toFixed(1)}g\n• Production Cost: $${unitProdCost.toFixed(2)}/unit\n• Recommended Retail: $${recommendedRetail.toFixed(2)}/unit (Net Profit: +$${netProfit.toFixed(2)}/unit)`;
}

function copyCostQuote() {
    if (!lastCostQuoteText) updateCostCalculatorUI();
    const fallback = () => {
        const ta = document.createElement('textarea');
        ta.value = lastCostQuoteText;
        ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (_) {}
        document.body.removeChild(ta);
        showToast(_v3IsFr() ? '📋 Devis copié dans le presse-papiers !' : '📋 Quote copied to clipboard!');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(lastCostQuoteText)
            .then(() => showToast(_v3IsFr() ? '📋 Devis copié dans le presse-papiers !' : '📋 Quote copied to clipboard!'))
            .catch(fallback);
    } else {
        fallback();
    }
}

// =========================================================================
// #1 AMS LAYER-BUILD & FILAMENT-ARRANGEMENT TIME-LAPSE VIDEO (.WEBM, FREE!)
// Shows Layer-by-Layer Z Build + Glowing Active AMS Spool Bar + Z-Timeline + 360° Spin!
// =========================================================================
let isRecordingTimelapse = false;

function openTimelapseModal() {
    if (!currentMesh || !currentMesh.geometry || !triangleColors) {
        showToast(t('aiNoModel', 'Load a 3D model first.'));
        return;
    }
    const modal = document.getElementById('timelapse-modal');
    if (!modal) return;
    const infoEl = document.getElementById('timelapse-preview-stats');
    const analysis = typeof analyzePrintForAxis === 'function' ? analyzePrintForAxis(0, 1, 0, 0.2) : null;
    if (infoEl && analysis) {
        infoEl.innerHTML = _v3IsFr()
            ? `<b>${analysis.layerCount} couches</b> • <b>${analysis.usedSlots.length} bobines AMS</b> • <b>${analysis.totalSwaps} changements</b> • Durée vidéo : <b>7.5s</b>`
            : `<b>${analysis.layerCount} layers</b> • <b>${analysis.usedSlots.length} AMS spools</b> • <b>${analysis.totalSwaps} swaps</b> • Video duration: <b>7.5s</b>`;
    }
    modal.classList.add('open');
    if (typeof refreshIcons === 'function') refreshIcons();
}

function closeTimelapseModal() {
    const modal = document.getElementById('timelapse-modal');
    if (modal) modal.classList.remove('open');
}

function _drawSpoolIcon(ctx, cx, cy, r, hex, isActive, slotNum, nameStr, gramsStr) {
    ctx.save();
    if (isActive) {
        ctx.shadowColor = hex;
        ctx.shadowBlur = 18;
    }
    // Outer spool flange
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = isActive ? '#0f172a' : 'rgba(15,23,42,0.72)';
    ctx.fill();
    ctx.lineWidth = isActive ? 3.5 : 1.5;
    ctx.strokeStyle = isActive ? '#38bdf8' : 'rgba(148,163,184,0.35)';
    ctx.stroke();

    // Filament winding coil ring
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
    ctx.fillStyle = hex;
    ctx.fill();

    // Center hub hole
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.30, 0, Math.PI * 2);
    ctx.fillStyle = '#090d1a';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.stroke();

    // Slot badge number
    ctx.fillStyle = '#f8fafc';
    ctx.font = `800 ${Math.round(r * 0.42)}px Outfit, Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`#${slotNum}`, cx, cy + 0.5);

    // Active green LED dot
    if (isActive) {
        ctx.beginPath();
        ctx.arc(cx + r * 0.72, cy - r * 0.72, Math.max(4, r * 0.16), 0, Math.PI * 2);
        ctx.fillStyle = '#10b981';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
    }

    // Label below spool
    ctx.fillStyle = isActive ? '#f8fafc' : '#94a3b8';
    ctx.font = `700 ${Math.max(10, Math.round(r * 0.36))}px Inter, sans-serif`;
    ctx.fillText(String(nameStr || '').slice(0, 12), cx, cy + r + 15);
    if (gramsStr) {
        ctx.fillStyle = isActive ? '#38bdf8' : '#64748b';
        ctx.font = `600 ${Math.max(9, Math.round(r * 0.30))}px Inter, sans-serif`;
        ctx.fillText(gramsStr, cx, cy + r + 29);
    }
    ctx.restore();
}

function recordAMSLayerBuildTimelapse(aspect = '9:16') {
    if (isRecordingTimelapse) return;
    if (!renderer || !scene || !camera || !controls || !currentMesh || !triangleColors) {
        showToast(t('aiNoModel', 'Load a 3D model first.'));
        return;
    }
    if (typeof MediaRecorder === 'undefined') {
        showToast(_v3IsFr()
            ? 'Enregistrement vidéo non supporté par ce navigateur.'
            : 'Video recording is not supported in this browser.');
        return;
    }

    isRecordingTimelapse = true;
    const isPortrait = (aspect === '9:16');
    const outW = isPortrait ? 720 : 960;
    const outH = isPortrait ? 1280 : 960;

    const compCanvas = document.createElement('canvas');
    compCanvas.width = outW;
    compCanvas.height = outH;
    const ctx = compCanvas.getContext('2d');

    const analysis = analyzePrintForAxis(0, 1, 0, 0.2);
    if (!analysis) { isRecordingTimelapse = false; return; }

    // Save viewport state so user's view & slice are 100% restored afterward!
    const prevCamPos = camera.position.clone();
    const prevTarget = controls.target.clone();
    const prevControlsEnabled = controls.enabled;
    const prevClipPlanes = currentMesh.material.clippingPlanes;
    const prevLocalClip = renderer.localClippingEnabled;
    const prevRingVis = typeof brushHelperRing !== 'undefined' && brushHelperRing ? brushHelperRing.visible : false;
    const prevHeatmap = typeof isShowingPurgeHeatmap !== 'undefined' && isShowingPurgeHeatmap;
    const prevPreflight = activePreflightMode;

    if (prevHeatmap || prevPreflight !== 'none') {
        if (typeof updateMeshVisualColors === 'function') updateMeshVisualColors();
    }
    if (typeof brushHelperRing !== 'undefined' && brushHelperRing) brushHelperRing.visible = false;
    controls.enabled = false;
    renderer.localClippingEnabled = true;

    currentMesh.geometry.computeBoundingBox();
    const box = currentMesh.geometry.boundingBox;
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z, 12);
    const fov = camera.fov * (Math.PI / 180);
    const camDist = Math.max(24, (maxDim / 2) / Math.tan(fov / 2) * 1.75);

    // Glowing cyan build-plane laser ring tracking active print Z-height!
    const ringRadius = Math.max(size.x, size.z) * 0.62 + 2.5;
    const scanGeo = new THREE.RingGeometry(ringRadius * 0.94, ringRadius, 48);
    scanGeo.rotateX(-Math.PI / 2);
    const scanMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
        depthTest: false
    });
    const scanRing = new THREE.Mesh(scanGeo, scanMat);
    scanRing.position.set(center.x, box.min.y, center.z);
    scene.add(scanRing);

    const tlPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), box.min.y + 0.1);
    currentMesh.material.clippingPlanes = [tlPlane];
    currentMesh.material.side = THREE.DoubleSide;
    currentMesh.material.needsUpdate = true;

    // Precompute used spools metadata
    const usedSlots = analysis.usedSlots.length > 0 ? analysis.usedSlots.slice(0, 8) : [0];
    const totalA = Math.max(1e-4, analysis.totalArea || 1);
    const usedSlotInfos = usedSlots.map(s => {
        const g = +(analysis.partGrams * ((analysis.slotArea[s] || 0) / totalA)).toFixed(1);
        return {
            idx: s,
            id: (filamentSlots[s]?.id) || (s + 1),
            hex: filamentSlots[s]?.color || '#ffffff',
            name: filamentSlots[s]?.name || `Slot #${s + 1}`,
            grams: `${g}g`
        };
    });

    const isPro = (typeof window.isStudiosProPremium === 'function') && window.isStudiosProPremium();
    const progressEl = document.getElementById('timelapse-progress-bar');
    const statusEl = document.getElementById('timelapse-status-text');

    let stream = null;
    try {
        stream = compCanvas.captureStream(30);
        const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
            ? 'video/webm;codecs=vp9'
            : (MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : '');
        const recorder = mime
            ? new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4500000 })
            : new MediaRecorder(stream);
        const chunks = [];
        recorder.ondataavailable = (ev) => { if (ev.data && ev.data.size > 0) chunks.push(ev.data); };

        const cleanup = () => {
            isRecordingTimelapse = false;
            scene.remove(scanRing);
            scanGeo.dispose();
            scanMat.dispose();
            currentMesh.material.clippingPlanes = prevClipPlanes;
            currentMesh.material.needsUpdate = true;
            renderer.localClippingEnabled = prevLocalClip;
            camera.position.copy(prevCamPos);
            controls.target.copy(prevTarget);
            controls.enabled = prevControlsEnabled;
            controls.update();
            if (typeof brushHelperRing !== 'undefined' && brushHelperRing) brushHelperRing.visible = prevRingVis;
            if (prevHeatmap && typeof togglePurgeHeatmap === 'function') {
                isShowingPurgeHeatmap = false; togglePurgeHeatmap();
            } else if (prevPreflight !== 'none') {
                const m = prevPreflight; activePreflightMode = 'none'; setPreflightMode(m);
            }
            if (stream) stream.getTracks().forEach(tr => tr.stop());
            if (progressEl) progressEl.style.width = '0%';
            if (statusEl) statusEl.textContent = '';
        };

        recorder.onerror = () => {
            cleanup();
            showToast(_v3IsFr() ? 'Erreur lors de la capture Time-Lapse.' : 'Time-Lapse capture error.');
        };

        recorder.onstop = () => {
            cleanup();
            const blob = new Blob(chunks, { type: mime || 'video/webm' });
            const tag = isPortrait ? '9x16_Reels' : '1x1_Square';
            downloadBlob(blob, `StudiosPro_AMS_Timelapse_${tag}.webm`, true); // 100% FREE!
            closeTimelapseModal();
            showToast(_v3IsFr()
                ? `🎬 Vidéo Time-Lapse AMS (${aspect}) téléchargée !`
                : `🎬 AMS Layer-Build Time-Lapse (${aspect}) downloaded!`);
        };

        showToast(_v3IsFr()
            ? `🎬 Enregistrement Time-Lapse AMS (${aspect}, 7.5s)...`
            : `🎬 Recording AMS Layer-Build Time-Lapse (${aspect}, 7.5s)...`);
        recorder.start();

        const durationMs = 7500;
        const buildPhaseEnd = 0.66; // 0..66% = Z layer-by-layer build; 66..100% = full 360° hero spin!
        const startTime = performance.now();

        function renderFrame(now) {
            const elapsed = now - startTime;
            const p = Math.min(1, elapsed / durationMs);

            if (progressEl) progressEl.style.width = `${Math.round(p * 100)}%`;
            if (statusEl) {
                statusEl.textContent = _v3IsFr()
                    ? `Rendu en cours... ${Math.round(p * 100)}%`
                    : `Rendering video... ${Math.round(p * 100)}%`;
            }

            let layerFrac = 1.0;
            let orbitAngle = 0;
            if (p <= buildPhaseEnd) {
                layerFrac = Math.max(0.02, p / buildPhaseEnd);
                orbitAngle = layerFrac * Math.PI * 0.75; // Smooth slow orbit during print build
                const curY = box.min.y + size.y * layerFrac;
                tlPlane.constant = curY + 0.05;
                currentMesh.material.clippingPlanes = [tlPlane];
                scanRing.visible = true;
                scanRing.position.y = curY;
            } else {
                const spinP = (p - buildPhaseEnd) / (1 - buildPhaseEnd);
                orbitAngle = Math.PI * 0.75 + spinP * Math.PI * 2.0;
                currentMesh.material.clippingPlanes = null;
                scanRing.visible = false;
            }

            // Orbit camera smoothly around model center
            camera.position.set(
                center.x + Math.sin(orbitAngle + 0.65) * camDist,
                center.y + camDist * 0.38,
                center.z + Math.cos(orbitAngle + 0.65) * camDist
            );
            camera.lookAt(center);
            renderer.render(scene, camera);

            // --- COMPOSITE STUDIO FRAME ---
            const bgGrad = ctx.createLinearGradient(0, 0, 0, outH);
            bgGrad.addColorStop(0, '#040814');
            bgGrad.addColorStop(0.5, '#0b152a');
            bgGrad.addColorStop(1, '#050a16');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, outW, outH);

            // Stage region for 3D render
            const topBarH = isPortrait ? 148 : 112;
            const botBarH = isPortrait ? 260 : 210;
            const stageW = outW - 76;
            const stageH = outH - topBarH - botBarH;
            const stageX = 16;
            const stageY = topBarH;

            // Draw cropped WebGL viewport centered cleanly inside stage with rounded clip
            ctx.save();
            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(stageX, stageY, stageW, stageH, 20) : ctx.rect(stageX, stageY, stageW, stageH);
            ctx.clip();

            const srcCanvas = renderer.domElement;
            const srcAspect = srcCanvas.width / Math.max(1, srcCanvas.height);
            const dstAspect = stageW / Math.max(1, stageH);
            let drawW = stageW, drawH = stageH, dx = stageX, dy = stageY;
            if (srcAspect > dstAspect) {
                drawH = stageH;
                drawW = stageH * srcAspect;
                dx = stageX + (stageW - drawW) * 0.5;
            } else {
                drawW = stageW;
                drawH = stageW / srcAspect;
                dy = stageY + (stageH - drawH) * 0.5;
            }
            ctx.drawImage(srcCanvas, dx, dy, drawW, drawH);
            ctx.restore();

            // Subtle stage frame border
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
            ctx.lineWidth = 2;
            ctx.strokeRect(stageX, stageY, stageW, stageH);

            // Current layer stats
            const curLayerIdx = Math.max(0, Math.min(analysis.layerCount - 1, Math.floor(layerFrac * (analysis.layerCount - 1))));
            const curLayerNum = curLayerIdx + 1;
            const curMm = (size.y * layerFrac).toFixed(1);
            const curMask = (p <= buildPhaseEnd && analysis.layerSlotMasks)
                ? analysis.layerSlotMasks[curLayerIdx]
                : ((1 << usedSlots.length) - 1);
            const swapsSoFar = Math.round(analysis.totalSwaps * layerFrac);

            // TOP HEADER HUD
            ctx.fillStyle = '#38bdf8';
            ctx.font = `800 ${isPortrait ? 18 : 16}px Outfit, Inter, sans-serif`;
            ctx.textAlign = 'left';
            ctx.fillText('BAMBU AMS • LAYER-BY-LAYER BUILD', 24, 38);

            ctx.fillStyle = '#f8fafc';
            ctx.font = `900 ${isPortrait ? 34 : 28}px Outfit, Inter, sans-serif`;
            ctx.fillText(
                p <= buildPhaseEnd
                    ? `Layer ${curLayerNum} / ${analysis.layerCount}  •  Z ${curMm} mm`
                    : (_v3IsFr() ? '✨ MODÈLE TERMINÉ — 360°' : '✨ PRINT COMPLETE — 360°'),
                24, isPortrait ? 82 : 74
            );

            ctx.fillStyle = '#94a3b8';
            ctx.font = `600 ${isPortrait ? 16 : 14}px Inter, sans-serif`;
            ctx.fillText(
                `${usedSlotInfos.length} ${_v3IsFr() ? 'Bobines' : 'Spools'}  •  ${swapsSoFar}/${analysis.totalSwaps} AMS Swaps  •  ${analysis.partGrams}g + ${analysis.purgeGrams}g Purge`,
                24, isPortrait ? 116 : 100
            );

            // RIGHT-SIDE VERTICAL FILAMENT Z-TIMELINE BAR
            const barX = outW - 44;
            const barY = stageY + 12;
            const barW = 24;
            const barH = stageH - 24;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
            ctx.fillRect(barX, barY, barW, barH);
            const segs = Math.min(80, analysis.layerCount);
            for (let s = 0; s < segs; s++) {
                const lIdx = Math.floor((s / segs) * analysis.layerCount);
                const mask = analysis.layerSlotMasks ? analysis.layerSlotMasks[lIdx] : 1;
                const activeInLayer = [];
                for (let k = 0; k < filamentSlots.length && k < 16; k++) {
                    if ((mask & (1 << k)) !== 0) activeInLayer.push(filamentSlots[k].color || '#ffffff');
                }
                if (activeInLayer.length === 0) activeInLayer.push('#334155');
                const sy = barY + barH - ((s + 1) / segs) * barH;
                const sh = Math.ceil(barH / segs) + 1;
                const sw = barW / activeInLayer.length;
                activeInLayer.forEach((col, ci) => {
                    ctx.fillStyle = col;
                    ctx.fillRect(barX + ci * sw, sy, sw + 0.5, sh);
                });
            }
            ctx.strokeStyle = 'rgba(255,255,255,0.22)';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(barX, barY, barW, barH);

            // Current Z playhead marker on Z-Timeline
            const playY = barY + barH - layerFrac * barH;
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.moveTo(barX - 10, playY);
            ctx.lineTo(barX - 1, playY - 6);
            ctx.lineTo(barX - 1, playY + 6);
            ctx.closePath();
            ctx.fill();

            // BOTTOM LIVE AMS SPOOL ARRANGEMENT RACK
            const rackY = outH - botBarH + 14;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.fillRect(16, rackY, outW - 32, botBarH - 54);
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(16, rackY, outW - 32, botBarH - 54);

            ctx.fillStyle = '#94a3b8';
            ctx.font = `700 13px Outfit, Inter, sans-serif`;
            ctx.textAlign = 'left';
            ctx.fillText(
                _v3IsFr() ? 'ARRANGEMENT DES BOBINES AMS ACTIVES SUR CETTE COUCHE' : 'LIVE AMS FILAMENT SPOOL ARRANGEMENT ON ACTIVE LAYER',
                30, rackY + 24
            );

            const nSpools = usedSlotInfos.length;
            const rackInnerW = outW - 64;
            const slotSpacing = rackInnerW / Math.max(1, nSpools);
            const spoolR = Math.min(isPortrait ? 36 : 32, Math.max(18, slotSpacing * 0.33));
            const spoolCY = rackY + (botBarH - 54) * 0.50;

            usedSlotInfos.forEach((sp, i) => {
                const cx = 32 + slotSpacing * (i + 0.5);
                const isActive = (p > buildPhaseEnd) || ((curMask & (1 << Math.min(30, sp.idx))) !== 0);
                _drawSpoolIcon(ctx, cx, spoolCY, spoolR, sp.hex, isActive, sp.id, sp.name, sp.grams);
            });

            // Footer progress bar + watermark on Free plan
            const footY = outH - 22;
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            ctx.fillRect(16, footY - 10, outW - 32, 4);
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(16, footY - 10, (outW - 32) * p, 4);

            if (!isPro) {
                ctx.fillStyle = 'rgba(224, 242, 254, 0.85)';
                ctx.font = '700 13px Outfit, Inter, sans-serif';
                ctx.textAlign = 'right';
                ctx.fillText('STUDIOS-PRO.COM • MultiColor 3MF Painter', outW - 20, outH - 2);
            }

            if (elapsed >= durationMs) {
                if (recorder.state !== 'inactive') recorder.stop();
                return;
            }
            requestAnimationFrame(renderFrame);
        }
        requestAnimationFrame(renderFrame);
    } catch (err) {
        console.error('Time-lapse capture error:', err);
        isRecordingTimelapse = false;
        scene.remove(scanRing);
        scanGeo.dispose();
        scanMat.dispose();
        currentMesh.material.clippingPlanes = prevClipPlanes;
        renderer.localClippingEnabled = prevLocalClip;
        controls.enabled = prevControlsEnabled;
        if (stream) stream.getTracks().forEach(tr => tr.stop());
        showToast(_v3IsFr() ? 'Impossible de démarrer la vidéo Time-Lapse.' : 'Failed to start Time-Lapse video.');
    }
}

// =========================================================================
// #9 INTERACTIVE STANDALONE OFFLINE HTML 3D CLIENT PROOF & 4K STUDIO MOCKUPS
// =========================================================================
function exportStandaloneHTML3D() {
    if (!currentMesh || !currentMesh.geometry || !triangleColors) {
        showToast(t('aiNoModel', 'Load a 3D model first.'));
        return;
    }

    // Simplify gracefully if model > 16k tris so offline HTML stays fast (<1.5MB) & 60 FPS on phones!
    let posArr = currentMesh.geometry.attributes.position.array;
    let colArr = triangleColors;
    const origTris = colArr.length;
    if (origTris > 14000 && typeof vertexClusterSimplify === 'function') {
        const sim = vertexClusterSimplify(posArr, 12000, colArr, true);
        if (sim && sim.wasOptimized && sim.triCount > 0) {
            posArr = sim.positions;
            colArr = sim.colors || new Uint8Array(sim.triCount);
        }
    }

    currentMesh.geometry.computeBoundingBox();
    const box = currentMesh.geometry.boundingBox;
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    const scaleNorm = 1.0 / Math.max(size.x, size.y, size.z, 1);

    const triCount = (posArr.length / 9) | 0;
    const compactTris = [];
    for (let f = 0; f < triCount; f++) {
        const b = f * 9;
        compactTris.push([
            +((posArr[b] - center.x) * scaleNorm).toFixed(4),
            +((posArr[b + 1] - center.y) * scaleNorm).toFixed(4),
            +((posArr[b + 2] - center.z) * scaleNorm).toFixed(4),
            +((posArr[b + 3] - center.x) * scaleNorm).toFixed(4),
            +((posArr[b + 4] - center.y) * scaleNorm).toFixed(4),
            +((posArr[b + 5] - center.z) * scaleNorm).toFixed(4),
            +((posArr[b + 6] - center.x) * scaleNorm).toFixed(4),
            +((posArr[b + 7] - center.y) * scaleNorm).toFixed(4),
            +((posArr[b + 8] - center.z) * scaleNorm).toFixed(4),
            colArr[f] || 0
        ]);
    }

    const analysis = typeof analyzePrintForAxis === 'function' ? analyzePrintForAxis(0, 1, 0, 0.2) : null;
    const safeTitle = _v3Esc(typeof currentModelTitle !== 'undefined' ? currentModelTitle : 'Studios-Pro 3D Proof');
    const paletteJson = JSON.stringify(filamentSlots.map(s => ({
        name: String(s.name || 'Filament').slice(0, 32),
        color: s.color || '#ffffff',
        type: s.type || 'PLA'
    }))).replace(/</g, '\\u003c');
    const trisJson = JSON.stringify(compactTris);
    const dimsStr = `${size.x.toFixed(1)} × ${size.y.toFixed(1)} × ${size.z.toFixed(1)} mm`;
    const metaSummary = analysis
        ? `${dimsStr} • ${analysis.usedSlots.length} AMS Spools • ~${analysis.totalGrams}g (${analysis.totalSwaps} swaps)`
        : dimsStr;

    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${safeTitle} — Interactive 3D Client Proof</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:radial-gradient(circle at 50% 35%,#13203d,#050914 78%);color:#f8fafc;font-family:system-ui,-apple-system,sans-serif;height:100vh;overflow:hidden;display:flex;flex-direction:column}
header{padding:12px 20px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,255,255,0.08);background:rgba(5,9,20,0.85)}
h1{font-size:1rem;font-weight:800;letter-spacing:0.3px}
.sub{font-size:0.76rem;color:#94a3b8;margin-top:2px}
.controls{display:flex;gap:8px;align-items:center}
button{background:rgba(56,189,248,0.16);border:1px solid rgba(56,189,248,0.45);color:#e0f2fe;padding:6px 12px;border-radius:8px;font-weight:700;font-size:0.75rem;cursor:pointer}
button:hover{background:rgba(56,189,248,0.3)}
#stage{flex:1;width:100%;cursor:grab;touch-action:none}
#stage:active{cursor:grabbing}
footer{padding:10px 18px;background:rgba(5,9,20,0.9);border-top:1px solid rgba(255,255,255,0.08);display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between}
.swatches{display:flex;flex-wrap:wrap;gap:6px}
.chip{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:99px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);font-size:0.72rem}
.dot{width:11px;height:11px;border-radius:50%;border:1px solid rgba(255,255,255,0.5)}
</style></head>
<body>
<header>
  <div><h1>${safeTitle}</h1><div class="sub">${_v3Esc(metaSummary)}</div></div>
  <div class="controls">
    <button id="btnSpin">Auto-Spin: ON</button>
    <button id="btnReset">Reset View</button>
  </div>
</header>
<canvas id="stage"></canvas>
<footer>
  <div class="swatches" id="swatchBar"></div>
  <div style="font-size:0.72rem;color:#64748b">Drag to rotate • Scroll to zoom • Offline 3D Proof by Studios-Pro.com</div>
</footer>
<script>
const PALETTE=${paletteJson};
const TRIS=${trisJson};
const sb=document.getElementById('swatchBar');
PALETTE.forEach((s,i)=>{const d=document.createElement('span');d.className='chip';const dot=document.createElement('span');dot.className='dot';dot.style.background=s.color;d.appendChild(dot);d.appendChild(document.createTextNode('#'+(i+1)+' '+s.name));sb.appendChild(d);});
const PAL_RGB=PALETTE.map(s=>{const h=s.color.replace('#','');return[parseInt(h.slice(0,2),16)||200,parseInt(h.slice(2,4),16)||200,parseInt(h.slice(4,6),16)||200];});
const cv=document.getElementById('stage'),ctx=cv.getContext('2d');
let rx=-0.38,ry=0.65,zoom=1.35,spin=true,drag=false,lx=0,ly=0;
function resize(){cv.width=cv.clientWidth*devicePixelRatio;cv.height=cv.clientHeight*devicePixelRatio;}
window.addEventListener('resize',resize);resize();
cv.addEventListener('pointerdown',e=>{drag=true;spin=false;document.getElementById('btnSpin').textContent='Auto-Spin: OFF';lx=e.clientX;ly=e.clientY;cv.setPointerCapture(e.pointerId);});
cv.addEventListener('pointermove',e=>{if(!drag)return;ry+=(e.clientX-lx)*0.008;rx=Math.max(-1.45,Math.min(1.45,rx+(e.clientY-ly)*0.008));lx=e.clientX;ly=e.clientY;});
cv.addEventListener('pointerup',()=>{drag=false;});
cv.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(0.5,Math.min(3.5,zoom*(e.deltaY>0?0.92:1.08)));},{passive:false});
document.getElementById('btnSpin').onclick=()=>{spin=!spin;document.getElementById('btnSpin').textContent='Auto-Spin: '+(spin?'ON':'OFF');};
document.getElementById('btnReset').onclick=()=>{rx=-0.38;ry=0.65;zoom=1.35;};
function draw(){
  if(spin)ry+=0.008;
  const W=cv.width,H=cv.height,cx=W/2,cy=H/2,sc=Math.min(W,H)*0.48*zoom;
  ctx.clearRect(0,0,W,H);
  const cyA=Math.cos(ry),syA=Math.sin(ry),cxA=Math.cos(rx),sxA=Math.sin(rx);
  const proj=[];
  for(let i=0;i<TRIS.length;i++){
    const t=TRIS[i];
    const p=[];
    let zSum=0;
    for(let k=0;k<3;k++){
      const x0=t[k*3],y0=t[k*3+1],z0=t[k*3+2];
      const x1=x0*cyA+z0*syA,z1=-x0*syA+z0*cyA;
      const y2=y0*cxA-z1*sxA,z2=y0*sxA+z1*cxA;
      const persp=2.6/(2.6-z2);
      p.push([cx+x1*sc*persp,cy-y2*sc*persp,z2,x1,y2]);
      zSum+=z2;
    }
    const ux=p[1][3]-p[0][3],uy=p[1][4]-p[0][4],uz=p[1][2]-p[0][2];
    const vx=p[2][3]-p[0][3],vy=p[2][4]-p[0][4],vz=p[2][2]-p[0][2];
    let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
    if(nz<0)continue;
    const nl=Math.hypot(nx,ny,nz)||1;nx/=nl;ny/=nl;nz/=nl;
    const light=0.34+0.66*Math.max(0,nx*0.42+ny*0.62+nz*0.66);
    proj.push({z:zSum,p,c:PAL_RGB[t[9]]||PAL_RGB[0],l:light});
  }
  proj.sort((a,b)=>a.z-b.z);
  for(let i=0;i<proj.length;i++){
    const q=proj[i],r=Math.min(255,(q.c[0]*q.l)|0),g=Math.min(255,(q.c[1]*q.l)|0),b=Math.min(255,(q.c[2]*q.l)|0);
    ctx.fillStyle='rgb('+r+','+g+','+b+')';
    ctx.beginPath();ctx.moveTo(q.p[0][0],q.p[0][1]);ctx.lineTo(q.p[1][0],q.p[1][1]);ctx.lineTo(q.p[2][0],q.p[2][1]);ctx.closePath();ctx.fill();
  }
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
</script></body></html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const safeFile = String(currentModelTitle || 'StudiosPro_Model').replace(/[^\w\-]+/g, '_');
    if (typeof downloadBlob === 'function') downloadBlob(blob, `${safeFile}_ClientProof_3D.html`);
    if (typeof closeExportModal === 'function') closeExportModal();
    showToast(_v3IsFr()
        ? '🌐 Preuve Client HTML 3D autonome exportée !'
        : '🌐 Offline Interactive HTML 3D Client Proof exported!');
}

function openMockupModal() {
    if (!currentMesh || !currentMesh.geometry) {
        showToast(t('aiNoModel', 'Load a 3D model first.'));
        return;
    }
    const modal = document.getElementById('mockup-4k-modal');
    if (!modal) return;
    modal.classList.add('open');
    if (typeof refreshIcons === 'function') refreshIcons();
}

function closeMockupModal() {
    const modal = document.getElementById('mockup-4k-modal');
    if (modal) modal.classList.remove('open');
}

function render4KStudioMockup(sceneType = 'gallery') {
    if (!renderer || !scene || !camera || !currentMesh || !triangleColors) {
        showToast(t('aiNoModel', 'Load a 3D model first.'));
        return;
    }

    const W = 3840, H = 2160;
    const out = document.createElement('canvas');
    out.width = W;
    out.height = H;
    const ctx = out.getContext('2d');

    // Temporarily hide helpers/grid/bed to capture a spotless commercial render!
    const prevRing = typeof brushHelperRing !== 'undefined' && brushHelperRing ? brushHelperRing.visible : false;
    const prevGrid = typeof gridHelper !== 'undefined' && gridHelper ? gridHelper.visible : false;
    const prevBed = virtualBedGroup ? virtualBedGroup.visible : false;
    const prevCopies = multiCopyGroup ? multiCopyGroup.visible : false;
    const prevBg = scene.background;
    const prevSize = new THREE.Vector2();
    renderer.getSize(prevSize);
    const prevAspect = camera.aspect;

    try {
        if (typeof brushHelperRing !== 'undefined' && brushHelperRing) brushHelperRing.visible = false;
        if (typeof gridHelper !== 'undefined' && gridHelper) gridHelper.visible = false;
        if (virtualBedGroup) virtualBedGroup.visible = false;
        if (multiCopyGroup) multiCopyGroup.visible = false;

        // Render high-res transparent frame of the 3D painted model
        scene.background = null;
        renderer.setClearColor(0x000000, 0);
        const capW = 1920, capH = 1080;
        renderer.setSize(capW, capH, false);
        camera.aspect = capW / capH;
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);

        // Background scenes
        if (sceneType === 'desk') {
            const g = ctx.createLinearGradient(0, 0, 0, H);
            g.addColorStop(0, '#f3efe6');
            g.addColorStop(0.62, '#e3d8c6');
            g.addColorStop(0.63, '#b88b5a');
            g.addColorStop(1, '#7c532e');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H);
        } else if (sceneType === 'spotlight') {
            const g = ctx.createRadialGradient(W * 0.5, H * 0.35, 120, W * 0.5, H * 0.5, W * 0.65);
            g.addColorStop(0, '#1e3a8a');
            g.addColorStop(0.45, '#090d1f');
            g.addColorStop(1, '#02040a');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H);
        } else if (sceneType === 'etsy') {
            const g = ctx.createLinearGradient(0, 0, W, H);
            g.addColorStop(0, '#0b1120');
            g.addColorStop(1, '#1e1b4b');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H);
        } else {
            // 'gallery' Modern Dark Studio
            const g = ctx.createRadialGradient(W * 0.5, H * 0.42, 100, W * 0.5, H * 0.52, W * 0.6);
            g.addColorStop(0, '#1e293b');
            g.addColorStop(0.6, '#0f172a');
            g.addColorStop(1, '#020617');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H);
        }

        // Soft studio floor pedestal shadow
        const modelX = sceneType === 'etsy' ? W * 0.34 : W * 0.5;
        const pedGrad = ctx.createRadialGradient(modelX, H * 0.78, 30, modelX, H * 0.78, W * 0.24);
        pedGrad.addColorStop(0, 'rgba(0,0,0,0.55)');
        pedGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = pedGrad;
        ctx.fillRect(0, H * 0.55, W, H * 0.45);

        // Draw crisp 3D model render
        if (sceneType === 'etsy') {
            ctx.drawImage(renderer.domElement, -W * 0.14, H * 0.04, W * 0.96, H * 0.96);
            // Right-hand Etsy/MakerWorld Commercial Listing Card!
            const cardX = W * 0.64, cardY = H * 0.12, cardW = W * 0.31, cardH = H * 0.76;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
            ctx.fillRect(cardX, cardY, cardW, cardH);
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
            ctx.lineWidth = 4;
            ctx.strokeRect(cardX, cardY, cardW, cardH);

            ctx.fillStyle = '#38bdf8';
            ctx.font = '800 42px Outfit, Inter, sans-serif';
            ctx.fillText('MULTI-COLOR 3D PRINT', cardX + 64, cardY + 115);

            ctx.fillStyle = '#f8fafc';
            ctx.font = '900 72px Outfit, Inter, sans-serif';
            const titleTxt = String(currentModelTitle || 'Custom 3MF Model').replace(/^Demo_/i, '').slice(0, 18);
            ctx.fillText(titleTxt, cardX + 64, cardY + 215);

            const analysis = typeof analyzePrintForAxis === 'function' ? analyzePrintForAxis(0, 1, 0, 0.2) : null;
            currentMesh.geometry.computeBoundingBox();
            const sz = new THREE.Vector3();
            currentMesh.geometry.boundingBox.getSize(sz);
            ctx.fillStyle = '#cbd5e1';
            ctx.font = '600 40px Inter, sans-serif';
            ctx.fillText(`${sz.x.toFixed(0)} × ${sz.y.toFixed(0)} × ${sz.z.toFixed(0)} mm`, cardX + 64, cardY + 300);
            if (analysis) {
                ctx.fillText(`${analysis.usedSlots.length} AMS Filaments • ~${analysis.partGrams}g`, cardX + 64, cardY + 365);
            }

            // Swatches list
            const activeSlots = analysis && analysis.usedSlots.length ? analysis.usedSlots : [0, 1, 2];
            activeSlots.slice(0, 6).forEach((sIdx, i) => {
                const sp = filamentSlots[sIdx];
                if (!sp) return;
                const sy = cardY + 470 + i * 110;
                ctx.fillStyle = sp.color || '#fff';
                ctx.beginPath();
                ctx.arc(cardX + 95, sy, 32, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.6)';
                ctx.lineWidth = 3;
                ctx.stroke();

                ctx.fillStyle = '#f8fafc';
                ctx.font = '700 38px Inter, sans-serif';
                ctx.fillText(sp.name.slice(0, 22), cardX + 150, sy + 12);
            });
        } else {
            ctx.drawImage(renderer.domElement, 0, 0, W, H);
            // Minimal gallery caption bottom-left
            ctx.fillStyle = sceneType === 'desk' ? '#1e293b' : '#f8fafc';
            ctx.font = '800 54px Outfit, Inter, sans-serif';
            ctx.fillText(String(currentModelTitle || 'MultiColor 3D Creation').replace(/^Demo_/i, ''), 90, H - 135);
            ctx.fillStyle = sceneType === 'desk' ? '#475569' : '#94a3b8';
            ctx.font = '600 34px Inter, sans-serif';
            ctx.fillText('Bambu AMS / OrcaSlicer Ready • 4K Studio Render', 90, H - 80);
        }

        out.toBlob((blob) => {
            if (!blob) return;
            if (typeof downloadBlob === 'function') {
                downloadBlob(blob, `StudiosPro_4K_Mockup_${sceneType}.png`);
            }
            closeMockupModal();
            showToast(_v3IsFr()
                ? `📸 Mockup 4K (${sceneType}) exporté (3840×2160) !`
                : `📸 4K Studio Mockup (${sceneType}) exported (3840×2160)!`);
        }, 'image/png');
    } finally {
        scene.background = prevBg;
        renderer.setSize(prevSize.x, prevSize.y, false);
        camera.aspect = prevAspect;
        camera.updateProjectionMatrix();
        if (typeof brushHelperRing !== 'undefined' && brushHelperRing) brushHelperRing.visible = prevRing;
        if (typeof gridHelper !== 'undefined' && gridHelper) gridHelper.visible = prevGrid;
        if (virtualBedGroup) virtualBedGroup.visible = prevBed;
        if (multiCopyGroup) multiCopyGroup.visible = prevCopies;
        renderer.render(scene, camera);
    }
}

// =========================================================================
// INITIALIZER HOOK (CALLED ON DOMCONTENTLOADED BEFORE PAYWALL WRAP)
// =========================================================================
function initStudioV3Pro() {
    loadV3SpoolRack();
    // Hook toggleGrid so virtualBedGroup also toggles with Grid button!
    if (typeof window.toggleGrid === 'function' && !window.toggleGrid._v3Hooked) {
        const origGrid = window.toggleGrid;
        window.toggleGrid = function () {
            origGrid.apply(this, arguments);
            if (virtualBedGroup) virtualBedGroup.visible = !!isGridVisible;
            if (typeof bedOutline !== 'undefined' && bedOutline) bedOutline.visible = false;
        };
        window.toggleGrid._v3Hooked = true;
    }
    // Hook setLoadedGeometry post-load bed & PBR sync cleanly
    updateVirtualPrintBedVisual();
}
