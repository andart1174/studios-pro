// ArchitectPro — Language & Phase Data
const LANG = {
  en: {
    appName: "ArchitectPro",
    appTagline: "Build your dream home, step by step",
    newProject: "New Project",
    printProject: "Print",
    exportPDF: "Download PDF",
    progress: "Overall Progress",
    phases: "Construction Phases",
    colorCustomizer: "Color Customizer",
    colors: {
      extWalls: "Exterior Walls",
      roof: "Roof",
      windows: "Windows & Doors",
      intWalls: "Interior Walls",
      floor: "Floor",
      ground: "Ground",
    },
    budget: "Budget Tracker",
    budgetSpent: "Spent",
    budgetTotal: "Total Budget",
    overBudget: "⚠️ Over budget!",
    view2D: "2D Blueprint",
    view3D: "3D Model",
    materials: "Materials Calculator",
    costs: "Cost Estimator",
    materialItem: "Material",
    qty: "Qty",
    unit: "Unit",
    unitPrice: "Unit Price",
    total: "Total",
    laborCost: "Labor Cost",
    materialCost: "Materials Cost",
    phaseCost: "Phase Total",
    proTip: "💡 Pro Tip",
    warning: "⚠️ Warning",
    norm: "📋 Standard / Norm",
    stepDone: "Mark complete",
    steps: "Steps",
    wizard: {
      title: "Configure Your Project",
      subtitle: "Enter your house parameters to generate a complete construction plan",
      houseType: "House Type",
      length: "Length (m)",
      width: "Width (m)",
      floorHeight: "Floor height (m)",
      floors: "Number of Floors",
      foundation: "Foundation Type",
      roofType: "Roof Type",
      budget: "Total Budget ($)",
      region: "Region / Climate",
      start: "Generate My Plan →",
      types: ["Single Story", "2 Floors", "3 Floors", "4 Floors", "5 Floors", "Villa / Custom"],
      foundations: ["Strip Foundation", "Raft Slab", "Pile Foundation"],
      roofs: ["Flat Roof / Terrace", "Gable Roof (2 slopes)", "Hip Roof (4 slopes)"],
      regions: ["Temperate", "Cold / Nordic", "Hot / Mediterranean", "Tropical"],
    },
    phaseNames: ["Foundation", "Structure", "Roof", "Exterior", "Interior", "Utilities", "Finishes"],
    phaseIcons: ["⛏️", "🧱", "🏔️", "🏠", "🪟", "⚡", "🎨"],
  },
  fr: {
    appName: "ArchitectPro",
    appTagline: "Construisez la maison de vos rêves, étape par étape",
    newProject: "Nouveau Projet",
    printProject: "Imprimer",
    exportPDF: "Télécharger PDF",
    progress: "Progression Globale",
    phases: "Phases de Construction",
    colorCustomizer: "Personnaliser les Couleurs",
    colors: {
      extWalls: "Murs Extérieurs",
      roof: "Toiture",
      windows: "Fenêtres & Portes",
      intWalls: "Murs Intérieurs",
      floor: "Sol",
      ground: "Terrain",
    },
    budget: "Suivi du Budget",
    budgetSpent: "Dépensé",
    budgetTotal: "Budget Total",
    overBudget: "⚠️ Budget dépassé!",
    view2D: "Plan 2D",
    view3D: "Modèle 3D",
    materials: "Calculateur de Matériaux",
    costs: "Estimation des Coûts",
    materialItem: "Matériau",
    qty: "Qté",
    unit: "Unité",
    unitPrice: "Prix Unitaire",
    total: "Total",
    laborCost: "Main d'œuvre",
    materialCost: "Matériaux",
    phaseCost: "Total Phase",
    proTip: "💡 Conseil Pro",
    warning: "⚠️ Attention",
    norm: "📋 Norme / Standard",
    stepDone: "Marquer terminé",
    steps: "Étapes",
    wizard: {
      title: "Configurer Votre Projet",
      subtitle: "Entrez les paramètres de votre maison pour générer un plan de construction complet",
      houseType: "Type de maison",
      length: "Longueur (m)",
      width: "Largeur (m)",
      floorHeight: "Hauteur d'étage (m)",
      floors: "Nombre d'étages",
      foundation: "Type de fondation",
      roofType: "Type de toiture",
      budget: "Budget Total ($)",
      region: "Région / Climat",
      start: "Générer Mon Plan →",
      types: ["Plain-pied", "2 Étages", "3 Étages", "4 Étages", "5 Étages", "Villa / Personnalisé"],
      foundations: ["Fondation en Bande", "Radier / Dalle", "Fondation sur Pieux"],
      roofs: ["Toiture Terrasse", "Toit à 2 Pentes", "Toit à 4 Pentes (Croupe)"],
      regions: ["Tempéré", "Froid / Nordique", "Chaud / Méditerranéen", "Tropical"],
    },
    phaseNames: ["Fondation", "Structure", "Toiture", "Extérieur", "Intérieur", "Installations", "Finitions"],
    phaseIcons: ["⛏️", "🧱", "🏔️", "🏠", "🪟", "⚡", "🎨"],
  }
};

// Construction phase data
const PHASES_DATA = {
  en: [
    // PHASE 1 - FOUNDATION
    {
      id: 0,
      name: "Foundation",
      color: "#92400e",
      laborPercent: 0.35,
      steps: [
        { title: "Site Survey & Soil Analysis", desc: "Conduct a topographic survey of the site. Perform soil borings (minimum 3 points) to determine bearing capacity. Results determine foundation type and depth.", tip: "Always get a geotechnical report — it prevents costly mistakes.", warning: "Never assume soil conditions without testing.", norm: "ASTM D1586 / Eurocode 7" },
        { title: "Land Clearing & Excavation", desc: "Clear vegetation, remove topsoil (min 30cm). Mark foundation perimeter with stakes and strings. Excavate to required depth (typically 1.2–1.8m below grade for strip foundations).", tip: "Add 60cm extra width on each side for formwork and waterproofing access.", warning: "Check for underground utilities before digging.", norm: "ACI 318" },
        { title: "Compaction & Gravel Bed", desc: "Compact subgrade with a plate compactor to 98% Proctor density. Lay 15–20cm of crushed gravel (20–40mm), compact again. Place 10cm lean concrete (C10) as working slab.", tip: "Test compaction with a dynamic plate load test before proceeding.", warning: "Never place concrete on loose or wet soil.", norm: "" },
        { title: "Formwork & Reinforcement", desc: "Install wooden or steel formwork to foundation shape. Place rebar cage: longitudinal bars (∅16mm) + stirrups (∅8mm, 20cm spacing). Maintain 5cm concrete cover using plastic spacers.", tip: "Pre-fabricate rebar cages off-site to save time.", warning: "Inspect all rebar before pouring — no rust, correct spacing.", norm: "ACI 318-19 Chapter 15" },
        { title: "Concrete Pour & Curing", desc: "Order ready-mix concrete (min C25/30, slump 100–150mm). Pour in layers max 50cm, vibrate thoroughly to eliminate air pockets. Cure minimum 28 days (keep wet for first 7 days).", tip: "Pour in the morning to avoid rapid evaporation in heat.", warning: "Do not pour concrete below 5°C without cold-weather precautions.", norm: "ACI 305R / ACI 306R" },
        { title: "Waterproofing & Drainage", desc: "Apply bituminous waterproofing membrane on exterior foundation walls (2 layers). Install perimeter drain tile at footing level, wrapped in geotextile fabric. Backfill with free-draining gravel.", tip: "Add a dimple sheet (drainage membrane) for extra protection.", warning: "Inspect waterproofing for holes before backfilling — impossible to fix later.", norm: "" },
      ],
      tips: ["Always over-engineer foundations — they carry everything above", "Spend on soil testing, save on repairs"],
      materials: (p) => [
        { name: "Concrete C25/30", qty: Math.round(p.footprint * 0.4), unit: "m³", unitPrice: 120, category: "Concrete" },
        { name: "Rebar ∅16mm", qty: Math.round(p.footprint * 18), unit: "kg", unitPrice: 0.95, category: "Steel" },
        { name: "Rebar ∅8mm (stirrups)", qty: Math.round(p.footprint * 8), unit: "kg", unitPrice: 0.95, category: "Steel" },
        { name: "Crushed Gravel 20-40mm", qty: Math.round(p.footprint * 0.25), unit: "m³", unitPrice: 35, category: "Aggregate" },
        { name: "Lean Concrete C10", qty: Math.round(p.footprint * 0.1), unit: "m³", unitPrice: 85, category: "Concrete" },
        { name: "Bituminous Membrane", qty: Math.round(p.perimeter * 1.8 * 2), unit: "m²", unitPrice: 8, category: "Waterproofing" },
        { name: "Formwork Boards", qty: Math.round(p.perimeter * 3), unit: "m²", unitPrice: 12, category: "Formwork" },
        { name: "Plastic Spacers", qty: Math.round(p.footprint * 5), unit: "pcs", unitPrice: 0.15, category: "Accessories" },
      ]
    },
    // PHASE 2 - STRUCTURE
    {
      id: 1,
      name: "Structure",
      color: "#78350f",
      laborPercent: 0.40,
      steps: [
        { title: "Ground Floor Slab", desc: "Place vapor barrier (PE 0.2mm) on compacted gravel. Install underfloor insulation (5cm XPS). Lay welded mesh (∅6mm, 15×15cm grid). Pour C25/30 slab (12–15cm thick), steel trowel finish.", tip: "Use self-leveling compound for perfect flatness if needed.", warning: "Protect fresh slab from traffic for minimum 72 hours.", norm: "ACI 360R" },
        { title: "Exterior Walls — Masonry", desc: "Lay load-bearing masonry using thermal blocks (porotherm/ytong 25–30cm). Use thin-bed mortar (2mm joints). First course must be perfectly level — critical for all walls above. Install structural lintels above all openings.", tip: "Check plumb every 3 courses with a spirit level and laser level.", warning: "Never cut thermal blocks with a regular saw — use band saw.", norm: "" },
        { title: "Columns & Ring Beams (Belt Course)", desc: "Cast reinforced concrete columns at corners and every 4–5m. Install horizontal ring beams (centuri) at each floor level: rebar ∅14mm + stirrups ∅8mm/15cm. These tie all walls together structurally.", tip: "Ring beams are earthquake resistance — never omit them.", warning: "Columns must align vertically with columns below — check with plumb bob.", norm: "ACI 318 / Eurocode 8" },
        { title: "Interior Partition Walls", desc: "Build non-load-bearing interior walls with lightweight blocks (10–15cm thick). Layout per architectural drawings. Leave door openings with proper width + 10cm for frame. Tie into exterior walls with anchor ties every 3 courses.", tip: "Mark all partition positions on the slab with a chalk line before starting.", warning: "Confirm room dimensions before closing any wall.", norm: "" },
        { title: "Floor Structure (Intermediate Slab)", desc: "If multi-story: Install prefab hollow-core planks OR cast in-situ reinforced slab (15–20cm). For cast slab: install shore supports, formwork, rebar mesh, pour C30/37. Do not remove shores for min 28 days.", tip: "Pre-fabricated floor elements reduce time significantly.", warning: "Calculate live load capacity before placing any heavy equipment on new slab.", norm: "ACI 318 Chapter 26" },
        { title: "Structural Inspection", desc: "Conduct a structural inspection by a licensed engineer. Check: plumb of all walls, level of slabs, correct rebar placement (pre-pour inspection photos), concrete test results (cube tests at 7 and 28 days).", tip: "Keep all lab test reports — you'll need them for the building permit final sign-off.", warning: "Do not proceed to roof if there are structural non-conformities.", norm: "" },
      ],
      tips: ["Structural phase sets everything — invest in quality materials here", "Use a laser level throughout — it saves thousands in corrections"],
      materials: (p) => [
        { name: "Thermal Blocks (30cm)", qty: Math.round(p.wallArea * 11), unit: "pcs", unitPrice: 3.2, category: "Masonry" },
        { name: "Thin-bed Mortar", qty: Math.round(p.wallArea * 0.6), unit: "bags (25kg)", unitPrice: 8.5, category: "Mortar" },
        { name: "Concrete C30/37 (slab)", qty: Math.round(p.footprint * p.floors * 0.18), unit: "m³", unitPrice: 130, category: "Concrete" },
        { name: "Rebar ∅14mm (ring beam)", qty: Math.round(p.perimeter * p.floors * 12), unit: "kg", unitPrice: 0.95, category: "Steel" },
        { name: "Rebar ∅8mm (stirrups)", qty: Math.round(p.perimeter * p.floors * 5), unit: "kg", unitPrice: 0.95, category: "Steel" },
        { name: "Welded Mesh ∅6/15", qty: Math.round(p.footprint * p.floors), unit: "m²", unitPrice: 4.5, category: "Steel" },
        { name: "Interior Blocks (15cm)", qty: Math.round(p.footprint * 0.4 * 8), unit: "pcs", unitPrice: 1.8, category: "Masonry" },
        { name: "Steel Lintels", qty: Math.round(p.openings * 2), unit: "pcs", unitPrice: 45, category: "Steel" },
      ]
    },
    // PHASE 3 - ROOF
    {
      id: 2,
      name: "Roof",
      color: "#1e3a5f",
      laborPercent: 0.38,
      steps: [
        { title: "Top Ring Beam & Roof Plate", desc: "Cast final ring beam at top of walls. Install treated timber wall plate (sablière, 8×10cm) continuously around perimeter, anchored with chemical bolts every 60cm.", tip: "Treat all timber with preservative (boron-based) before installation.", warning: "Wall plate must be perfectly level — use a water level instrument.", norm: "" },
        { title: "Ridge Beam & Principal Rafters", desc: "Install central ridge beam (faîtière) supported on gable walls or king post. Set principal rafters at calculated spacing (typically 60–90cm centers). Use carpenter's square and template rafter for consistent cutting.", tip: "Use engineered LVL timber for ridge beam to prevent sagging.", warning: "All timber must be kiln-dried to <19% moisture content.", norm: "" },
        { title: "Common Rafters & Collar Ties", desc: "Install common rafters at regular spacing. Add collar ties at 1/3 from ridge to prevent spread. Install eave fascia board and soffit boards. Box in all eaves for vermin protection with ventilated soffit strip.", tip: "Pre-cut all rafters using a template — precision is key.", warning: "Calculate snow load for your region and size rafters accordingly.", norm: "ASCE 7 / Eurocode 1" },
        { title: "Roof Sheathing & Underlayment", desc: "Install 18mm OSB or plywood sheathing over rafters (staggered joints). Apply breathable roofing felt (min 140g/m²) bottom to top with 15cm overlaps. Nail with galvanized clout nails. Install batten strips (25×50mm) for tile hanging.", tip: "Leave no gaps in sheathing — it's your first line of water defence.", warning: "Work in dry weather only — wet OSB swells and may not recover.", norm: "" },
        { title: "Roofing Tiles / Covering", desc: "Start from eave, work upward in overlapping courses. Use manufacturer's recommended starter tile at eave. Maintain constant gauge (lap). Install ridge tiles with mortar or dry-fix ridge system. Flash all junctions, valleys, and chimney intersections with lead or GRP.", tip: "Dry-fix ridge systems are maintenance-free — worth the extra cost.", warning: "Check tile profile matches battening gauge before starting.", norm: "" },
        { title: "Gutters, Downpipes & Finishing", desc: "Install galvanized or PVC gutters with minimum 1:200 fall to downpipe. Space downpipes max 12m apart. Install leaf guards. Fit all flashings, soakers, and aprons. Apply roof sealant at all penetrations.", tip: "Oversized gutters are worth it — undersized ones overflow in storms.", warning: "All roof penetrations must be flashed — never use mastic alone.", norm: "" },
      ],
      tips: ["The roof is your biggest protection — quality pays off for 50+ years", "Ventilate the roof void to prevent condensation and rot"],
      materials: (p) => [
        { name: "Roof Tiles (concrete/clay)", qty: Math.round(p.roofArea * 11.5), unit: "pcs", unitPrice: 1.2, category: "Roofing" },
        { name: "OSB Sheathing 18mm", qty: Math.round(p.roofArea * 1.1), unit: "m²", unitPrice: 9, category: "Timber" },
        { name: "Rafters C24 (45×195mm)", qty: Math.round(p.roofArea / 0.6 * 1.2), unit: "lm", unitPrice: 4.8, category: "Timber" },
        { name: "Roof Battens (25×50mm)", qty: Math.round(p.roofArea * 2.5), unit: "lm", unitPrice: 1.2, category: "Timber" },
        { name: "Breathable Felt 140g", qty: Math.round(p.roofArea * 1.15), unit: "m²", unitPrice: 2.5, category: "Waterproofing" },
        { name: "Galvanized Gutters 125mm", qty: Math.round(p.perimeter), unit: "lm", unitPrice: 12, category: "Drainage" },
        { name: "Downpipes 100mm", qty: Math.round(p.perimeter / 6), unit: "lm", unitPrice: 8, category: "Drainage" },
        { name: "Lead Flashing", qty: Math.round(p.perimeter * 0.5), unit: "m²", unitPrice: 55, category: "Weatherproofing" },
      ]
    },
    // PHASE 4 - EXTERIOR
    {
      id: 3,
      name: "Exterior",
      color: "#064e3b",
      laborPercent: 0.45,
      steps: [
        { title: "Exterior Insulation System (ETICS)", desc: "Apply EWI/ETICS system: adhere 10–15cm EPS or mineral wool boards with tile adhesive + mesh. Install mechanical anchors (min 6/m²). Apply base coat with fibreglass mesh, then finish render.", tip: "Use graphite EPS — 20% better insulation for same thickness.", warning: "ETICS must be installed by certified applicators for warranty.", norm: "ETAG 004" },
        { title: "Window & Door Installation", desc: "Install triple-glazed PVC or aluminium frames in pre-formed openings. Use expanding foam + airtight membrane tape for sealing. Install threshold drainage profiles. Apply silicone bead at all junctions.", tip: "Uf window frame ≤ 1.0 W/m²K — key for energy performance.", warning: "Never omit the internal vapour barrier tape — it prevents mould.", norm: "EN 14351-1" },
        { title: "Exterior Render (Scratch Coat)", desc: "Apply bonding bridge to masonry. First coat: cement-lime render 10–15mm thick, scratched while wet. Allow minimum 7 days to cure before top coat.", tip: "Add fibre reinforcement to scratch coat to prevent cracking.", warning: "Do not render in direct sun — causes rapid drying and cracking.", norm: "" },
        { title: "External Finish Coat", desc: "Apply acrylic, silicone, or mineral top coat render (2–3mm). Use consistent technique (circular or straight finish). Apply two coats of exterior paint or leave textured render as final surface.", tip: "Silicone render is self-cleaning and hydrophobic — best long-term choice.", warning: "Colour choice affects heat absorption — lighter colours better in hot climates.", norm: "" },
        { title: "Damp Proof Course & Drainage", desc: "Install horizontal DPC at base of all external walls (min 15cm above ground). Install perimeter drainage channel around building. Lay paving away from building (fall min 1:50). Install rodent mesh at roof eaves.", tip: "French drain around perimeter prevents basement dampness.", warning: "Ground must fall away from building — never toward it.", norm: "" },
        { title: "External Works & Landscaping", desc: "Pave paths and driveway (min 10cm concrete or block paving on compacted sub-base). Build retaining walls if needed. Fence and gate installation. Topsoil and grass seeding.", tip: "Block paving is flexible — easy to repair utility trenches later.", warning: "", norm: "" },
      ],
      tips: ["A well-insulated exterior saves 30-50% on heating costs", "Invest in quality windows — they can never be easily replaced"],
      materials: (p) => [
        { name: "EPS Insulation 12cm", qty: Math.round(p.extWallArea), unit: "m²", unitPrice: 8.5, category: "Insulation" },
        { name: "ETICS Base Coat + Mesh", qty: Math.round(p.extWallArea), unit: "m²", unitPrice: 7, category: "Render" },
        { name: "Silicone Top Coat Render", qty: Math.round(p.extWallArea), unit: "m²", unitPrice: 12, category: "Render" },
        { name: "Windows Triple glaze", qty: Math.round(p.footprint * 0.08), unit: "m²", unitPrice: 380, category: "Openings" },
        { name: "Exterior Door", qty: 1 + Math.floor(p.floors / 1), unit: "pcs", unitPrice: 850, category: "Openings" },
        { name: "Mechanical Anchors", qty: Math.round(p.extWallArea * 6), unit: "pcs", unitPrice: 0.45, category: "Fixings" },
        { name: "Fibreglass Mesh 160g", qty: Math.round(p.extWallArea * 1.1), unit: "m²", unitPrice: 1.8, category: "Reinforcement" },
        { name: "External Paving Slabs", qty: Math.round(p.footprint * 0.3), unit: "m²", unitPrice: 28, category: "Landscaping" },
      ]
    },
    // PHASE 5 - INTERIOR
    {
      id: 4,
      name: "Interior",
      color: "#312e81",
      laborPercent: 0.42,
      steps: [
        { title: "Internal Plasterwork (First Fix)", desc: "Apply roughcast bonding to masonry walls. First coat of cement-lime plaster (12mm) using feather edge aluminium screeds for flatness. Check all walls with 2m straight edge — max 3mm deviation.", tip: "Straighten stud walls with wooden packers before plastering.", warning: "Ensure all electrical first fix is complete before plastering.", norm: "" },
        { title: "Ceiling Plasterboard / Drywall", desc: "Install metal furring channel grid on ceiling with wire hangers from structure. Fix 12.5mm plasterboard (GKB) with drywall screws. Tape all joints with fibreglass mesh tape + jointing compound (3 coats, feathered).", tip: "Use moisture-resistant board in bathrooms — never standard GKB.", warning: "Board must not touch floor — leave 12mm gap minimum.", norm: "" },
        { title: "Internal Plaster Skim Coat", desc: "Apply finish plaster skim coat (3–5mm) over brown coat. Use a hawk and trowel — keep wet and flat. Trowel to a mirror finish. Sand when dry with 120-grit sandpaper. Prime with diluted PVA before painting.", tip: "Two thin coats better than one thick coat.", warning: "Never skim over fresh plaster — wait until completely dry (cream → white).", norm: "" },
        { title: "Screed Floor Preparation", desc: "Install underfloor heating pipes (if specified). Lay vapour barrier PE 0.2mm. Pour liquid or semi-dry sand:cement screed (65–75mm). Use depth pins at regular intervals. Power float or manually compact. Cure minimum 21 days.", tip: "Liquid anhydrite screed self-levels and pumps fast — ideal for underfloor heating.", warning: "Mark screed depth clearly on walls — do not pour too thin.", norm: "" },
        { title: "Tile Setting (Wet Rooms)", desc: "Waterproof wet room floors and shower walls with tanking slurry (2 coats). Set floor tiles in adhesive bed on screed. Use tile levelling system for large format tiles. Grout after minimum 24h. Silicone all internal corners.", tip: "Use large format tiles (60×60cm+) for a premium look.", warning: "Always tanking-coat wet rooms — even with waterproof tiles.", norm: "" },
        { title: "Joinery & Built-ins First Fix", desc: "Install internal door linings and frames. Fix stair components if multi-story. Install any built-in joinery (wardrobes, shelving). Hang interior doors with 3 hinges each. Fit door hardware.", tip: "Pre-hang doors before finishing floor — easier to trim.", warning: "Check all door openings are plumb and square before ordering doors.", norm: "" },
      ],
      tips: ["Good plasterwork is the foundation of a beautiful interior", "Never rush drying times — cracks appear months later"],
      materials: (p) => [
        { name: "Lime Plaster (25kg bags)", qty: Math.round(p.wallArea * 0.18 / 0.025), unit: "bags", unitPrice: 12, category: "Plaster" },
        { name: "Finish Plaster Skim", qty: Math.round(p.wallArea * 0.05 / 0.010), unit: "bags", unitPrice: 9, category: "Plaster" },
        { name: "Plasterboard GKB 12.5mm", qty: Math.round(p.footprint * p.floors * 1.1), unit: "m²", unitPrice: 6.5, category: "Drywall" },
        { name: "Sand:Cement Screed", qty: Math.round(p.footprint * p.floors * 0.07), unit: "m³", unitPrice: 90, category: "Screed" },
        { name: "Floor Tiles (large format)", qty: Math.round(p.footprint * p.floors * 1.1), unit: "m²", unitPrice: 35, category: "Tiles" },
        { name: "Wall Tiles (bathroom)", qty: Math.round(p.footprint * p.floors * 0.15 * 8), unit: "m²", unitPrice: 28, category: "Tiles" },
        { name: "Tile Adhesive C2", qty: Math.round(p.footprint * p.floors * 0.006), unit: "tons", unitPrice: 420, category: "Adhesive" },
        { name: "Interior Doors", qty: Math.round(p.footprint * p.floors * 0.05), unit: "pcs", unitPrice: 320, category: "Joinery" },
      ]
    },
    // PHASE 6 - UTILITIES
    {
      id: 5,
      name: "Utilities",
      color: "#7f1d1d",
      laborPercent: 0.50,
      steps: [
        { title: "Electrical Main Panel & Mains", desc: "Install consumer unit (min 24 way) with RCD protection. Route main cable from utility pole or underground. Install sub-panels per floor if multi-story. Use 10mm² cable for main supply.", tip: "Install 3-phase supply — future-proofs for EV chargers and heat pumps.", warning: "All electrical work must be certified by a licensed electrician.", norm: "IEC 60364 / NEC" },
        { title: "Electrical First Fix (Rough-In)", desc: "Route all cable runs in conduit or wall chases before plastering. Install back boxes for sockets, switches, and light fittings. Run Cat6 data and TV coax cables simultaneously. Install HVAC thermostat wiring.", tip: "Run spares — always install extra conduits while walls are open.", warning: "Separate circuits for kitchen, bathrooms, and outdoor — mandatory.", norm: "" },
        { title: "Plumbing — Water Supply", desc: "Install isolator valves at mains entry. Run hot and cold supply in PE-X or copper pipe. Include in-wall service valves at every appliance. Insulate all hot water pipes. Install pressure reducing valve (3.5 bar).", tip: "PE-X push-fit systems are leak-free and faster than copper soldering.", warning: "Flush all pipes before making final connections.", norm: "EN 806" },
        { title: "Drainage & Soil System", desc: "Install 110mm soil stack (UPVC) with access junction. Run 110mm branch drains to all WCs, 50mm to sinks and baths. All waste must fall minimum 1:40. Connect to existing sewer or install septic system.", tip: "Record all drain positions before screed — draw on walls with marker.", warning: "Never use push-fit for underground drainage — use ring seal jointed pipe.", norm: "EN 12056" },
        { title: "Heating System", desc: "Install gas boiler or heat pump with a thermal buffer tank. Run underfloor heating manifolds or radiator circuits in chrome pipe. Install room thermostats and zone valves. Balance the system on commissioning.", tip: "A-rated heat pump + underfloor heating = 70% less energy cost vs gas.", warning: "Gas work must be done by a registered gas engineer.", norm: "EN 12897 / ASHRAE" },
        { title: "Ventilation & Air Quality", desc: "Install MVHR (Mechanical Ventilation with Heat Recovery) unit in utility room. Run 125mm duct to each bedroom, kitchen, and bathroom. Install extract grilles in wet rooms. Commission airflow rates per room.", tip: "MVHR recovers 80%+ of heat — essential for well-insulated houses.", warning: "Ducts must be airtight — seal all joints with foil tape.", norm: "ASHRAE 62.2" },
      ],
      tips: ["Utilities are invisible but critically important — never cut corners", "Label every circuit and pipe — your future self will thank you"],
      materials: (p) => [
        { name: "Consumer Unit 24-way (RCBO)", qty: 1, unit: "pcs", unitPrice: 380, category: "Electrical" },
        { name: "2.5mm² Cable (lighting/sockets)", qty: Math.round(p.footprint * p.floors * 8), unit: "lm", unitPrice: 0.65, category: "Electrical" },
        { name: "PE-X Pipe 16mm (heating)", qty: Math.round(p.footprint * p.floors * 5), unit: "lm", unitPrice: 1.8, category: "Plumbing" },
        { name: "Copper Pipe 22mm (supply)", qty: Math.round(p.perimeter * p.floors * 2), unit: "lm", unitPrice: 5.5, category: "Plumbing" },
        { name: "UPVC Soil Pipe 110mm", qty: Math.round(p.floorHeight * p.floors * 3), unit: "lm", unitPrice: 8, category: "Drainage" },
        { name: "Gas Boiler / Heat Pump", qty: 1, unit: "unit", unitPrice: p.footprint > 100 ? 8500 : 5500, category: "HVAC" },
        { name: "UFH Manifold (12 port)", qty: Math.ceil(p.floors), unit: "pcs", unitPrice: 280, category: "Heating" },
        { name: "Ventilation MVHR Unit", qty: 1, unit: "unit", unitPrice: 2200, category: "Ventilation" },
      ]
    },
    // PHASE 7 - FINISHES
    {
      id: 6,
      name: "Finishes",
      color: "#134e4a",
      laborPercent: 0.40,
      steps: [
        { title: "Painting — Walls & Ceilings", desc: "Sand all plastered surfaces (120-grit) and dust off. Apply 1 coat mist coat (diluted emulsion 50:50). Apply 2 full coats silk or matt emulsion. Cut in at edges before rolling. Use extension pole for ceilings.", tip: "Quality paint (10yr washable) is worth the premium — better coverage too.", warning: "Never paint over damp plaster — check with moisture meter.", norm: "" },
        { title: "Hardwood / Engineered Wood Flooring", desc: "Acclimatise flooring boards for min 48h in the room. Lay floating with an 8–10mm expansion gap to all walls. Stagger joints min 40cm. Install skirting boards over expansion gap. Apply wood finish if solid timber.", tip: "Engineered wood is more stable than solid in central heating environments.", warning: "Do not lay over damp screed — moisture content must be below 3%.", norm: "" },
        { title: "Kitchen Fit-Out", desc: "Set out kitchen units on a level datum line. Install base units first — shim level. Fit wall units at standard height (900mm from floor to underside). Apply worktop to level base units. Install sink and connect services. Fit doors and drawers.", tip: "Spend more on worktop and less on unit carcasses — it's what everyone sees.", warning: "Silicon seal all worktop-wall junctions — no gaps for water ingress.", norm: "" },
        { title: "Bathroom Fixtures & Fittings", desc: "Install WC pan on sealed floor fixings. Fit basin with bottle trap. Install bath/shower enclosure — level and plumb. Connect all water supplies and waste. Silicon all junctions to wall tiles. Fit towel rails and accessories.", tip: "Rimless close-coupled WCs look better and are easier to clean.", warning: "Test all waste fittings by running water for 5 minutes before completing.", norm: "" },
        { title: "Electrical Second Fix", desc: "Fit all socket faceplates, light switches, and light fixtures. Install downlights (use fire-rated housings in first floor ceiling). Connect all appliances. Install smart home system if specified. Commission consumer unit.", tip: "LED downlights use 6W vs 50W halogen — same light output.", warning: "Test every circuit with a circuit tester before signing off.", norm: "IEC 60364-6" },
        { title: "Snagging & Final Inspection", desc: "Walk through entire house with architect/inspector. Compile snagging list (typically 50–150 items): paint touch-ups, door adjustments, sealant gaps, hardware tightening. Obtain completion certificate. Hand over as-built drawings and all warranties.", tip: "Snag in daylight with head torch to catch every defect.", warning: "Do not make final payment to contractors until snagging is complete.", norm: "" },
      ],
      tips: ["Great finishes make the house feel complete — don't rush the last 10%", "Keep 10% of budget for snagging and the unexpected"],
      materials: (p) => [
        { name: "Premium Emulsion Paint", qty: Math.round(p.wallArea * p.floors / 12), unit: "10L cans", unitPrice: 48, category: "Paint" },
        { name: "Engineered Wood Flooring", qty: Math.round(p.footprint * p.floors * 0.7 * 1.1), unit: "m²", unitPrice: 42, category: "Flooring" },
        { name: "Skirting Boards 100mm MDF", qty: Math.round(p.perimeter * p.floors * 1.2), unit: "lm", unitPrice: 3.5, category: "Joinery" },
        { name: "Kitchen Units Set", qty: 1, unit: "set", unitPrice: p.footprint > 100 ? 12000 : 7500, category: "Kitchen" },
        { name: "Bathroom Suite (full)", qty: p.floors, unit: "set", unitPrice: 2200, category: "Bathroom" },
        { name: "Light Fixtures (LED)", qty: Math.round(p.footprint * p.floors / 4), unit: "pcs", unitPrice: 35, category: "Electrical" },
        { name: "Sockets & Switches", qty: Math.round(p.footprint * p.floors * 0.5), unit: "pcs", unitPrice: 14, category: "Electrical" },
        { name: "Silicone Sealant", qty: Math.round(p.perimeter * p.floors * 0.3), unit: "cartridges", unitPrice: 7, category: "Sealant" },
      ]
    },
  ],
  fr: [] // populated below
};

// Mirror French phase names (same structure, different names/text)
PHASES_DATA.fr = PHASES_DATA.en.map((phase, i) => ({
  ...phase,
  name: LANG.fr.phaseNames[i],
  steps: phase.steps.map(step => ({
    ...step,
    title: [
      // Foundation
      ["Relevé topographique & Analyse du sol", "Terrassement & Fouilles", "Compactage & Lit de gravier", "Coffrage & Ferraillage", "Coulée du béton & Cure", "Étanchéité & Drainage"],
      // Structure
      ["Dalle de rez-de-chaussée", "Murs extérieurs — Maçonnerie", "Colonnes & Chaînages", "Cloisons intérieures", "Structure du plancher intermédiaire", "Inspection structurelle"],
      // Roof
      ["Chaînage haut & Sablière", "Faîtage & Chevrons principaux", "Chevrons communs & Entretoise", "Voligeage & Écran sous-toiture", "Pose des tuiles / Couverture", "Gouttières, Descentes & Finitions"],
      // Exterior
      ["Isolation thermique par l'extérieur (ITE)", "Pose des fenêtres & Portes", "Enduit de corps", "Enduit de finition", "Drainage périphérique", "Travaux extérieurs & Aménagement"],
      // Interior
      ["Plâtrerie intérieure (1er enduit)", "Plafond en plaque de plâtre", "Enduit de finition (lissage)", "Chape de sol", "Carrelage (pièces humides)", "Menuiseries & Cuisines 1er fixage"],
      // Utilities
      ["Tableau électrique & Alimentation", "Electricité 1er fixage (encastrement)", "Plomberie — Alimentation en eau", "Réseaux d'assainissement", "Système de chauffage", "Ventilation & Qualité de l'air"],
      // Finishes
      ["Peinture — Murs & Plafonds", "Parquet bois / Stratifié", "Installation de la cuisine", "Appareils sanitaires & Salle de bain", "Électricité 2e fixage", "Levée de réserves & Réception finale"]
    ][i][PHASES_DATA.en[i].steps.indexOf(step)]
  }))
}));

// Labor rate by region (multiplier)
const REGION_MULTIPLIER = [1.0, 1.2, 0.85, 0.75];

// Cost distribution per phase (% of total)
const PHASE_COST_WEIGHT = [0.12, 0.22, 0.14, 0.12, 0.18, 0.14, 0.08];

// Default colors
const DEFAULT_COLORS = {
  extWalls: "#e8d5b0",
  roof: "#b45309",
  windows: "#1e3a5f",
  intWalls: "#f5f0e8",
  floor: "#c8a882",
  ground: "#4ade80"
};
