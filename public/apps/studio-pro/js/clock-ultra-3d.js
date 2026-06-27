/**
 * Clock Ultra Engine (EN/FR)
 * High-fidelity custom clocks from photos (PNG, JPG, DXF) with customizable hands, offsets, dials, reflection, and audio ticking.
 */
window.ClockUltra3D = (() => {
    let panel = null, isOpen = false, clockGroup = null, clockGroupAdded = false;
    
    // Core parameters (defaults)
    let customLogoStr = null; // Image background base64
    let customOutlinePoints = null; // Convex hull points for custom image shape
    let customSilhouettePoints = null; // Exact silhouette points
    let dxfDataStr = null;    // DXF data base64
    let dxfTextStr = null;    // Raw DXF text
    let dxfFileName = '';
    let pivotX = 0;           // Pivot X offset (-50 to 50)
    let pivotY = 0;           // Pivot Y offset (-50 to 50)
    let handStyle = 'modern';  // modern, classic, diamond, neon, arrow
    let markerStyle = 'lines'; // none, lines, dots, roman, arabic
    let markerColor = '#06b6d4';
    let markerSize = 1.0;
    let markerRadius = 36;
    let glassCover = true;
    let soundEnabled = false;
    let alarmTime = '12:00';
    let alarmEnabled = false;
    let modelColor = '#06b6d4';
    let chronoEnabled = false;
    let chronoRunning = false;
    let chronoTime = 0;
    let chronoColor = '#06b6d4';
    let chronoNeedleColor = '#ff2a5f';

    // Hand colors
    let handHColor = '#ffffff';
    let handMColor = '#ffffff';
    let handSColor = '#ff2a5f';

    // Hand lengths
    let handHLength = 18;
    let handMLength = 27;
    let handSLength = 34;

    // Hand widths
    let handHWidth = 1.6;
    let handMWidth = 1.0;
    let handSWidth = 0.5;

    // Face options
    let faceShape = 'circle'; // circle, square, none, silhouette
    let faceColor = '#0a0f1d';
    let metalStyle = 'gold'; // gold, brass, steel, copper
    let glowEnabled = false;
    let glowColor = '#6366f1';
    let parallaxEnabled = true;
    let glareSweepEnabled = true;
    let gearsEnabled = false;
    let neonBorderEnabled = false;
    let neonBorderColor = '#06b6d4';
    let tourbillonEnabled = false;
    let moonPhaseEnabled = false;
    let liquidNeonEnabled = false;
    let steamPipesEnabled = false;
    let holoHudEnabled = false;

    // Custom Dial Text options (multiple texts)
    let dialTexts = [
        { text: '', color: '#ffffff', size: 14, font: 'Inter', x: 0, y: 8, rotation: 0, orientation: 'horizontal', preset: 'flat', warp: false, warpRadius: 25, pulseWithTick: false },
        { text: '', color: '#ffffff', size: 14, font: 'Inter', x: 0, y: -10, rotation: 0, orientation: 'horizontal', preset: 'flat', warp: false, warpRadius: 25, pulseWithTick: false },
        { text: '', color: '#ffffff', size: 14, font: 'Inter', x: 0, y: 0, rotation: 0, orientation: 'horizontal', preset: 'flat', warp: false, warpRadius: 25, pulseWithTick: false }
    ];
    let activeTextTab = 0;

    // Advanced themes & effects variables
    let dialTexturePreset = 'none';
    let weatherOverlay = 'none';
    let dynamicTimeColor = false;
    let audioReactive = false;
    let subDialMode = 'chrono';

    // Unique premium feature states
    let timeTravelEnabled = false;
    let timeTravelAutoReturn = true;
    let cursorMagnetismEnabled = false;
    let ambientTickEnabled = false;
    let hourlyChimeEnabled = false;
    let countdownTarget = '';
    let themePreset = 'custom';
    let historyTimelineEnabled = false;
    let teamPresenceRingEnabled = false;
    let kpiDashboardEnabled = false;
    let securityRadarEnabled = false;
    let audioVisualizerEnabled = false;
    let futureRoadmapEnabled = false;
    let exportWhiteLabel = false;

    let financialTickerEnabled = false;
    let financialAsset = 'BTC';
    let financialCurrency = 'USD';
    let billboardCampaignEnabled = false;
    let billboardClockDuration = 30;
    let billboardVisualPreview = true;
    let billboardSlides = [
        {
            mediaType: 'image',
            mediaData: null,
            mediaName: '',
            title: 'PRECISION & ELEGANCE',
            titleColor: '#38bdf8',
            titleSize: 32,
            titleX: 50,
            titleY: 28,
            desc: 'Discover the new series of ultra-premium chronographs.',
            descColor: '#e2e8f0',
            descSize: 16,
            descX: 50,
            descY: 42,
            ctaText: 'Explore Collection',
            ctaUrl: 'https://example.com',
            ctaColor: '#0ea5e9',
            bgType: 'gradient',
            bgColor1: '#090d1a',
            bgColor2: '#1e1b4b',
            duration: 7,
            showQr: false,
            layoutStyle: 'glass-card',
            mediaFit: 'cover',
            mediaScale: 100,
            mediaX: 50,
            mediaY: 50
        }
    ];
    let billboardActiveEditIndex = 0;

    let financialHourTexts = [
        { hour: 12, label: "Price Current", title: "Bitcoin Trading", desc: "Live market cap: $1.8T. Bullish trend with high volume support." },
        { hour: 11, label: "-1 Hour", title: "Hourly Retracement", desc: "Slight pullback of -0.5% Mitigated by solid support at lower boundaries." },
        { hour: 10, label: "-2 Hours", title: "Consolidation Phase", desc: "Range bound trading between key support and resistance clusters." },
        { hour: 9, label: "-3 Hours", title: "Breakout Attempt", desc: "Volume spike detected. Price broke out of the 15-minute descending wedge." },
        { hour: 8, label: "-4 Hours", title: "Liquidity Sweep", desc: "Stop-loss hunt at local lows cleared leveraged longs before continuation." },
        { hour: 7, label: "-5 Hours", title: "Support Test", desc: "Successful retest of the 200 EMA on the 4-hour chart. Buyers stepped in." },
        { hour: 6, label: "-6 Hours", title: "Momentum Shift", desc: "RSI crossed above the 50 neutral line. MACD bullish crossover confirmed." },
        { hour: 5, label: "-7 Hours", title: "Volume Build", desc: "Steady accumulation observed on major spot exchanges. Whale inflows detected." },
        { hour: 4, label: "-8 Hours", title: "Resistance Retest", desc: "Tested local resistance. Rejection lead to brief healthy consolidation." },
        { hour: 3, label: "-9 Hours", title: "Whale Activity", desc: "Large block buy orders filled on order books. Liquidity depth improved." },
        { hour: 2, label: "-10 Hours", title: "Sideways Drift", desc: "Low volatility trading during Asian session opening. Awaiting US open." },
        { hour: 1, label: "-11 Hours", title: "Daily Open", desc: "Daily candle opened strong above weekly pivot level. Market bias remains bullish." }
    ];

    let astrologicalBiorhythmEnabled = false;
    let birthdateInput = '1995-01-01';
    let astrologyHourTexts = [
        { hour: 12, label: "Pisces / Poissons", title: "Water / Eau", desc: "Intuitive, empathetic, creative and mystical. / Intuitif, empathique, créatif et mystique." },
        { hour: 11, label: "Aquarius / Verseau", title: "Air / Air", desc: "Innovative, independent, humanitarian and original. / Innovant, indépendant, humanitaire et original." },
        { hour: 10, label: "Capricorn / Capricorne", title: "Earth / Terre", desc: "Disciplined, ambitious, patient and practical. / Discipliné, ambitieux, impatient et pratique." },
        { hour: 9, label: "Sagittarius / Sagittaire", title: "Fire / Feu", desc: "Optimistic, adventurous, generous and idealistic. / Optimiste, aventureux, généreux et idéaliste." },
        { hour: 8, label: "Scorpio / Scorpion", title: "Water / Eau", desc: "Passionate, resourceful, brave and intuitive. / Passionné, ingénieux, courageux et intuitif." },
        { hour: 7, label: "Libra / Balance", title: "Air / Air", desc: "Diplomatic, fair, artistic and social. / Diplomate, juste, artistique et social." },
        { hour: 6, label: "Virgo / Vierge", title: "Earth / Terre", desc: "Analytical, hardworking, kind and practical. / Analytique, travailleur, gentil et pratique." },
        { hour: 5, label: "Leo / Lion", title: "Fire / Feu", desc: "Creative, passionate, generous and warm-hearted. / Créatif, passionné, généreux et chaleureux." },
        { hour: 4, label: "Cancer / Cancer", title: "Water / Eau", desc: "Imaginative, loyal, emotional and sympathetic. / Imaginatif, loyal, émotif et sympathique." },
        { hour: 3, label: "Gemini / Gémeaux", title: "Air / Air", desc: "Gentle, affectionate, curious and adaptable. / Doux, affectueux, curieux et adaptable." },
        { hour: 2, label: "Taurus / Taureau", title: "Earth / Terre", desc: "Reliable, patient, practical and devoted. / Fiable, patient, pratique et dévoué." },
        { hour: 1, label: "Aries / Bélier", title: "Fire / Feu", desc: "Eager, dynamic, quick and competitive. / Passionné, dynamique, rapide et compétitif." }
    ];

    let worldGlobeEnabled = false;
    let worldGlobeHourTexts = [
        { hour: 12, label: "GMT+0 (London)", title: "Prime Meridian", desc: "UTC / Greenwich Mean Time. The starting point of global timezones." },
        { hour: 1, label: "GMT+1 (Paris)", title: "Central European Time", desc: "Cultural capital. Active business hubs. Coordinates with London." },
        { hour: 2, label: "GMT+2 (Bucharest)", title: "Eastern European Time", desc: "Southeastern Europe tech hub. High speed network infrastructure." },
        { hour: 3, label: "GMT+3 (Dubai)", title: "Gulf Standard Time", desc: "Global financial tower. Innovation oasis in the desert." },
        { hour: 4, label: "GMT+4.5 (Kabul)", title: "Afghanistan Time", desc: "Central Asian node. Mountainous terrain, historic pass." },
        { hour: 5, label: "GMT+5 (Islamabad)", title: "Pakistan Standard Time", desc: "Historical landmarks, regional business and tech expansion." },
        { hour: 6, label: "GMT+6 (Dhaka)", title: "Bangladesh Standard Time", desc: "Rapidly growing textile and digital service exporter." },
        { hour: 7, label: "GMT+7 (Bangkok)", title: "Indochina Time", desc: "Southeast Asian economic hub. Busy waterways and tourism." },
        { hour: 8, label: "GMT+8 (Singapore)", title: "Singapore Standard Time", desc: "Global maritime and financial powerhouse. Ultra-fast networks." },
        { hour: 9, label: "GMT+9 (Tokyo)", title: "Japan Standard Time", desc: "High-tech futuristic megalopolis. Leader in robotics." },
        { hour: 10, label: "GMT+10 (Sydney)", title: "Australian Eastern Standard", desc: "Southern hemisphere financial anchor. Coastal lifestyle." },
        { hour: 11, label: "GMT+11 (Noumea)", title: "New Caledonia Time", desc: "Pacific island timezone. Tourism, mining and natural reserves." }
    ];

    let retroArcadeEnabled = false;
    let retroArcadeHourTexts = [
        { hour: 12, label: "LEVEL 12 (BOSS)", title: "Hyperion Strike", desc: "BOSS warning! Evade the falling neon block lasers. Score multiplier x12." },
        { hour: 11, label: "LEVEL 11", title: "Cosmic Invaders", desc: "Deploy shields. Alien mothership detected on the visual grid." },
        { hour: 10, label: "LEVEL 10", title: "Glitch Valley", desc: "Warning: unstable cell configurations causing cell replication." },
        { hour: 9, label: "LEVEL 9", title: "Pixel Storm", desc: "Grid noise elevated. Active cells spawning at random coordinates." },
        { hour: 8, label: "LEVEL 8", title: "Neon Grid Runner", desc: "Speed increase. Navigate through the glowing block obstacles." },
        { hour: 7, label: "LEVEL 7", title: "Cyber Protocol", desc: "Initiating cellular automata grid sweep sequence. Cells cleared." },
        { hour: 6, label: "LEVEL 6", title: "Vector Matrix", desc: "Symmetric glider pattern loaded. Cellular structures moving diagonally." },
        { hour: 5, label: "LEVEL 5", title: "Quantum Pulse", desc: "Every clock tick triggers a state oscillation on the dot matrix." },
        { hour: 4, label: "LEVEL 4", title: "Pulse Shifter", desc: "Grid size scaled down. Density threshold adjusted to 40%." },
        { hour: 3, label: "LEVEL 3", title: "Analog Grid", desc: "Binaural noise integrated. Audio beats sync with cellular decay." },
        { hour: 2, label: "LEVEL 2", title: "Startup Grid", desc: "Standard glider configurations seeded. Preparing evolution." },
        { hour: 1, label: "LEVEL 1 (START)", title: "Insert Coin", desc: "Welcome player. Press Start to initiate Conway's Game of Life." }
    ];

    let campaignRoiEnabled = false;
    let roiHourTexts = [
        { hour: 12, label: "Social Media / Réseaux Sociaux", title: "Social Ads", desc: "ROI: 320% | CTR: 4.2% | Conversions: 12.4k. Strong engagement on video feeds. / ROI : 320% | CTR : 4,2% | Conversions : 12,4k. Fort engagement sur les flux vidéo." },
        { hour: 1, label: "Google Ads / Publicité Google", title: "Paid Search", desc: "ROI: 280% | CTR: 3.8% | Conversions: 8.5k. Target keywords optimizing well. / ROI : 280% | CTR : 3,8% | Conversions : 8,5k. Mots-clés cibles performants." },
        { hour: 2, label: "SEO / Référencement Naturel", title: "Organic Growth", desc: "ROI: 450% | CTR: 5.1% | Conversions: 15.2k. Long-term authority scaling up. / ROI : 450% | CTR : 5,1% | Conversions : 15,2k. Autorité à long terme en hausse." },
        { hour: 3, label: "Email Marketing / Campagnes Email", title: "Retention Engine", desc: "ROI: 520% | CTR: 6.8% | Conversions: 22.0k. Personalized automated flows live. / ROI : 520% | CTR : 6,8% | Conversions : 22,0k. Flux automatisés personnalisés actifs." },
        { hour: 4, label: "Influencers / Influenceurs", title: "Creator Network", desc: "ROI: 190% | CTR: 2.1% | Conversions: 4.1k. Brand awareness boost from reviews. / ROI : 190% | CTR : 2,1% | Conversions : 4,1k. Hausse de notoriété grâce aux revues." },
        { hour: 5, label: "Affiliate / Affiliation", title: "Partner Network", desc: "ROI: 240% | CTR: 3.0% | Conversions: 6.2k. High conversion from top coupon blogs. / ROI : 240% | CTR : 3,0% | Conversions : 6,2k. Conversion élevée via les blogs partenaires." },
        { hour: 6, label: "Video Ads / Publicités Vidéo", title: "YouTube Campaigns", desc: "ROI: 310% | CTR: 4.5% | Conversions: 11.0k. High retention on 15s bumper ads. / ROI : 310% | CTR : 4,5% | Conversions : 11,0k. Forte rétention sur les bumpers de 15s." },
        { hour: 7, label: "PR & Media / Relations Presse", title: "Press Outreach", desc: "ROI: 150% | CTR: 1.8% | Conversions: 2.5k. Premium publications link acquisition. / ROI : 150% | CTR : 1,8% | Conversions : 2,5k. Publications de premier choix." },
        { hour: 8, label: "Referral / Parrainage", title: "Viral Loop", desc: "ROI: 380% | CTR: 4.8% | Conversions: 14.1k. Referral code share frequency optimal. / ROI : 380% | CTR : 4,8% | Conversions : 14,1k. Fréquence optimale de partage." },
        { hour: 9, label: "Events / Événements", title: "Experiential Marketing", desc: "ROI: 90% | CTR: 1.2% | Conversions: 1.1k. Physical branding booth setups. / ROI : 90% | CTR : 1,2% | Conversions : 1,1k. Stands de marque physiques." },
        { hour: 10, label: "Display Ads / Bannières Web", title: "Retargeting Ads", desc: "ROI: 130% | CTR: 1.5% | Conversions: 3.4k. Banner layout dynamic testing. / ROI : 130% | CTR : 1,5% | Conversions : 3,4k. Tests dynamiques de bannières." },
        { hour: 11, label: "Audio Ads / Publicités Audio", title: "Podcast Spots", desc: "ROI: 110% | CTR: 1.4% | Conversions: 2.8k. Sponsorship reads on tech podcasts. / ROI : 110% | CTR : 1,4% | Conversions : 2,8k. Sponsoring de podcasts tech." }
    ];

    let brandCarouselEnabled = false;
    let brandHourTexts = [
        { hour: 12, label: "Nike Concept / Concept Nike", title: "Run the Night", desc: "Interactive AR overlay and limited glow edition runner pitch. / Filtres AR interactifs et présentation d'une édition lumineuse." },
        { hour: 1, label: "Coca-Cola Launch / Projet Coca-Cola", title: "Share a Pulse", desc: "Visualizing customer heartbeat to trigger neon dispenser rewards. / Utiliser les battements de cœur pour déclencher le distributeur." },
        { hour: 2, label: "Apple Store / Design Apple", title: "Infinite Horizon", desc: "Immersive 3D interactive web configurator and packaging. / Configurateur web 3D interactif et design packaging." },
        { hour: 3, label: "Tesla Pitch / Campagne Tesla", title: "Volt Storm", desc: "A simulation of storm energy harnessed inside charging ports. / Simulation d'énergie de tempête dans les bornes de recharge." },
        { hour: 4, label: "Netflix Cyber / Promo Netflix", title: "Binge Matrix", desc: "Interactive hologram panel billboard concepts in metropolitan centers. / Panneaux holographiques interactifs dans les centres urbains." },
        { hour: 5, label: "Disney Magic / Flux Disney", title: "Dream Stream", desc: "Augmented reality scavenger hunt app design for theme parks. / Application de chasse au trésor en réalité augmentée." },
        { hour: 6, label: "Porsche Showcase / Lancement Porsche", title: "Aero Glow", desc: "3D projection mapping detailing active aerodynamics on test tracks. / Projection mapping 3D sur l'aérodynamique active." },
        { hour: 7, label: "Starbucks Brew / Application Starbucks", title: "Brew Wave", desc: "Visualizing local store order patterns as coffee waves. / Modélisation des commandes locales sous forme de vagues." },
        { hour: 8, label: "Adidas Retro / Adidas Vintage", title: "Pixel Run", desc: "Web-GPU based pixel art game integration for limited shoes. / Jeu de pixel-art WebGPU pour des chaussures exclusives." },
        { hour: 9, label: "Sony VR / Présentation Sony VR", title: "Neural Vision", desc: "Design of virtual catalog space for VR headset integration. / Espace de catalogue virtuel pour les casques de réalité virtuelle." },
        { hour: 10, label: "Samsung Flex / Hologramme Samsung", title: "Flex Universe", desc: "Showcasing phone screens folding mapped to cosmos stars. / Écrans pliables de téléphone synchronisés avec le cosmos." },
        { hour: 11, label: "Audi e-tron / Audi Électrique", title: "Silent Power", desc: "Sound-wave interactive canvas translating electric vehicle sounds. / Canvas interactif traduisant le son des véhicules électriques." }
    ];

    let sentimentRadarEnabled = false;
    let sentimentHourTexts = [
        { hour: 12, label: "Variant A CTR / CTR Variante A", title: "Visual Optimization", desc: "CTR: 5.4% | Conversion: 8.2% | Status: Active. High response to cyan neon. / CTR : 5,4% | Conversion : 8,2% | Actif. Forte réponse au néon cyan." },
        { hour: 1, label: "Variant B CTR / CTR Variante B", title: "Copywriting Test", desc: "CTR: 4.8% | Conversion: 7.5% | Status: Control. Muted color palette response. / CTR : 4,8% | Conversion : 7,5% | Contrôle. Réponse atténuée aux couleurs." },
        { hour: 2, label: "US Audience / Public US", title: "Sentiment Analysis", desc: "Positive: 82% | Neutral: 12% | Negative: 6%. High brand engagement. / Positif : 82% | Neutre : 12% | Négatif : 6%. Fort engagement." },
        { hour: 3, label: "EU Audience / Public Européen", title: "Sentiment Analysis", desc: "Positive: 78% | Neutral: 15% | Negative: 7%. Strong response to sustainability messages. / Positif : 78% | Neutre : 15% | Négatif : 7%." },
        { hour: 4, label: "Brand Lift / Notoriété de Marque", title: "Gen Z Metric", desc: "Ad recall increased +22% over 30 days of campaign deployment. / Mémorisation publicitaire en hausse de +22% sur 30 jours." },
        { hour: 5, label: "Social Buzz / Volume de Buzz", title: "#BrandStorm Tag", desc: "Mention volume increased +450% after launch. Sentiment remains positive. / Volume des mentions en hausse de +450% après le lancement." },
        { hour: 6, label: "Variant A ROI / ROI Variante A", title: "Cost Efficiency", desc: "ROI: 310% | CPA: $1.20. Well within optimal target range. / ROI : 310% | CPA : 1,20 $. Dans la fourchette cible optimale." },
        { hour: 7, label: "Variant B ROI / ROI Variante B", title: "Cost Efficiency", desc: "ROI: 260% | CPA: $1.45. Slightly higher acquisition cost. / ROI : 260% | CPA : 1,45 $. Coût d'acquisition légèrement plus élevé." },
        { hour: 8, label: "Influencer Sentiment / Sentiment Influenceur", title: "Creator Buzz", desc: "Positive: 89% | Engagement: 11.2%. High conversion rate. / Positif : 89% | Engagement : 11,2%. Taux de conversion élevé." },
        { hour: 9, label: "Viral Index / Indice Viral", title: "Video Campaign", desc: "Views: 5.2M | Shares: 240k | Growth: Exponential. Viral hit verified. / Vues : 5,2M | Partages : 240k | Croissance exponentielle." },
        { hour: 10, label: "Audience Target / Ciblage Audience", title: "Ad Match Rate", desc: "Ad match rate: 94%. High affinity inside 18-34 years age brackets. / Taux de correspondance : 94%. Forte affinité chez les 18-34 ans." },
        { hour: 11, label: "CPC Control / Contrôle du CPC", title: "Bid Adjustment", desc: "CPC: $0.18 | Target CPC: $0.22. Performing optimally. / CPC : 0,18 $ | CPC cible : 0,22 $. Performance optimale." }
    ];

    let weatherDialEnabled = false;
    let aiAgentEnabled = false;
    let weatherHourTexts = [
        { hour: 12, label: "Current Weather / Temps Actuel", title: "Fetching Weather / Chargement...", desc: "Loading local real-time forecast data via Open-Meteo... / Chargement des prévisions en direct..." },
        { hour: 1, label: "+1 Hour / +1 Heure", title: "Forecast / Prévision", desc: "Loading... / Chargement..." },
        { hour: 2, label: "+2 Hours / +2 Heures", title: "Forecast / Prévision", desc: "Loading... / Chargement..." },
        { hour: 3, label: "+3 Hours / +3 Heures", title: "Forecast / Prévision", desc: "Loading... / Chargement..." },
        { hour: 4, label: "+4 Hours / +4 Heures", title: "Forecast / Prévision", desc: "Loading... / Chargement..." },
        { hour: 5, label: "+5 Hours / +5 Heures", title: "Forecast / Prévision", desc: "Loading... / Chargement..." },
        { hour: 6, label: "+6 Hours / +6 Heures", title: "Forecast / Prévision", desc: "Loading... / Chargement..." },
        { hour: 7, label: "+7 Hours / +7 Heures", title: "Forecast / Prévision", desc: "Loading... / Chargement..." },
        { hour: 8, label: "+8 Hours / +8 Heures", title: "Forecast / Prévision", desc: "Loading... / Chargement..." },
        { hour: 9, label: "+9 Hours / +9 Heures", title: "Forecast / Prévision", desc: "Loading... / Chargement..." },
        { hour: 10, label: "+10 Hours / +10 Heures", title: "Forecast / Prévision", desc: "Loading... / Chargement..." },
        { hour: 11, label: "+11 Hours / +11 Heures", title: "Forecast / Prévision", desc: "Loading... / Chargement..." }
    ];

    let socialContactEnabled = false;
    let socialContactHours = [
        { hour: 12, type: 'website', label: 'Official Website / Site Officiel', value: 'www.example.com', url: 'https://www.example.com' },
        { hour: 1, type: 'phone', label: 'Call Us / Appelez-nous', value: '+373 69 000 000', url: 'tel:+37369000000' },
        { hour: 2, type: 'telegram', label: 'Telegram Chat / Chat Telegram', value: '@yourusername', url: 'https://t.me/yourusername' },
        { hour: 3, type: 'facebook', label: 'Facebook Page / Page Facebook', value: 'yourpage', url: 'https://facebook.com/yourpage' },
        { hour: 4, type: 'youtube', label: 'YouTube Channel / Chaîne YouTube', value: 'yourchannel', url: 'https://youtube.com/c/yourchannel' },
        { hour: 5, type: 'whatsapp', label: 'WhatsApp Chat / Chat WhatsApp', value: 'Chat Now / Parler', url: 'https://wa.me/37369000000' },
        { hour: 6, type: 'instagram', label: 'Instagram Profile / Profil Instagram', value: '@yourinsta', url: 'https://instagram.com/yourinsta' },
        { hour: 7, type: 'linkedin', label: 'LinkedIn Profile / Profil LinkedIn', value: 'yourcompany', url: 'https://linkedin.com/company/yourcompany' },
        { hour: 8, type: 'x', label: 'Twitter / X', value: '@yourhandle', url: 'https://x.com/yourhandle' },
        { hour: 9, type: 'tiktok', label: 'TikTok Account / Compte TikTok', value: '@yourtiktok', url: 'https://tiktok.com/@yourtiktok' },
        { hour: 10, type: 'pinterest', label: 'Pinterest Boards / Tableaux Pinterest', value: '@yourpinterest', url: 'https://pinterest.com/yourpinterest' },
        { hour: 11, type: 'email', label: 'Send Email / Envoyer un Email', value: 'contact@example.com', url: 'mailto:contact@example.com' }
    ];

    let celestialTrackerEnabled = false;
    let celestialLocation = 'Auto';
    let celestialShowStars = true;
    let celestialHourTexts = [
        { hour: 12, label: "Le Soleil / The Sun", title: "Zenith Solaire / Solar Zenith", desc: "Le Soleil est au centre de notre système. Sa lumière met 8 min 20 s pour atteindre la Terre. / The Sun is at the centre of our system. Its light takes 8 min 20 s to reach Earth." },
        { hour: 11, label: "Mercure / Mercury", title: "L'Orbite la Plus Rapide / Fastest Orbit", desc: "Mercure est la planète la plus proche du Soleil. Un jour sur Mercure dure 59 jours terrestres. / Mercury is the closest planet to the Sun. One day on Mercury lasts 59 Earth days." },
        { hour: 10, label: "Vénus / Venus", title: "La Planète de Feu / The Fiery Planet", desc: "Vénus est la planète la plus chaude grâce à un effet de serre extrême, avec des températures dépassant 460°C. / Venus is the hottest planet due to an extreme greenhouse effect, with temperatures exceeding 460°C." },
        { hour: 9, label: "La Terre / Earth", title: "L'Oasis de la Vie / Oasis of Life", desc: "La Terre est la seule planète connue abritant la vie avec de l'eau liquide à sa surface. / Earth is the only known planet harbouring life with liquid water on its surface." },
        { hour: 8, label: "Mars / Mars", title: "La Planète Rouge / The Red Planet", desc: "Mars abrite le plus haut volcan du système solaire : l'Olympus Mons, culminant à 22 km. / Mars hosts the tallest volcano in the solar system: Olympus Mons, standing 22 km high." },
        { hour: 7, label: "Jupiter / Jupiter", title: "Le Grand Protecteur / The Great Protector", desc: "Jupiter est 318 fois plus massive que la Terre et possède une tempête géante active depuis 350 ans. / Jupiter is 318 times more massive than Earth and has a giant storm active for 350 years." },
        { hour: 6, label: "Saturne / Saturn", title: "Le Joyau des Anneaux / The Ringed Jewel", desc: "Saturne est célèbre pour ses anneaux complexes composés de glace, de poussière et de fragments rocheux. / Saturn is famous for its complex rings made of ice, dust and rock fragments." },
        { hour: 5, label: "Uranus / Uranus", title: "Le Géant de Glace / The Ice Giant", desc: "Uranus a une rotation unique : son axe est incliné à 98°, ce qui le fait rouler sur le côté. / Uranus has a unique rotation: its axis is tilted at 98°, making it roll on its side." },
        { hour: 4, label: "Neptune / Neptune", title: "La Planète des Tempêtes / Planet of Storms", desc: "Neptune possède les vents les plus puissants du système solaire, atteignant 2 100 km/h. / Neptune has the most powerful winds in the solar system, reaching 2,100 km/h." },
        { hour: 3, label: "La Lune / The Moon", title: "Le Compagnon Cosmique / Cosmic Companion", desc: "La Lune stabilise l'inclinaison de l'axe terrestre, rendant le climat plus stable et créant les marées. / The Moon stabilises Earth's axial tilt, making the climate more stable and creating the tides." },
        { hour: 2, label: "La Voie Lactée / Milky Way", title: "Notre Galaxie / Our Galaxy", desc: "La Voie Lactée contient plus de 100 milliards d'étoiles et un trou noir supermassif en son centre. / The Milky Way contains over 100 billion stars and a supermassive black hole at its centre." },
        { hour: 1, label: "Temps Cosmique / Cosmic Time", title: "L'Âge de l'Univers / Age of the Universe", desc: "L'Univers a environ 13,8 milliards d'années. Le temps cosmique mesure son expansion continue. / The Universe is about 13.8 billion years old. Cosmic time measures its ongoing expansion." }
    ];


    let kpiHourTexts = [
        { hour: 12, label: "January", title: "Launch Performance", desc: "Q1 kickoff: Revenue reached $1.2M with a user growth of +15% MoM." },
        { hour: 2, label: "February", title: "Product Optimization", desc: "Platform updates reduced churn. Revenue increased to $1.5M (+25%)." },
        { hour: 4, label: "March", title: "Marketing Expansion", desc: "Ad campaigns brought 50k new users. Revenue reached $1.8M (+20%)." },
        { hour: 6, label: "April", title: "Enterprise Adoption", desc: "Signed 5 new Fortune 500 contracts. Revenue hit $2.1M (+18%)." },
        { hour: 8, label: "May", title: "Partnership Network", desc: "Integrations with major SaaS providers live. Revenue reached $2.4M." },
        { hour: 10, label: "June", title: "Mid-Year Records", desc: "Mid-year review: record $3.0M monthly revenue and +30% user growth." }
    ];

    let radarHourTexts = [
        { hour: 12, label: "us-east", title: "North America (N. Virginia)", desc: "Uptime: 99.99% | Latency: 12ms. All database nodes online. Security systems nominal." },
        { hour: 2, label: "us-west", title: "North America (Oregon)", desc: "Uptime: 99.95% | Latency: 28ms. Backup server active. Synchronized with US-East." },
        { hour: 4, label: "eu-central", title: "Europe (Frankfurt)", desc: "Uptime: 99.98% | Latency: 15ms. Undergoing scheduled minor firmware patch." },
        { hour: 6, label: "ap-northeast", title: "Asia Pacific (Tokyo)", desc: "Uptime: 99.90% | Latency: 85ms. Network traffic steady. CPU load at 14%." },
        { hour: 8, label: "sa-east", title: "South America (São Paulo)", desc: "Uptime: 99.85% | Latency: 120ms. Secure. Connectivity normal. Primary databases synchronized." },
        { hour: 10, label: "af-south", title: "Africa (Cape Town)", desc: "Uptime: 99.70% | Latency: 190ms. CRITICAL: Minor DDoS attack mitigated by shield." }
    ];

    let roadmapHourTexts = [
        { hour: 12, label: "Year 2027", title: "AI Spatial Web v2.0", desc: "Deployment of generative AI model loaders for interactive 3D site builders." },
        { hour: 6, label: "Year 2028", title: "Eco-Friendly Headquarters", desc: "Moving operations to our newly constructed smart zero-carbon technology tower." },
        { hour: 10, label: "Year 2029", title: "Global Decentralized Mesh", desc: "Deployment of a global edge CDN mesh ensuring zero latency for assets." }
    ];

    let historyHourTexts = [
        { hour: 12, label: "2016", title: "Company Founded", desc: "Started with a small group of visionary designers in a tiny studio." },
        { hour: 2, label: "2018", title: "First Major Release", desc: "Released our custom 3D web rendering engine v1.0, enabling interactive site features." },
        { hour: 4, label: "2020", title: "Global Expansion", desc: "Opened remote branches in London, Paris, and Tokyo to serve clients." },
        { hour: 6, label: "2022", title: "Series A Funding", desc: "Raised $10M in Series A funding to expand our interactive solutions." },
        { hour: 8, label: "2024", title: "AI & Neural Integration", desc: "Added AI generative modeling helpers directly inside our 3D composer interface." },
        { hour: 10, label: "2026", title: "Clock Ultra Engine", desc: "Released the Clock Ultra Engine - the ultimate high-fidelity custom widget." }
    ];

    let teamHourTexts = [
        { hour: 12, name: "Alice Smith", role: "Chief Executive Officer", email: "alice.smith@clockultra.com", bio: "Visionary leader driving innovation and digital expansion globally." },
        { hour: 1, name: "Bob Jones", role: "Technical Director", email: "bob.jones@clockultra.com", bio: "Full-stack wizard orchestrating secure, high-performance cloud architectures." },
        { hour: 2, name: "Charlie Brown", role: "Lead Product Designer", email: "charlie.brown@clockultra.com", bio: "Crafting beautiful, user-centric interfaces with passion." },
        { hour: 3, name: "Diana Prince", role: "Senior Project Manager", email: "diana.prince@clockultra.com", bio: "Ensuring flawless execution and perfect delivery of complex solutions." },
        { hour: 4, name: "Ethan Hunt", role: "Security Operations", email: "ethan.hunt@clockultra.com", bio: "Protecting user data and guaranteeing maximum integrity." },
        { hour: 5, name: "Fiona Gallagher", role: "Lead Frontend Dev", email: "fiona.g@clockultra.com", bio: "Transforming design prototypes into rich, interactive 3D realities." },
        { hour: 6, name: "George Clark", role: "Cloud & Devops", email: "george.c@clockultra.com", bio: "Scaling server capacity and guaranteeing 99.9% application uptime." },
        { hour: 7, name: "Hannah Abbott", role: "QA Lead Engineer", email: "hannah.a@clockultra.com", bio: "Meticulously testing every edge case to ensure perfection." },
        { hour: 8, name: "Ian Malcolm", role: "Data Scientist", email: "ian.m@clockultra.com", bio: "Analyzing user metrics to dynamically improve performance." },
        { hour: 9, name: "Julia Roberts", role: "Marketing Director", email: "julia.r@clockultra.com", bio: "Connecting our premium products with millions of users worldwide." },
        { hour: 10, name: "Kevin Bacon", role: "Customer Experience", email: "kevin.b@clockultra.com", bio: "Dedicated to solving customer issues with empathy and speed." },
        { hour: 11, name: "Laura Croft", role: "Mobile Platforms Dev", email: "laura.c@clockultra.com", bio: "Optimizing responsive graphics for mobile experiences." }
    ];

    let worldHourTexts = [
        { hour: 12, name: "London", country: "United Kingdom", zone: "Europe/London" },
        { hour: 1, name: "Paris", country: "France", zone: "Europe/Paris" },
        { hour: 2, name: "Bucharest", country: "Romania", zone: "Europe/Bucharest" },
        { hour: 3, name: "Dubai", country: "United Arab Emirates", zone: "Asia/Dubai" },
        { hour: 4, name: "New Delhi", country: "India", zone: "Asia/Kolkata" },
        { hour: 5, name: "Bangkok", country: "Thailand", zone: "Asia/Bangkok" },
        { hour: 6, name: "Tokyo", country: "Japan", zone: "Asia/Tokyo" },
        { hour: 7, name: "Sydney", country: "Australia", zone: "Australia/Sydney" },
        { hour: 8, name: "Auckland", country: "New Zealand", zone: "Pacific/Auckland" },
        { hour: 9, name: "New York", country: "United States", zone: "America/New_York" },
        { hour: 10, name: "Chicago", country: "United States", zone: "America/Chicago" },
        { hour: 11, name: "Los Angeles", country: "United States", zone: "America/Los_Angeles" }
    ];

    // 5 New Focus & Utility features
    let navigatorMenuEnabled = false;
    let clockToBookEnabled = false;
    let businessHoursRingEnabled = false;
    let businessHoursStart = 9;
    let businessHoursEnd = 18;
    let analyticsDisplayEnabled = false;
    let pomodoroTimerEnabled = false;
    let weatherWeatherSyncEnabled = false;
    let blueLightFilterEnabled = false;
    let soundscapeMixerEnabled = false;

    // Feature 3: Team Members per Hour
    let teamMembersEnabled = false;
    let teamMembers = [
        { hour: 12, name: 'Alex Martin', role: 'CEO & Founder', email: 'alex@company.com', photo: '' },
        { hour: 1,  name: 'Sophie Blanc', role: 'Creative Director', email: 'sophie@company.com', photo: '' },
        { hour: 2,  name: 'Luca Ferrari', role: 'Lead Developer', email: 'luca@company.com', photo: '' },
        { hour: 3,  name: 'Emma Dubois', role: 'UX Designer', email: 'emma@company.com', photo: '' },
        { hour: 4,  name: 'Noah Patel', role: 'Marketing Manager', email: 'noah@company.com', photo: '' },
        { hour: 5,  name: 'Mia Schmidt', role: 'Sales Lead', email: 'mia@company.com', photo: '' },
        { hour: 6,  name: 'James Chen', role: 'Backend Engineer', email: 'james@company.com', photo: '' },
        { hour: 7,  name: 'Aria López', role: '3D Artist', email: 'aria@company.com', photo: '' },
        { hour: 8,  name: 'Rayan Costa', role: 'DevOps Engineer', email: 'rayan@company.com', photo: '' },
        { hour: 9,  name: 'Zoe Müller', role: 'Data Analyst', email: 'zoe@company.com', photo: '' },
        { hour: 10, name: 'Hugo Rossi', role: 'Product Manager', email: 'hugo@company.com', photo: '' },
        { hour: 11, name: 'Chloe Kim', role: 'Support Specialist', email: 'chloe@company.com', photo: '' }
    ];


    // Soundscape Node volumes & references
    let soundscapeRainVol = 0;
    let soundscapeWindVol = 0;
    let soundscapeBinauralVol = 0;
    
    // Pomodoro status
    let pomodoroDuration = 25; // minutes
    let pomodoroRunning = false;
    let pomodoroTimeRemaining = 0; // seconds

    // Audio State
    let lastTickedSecond = -1;
    let alarmInterval = null;
    let playbackAudioCtx = null;
    let soundscapeRainGain = null;
    let soundscapeWindGain = null;
    let soundscapeBinauralGain = null;
    let soundscapeRainSource = null;
    let soundscapeWindSource = null;
    let soundscapeBinauralSourceL = null;
    let soundscapeBinauralSourceR = null;
    let soundscapeWindFilter = null;
    let soundscapeWindLFO = null;

    // Radio State
    let radioEnabled = false;
    let radioFrequency = 90.0;
    let radioVolume = 0.5;
    let radioAudio = null;
    let radioStaticNode = null;
    let radioStaticGain = null;

    const radioStations = [
        { freq: 90.2, name: 'Lofi Cafe', url: 'https://ice1.somafm.com/groovesalad-128-mp3' },
        { freq: 94.5, name: 'Jazz Classics', url: 'https://jazz.streamr.ru/jazz-128.mp3' },
        { freq: 98.8, name: 'Cyber Synth', url: 'https://ice1.somafm.com/defcon-128-mp3' },
        { freq: 102.4, name: 'Deep Chill', url: 'https://ice1.somafm.com/lush-128-mp3' },
        { freq: 106.8, name: 'Electro Dance', url: 'https://ice1.somafm.com/beatblender-128-mp3' }
    ];

    function ensureRadioStatic() {
        try {
            const ctx = getPlaybackAudioContext();
            if (!ctx) return;
            if (!radioStaticGain) {
                radioStaticGain = ctx.createGain();
                radioStaticGain.gain.setValueAtTime(0, ctx.currentTime);
                radioStaticGain.connect(ctx.destination);
            }
            if (!radioStaticNode) {
                const bufferSize = 2 * ctx.sampleRate;
                const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const output = noiseBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    output[i] = Math.random() * 2 - 1;
                }
                radioStaticNode = ctx.createBufferSource();
                radioStaticNode.buffer = noiseBuffer;
                radioStaticNode.loop = true;
                radioStaticNode.connect(radioStaticGain);
                whiteNoiseSource = radioStaticNode;
                radioStaticNode.start(0);
            }
        } catch (e) {
            console.warn("Failed to create radio static noise:", e);
        }
    }

    function playRadioStation(url) {
        if (!radioAudio) {
            radioAudio = new Audio();
        }
        if (radioAudio.src !== url) {
            radioAudio.src = url;
            radioAudio.load();
        }
        if (radioAudio.paused) {
            radioAudio.play().catch(err => {
                console.warn("Audio autoplay blocked or stream failed:", err);
            });
        }
    }

    function pauseRadioStation() {
        if (radioAudio && !radioAudio.paused) {
            radioAudio.pause();
        }
    }

    function stopRadioAudio() {
        pauseRadioStation();
        if (radioStaticNode) {
            try {
                radioStaticNode.stop();
            } catch(e) {}
            radioStaticNode = null;
        }
        if (radioStaticGain) {
            try {
                radioStaticGain.disconnect();
            } catch(e) {}
            radioStaticGain = null;
        }
    }

    function tuneRadio() {
        if (!radioEnabled) {
            stopRadioAudio();
            return;
        }
        let nearest = null;
        let minDist = 999;
        for (const st of radioStations) {
            const dist = Math.abs(radioFrequency - st.freq);
            if (dist < minDist) {
                minDist = dist;
                nearest = st;
            }
        }
        ensureRadioStatic();
        let staticVol = 0;
        let stationVol = 0;
        if (minDist <= 0.201) {
            const strength = 1.0 - (minDist / 0.2);
            stationVol = strength * radioVolume;
            staticVol = (1.0 - strength) * 0.45 * radioVolume;
            playRadioStation(nearest.url);
        } else {
            staticVol = 0.45 * radioVolume;
            stationVol = 0;
            pauseRadioStation();
        }
        if (radioStaticGain && playbackAudioCtx) {
            const now = playbackAudioCtx.currentTime;
            radioStaticGain.gain.setValueAtTime(staticVol, now);
        }
        if (radioAudio) {
            radioAudio.volume = stationVol;
        }
    }

    function getPlaybackAudioContext() {
        if (!playbackAudioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            playbackAudioCtx = new AudioContextClass();
        }
        if (playbackAudioCtx && playbackAudioCtx.state === 'suspended') {
            playbackAudioCtx.resume().catch(() => {});
        }
        return playbackAudioCtx;
    }

    window._clockBatteryLevel = 1.0;
    if (navigator.getBattery) {
        try {
            navigator.getBattery().then(battery => {
                window._clockBatteryLevel = battery.level;
                battery.addEventListener('levelchange', () => {
                    window._clockBatteryLevel = battery.level;
                });
            }).catch(err => {
                console.warn("Battery status API promise rejected:", err);
            });
        } catch (err) {
            console.warn("Battery status API access error:", err);
        }
    }

    function getConvexHull(points) {
        if (points.length <= 3) return points.slice();
        points.sort((a, b) => a.x !== b.x ? a.x - b.x : a.y - b.y);
        const lower = [];
        for (let i = 0; i < points.length; i++) {
            while (lower.length >= 2 && crossProduct(lower[lower.length - 2], lower[lower.length - 1], points[i]) <= 0) {
                lower.pop();
            }
            lower.push(points[i]);
        }
        const upper = [];
        for (let i = points.length - 1; i >= 0; i--) {
            while (upper.length >= 2 && crossProduct(upper[upper.length - 2], upper[upper.length - 1], points[i]) <= 0) {
                upper.pop();
            }
            upper.push(points[i]);
        }
        upper.pop();
        lower.pop();
        return lower.concat(upper);
    }
    function crossProduct(o, a, b) {
        return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    }

    function getSilhouetteContour(alphaGrid, w, h) {
        let startX = -1, startY = -1;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (alphaGrid[y][x]) {
                    if (x === 0 || !alphaGrid[y][x-1]) {
                        startX = x;
                        startY = y;
                        break;
                    }
                }
            }
            if (startX !== -1) break;
        }
        if (startX === -1) return [];

        const path = [];
        let cx = startX;
        let cy = startY;
        
        const dirs = [
            {dx: -1, dy: 0},
            {dx: -1, dy: -1},
            {dx: 0, dy: -1},
            {dx: 1, dy: -1},
            {dx: 1, dy: 0},
            {dx: 1, dy: 1},
            {dx: 0, dy: 1},
            {dx: -1, dy: 1}
        ];

        let backtrackDir = 0;
        let sX = startX, sY = startY;
        let currX = startX, currY = startY;
        let visited = new Set();
        let maxSteps = w * h * 2;
        let step = 0;
        
        while (step < maxSteps) {
            path.push({ x: currX, y: currY });
            const key = `${currX},${currY}`;
            visited.add(key);

            let found = false;
            for (let i = 0; i < 8; i++) {
                const dIdx = (backtrackDir + i) % 8;
                const nx = currX + dirs[dIdx].dx;
                const ny = currY + dirs[dIdx].dy;
                if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                    if (alphaGrid[ny][nx]) {
                        currX = nx;
                        currY = ny;
                        backtrackDir = (dIdx + 5) % 8;
                        found = true;
                        break;
                    }
                }
            }
            if (!found) break;
            if (currX === sX && currY === sY) break;
            step++;
        }
        return path;
    }

    function analyzeImageOutline(dataUrl, callback) {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxDim = 64;
            let w = img.width;
            let h = img.height;
            if (w > h) {
                h = Math.round((h * maxDim) / w);
                w = maxDim;
            } else {
                w = Math.round((w * maxDim) / h);
                h = maxDim;
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            
            let imgData;
            try {
                imgData = ctx.getImageData(0, 0, w, h);
            } catch(e) {
                callback(null, null);
                return;
            }
            
            const data = imgData.data;
            let minX = w, maxX = 0, minY = h, maxY = 0;
            let hasOpaque = false;
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const idx = (y * w + x) * 4;
                    const alpha = data[idx + 3];
                    if (alpha > 50) {
                        hasOpaque = true;
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }
            
            if (hasOpaque) {
                const cx = (minX + maxX) / 2;
                const cy = (minY + maxY) / 2;
                const spanX = maxX - minX;
                const spanY = maxY - minY;
                const maxSpan = Math.max(spanX, spanY) || 1;
                const scaleFactor = 60 / maxSpan;

                const alphaGrid = [];
                for (let y = 0; y < h; y++) {
                    alphaGrid[y] = new Array(w).fill(false);
                }

                const pts = [];
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        const idx = (y * w + x) * 4;
                        const alpha = data[idx + 3];
                        if (alpha > 50) {
                            alphaGrid[y][x] = true;
                            const nx = (x - cx) * scaleFactor;
                            const ny = (cy - y) * scaleFactor;
                            pts.push({ x: nx, y: ny });
                        }
                    }
                }
                
                const hull = getConvexHull(pts);
                const contourGridPts = getSilhouetteContour(alphaGrid, w, h);
                const silhouette = contourGridPts.map(p => ({
                    x: (p.x - cx) * scaleFactor,
                    y: (cy - p.y) * scaleFactor
                }));
                callback(hull, silhouette);
            } else {
                callback(null, null);
            }
        };
        img.onerror = () => callback(null, null);
        img.src = dataUrl;
    }

    const T = {
        en: {
            title: '🕒💎 Clock Ultra Engine',
            uploadLabel: 'Upload Dial Background',
            uploadHint: 'Supports PNG, JPG, or DXF files',
            dxfLoaded: 'DXF Loaded:',
            imgLoaded: 'Image loaded successfully.',
            noFile: 'No file selected',
            pivotGroup: '📐 Pivot/Center Offset',
            pivotXLabel: 'Offset X (Horizontal)',
            pivotYLabel: 'Offset Y (Vertical)',
            handsGroup: '⚔️ Clock Hands Config',
            handHColorLabel: 'Hour Hand Color',
            handHLengthLabel: 'Hour Hand Length',
            handHWidthLabel: 'Hour Hand Width',
            handMColorLabel: 'Minute Hand Color',
            handMLengthLabel: 'Minute Hand Length',
            handMWidthLabel: 'Minute Hand Width',
            handSColorLabel: 'Second Hand Color',
            handSLengthLabel: 'Second Hand Length',
            handSWidthLabel: 'Second Hand Width',
            styleLabel: 'Hands Geometry Style',
            markerGroup: '🔢 Dial Markers & Ticks',
            markerStyleLabel: 'Markers Style',
            markerColorLabel: 'Markers Color',
            markerRadiusLabel: 'Markers Radius',
            markerSizeLabel: 'Markers Scale',
            optionsGroup: '✨ Premium Overlays',
            glassLabel: 'Mineral Glass Cover (Specular Glare)',
            soundLabel: 'Synthesized Tick-Tock Audio',
            alarmLabel: 'Alarm Strike Timer (HH:MM)',
            alarmTest: '🔔 Test Alarm Strike',
            alarmStop: '🔕 Silence Alarm',
            faceGroup: '🎨 Clock Base Style',
            shapeLabel: 'Clock Shape',
            metalLabel: 'Outer Bezel Metal',
            metalNone: 'None (No Bezel)',
            fuseBtn: '⚡ Fuse & Export Clock',
            errNoScene: '⚠️ Create a 3D scene first, then launch the Clock Ultra mechanism!',
            successFused: '✅ Clock Ultra fused into scene - standalone ready!',
            statusLabel: 'Aesthetic Mode',
            shapeCircle: 'Circle',
            shapeSquare: 'Square',
            shapeNone: 'None',
            shapeCustom: 'Custom Shape',
            shapeSilhouette: 'Exact Silhouette',
            glowLabel: 'Ambient Backlight Glow',
            glowColorLabel: 'Glow Color',
            parallaxLabel: '3D Mouse Parallax Tilt',
            glareSweepLabel: 'Automated Glare Sweep',
            gearsLabel: 'Skeletal Mechanical Gears',
            neonBorderLabel: 'Glowing Neon Border',
            neonBorderColorLabel: 'Neon Color',
            markerNone: 'None',
            markerLines: 'Lines',
            markerDots: 'Dots',
            markerRoman: 'Roman',
            markerArabic: 'Arabic',
            faceColorLabel: 'Dial Background Color',
            modelColorLabel: 'Model/Logo Color',
            chronoLabel: 'Chronograph Stopwatch',
            chronoEnabledLabel: 'Enable Chronograph',
            chronoStart: 'Start',
            chronoReset: 'Reset',
            chronoColorLabel: 'Sub-Dial Color',
            chronoNeedleColorLabel: 'Chrono Needle Color',
            tourbillonLabel: 'Tourbillon Escapement Osc.',
            moonPhaseLabel: 'Astrolabe Moon Phase',
            liquidNeonLabel: 'Liquid Neon Tracks',
            steamPipesLabel: 'Pipes & Steam particles',
            holoHudLabel: 'Cyber Holographic HUD',
            textGroup: '✍️ Custom Dial Text',
            textLabel: 'Text Content',
            textColorLabel: 'Text Color',
            textSizeLabel: 'Text Size',
            textFontLabel: 'Font Family',
            textXLabel: 'Offset X',
            textYLabel: 'Offset Y',
            textRotLabel: 'Text Rotation',
            textOrientLabel: 'Text Flow',
            textPresetLabel: 'Styling Effect',
            textWarpLabel: 'Warp along Circle',
            textWarpRadLabel: 'Warp Radius',
            textPulseLabel: 'Pulse with Clock Tick',
            textPresetsLabel: 'Quick Position Presets',
            textPresetTop: 'Top Curve',
            textPresetBottom: 'Bottom Curve',
            textPresetCenter: 'Center',
            billboardLayoutTitle: 'Layout & QR Settings',
            billboardLayoutLabel: 'Layout:',
            billboardLayoutGlassCard: 'Centered Card',
            billboardLayoutSplitHalf: 'Left Split',
            billboardLayoutMinimalBanner: 'Bottom Banner',
            billboardShowQrLabel: 'Show QR Code (CTA)',
            billboardMediaFitLabel: 'Media Fit:',
            billboardMediaScaleLabel: 'Media Scale (%):',
            billboardMediaXLabel: 'Media Pos X (%):',
            billboardMediaYLabel: 'Media Pos Y (%):',
            
            advDialLabel: '🎭 Advanced Dial Themes & Effects',
            dialTextureLabel: 'Background Texture',
            weatherOverlayLabel: 'Weather Overlay',
            dynamicTimeColorLabel: 'Dynamic Time Color Shift',
            audioReactiveLabel: 'EKG Telemetry Waveform (Heartbeat)',
            subDialModeLabel: 'Sub-Dials Display Mode',
            radioLabel: '📻 Live Internet Radio Tuner',
            radioFreqLabel: 'Tuning Frequency',
            radioVolLabel: 'Radio Volume',
            textureNone: 'None',
            textureCarbon: 'Forged Carbon',
            textureSunburst: 'Sunburst Metal',
            textureMarble: 'White Marble',
            textureWood: 'Wood Grain',
            textureSidef: 'Mother of Pearl',
            weatherNone: 'None',
            weatherRain: 'Rain overlay',
            weatherSnow: 'Snow drifts',
            weatherMist: 'Foggy mist',
            subDialChrono: 'Chronograph',
            subDialBattery: 'Battery Gauge',
            subDialGMT: 'GMT Dual Time',
            subDialPerformance: 'Rendering FPS',
            subDialCountdown: 'Event Countdown',
            newFeaturesGroup: '💎 Ultra-Premium Extras',
            themePresetLabel: 'Design Theme Preset',
            timeTravelLabel: 'Interactive Time Travel',
            timeTravelAutoReturnLabel: 'Auto-Return to Real Time',
            cursorMagnetismLabel: 'Cursor Gravity/Magnetism',
            ambientTickLabel: 'Synthesized Ambient Tick',
            hourlyChimeLabel: 'Resonant Hourly Chimes',
            countdownTargetLabel: 'Countdown Target Date/Time',
            testChimeLabel: '🎵 Test Chime Tone',
            navigatorMenuEnabledLabel: '3D Website Menu Redirection',
            clockToBookEnabledLabel: 'Clock-to-Book Appointment Scheduling',
            businessHoursRingEnabledLabel: 'Business Hours Visual Ring',
            analyticsDisplayEnabledLabel: 'Real-Time Web Analytics Simulation',
            pomodoroTimerEnabledLabel: 'Interactive Pomodoro Focus Timer',
            weatherWeatherSyncEnabledLabel: 'Adaptive Local Weather Particle Sync',
            blueLightFilterEnabledLabel: 'Adaptive Night Blue-Light Filter',
            soundscapeMixerEnabledLabel: 'ASMR Ambient Soundscape Mixer',
            soundscapeRainLabel: 'Rain Soundscape Volume',
            soundscapeWindLabel: 'Wind Soundscape Volume',
            soundscapeBinauralLabel: 'Binaural Focus Beat Volume',
            pomodoroStartBtn: 'Start Focus Session',
            pomodoroStopBtn: 'Stop Focus Session',
            pomodoroFocusTimeLabel: 'Focus Duration (minutes)',
            teamMembersEnabledLabel: '👥 Team Members per Hour Dial',
            historyTimelineEnabledLabel: '📜 Interactive History & Milestones',
            teamPresenceRingEnabledLabel: '🟢 Remote Team Presence Ring',
            kpiDashboardEnabledLabel: '📊 KPI & Financial Dashboard 3D',
            securityRadarEnabledLabel: '🛡️ Security Radar & Server Health',
            audioVisualizerEnabledLabel: '🎙️ Audio Visualizer 3D',
            futureRoadmapEnabledLabel: '🚀 Future Roadmap & Milestones',
            financialTickerEnabledLabel: '📈 Crypto & Financial Live Ticker',
            financialAssetLabel: 'Financial Asset:',
            financialCurrencyLabel: 'Currency:',
            celestialTrackerEnabledLabel: '🌌 Celestial Orbit Tracker',
            celestialShowStarsLabel: 'Show Background Stars',
            astrologicalBiorhythmEnabledLabel: '🧭 Astrology & Biorhythm Dial',
            birthdateInputLabel: 'Birthdate:',
            worldGlobeEnabledLabel: '🌍 World Globe Timezones',
            retroArcadeEnabledLabel: '🎮 Retro Arcade Game of Life',
            campaignRoiEnabledLabel: '📈 Campaign ROI Heatmap',
            brandCarouselEnabledLabel: '💡 Creative Brand Showcase',
            sentimentRadarEnabledLabel: '🎭 A/B Sentiment Radar',
            weatherDialEnabledLabel: '🌍 Live Weather & Forecast Dial',
            socialContactEnabledLabel: '🔗 Social & Contact Dial (Link-in-Bio)',
            socialChannelType: 'Channel Type:',
            socialChannelLabel: 'Button Label:',
            socialChannelValue: 'Display Text / Username:',
            socialChannelUrl: 'Target URL / Action Link:',
            hourEditorTitle: '📝 Edit Hour Contents',
            hourSelectLabel: 'Select Hour:',
            aiAgentEnabledLabel: '🤖 AI Assistant & Pulsing Dial',
            exportWhiteLabelLabel: '⚪ White-Label (Hide Settings Panel in Export)',
            radioTvGroup: '📺 Radio & TV Online Media Center',
            radioTvEnabledLabel: 'Enable Radio TV Media Screen',
            radioTvStyleLabel: 'Television Bezel Style',
            radioTvAspectLabel: 'Aspect Ratio',
            radioTvScaleLabel: 'Screen Scale',
            radioTvChannelLabel: 'TV / Radio Station',
            radioTvCustomUrlLabel: 'Custom Stream URL',
            radioTvCustomTypeLabel: 'Stream Media Type',
            radioTvVolumeLabel: 'Media Player Volume',
            radioTvPositionXLabel: 'Horizontal Position X (%)',
            radioTvPositionYLabel: 'Vertical Position Y (%)'
        },
        fr: {
            title: '🕒💎 Moteur Clock Ultra',
            uploadLabel: 'Charger Fond du Cadran',
            uploadHint: 'Fichiers PNG, JPG, ou DXF supportés',
            dxfLoaded: 'DXF Chargé:',
            imgLoaded: 'Image chargée avec succès.',
            noFile: 'Aucun fichier sélectionné',
            pivotGroup: '📐 Décalage du Pivot Central',
            pivotXLabel: 'Décalage X (Horizontal)',
            pivotYLabel: 'Décalage Y (Vertical)',
            handsGroup: '⚔️ Config des Aiguilles',
            handHColorLabel: 'Couleur Aiguille Heures',
            handHLengthLabel: 'Longueur des Heures',
            handHWidthLabel: 'Largeur des Heures',
            handMColorLabel: 'Couleur Aiguille Minutes',
            handMLengthLabel: 'Longueur des Minutes',
            handMWidthLabel: 'Largeur des Minutes',
            handSColorLabel: 'Couleur Aiguille Secondes',
            handSLengthLabel: 'Longueur des Secondes',
            handSWidthLabel: 'Largeur des Secondes',
            styleLabel: 'Style des Aiguilles',
            markerGroup: '🔢 Repères & Chiffres',
            markerStyleLabel: 'Style de Repères',
            markerColorLabel: 'Couleur des Repères',
            markerRadiusLabel: 'Rayon des Repères',
            markerSizeLabel: 'Échelle des Repères',
            optionsGroup: '✨ Effets Premium',
            glassLabel: 'Verre Minéral Effet Brillance',
            soundLabel: 'Audio Synthesizer (Tic-Tac)',
            alarmLabel: 'Réglage Alarme (HH:MM)',
            alarmTest: '🔔 Tester le Chime d\'Alarme',
            alarmStop: '🔕 Silencer l\'Alarme',
            faceGroup: '🎨 Style du Socle',
            shapeLabel: 'Forme du Cadran',
            metalLabel: 'Métal du Bezel Externe',
            metalNone: 'Aucun (Sans Bezel)',
            fuseBtn: '⚡ Fusionner & Exporter',
            errNoScene: '⚠️ Créez d\'abord une scène 3D pour lancer le mécanisme Clock Ultra !',
            successFused: '✅ Clock Ultra fusionné dans la scène - autonome prêt !',
            statusLabel: 'Mode Esthétique',
            shapeCircle: 'Cercle',
            shapeSquare: 'Carré',
            shapeNone: 'Sans Forme',
            shapeCustom: 'Importé',
            shapeSilhouette: 'Silhouette',
            glowLabel: 'Halo Lumineux Ambiant',
            glowColorLabel: 'Couleur du Halo',
            parallaxLabel: 'Parallaxe Souris 3D',
            glareSweepLabel: 'Balayage de Reflet Auto',
            gearsLabel: 'Engrenages Mécaniques (Squelette)',
            neonBorderLabel: 'Bordure Néon Lumineuse',
            neonBorderColorLabel: 'Couleur du Néon',
            markerNone: 'Aucun',
            markerLines: 'Lignes',
            markerDots: 'Points',
            markerRoman: 'Romain',
            markerArabic: 'Arabe',
            faceColorLabel: 'Couleur de Fond',
            modelColorLabel: 'Couleur du Modèle/Logo',
            chronoLabel: 'Chronomètre Chronographe',
            chronoEnabledLabel: 'Activer le Chronographe',
            chronoStart: 'Démarrer',
            chronoReset: 'Réinit.',
            chronoColorLabel: 'Couleur Sous-Cadrans',
            chronoNeedleColorLabel: 'Couleur Aiguilles Chrono',
            tourbillonLabel: 'Oscillation Échappement Tourbillon',
            moonPhaseLabel: 'Phase de Lune Astrolabe',
            liquidNeonLabel: 'Pistes Néon Liquide concentriques',
            steamPipesLabel: 'Tuyaux & Émissions de Vapeur',
            holoHudLabel: 'HUD Holographique Cyber',
            textGroup: '✍️ Texte Personnalisé',
            textLabel: 'Contenu du Texte',
            textColorLabel: 'Couleur du Texte',
            textSizeLabel: 'Taille du Texte',
            textFontLabel: 'Police',
            textXLabel: 'Décalage X',
            textYLabel: 'Décalage Y',
            textRotLabel: 'Rotation du Texte',
            textOrientLabel: 'Sens de Lecture',
            textPresetLabel: 'Effet de Style',
            textWarpLabel: 'Enrouler en Cercle',
            textWarpRadLabel: 'Rayon de Courbure',
            textPulseLabel: 'Pulsation avec le Tic-Tac',
            textPresetsLabel: 'Positions Prédéfinies',
            textPresetTop: 'Courbe Haut',
            textPresetBottom: 'Courbe Bas',
            textPresetCenter: 'Centré',
            billboardLayoutTitle: 'Réglages Layout & QR',
            billboardLayoutLabel: 'Layout :',
            billboardLayoutGlassCard: 'Carte Centrée',
            billboardLayoutSplitHalf: 'Split Gauche',
            billboardLayoutMinimalBanner: 'Bannière Bas',
            billboardShowQrLabel: 'Afficher le Code QR (CTA)',
            billboardMediaFitLabel: 'Ajustement Média :',
            billboardMediaScaleLabel: 'Échelle Média (%) :',
            billboardMediaXLabel: 'Pos Média X (%) :',
            billboardMediaYLabel: 'Pos Média Y (%) :',
            
            advDialLabel: '🎭 Thèmes & Effets de Cadran Avancés',
            dialTextureLabel: 'Texture du Fond',
            weatherOverlayLabel: 'Effet Météo',
            dynamicTimeColorLabel: 'Couleur Dynamique Selon l\'Heure',
            audioReactiveLabel: 'Onde de Télémétrie EKG (Pulsation)',
            subDialModeLabel: 'Mode des Sous-Cadrans',
            radioLabel: '📻 Tuner Radio Internet Live',
            radioFreqLabel: 'Fréquence d\'Accord',
            radioVolLabel: 'Volume de la Radio',
            textureNone: 'Aucune',
            textureCarbon: 'Carbone Forgé',
            textureSunburst: 'Métal Brossé',
            textureMarble: 'Marbre Blanc',
            textureWood: 'Fibre de Bois',
            textureSidef: 'Nacre (Sidef)',
            weatherNone: 'Aucun',
            weatherRain: 'Pluie Tombante',
            weatherSnow: 'Chute de Neige',
            weatherMist: 'Brume Translucide',
            subDialChrono: 'Chronographe',
            subDialBattery: 'Niveau Batterie',
            subDialGMT: 'Second Fuseau GMT',
            subDialPerformance: 'FPS / Performance',
            subDialCountdown: 'Compte à Rebours',
            newFeaturesGroup: '💎 Options Ultra-Premium',
            themePresetLabel: 'Présélection de Design',
            timeTravelLabel: 'Voyage Interactif dans le Temps',
            timeTravelAutoReturnLabel: 'Retour Automatique en Temps Réel',
            cursorMagnetismLabel: 'Gravité / Magnetisme du Curseur',
            ambientTickLabel: 'Tictac Ambiant Synthétisé',
            hourlyChimeLabel: 'Carillon Horaire Résonant',
            countdownTargetLabel: 'Date/Heure Cible',
            testChimeLabel: '🎵 Tester le Carillon',
            navigatorMenuEnabledLabel: 'Redirection Menu Site 3D',
            clockToBookEnabledLabel: 'Réservation par l\'Horloge (Clock-to-Book)',
            businessHoursRingEnabledLabel: 'Anneau des Horaires d\'Ouverture',
            analyticsDisplayEnabledLabel: 'Simulation de Statistiques Live',
            pomodoroTimerEnabledLabel: 'Minuteur Pomodoro Focus',
            weatherWeatherSyncEnabledLabel: 'Météo Particulaire Adaptative',
            blueLightFilterEnabledLabel: 'Filtre de Lumière Bleue Nocturne',
            soundscapeMixerEnabledLabel: 'Mixeur d\'Ambiance ASMR Focus',
            soundscapeRainLabel: 'Bruit de Pluie',
            soundscapeWindLabel: 'Vent Sylvestre',
            soundscapeBinauralLabel: 'Ondes Binaurales',
            pomodoroStartBtn: 'Démarrer Pomodoro',
            pomodoroStopBtn: 'Arrêter Pomodoro',
            pomodoroFocusTimeLabel: 'Durée du Focus (minutes)',
            teamMembersEnabledLabel: '👥 Membres d\'Équipe par Heure',
            historyTimelineEnabledLabel: '📜 Historique Interactif & Jalons',
            teamPresenceRingEnabledLabel: '🟢 Anneau de Présence Équipe Distante',
            kpiDashboardEnabledLabel: '📊 Tableau de Bord KPI 3D',
            securityRadarEnabledLabel: '🛡️ Radar de Sécurité & Statut Server',
            audioVisualizerEnabledLabel: '🎙️ Visualiseur Audio 3D',
            futureRoadmapEnabledLabel: '🚀 Feuille de Route & Jalons Futurs',
            financialTickerEnabledLabel: '📈 Cadran Financier & Live Ticker',
            financialAssetLabel: 'Actif Financier :',
            financialCurrencyLabel: 'Devise :',
            celestialTrackerEnabledLabel: '🌌 Cadran Astronomique & Orbites',
            celestialShowStarsLabel: 'Afficher les Étoiles en Arrière-plan',
            astrologicalBiorhythmEnabledLabel: '🧭 Cadran Astrologique & Biorhythme',
            birthdateInputLabel: 'Date de Naissance :',
            worldGlobeEnabledLabel: '🌍 Mappemonde & Fuseaux Horaires',
            retroArcadeEnabledLabel: '🎮 Retro Arcade Jeu de la Vie',
            campaignRoiEnabledLabel: '📈 ROI des Campagnes & Heatmap',
            brandCarouselEnabledLabel: '💡 Carrousel Créatif & Marques',
            sentimentRadarEnabledLabel: '🎭 Radar de Sentiment A/B',
            weatherDialEnabledLabel: '🌍 Prévisions Météo en Direct',
            socialContactEnabledLabel: '🔗 Réseaux Sociaux & Contact (Link-in-Bio)',
            hourEditorTitle: '📝 Editer le Contenu des Heures',
            hourSelectLabel: 'Sélectionner l\'Heure :',
            aiAgentEnabledLabel: '🤖 Assistant IA et Cadran Pulsant',
            exportWhiteLabelLabel: '⚪ White-Label (Masquer le Panneau au Rendu)',
            radioTvGroup: '📺 Centre Média Radio & TV En Ligne',
            radioTvEnabledLabel: 'Activer l\'Écran Média Radio TV',
            radioTvStyleLabel: 'Style du Téléviseur',
            radioTvAspectLabel: 'Format de l\'Image',
            radioTvScaleLabel: 'Échelle de l\'Écran',
            radioTvChannelLabel: 'Chaîne TV / Station Radio',
            radioTvCustomUrlLabel: 'URL du Flux Personnalisé',
            radioTvCustomTypeLabel: 'Type de Flux Média',
            radioTvVolumeLabel: 'Volume du Lecteur',
            radioTvPositionXLabel: 'Position Horizontale X (%)',
            radioTvPositionYLabel: 'Position Verticale Y (%)'
        }
    };

    const L = () => T[window.currentLang === 'fr' ? 'fr' : 'en'];

    function injectCSS() {
        if (document.getElementById('cu3-css')) return;
        const s = document.createElement('style');
        s.id = 'cu3-css';
        s.textContent = `
        #cu3-panel{position:fixed;top:60px;right:12px;width:340px;max-height:calc(100vh - 76px);background:rgba(8,12,28,0.92);backdrop-filter:blur(16px);border:1px solid rgba(139,92,246,0.4);border-radius:12px;box-shadow:0 0 40px rgba(139,92,246,0.2),0 20px 60px rgba(0,0,0,0.85);z-index:99999;overflow-y:auto;font-family:'Inter',sans-serif;scrollbar-width:thin;color:#f1f5f9;}
        #cu3-panel::-webkit-scrollbar{width:6px;}
        #cu3-panel::-webkit-scrollbar-thumb{background:rgba(139,92,246,0.4);border-radius:3px;}
        #cu3-panel .hdr{padding:10px 12px;background:rgba(139,92,246,0.15);border-bottom:1px solid rgba(139,92,246,0.3);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:3;}
        #cu3-panel .hdr-title{font-size:13px;font-weight:800;color:#c084fc;letter-spacing:0.5px;}
        #cu3-panel .x{width:22px;height:22px;border:none;border-radius:50%;padding:0;background:rgba(239,68,68,0.25);color:#f87171;cursor:pointer;font-size:11px;line-height:22px;text-align:center;font-weight:700;}
        #cu3-panel .x:hover{background:rgba(239,68,68,0.6);color:#fff;}
        #cu3-panel .sec{padding:12px 14px;border-bottom:1px solid rgba(255,255,255,0.06);}
        #cu3-panel .sec-t{font-size:9.5px;font-weight:800;color:#818cf8;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;display:flex;align-items:center;gap:4px;}
        #cu3-panel .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
        #cu3-panel .btn-choice{padding:8px 6px;background:#0d1225;border:1px solid #1e293b;border-radius:6px;color:#94a3b8;font-size:10px;font-weight:700;cursor:pointer;transition:all 0.2s;text-align:center;}
        #cu3-panel .btn-choice.active{background:rgba(99,102,241,0.25);border-color:#6366f1;color:#a5b4fc;}
        #cu3-panel .btn-choice:hover{background:#1e2a45;border-color:rgba(99,102,241,0.5);color:#cbd5e1;}
        #cu3-panel .input-text{width:100%;padding:6px;background:#070a13;border:1px solid #1e293b;border-radius:6px;color:#e2e8f0;font-size:11px;font-weight:600;outline:none;}
        #cu3-panel .input-text:focus{border-color:#6366f1;}
        #cu3-panel .slider-row{display:flex;align-items:center;gap:10px;margin-bottom:6px;}
        #cu3-panel .slider-label{font-size:10px;color:#94a3b8;flex:1;}
        #cu3-panel .slider{width:110px;accent-color:#6366f1;cursor:pointer;}
        #cu3-panel .slider-val{color:#38bdf8;font-size:10px;font-weight:700;min-width:28px;text-align:right;}
        #cu3-panel .action-btn{width:100%;padding:9px;border:none;border-radius:6px;color:#fff;font-size:11px;font-weight:700;cursor:pointer;transition:all 0.2s;text-align:center;margin-top:4px;}
        #cu3-panel .action-btn.primary{background:linear-gradient(135deg,#6366f1,#8b5cf6);box-shadow:0 3px 12px rgba(99,102,241,0.3);}
        #cu3-panel .action-btn.primary:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(99,102,241,0.55);}
        #cu3-panel .action-btn.secondary{background:#18122b;border:1px solid #443c68;color:#d8b4fe;}
        #cu3-panel .action-btn.secondary:hover{background:#2a1e47;color:#fff;}
        #cu3-panel .file-info{font-size:10px;color:#10b981;margin-top:4px;word-break:break-all;}
        #cu3-panel .cb-row{display:flex;align-items:center;gap:8px;margin-bottom:8px;cursor:pointer;user-select:none;}
        #cu3-panel .cb-row input{cursor:pointer;}
        #cu3-panel .cb-row span{font-size:11px;color:#cbd5e1;}
        @media (max-width: 600px) {
            #cu3-panel {
                top: auto !important;
                bottom: 12px !important;
                right: 12px !important;
                left: 12px !important;
                width: auto !important;
                max-height: 50vh !important;
            }
        }
        `;
        document.head.appendChild(s);
    }

    function getScene() {
        return window.SketchExtruder ? window.SketchExtruder.getScene() : null;
    }

    function ensureGroup() {
        if (!clockGroup) {
            clockGroup = new THREE.Group();
            clockGroup.name = 'ClockUltraGroup';
        }
        return !!(window.SketchExtruder && typeof window.SketchExtruder.addExtraModule === 'function');
    }

    function playTickSound() {
        try {
            const ctx = getPlaybackAudioContext();
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            const isTick = (lastTickedSecond % 2 === 0);
            osc.frequency.setValueAtTime(isTick ? 850 : 650, now);
            osc.type = 'triangle';
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.12, now + 0.002);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.05);
        } catch (e) {}
    }

    function playAlarmBeep() {
        try {
            const ctx = getPlaybackAudioContext();
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1000, now);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.25, now + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.35);
        } catch(e) {}
    }

    function playTone(freq, startTime, duration) {
        try {
            const ctx = getPlaybackAudioContext();
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(freq, startTime);
            gain1.gain.setValueAtTime(0, startTime);
            gain1.gain.linearRampToValueAtTime(0.2, startTime + 0.04);
            gain1.gain.exponentialRampToValueAtTime(0.0001, startTime + duration - 0.01);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(startTime);
            osc1.stop(startTime + duration);

            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(freq * 2, startTime);
            gain2.gain.setValueAtTime(0, startTime);
            gain2.gain.linearRampToValueAtTime(0.08, startTime + 0.03);
            gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + duration - 0.01);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(startTime);
            osc2.stop(startTime + duration);
        } catch(e) {}
    }

    function playWestminsterChime(hours) {
        try {
            const ctx = getPlaybackAudioContext();
            const now = ctx.currentTime;
            const notes = {
                'G3': 196.00,
                'C4': 261.63,
                'D4': 293.66,
                'E4': 329.63
            };
            const melody = [
                'E4', 'C4', 'D4', 'G3',
                'C4', 'E4', 'D4', 'G3',
                'G3', 'D4', 'E4', 'C4',
                'C4', 'G3', 'D4', 'E4'
            ];
            let time = now + 0.1;
            const noteDuration = 0.5;
            const noteGap = 0.6;

            melody.forEach(noteName => {
                playTone(notes[noteName], time, noteDuration);
                time += noteGap;
            });

            time += 0.8;
            const strikeCount = hours % 12 === 0 ? 12 : hours % 12;
            for (let i = 0; i < strikeCount; i++) {
                playTone(notes['C4'], time, 1.2);
                time += 1.5;
            }
        } catch(e) {}
    }

    function playFocusChime() {
        try {
            const ctx = getPlaybackAudioContext();
            const now = ctx.currentTime;
            playTone(261.63, now, 0.4);
            playTone(329.63, now + 0.3, 0.4);
            playTone(392.00, now + 0.6, 0.8);
        } catch(e) {}
    }

    function triggerAlarm() {
        if (alarmInterval) return;
        let count = 0;
        window._cuAlarmActive = true;
        alarmInterval = setInterval(() => {
            if (count > 12 || !alarmEnabled) {
                clearInterval(alarmInterval);
                alarmInterval = null;
                window._cuAlarmActive = false;
                const alarmBtn = document.getElementById('cu3-alarm-test');
                if (alarmBtn) alarmBtn.textContent = L().alarmTest;
                return;
            }
            playAlarmBeep();
            count++;
        }, 400);
    }

    function stopAlarm() {
        if (alarmInterval) {
            clearInterval(alarmInterval);
            alarmInterval = null;
            window._cuAlarmActive = false;
        }
    }

    function initSoundscapeSynth() {
        if (!soundscapeMixerEnabled) {
            stopSoundscapeSynth();
            return;
        }
        try {
            const ctx = getPlaybackAudioContext();
            if (!ctx) return;

            // Create noise buffer for rain and wind
            const bufferSize = 2 * ctx.sampleRate;
            const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }

            // RAIN
            if (!soundscapeRainGain) {
                soundscapeRainGain = ctx.createGain();
                soundscapeRainGain.gain.setValueAtTime(soundscapeRainVol / 100, ctx.currentTime);
                soundscapeRainGain.connect(ctx.destination);

                const rainFilter = ctx.createBiquadFilter();
                rainFilter.type = 'bandpass';
                rainFilter.frequency.setValueAtTime(1000, ctx.currentTime);
                rainFilter.Q.setValueAtTime(1.0, ctx.currentTime);
                rainFilter.connect(soundscapeRainGain);

                soundscapeRainSource = ctx.createBufferSource();
                soundscapeRainSource.buffer = noiseBuffer;
                soundscapeRainSource.loop = true;
                soundscapeRainSource.connect(rainFilter);
                soundscapeRainSource.start(0);
            }

            // WIND
            if (!soundscapeWindGain) {
                soundscapeWindGain = ctx.createGain();
                soundscapeWindGain.gain.setValueAtTime(soundscapeWindVol / 100, ctx.currentTime);
                soundscapeWindGain.connect(ctx.destination);

                soundscapeWindFilter = ctx.createBiquadFilter();
                soundscapeWindFilter.type = 'lowpass';
                soundscapeWindFilter.frequency.setValueAtTime(400, ctx.currentTime);
                soundscapeWindFilter.Q.setValueAtTime(2.5, ctx.currentTime);
                soundscapeWindFilter.connect(soundscapeWindGain);

                soundscapeWindLFO = ctx.createOscillator();
                soundscapeWindLFO.frequency.setValueAtTime(0.1, ctx.currentTime); // slow sweep
                const windLFOGain = ctx.createGain();
                windLFOGain.gain.setValueAtTime(200, ctx.currentTime);
                soundscapeWindLFO.connect(windLFOGain);
                windLFOGain.connect(soundscapeWindFilter.frequency);
                soundscapeWindLFO.start(0);

                soundscapeWindSource = ctx.createBufferSource();
                soundscapeWindSource.buffer = noiseBuffer;
                soundscapeWindSource.loop = true;
                soundscapeWindSource.connect(soundscapeWindFilter);
                soundscapeWindSource.start(0);
            }

            // BINAURAL BEATS
            if (!soundscapeBinauralGain) {
                soundscapeBinauralGain = ctx.createGain();
                soundscapeBinauralGain.gain.setValueAtTime(soundscapeBinauralVol / 100, ctx.currentTime);
                soundscapeBinauralGain.connect(ctx.destination);

                const merger = ctx.createChannelMerger(2);
                merger.connect(soundscapeBinauralGain);

                soundscapeBinauralSourceL = ctx.createOscillator();
                soundscapeBinauralSourceL.type = 'sine';
                soundscapeBinauralSourceL.frequency.setValueAtTime(100, ctx.currentTime);
                soundscapeBinauralSourceL.connect(merger, 0, 0);
                soundscapeBinauralSourceL.start(0);

                soundscapeBinauralSourceR = ctx.createOscillator();
                soundscapeBinauralSourceR.type = 'sine';
                soundscapeBinauralSourceR.frequency.setValueAtTime(104, ctx.currentTime); // 4Hz difference
                soundscapeBinauralSourceR.connect(merger, 0, 1);
                soundscapeBinauralSourceR.start(0);
            }
        } catch (e) {
            console.warn("Failed to initialize ASMR soundscapes:", e);
        }
    }

    function updateSoundscapeVolumes() {
        try {
            const ctx = getPlaybackAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;
            if (soundscapeRainGain) soundscapeRainGain.gain.setValueAtTime(soundscapeRainVol / 100, now);
            if (soundscapeWindGain) soundscapeWindGain.gain.setValueAtTime(soundscapeWindVol / 100, now);
            if (soundscapeBinauralGain) soundscapeBinauralGain.gain.setValueAtTime(soundscapeBinauralVol / 100, now);
        } catch(e) {}
    }

    function stopSoundscapeSynth() {
        if (soundscapeRainSource) {
            try { soundscapeRainSource.stop(); } catch(e) {}
            soundscapeRainSource = null;
        }
        if (soundscapeRainGain) {
            try { soundscapeRainGain.disconnect(); } catch(e) {}
            soundscapeRainGain = null;
        }
        if (soundscapeWindSource) {
            try { soundscapeWindSource.stop(); } catch(e) {}
            soundscapeWindSource = null;
        }
        if (soundscapeWindLFO) {
            try { soundscapeWindLFO.stop(); } catch(e) {}
            soundscapeWindLFO = null;
        }
        if (soundscapeWindGain) {
            try { soundscapeWindGain.disconnect(); } catch(e) {}
            soundscapeWindGain = null;
        }
        if (soundscapeBinauralSourceL) {
            try { soundscapeBinauralSourceL.stop(); } catch(e) {}
            soundscapeBinauralSourceL = null;
        }
        if (soundscapeBinauralSourceR) {
            try { soundscapeBinauralSourceR.stop(); } catch(e) {}
            soundscapeBinauralSourceR = null;
        }
        if (soundscapeBinauralGain) {
            try { soundscapeBinauralGain.disconnect(); } catch(e) {}
            soundscapeBinauralGain = null;
        }
    }



    function syncProModel() {
        if (!ensureGroup()) return;
        const clockParts = [{
            format: 'clock-ultra',
            customLogo: customLogoStr,
            dxfData: dxfDataStr,
            dxfText: dxfTextStr,
            dxfFileName: dxfFileName,
            customOutlinePoints: customOutlinePoints,
            pivotX: pivotX,
            pivotY: pivotY,
            handStyle: handStyle,
            markerStyle: markerStyle,
            markerColor: markerColor,
            markerSize: markerSize,
            markerRadius: markerRadius,
            glassCover: glassCover,
            soundEnabled: soundEnabled,
            alarmTime: alarmTime,
            alarmEnabled: alarmEnabled,
            handHColor: handHColor,
            handMColor: handMColor,
            handSColor: handSColor,
            handHLength: handHLength,
            handMLength: handMLength,
            handSLength: handSLength,
            handHWidth: handHWidth,
            handMWidth: handMWidth,
            handSWidth: handSWidth,
            faceShape: faceShape,
            faceColor: faceColor,
            modelColor: modelColor,
            chronoEnabled: chronoEnabled,
            chronoColor: chronoColor,
            chronoNeedleColor: chronoNeedleColor,
            metalStyle: metalStyle,
            glowEnabled: glowEnabled,
            glowColor: glowColor,
            parallaxEnabled: parallaxEnabled,
            glareSweepEnabled: glareSweepEnabled,
            customSilhouettePoints: customSilhouettePoints,
            gearsEnabled: gearsEnabled,
            neonBorderEnabled: neonBorderEnabled,
            neonBorderColor: neonBorderColor,
            tourbillonEnabled: tourbillonEnabled,
            moonPhaseEnabled: moonPhaseEnabled,
            liquidNeonEnabled: liquidNeonEnabled,
            steamPipesEnabled: steamPipesEnabled,
            holoHudEnabled: holoHudEnabled,
            dialText: dialTexts[0].text,
            dialTextColor: dialTexts[0].color,
            dialTextSize: dialTexts[0].size,
            dialTextFont: dialTexts[0].font,
            dialTextX: dialTexts[0].x,
            dialTextY: dialTexts[0].y,
            dialTextRotation: dialTexts[0].rotation,
            dialTextOrientation: dialTexts[0].orientation,
            dialTextPreset: dialTexts[0].preset,
            dialTextWarp: dialTexts[0].warp,
            dialTextWarpRadius: dialTexts[0].warpRadius,
            dialTexts: JSON.parse(JSON.stringify(dialTexts)),
            dialTexturePreset: dialTexturePreset,
            weatherOverlay: weatherOverlay,
            dynamicTimeColor: dynamicTimeColor,
            audioReactive: audioReactive,
            subDialMode: subDialMode,
            radioEnabled: radioEnabled,
            radioFrequency: radioFrequency,
            radioVolume: radioVolume,
            timeTravelEnabled: timeTravelEnabled,
            timeTravelAutoReturn: timeTravelAutoReturn,
            cursorMagnetismEnabled: cursorMagnetismEnabled,
            ambientTickEnabled: ambientTickEnabled,
            hourlyChimeEnabled: hourlyChimeEnabled,
            countdownTarget: countdownTarget,
            themePreset: themePreset,
            navigatorMenuEnabled: navigatorMenuEnabled,
            clockToBookEnabled: clockToBookEnabled,
            businessHoursRingEnabled: businessHoursRingEnabled,
            businessHoursStart: businessHoursStart,
            businessHoursEnd: businessHoursEnd,
            analyticsDisplayEnabled: analyticsDisplayEnabled,
            pomodoroTimerEnabled: pomodoroTimerEnabled,
            weatherWeatherSyncEnabled: weatherWeatherSyncEnabled,
            blueLightFilterEnabled: blueLightFilterEnabled,
            soundscapeMixerEnabled: soundscapeMixerEnabled,
            soundscapeRainVol: soundscapeRainVol,
            soundscapeWindVol: soundscapeWindVol,
            soundscapeBinauralVol: soundscapeBinauralVol,
            pomodoroDuration: pomodoroDuration,
            pomodoroRunning: pomodoroRunning,
            pomodoroTimeRemaining: pomodoroTimeRemaining,
            teamMembersEnabled: teamMembersEnabled,
            teamMembers: JSON.parse(JSON.stringify(teamMembers)),
            historyTimelineEnabled: historyTimelineEnabled,
            teamPresenceRingEnabled: teamPresenceRingEnabled,
            kpiDashboardEnabled: kpiDashboardEnabled,
            securityRadarEnabled: securityRadarEnabled,
            audioVisualizerEnabled: audioVisualizerEnabled,
            futureRoadmapEnabled: futureRoadmapEnabled,
            exportWhiteLabel: exportWhiteLabel,
            financialTickerEnabled: financialTickerEnabled,
            financialAsset: financialAsset,
            financialCurrency: financialCurrency,
            kpiHourTexts: JSON.parse(JSON.stringify(kpiHourTexts)),
            radarHourTexts: JSON.parse(JSON.stringify(radarHourTexts)),
            roadmapHourTexts: JSON.parse(JSON.stringify(roadmapHourTexts)),
            historyHourTexts: JSON.parse(JSON.stringify(historyHourTexts)),
            teamHourTexts: JSON.parse(JSON.stringify(teamHourTexts)),
            worldHourTexts: JSON.parse(JSON.stringify(worldHourTexts)),
            financialHourTexts: JSON.parse(JSON.stringify(financialHourTexts)),
            celestialTrackerEnabled: celestialTrackerEnabled,
            celestialLocation: celestialLocation,
            celestialShowStars: celestialShowStars,
            celestialHourTexts: JSON.parse(JSON.stringify(celestialHourTexts)),
            astrologicalBiorhythmEnabled: astrologicalBiorhythmEnabled,
            birthdateInput: birthdateInput,
            astrologyHourTexts: JSON.parse(JSON.stringify(astrologyHourTexts)),
            worldGlobeEnabled: worldGlobeEnabled,
            worldGlobeHourTexts: JSON.parse(JSON.stringify(worldGlobeHourTexts)),
            retroArcadeEnabled: retroArcadeEnabled,
            retroArcadeHourTexts: JSON.parse(JSON.stringify(retroArcadeHourTexts)),
            campaignRoiEnabled: campaignRoiEnabled,
            roiHourTexts: JSON.parse(JSON.stringify(roiHourTexts)),
            brandCarouselEnabled: brandCarouselEnabled,
            brandHourTexts: JSON.parse(JSON.stringify(brandHourTexts)),
            sentimentRadarEnabled: sentimentRadarEnabled,
            sentimentHourTexts: JSON.parse(JSON.stringify(sentimentHourTexts)),
            weatherDialEnabled: weatherDialEnabled,
            weatherHourTexts: JSON.parse(JSON.stringify(weatherHourTexts)),
            socialContactEnabled: socialContactEnabled,
            socialContactHours: JSON.parse(JSON.stringify(socialContactHours)),
            billboardCampaignEnabled: billboardCampaignEnabled,
            billboardClockDuration: billboardClockDuration,
            billboardVisualPreview: billboardVisualPreview,
            billboardSlides: JSON.parse(JSON.stringify(billboardSlides)),
            aiAgentEnabled: aiAgentEnabled
        }];


        let id = window._clockUltraModelId || null;
        if (!id) {
            id = window.SketchExtruder.addExtraModule('clock-ultra', { clockParts, clockStyle: metalStyle, importedMesh: clockGroup });
            window._clockUltraModelId = id;
            // set initial running/time if not set
            const model = window.SketchExtruder.getModels().find(m => m.id === id);
            if (model) {
                model.chronoRunning = chronoRunning;
                model.chronoTime = chronoTime;
            }
            clockGroupAdded = true;
        } else {
            if (window._hf3UpdateModel) {
                window._hf3UpdateModel(id, clockParts, metalStyle, clockGroup, 'idle');
            }
        }
    }

    function applyThemePreset(presetName) {
        themePreset = presetName;
        if (presetName === 'rolex_ocean') {
            faceShape = 'circle';
            faceColor = '#0d2240';
            metalStyle = 'gold';
            handStyle = 'arrow';
            handHColor = '#ffd700';
            handMColor = '#ffd700';
            handSColor = '#ff4500';
            markerStyle = 'roman';
            markerColor = '#ffd700';
            moonPhaseEnabled = true;
            subDialMode = 'battery';
            glassCover = true;
            gearsEnabled = false;
            neonBorderEnabled = false;
            liquidNeonEnabled = false;
            steamPipesEnabled = false;
            holoHudEnabled = false;
            weatherOverlay = 'none';
            dialTexturePreset = 'sidef';
            glowEnabled = false;
        } else if (presetName === 'steampunk_oracle') {
            faceShape = 'none';
            metalStyle = 'copper';
            handStyle = 'classic';
            handHColor = '#ffb380';
            handMColor = '#ffb380';
            handSColor = '#ffb380';
            markerStyle = 'lines';
            markerColor = '#ffb380';
            gearsEnabled = true;
            tourbillonEnabled = true;
            steamPipesEnabled = true;
            faceColor = '#000000';
            glassCover = false;
            neonBorderEnabled = false;
            liquidNeonEnabled = false;
            moonPhaseEnabled = false;
            holoHudEnabled = false;
            weatherOverlay = 'none';
            dialTexturePreset = 'none';
            glowEnabled = false;
        } else if (presetName === 'zen_liquid') {
            faceShape = 'circle';
            faceColor = '#020205';
            metalStyle = 'brass';
            handStyle = 'none';
            liquidNeonEnabled = true;
            gearsEnabled = false;
            neonBorderEnabled = true;
            neonBorderColor = '#39ff14';
            glowEnabled = true;
            glowColor = '#39ff14';
            markerStyle = 'none';
            tourbillonEnabled = false;
            moonPhaseEnabled = false;
            holoHudEnabled = false;
            steamPipesEnabled = false;
            weatherOverlay = 'none';
            dialTexturePreset = 'none';
            glowEnabled = true;
        }
        build3DClockwork();
        syncProModel();
        renderPanel();
    }

    function updateClockwork(w) {
        if (!clockGroup) return;
        const now = new Date();
        
        const model = (window.SketchExtruder && typeof window.SketchExtruder.getModels === 'function')
            ? window.SketchExtruder.getModels().find(m => m.format === 'clock-ultra')
            : null;
        if (model && model._timeOffsetMinutes) {
            now.setMinutes(now.getMinutes() + model._timeOffsetMinutes);
        }
        
        const ms = now.getMilliseconds();
        const sec = now.getSeconds() + ms / 1000;
        const min = now.getMinutes() + sec / 60;
        const hr = (now.getHours() % 12) + min / 60;

        // Delta Time calculation for Pomodoro and simulated drifting
        const nowTimeMs = performance.now();
        if (!updateClockwork._lastTimeMs) updateClockwork._lastTimeMs = nowTimeMs;
        const dtMs = Math.min(1000, nowTimeMs - updateClockwork._lastTimeMs);
        updateClockwork._lastTimeMs = nowTimeMs;

        // Pomodoro Countdown Timer
        if (pomodoroTimerEnabled && pomodoroRunning) {
            pomodoroTimeRemaining -= dtMs / 1000;
            if (pomodoroTimeRemaining <= 0) {
                pomodoroTimeRemaining = 0;
                pomodoroRunning = false;
                
                playFocusChime();
                
                const startBtn = document.getElementById('cu3-pomodoro-btn-start');
                if (startBtn) startBtn.innerText = L().pomodoroStartBtn;
                
                if (window.toast) {
                    window.toast("🍅 Pomodoro focus session completed! Take a break!");
                } else {
                    alert("Pomodoro focus session completed! Take a break!");
                }
                
                window.dispatchEvent(new CustomEvent('clock-pomodoro-complete', { detail: { duration: pomodoroDuration } }));
                if (window.parent) {
                    window.parent.postMessage({ type: 'clock-pomodoro-complete', duration: pomodoroDuration }, '*');
                }
            }
            
            const timerDisplay = document.getElementById('cu3-pomodoro-time-display');
            if (timerDisplay) {
                const displayM = Math.floor(pomodoroTimeRemaining / 60);
                const displayS = Math.floor(pomodoroTimeRemaining % 60);
                timerDisplay.innerText = displayM + ':' + String(displayS).padStart(2, '0');
            }
        }

        if (alarmEnabled) {
            const timeParts = alarmTime.split(':');
            const alH = parseInt(timeParts[0] || 12);
            const alM = parseInt(timeParts[1] || 0);
            if (now.getHours() === alH && now.getMinutes() === alM && now.getSeconds() < 1) {
                triggerAlarm();
            }
        }

        const angleS = - (sec / 60) * Math.PI * 2;
        const angleM = - (min / 60) * Math.PI * 2;
        const angleH = - (hr / 12) * Math.PI * 2;

        // Interactive Website Menu Hand Overrides (only for Navigator Menu feature)
        let overrideHands = false;
        let angleH_nav, angleM_nav, angleS_nav;
        if (navigatorMenuEnabled && window._cuNavTargetTime && (Date.now() - window._cuNavTargetTime < 2000)) {
            overrideHands = true;
            const elapsed = (Date.now() - window._cuNavTargetTime) / 2000;
            const targetAngle = - (window._cuNavTargetHour / 12) * Math.PI * 2;
            if (elapsed < 0.25) {
                const t = elapsed / 0.25;
                angleH_nav = t * Math.PI * 4 + (1 - t) * angleH;
                angleM_nav = t * Math.PI * 8 + (1 - t) * angleM;
                angleS_nav = t * Math.PI * 12 + (1 - t) * angleS;
            } else {
                angleH_nav = targetAngle;
                angleM_nav = targetAngle;
                angleS_nav = targetAngle;
            }
        }

        const handH = clockGroup.getObjectByName('hand_h');
        const handM = clockGroup.getObjectByName('hand_m');
        const handS = clockGroup.getObjectByName('hand_s');
        const handAlarm = clockGroup.getObjectByName('hand_alarm');

        if (handH) handH.rotation.z = overrideHands ? angleH_nav : angleH;
        if (handM) handM.rotation.z = overrideHands ? angleM_nav : angleM;

        const activeSubDialMode = subDialMode;
        const handChronoMin = clockGroup.getObjectByName('hand_chrono_min');
        const handChronoTenth = clockGroup.getObjectByName('hand_chrono_tenth');
        const handChronoSec = clockGroup.getObjectByName('hand_chrono_sec');

        let chronoSec = 0;
        if (analyticsDisplayEnabled) {
            const t = Date.now() / 1000;
            const visitors = 85 + Math.sin(t * 0.05) * 50 + Math.cos(t * 0.12) * 15;
            const convRate = 2.75 + Math.sin(t * 0.08) * 1.75 + Math.cos(t * 0.17) * 0.5;
            
            if (!updateClockwork._lastEventTime) updateClockwork._lastEventTime = 0;
            const nowMs = Date.now();
            if (nowMs - updateClockwork._lastEventTime > 6000 + Math.sin(t) * 2000) {
                updateClockwork._lastEventTime = nowMs;
                updateClockwork._eventPulse = 1.0;
            }
            if (updateClockwork._eventPulse > 0) {
                updateClockwork._eventPulse -= dtMs / 1000;
                if (updateClockwork._eventPulse < 0) updateClockwork._eventPulse = 0;
            }
            const twitchAngle = (updateClockwork._eventPulse || 0) * Math.PI * 0.25;

            if (handChronoMin) {
                handChronoMin.rotation.z = - (visitors / 200) * Math.PI * 2;
            }
            if (handChronoTenth) {
                handChronoTenth.rotation.z = - (convRate / 10) * Math.PI * 2;
            }
            if (handChronoSec) {
                handChronoSec.rotation.z = overrideHands ? angleS_nav : (twitchAngle - (sec / 60) * Math.PI * 2);
            }
            if (handS) {
                handS.rotation.z = overrideHands ? angleS_nav : angleS;
            }
        } else if (activeSubDialMode === 'chrono' && chronoEnabled) {
            const nowMs = performance.now();
            if (!updateClockwork._lastMs) updateClockwork._lastMs = nowMs;
            const dtMs_chrono = Math.min(100, nowMs - updateClockwork._lastMs);
            updateClockwork._lastMs = nowMs;

            const running = model ? model.chronoRunning : chronoRunning;

            if (running) {
                if (model) {
                    model.chronoTime = (model.chronoTime || 0) + dtMs_chrono;
                    chronoTime = model.chronoTime;
                } else {
                    chronoTime = (chronoTime || 0) + dtMs_chrono;
                }
            } else if (model) {
                chronoTime = model.chronoTime || 0;
            }

            chronoSec = chronoTime / 1000;
            if (handS) handS.rotation.z = overrideHands ? angleS_nav : (- (chronoSec / 60) * Math.PI * 2);

            if (handChronoMin) {
                const cMin = chronoSec / 60;
                handChronoMin.rotation.z = - (cMin / 30) * Math.PI * 2;
            }
            if (handChronoTenth) {
                const cSubSec = (chronoTime / 1000) % 60;
                handChronoTenth.rotation.z = - (cSubSec / 60) * Math.PI * 2;
            }
            if (handChronoSec) {
                handChronoSec.rotation.z = overrideHands ? angleS_nav : (- (sec / 60) * Math.PI * 2);
            }
        } else {
            updateClockwork._lastMs = null;
            if (handS) handS.rotation.z = overrideHands ? angleS_nav : angleS;

            if (activeSubDialMode === 'battery') {
                const bat = window._clockBatteryLevel !== undefined ? window._clockBatteryLevel : 1.0;
                if (handChronoMin) {
                    // Sweep from 8 o'clock (0%) to 4 o'clock (100%)
                    handChronoMin.rotation.z = (2 * Math.PI / 3) - bat * (4 * Math.PI / 3);
                }
                if (handChronoTenth) handChronoTenth.rotation.z = 0;
                if (handChronoSec) handChronoSec.rotation.z = overrideHands ? angleS_nav : angleS;
            } else if (activeSubDialMode === 'gmt') {
                if (handChronoMin) {
                    const gmtHr = (now.getUTCHours() % 12) + now.getUTCMinutes() / 60;
                    handChronoMin.rotation.z = - (gmtHr / 12) * Math.PI * 2;
                }
                if (handChronoTenth) {
                    const gmtMin = now.getUTCMinutes() + now.getUTCSeconds() / 60;
                    handChronoTenth.rotation.z = - (gmtMin / 60) * Math.PI * 2;
                }
                if (handChronoSec) {
                    handChronoSec.rotation.z = overrideHands ? angleS_nav : (- (now.getUTCSeconds() / 60) * Math.PI * 2);
                }
            } else if (activeSubDialMode === 'performance') {
                const nowTime = performance.now();
                if (!updateClockwork._fpsLastTime) {
                    updateClockwork._fpsLastTime = nowTime;
                    updateClockwork._fpsFrames = 0;
                    updateClockwork._fpsValue = 60;
                }
                updateClockwork._fpsFrames++;
                if (nowTime > updateClockwork._fpsLastTime + 1000) {
                    updateClockwork._fpsValue = Math.round((updateClockwork._fpsFrames * 1000) / (nowTime - updateClockwork._fpsLastTime));
                    updateClockwork._fpsLastTime = nowTime;
                    updateClockwork._fpsFrames = 0;
                }
                
                if (!updateClockwork._lastPerfTime) updateClockwork._lastPerfTime = nowTime;
                const dt = Math.min(100, nowTime - updateClockwork._lastPerfTime);
                updateClockwork._lastPerfTime = nowTime;
                if (handChronoMin) {
                    const fpsVal = Math.min(60, updateClockwork._fpsValue);
                    // Sweep from 8 o'clock (0 FPS) to 4 o'clock (60 FPS)
                    handChronoMin.rotation.z = (2 * Math.PI / 3) - (fpsVal / 60) * (4 * Math.PI / 3);
                }
                if (handChronoTenth) {
                    const frameTimeVal = Math.min(50, dt);
                    // Sweep from 8 o'clock (0 ms) to 4 o'clock (50 ms)
                    handChronoTenth.rotation.z = (2 * Math.PI / 3) - (frameTimeVal / 50) * (4 * Math.PI / 3);
                }
                if (handChronoSec) handChronoSec.rotation.z = overrideHands ? angleS_nav : angleS;
            } else if (activeSubDialMode === 'countdown') {
                let diffMs = 0;
                if (countdownTarget) {
                    const targetDate = new Date(countdownTarget);
                    diffMs = targetDate - now;
                }
                if (diffMs > 0) {
                    const diffSec = diffMs / 1000;
                    const diffMin = diffSec / 60;
                    const diffHr = diffMin / 60;
                    const diffDays = diffHr / 24;

                    if (handChronoMin) {
                        handChronoMin.rotation.z = - (diffDays / 30) * Math.PI * 2;
                    }
                    if (handChronoTenth) {
                        handChronoTenth.rotation.z = - ((diffHr % 24) / 24) * Math.PI * 2;
                    }
                    if (handChronoSec) {
                        handChronoSec.rotation.z = overrideHands ? angleS_nav : (- ((diffSec % 60) / 60) * Math.PI * 2);
                    }
                } else {
                    if (handChronoMin) handChronoMin.rotation.z = 0;
                    if (handChronoTenth) handChronoTenth.rotation.z = 0;
                    if (handChronoSec) handChronoSec.rotation.z = 0;
                }
            }
        }

        const isAlarmDragging = model ? model._alarmHandDragging : false;
        if (handAlarm && !isAlarmDragging) {
            const timeParts = alarmTime.split(':');
            const alH = parseInt(timeParts[0] || 12);
            const alM = parseInt(timeParts[1] || 0);
            const alarmHrFrac = (alH % 12) + alM / 60;
            handAlarm.rotation.z = - (alarmHrFrac / 12) * Math.PI * 2;
        }

        if (soundEnabled || ambientTickEnabled || (pomodoroTimerEnabled && pomodoroRunning)) {
            const currentSec = Math.floor(sec);
            if (currentSec !== lastTickedSecond) {
                lastTickedSecond = currentSec;
                playTickSound();
            }
        }

        if (hourlyChimeEnabled) {
            const currentMin = now.getMinutes();
            const currentSec = now.getSeconds();
            if (currentMin === 0 && Math.floor(currentSec) === 0 && window._lastChimeHour !== now.getHours()) {
                window._lastChimeHour = now.getHours();
                playWestminsterChime(now.getHours());
            }
        }

        const secFrac = sec % 1;
        const tickPulse = Math.max(0, 1 - secFrac * 5);
        
        const neonBorder = clockGroup.getObjectByName('neonBorder');
        if (neonBorder && neonBorder.material) {
            neonBorder.material.emissiveIntensity = 1.0 + tickPulse * 1.5;
            if (pomodoroTimerEnabled && pomodoroRunning) {
                neonBorder.material.emissive.set('#f97316');
            } else if (blueLightFilterEnabled && (now.getHours() >= 18 || now.getHours() < 6)) {
                neonBorder.material.emissive.set('#d97706');
            } else {
                neonBorder.material.emissive.set(neonBorderColor || '#06b6d4');
            }
        }

        const backlightGlow = clockGroup.getObjectByName('backlightGlow');
        if (backlightGlow && backlightGlow.material) {
            backlightGlow.material.opacity = 0.55 + Math.sin(Date.now() * 0.0025) * 0.15 + tickPulse * 0.3;
            if (pomodoroTimerEnabled && pomodoroRunning) {
                backlightGlow.material.color.set('#f97316');
            } else if (blueLightFilterEnabled && (now.getHours() >= 18 || now.getHours() < 6)) {
                backlightGlow.material.color.set('#d97706');
            } else {
                backlightGlow.material.color.set(glowColor || '#6366f1');
            }
        }

        for (let i = 0; i < 3; i++) {
            const textMesh = clockGroup.getObjectByName(i === 0 ? 'dialTextDecal' : 'dialTextDecal_' + i);
            if (textMesh && textMesh.userData && textMesh.userData.pulseWithTick) {
                textMesh.material.opacity = 0.45 + tickPulse * 0.55;
            } else if (textMesh) {
                textMesh.material.opacity = 1.0;
            }
        }

        const faceMesh = clockGroup.getObjectByName('faceMesh');
        if (dynamicTimeColor && faceMesh && faceMesh.material) {
            function getDynamicTimeColorLocal(hourVal) {
                const nightCol = new THREE.Color('#030712');
                const sunriseCol = new THREE.Color('#ea580c');
                const dayCol = new THREE.Color('#1e1b4b');
                const sunsetCol = new THREE.Color('#701a75');
                
                if (hourVal >= 5 && hourVal < 8) {
                    const t = (hourVal - 5) / 3;
                    return nightCol.clone().lerp(sunriseCol, t);
                } else if (hourVal >= 8 && hourVal < 17) {
                    const t = (hourVal - 8) / 9;
                    return sunriseCol.clone().lerp(dayCol, t);
                } else if (hourVal >= 17 && hourVal < 20) {
                    const t = (hourVal - 17) / 3;
                    return dayCol.clone().lerp(sunsetCol, t);
                } else {
                    let t = 0;
                    if (hourVal >= 20) {
                        t = (hourVal - 20) / 9;
                    } else {
                        t = (hourVal + 4) / 9;
                    }
                    return sunsetCol.clone().lerp(nightCol, Math.min(1, t));
                }
            }
            const hour24 = now.getHours() + now.getMinutes() / 60;
            faceMesh.material.color.copy(getDynamicTimeColorLocal(hour24));
        } else if (faceMesh && faceMesh.material) {
            faceMesh.material.color.setStyle(faceColor || '#0a0f1d');
        }

        // Determine active weather type (supporting auto-cycling weather sync)
        let activeWeather = weatherOverlay;
        if (weatherWeatherSyncEnabled) {
            const cycleSec = 15;
            const cycleIdx = Math.floor((Date.now() / 1000) / cycleSec) % 3;
            const cycleTypes = ['rain', 'snow', 'mist'];
            activeWeather = cycleTypes[cycleIdx];
        }

        const weatherRain = clockGroup.getObjectByName('rainGroup');
        if (weatherRain) {
            weatherRain.visible = (activeWeather === 'rain');
            if (weatherRain.visible) {
                weatherRain.children.forEach(drop => {
                    drop.position.y -= drop.userData.speed;
                    drop.position.x -= drop.userData.speed * 0.08;
                    if (drop.position.y < -36) {
                        drop.position.y = 36;
                        drop.position.x = (Math.random() - 0.5) * 64;
                    }
                });
            }
        }
        const weatherSnow = clockGroup.getObjectByName('snowGroup');
        if (weatherSnow) {
            weatherSnow.visible = (activeWeather === 'snow');
            if (weatherSnow.visible) {
                weatherSnow.children.forEach(flake => {
                    flake.position.y -= flake.userData.speedY;
                    flake.userData.phase = (flake.userData.phase || 0) + 0.02;
                    flake.position.x += Math.sin(flake.userData.phase) * 0.08 + flake.userData.speedX;
                    if (flake.position.y < -36) {
                        flake.position.y = 36;
                        flake.position.x = (Math.random() - 0.5) * 64;
                    }
                });
            }
        }
        const weatherMist = clockGroup.getObjectByName('mistGroup');
        if (weatherMist) {
            weatherMist.visible = (activeWeather === 'mist');
            if (weatherMist.visible) {
                weatherMist.children.forEach(plane => {
                    plane.position.x += plane.userData.speedX;
                    plane.position.y += plane.userData.speedY;
                    if (plane.position.x > 40) {
                        plane.position.x = -40;
                        plane.position.y = -20 + Math.random() * 40;
                    }
                });
            }
        }

        const audioVisualizerDecal = clockGroup.getObjectByName('audioVizDecal');
        if (audioVisualizerDecal && (audioReactive || radioEnabled)) {
            audioVisualizerDecal.visible = true;
            const canvas = audioVisualizerDecal.material.map.image;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, 256, 256);
            
            const isAlarming = !!window._cuAlarmActive;
            const now = performance.now() / 1000;

            if (audioReactive) {
                ctx.strokeStyle = isAlarming ? '#ef4444' : (glowColor || '#06b6d4');
                ctx.lineWidth = 2.5;
                // No shadowBlur - removed: forces GPU canvas compositing every frame
                ctx.beginPath();
                
                let data = [];
                const scanAngle = (now % 1) * Math.PI * 2;

                const _getEKG = (t, alarming) => {
                    const period = alarming ? 0.45 : 1.0;
                    const pt = (t % period) / period;
                    let h = 0;
                    if (pt < 0.65) {
                        const nt = pt / 0.65;
                        if (nt < 0.15) h = 0.15 * Math.sin((nt / 0.15) * Math.PI);
                        else if (nt < 0.3) h = 0;
                        else if (nt < 0.35) h = -0.2 * Math.sin(((nt - 0.3) / 0.05) * Math.PI);
                        else if (nt < 0.45) h = 1.0 * Math.sin(((nt - 0.35) / 0.1) * Math.PI);
                        else if (nt < 0.5) h = -0.3 * Math.sin(((nt - 0.45) / 0.05) * Math.PI);
                        else if (nt < 0.7) h = 0.35 * Math.sin(((nt - 0.5) / 0.2) * Math.PI);
                    }
                    h += (Math.sin(t * 120) * 0.03 + Math.cos(t * 260) * 0.015);
                    return h;
                };
                
                const numPoints = 96; // reduced from 128 for performance
                for (let i = 0; i < numPoints; i++) {
                    const angle = (i / numPoints) * Math.PI * 2;
                    let diff = scanAngle - angle;
                    if (diff < 0) diff += Math.PI * 2;
                    const timeAgo = diff / (Math.PI * 2);
                    const val = _getEKG(now - timeAgo, isAlarming);
                    const fade = 1.0 - timeAgo;
                    data.push(val * fade);
                }
                
                const centerX = 128;
                const centerY = 128;
                const baseRadius = 80;
                
                for (let i = 0; i <= numPoints; i++) {
                    const index = i % numPoints;
                    const angle = (i / numPoints) * Math.PI * 2 - Math.PI / 2;
                    const amp = data[index] * 20;
                    const r = baseRadius + amp;
                    const x = centerX + Math.cos(angle) * r;
                    const y = centerY + Math.sin(angle) * r;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.stroke();
            }

            if (radioEnabled) {
                // Draw LCD Digital Tuner Display
                ctx.save();
                // No shadowBlur on radio LCD - removed for performance

                // 1. Draw glowing background container
                ctx.fillStyle = 'rgba(6, 12, 28, 0.88)';
                ctx.strokeStyle = isAlarming ? '#ef4444' : (glowColor || '#06b6d4');
                ctx.lineWidth = 1.5;
                
                // Draw rounded rectangle for LCD
                const rx = 78, ry = 52, rw = 100, rh = 32, radius = 4;
                ctx.beginPath();
                ctx.moveTo(rx + radius, ry);
                ctx.lineTo(rx + rw - radius, ry);
                ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
                ctx.lineTo(rx + rw, ry + rh - radius);
                ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
                ctx.lineTo(rx + radius, ry + rh);
                ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
                ctx.lineTo(rx, ry + radius);
                ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // 2. Draw Freq Text in glowing digital font
                ctx.font = 'bold 12px "Courier New", monospace';
                ctx.fillStyle = isAlarming ? '#f87171' : (glowColor || '#22d3ee');
                ctx.textAlign = 'center';
                ctx.fillText(radioFrequency.toFixed(1) + ' MHz', 128, 69);

                // 3. Draw Tuning Arrow Indicators
                ctx.font = '9px Arial, sans-serif';
                ctx.fillText('◀', 86, 68);
                ctx.fillText('▶', 170, 68);

                // 4. Draw Signal Strength Bars
                let nearestSt = null;
                let minDist = 999;
                for (const st of radioStations) {
                    const dist = Math.abs(radioFrequency - st.freq);
                    if (dist < minDist) {
                        minDist = dist;
                        nearestSt = st;
                    }
                }
                let sigBars = 0;
                if (minDist <= 0.05) sigBars = 5;
                else if (minDist <= 0.1) sigBars = 4;
                else if (minDist <= 0.15) sigBars = 3;
                else if (minDist <= 0.2) sigBars = 2;
                else if (minDist <= 0.3) sigBars = 1;

                ctx.font = '7px "Courier New", monospace';
                let sigText = 'SIG ';
                for (let b = 1; b <= 5; b++) {
                    sigText += (b <= sigBars) ? '█' : '░';
                }
                ctx.fillText(sigText, 128, 79);
                ctx.restore();
            }

            // Throttle canvas update to 30fps max (every 2nd frame)
            if (!window._cuVizFrame) window._cuVizFrame = 0;
            window._cuVizFrame++;
            if (window._cuVizFrame >= 2) {
                window._cuVizFrame = 0;
                audioVisualizerDecal.material.map.needsUpdate = true;
            }
        } else if (audioVisualizerDecal) {
            audioVisualizerDecal.visible = false;
        }

        const balanceWheel = clockGroup.getObjectByName('balanceWheel');
        if (balanceWheel) {
            balanceWheel.rotation.z = Math.sin(Date.now() * 0.015) * 1.2;
        }

        const moonGlobe = clockGroup.getObjectByName('moonGlobe');
        if (moonGlobe) {
            moonGlobe.rotation.y = (Date.now() * 0.0001) % (Math.PI * 2);
        }

        const activeBeadSec = (activeSubDialMode === 'chrono' && chronoEnabled) ? (chronoTime / 1000) : sec;
        const thetaS = Math.PI / 2 - (activeBeadSec / 60) * Math.PI * 2;
        const thetaM = Math.PI / 2 - (min / 60) * Math.PI * 2;
        const thetaH = Math.PI / 2 - (hr / 12) * Math.PI * 2;

        const beadS = clockGroup.getObjectByName('liquidBeadS');
        if (beadS) beadS.position.set(Math.cos(thetaS) * 28, Math.sin(thetaS) * 28, 0);

        const beadM = clockGroup.getObjectByName('liquidBeadM');
        if (beadM) beadM.position.set(Math.cos(thetaM) * 24, Math.sin(thetaM) * 24, 0);

        const beadH = clockGroup.getObjectByName('liquidBeadH');
        if (beadH) beadH.position.set(Math.cos(thetaH) * 20, Math.sin(thetaH) * 20, 0);

        const steamParticles = clockGroup.getObjectByName('steamParticles');
        if (steamParticles) {
            const isExtruded = (faceShape === 'custom' || faceShape === 'silhouette');
            const baseFaceFrontZ = isExtruded ? 0.6 : -0.2;
            const speedMultiplier = (w !== undefined) ? w : 1;
            steamParticles.children.forEach((p, idx) => {
                p.userData.age = (p.userData.age || 0) + 0.008 * speedMultiplier;
                if (p.userData.age > 1.0) {
                    p.userData.age = 0;
                }
                const t = p.userData.age;
                const isLeft = p.userData.side === 'left';
                const nozzleX = isLeft ? -37.2 : 37.2;
                const nozzleY = 13.7;
                const dx = isLeft ? -0.707 : 0.707;
                const dy = 0.707;

                p.position.x = nozzleX + dx * t * 15 + Math.sin(t * 10 + idx) * 1.5;
                p.position.y = nozzleY + dy * t * 15 + (t * t) * 5;
                p.position.z = baseFaceFrontZ + 0.1 + t * 4;

                if (p.material) {
                    p.material.opacity = Math.sin(t * Math.PI) * 0.55;
                }
                const s = 0.5 + t * 1.5;
                p.scale.set(s, s, s);
            });
        }

        const hudGroup = clockGroup.getObjectByName('holoHudGroup');
        if (hudGroup) {
            const baseHUDZ = hudGroup.userData.baseZ || 3.8;
            hudGroup.position.z = baseHUDZ + Math.sin(Date.now() * 0.0015) * 0.5;

            const cpX = window._cuParallaxX || 0;
            const cpY = window._cuParallaxY || 0;
            hudGroup.rotation.x = -cpX * 0.45;
            hudGroup.rotation.y = -cpY * 0.45;

            const hudOuterRing = clockGroup.getObjectByName('hudOuterRing');
            if (hudOuterRing) hudOuterRing.rotation.z = Date.now() * 0.0005;

            const hudInnerRing = clockGroup.getObjectByName('hudInnerRing');
            if (hudInnerRing) hudInnerRing.rotation.z = -Date.now() * 0.0008;

            const hudLines = clockGroup.getObjectByName('hudLines');
            if (hudLines) hudLines.rotation.z = Date.now() * 0.0002;
        }
    }

    function build3DClockwork() {
        if (!clockGroup) return;
        while(clockGroup.children.length > 0) {
            clockGroup.remove(clockGroup.children[0]);
        }

        if (window.SketchExtruder && typeof window.SketchExtruder.buildClockUltraGeo === 'function') {
            const dummyModel = {
                clockParts: [{
                    customLogo: customLogoStr,
                    dxfData: dxfDataStr,
                    dxfText: dxfTextStr,
                    customOutlinePoints: customOutlinePoints,
                    pivotX: pivotX,
                    pivotY: pivotY,
                    handStyle: handStyle,
                    markerStyle: markerStyle,
                    markerColor: markerColor,
                    markerSize: markerSize,
                    markerRadius: markerRadius,
                    glassCover: glassCover,
                    handHColor: handHColor,
                    handMColor: handMColor,
                    handSColor: handSColor,
                    handHLength: handHLength,
                    handMLength: handMLength,
                    handSLength: handSLength,
                    handHWidth: handHWidth,
                    handMWidth: handMWidth,
                    handSWidth: handSWidth,
                    faceShape: faceShape,
                    faceColor: faceColor,
                    modelColor: modelColor,
                    chronoEnabled: chronoEnabled,
                    chronoColor: chronoColor,
                    chronoNeedleColor: chronoNeedleColor,
                    metalStyle: metalStyle,
                    glowEnabled: glowEnabled,
                    glowColor: glowColor,
                    parallaxEnabled: parallaxEnabled,
                    glareSweepEnabled: glareSweepEnabled,
                    customSilhouettePoints: customSilhouettePoints,
                    gearsEnabled: gearsEnabled,
                    neonBorderEnabled: neonBorderEnabled,
                    neonBorderColor: neonBorderColor,
                    tourbillonEnabled: tourbillonEnabled,
                    moonPhaseEnabled: moonPhaseEnabled,
                    liquidNeonEnabled: liquidNeonEnabled,
                    steamPipesEnabled: steamPipesEnabled,
                    holoHudEnabled: holoHudEnabled,
                    dialText: dialTexts[0].text,
                    dialTextColor: dialTexts[0].color,
                    dialTextSize: dialTexts[0].size,
                    dialTextFont: dialTexts[0].font,
                    dialTextX: dialTexts[0].x,
                    dialTextY: dialTexts[0].y,
                    dialTextRotation: dialTexts[0].rotation,
                    dialTextOrientation: dialTexts[0].orientation,
                    dialTextPreset: dialTexts[0].preset,
                    dialTextWarp: dialTexts[0].warp,
                    dialTextWarpRadius: dialTexts[0].warpRadius,
                    dialTexts: JSON.parse(JSON.stringify(dialTexts)),
                    dialTexturePreset: dialTexturePreset,
                    weatherOverlay: weatherOverlay,
                    dynamicTimeColor: dynamicTimeColor,
                    subDialMode: subDialMode,
                    radioEnabled: radioEnabled,
                    radioFrequency: radioFrequency,
                    businessHoursRingEnabled: businessHoursRingEnabled, businessHoursStart: businessHoursStart, businessHoursEnd: businessHoursEnd, teamMembersEnabled: teamMembersEnabled, clockToBookEnabled: clockToBookEnabled, navigatorMenuEnabled: navigatorMenuEnabled, radioVolume: radioVolume,
                    alarmTime: alarmTime,
                    alarmEnabled: alarmEnabled,
                    timeTravelEnabled: timeTravelEnabled,
                    timeTravelAutoReturn: timeTravelAutoReturn,
                    cursorMagnetismEnabled: cursorMagnetismEnabled,
                    ambientTickEnabled: ambientTickEnabled,
                    hourlyChimeEnabled: hourlyChimeEnabled,
                    countdownTarget: countdownTarget,
                    themePreset: themePreset,
                    socialContactEnabled: socialContactEnabled,
                    socialContactHours: JSON.parse(JSON.stringify(socialContactHours)),
                    weatherDialEnabled: weatherDialEnabled,
                    weatherHourTexts: JSON.parse(JSON.stringify(weatherHourTexts)),
                    sentimentRadarEnabled: sentimentRadarEnabled,
                    sentimentHourTexts: JSON.parse(JSON.stringify(sentimentHourTexts)),
                    brandCarouselEnabled: brandCarouselEnabled,
                    brandHourTexts: JSON.parse(JSON.stringify(brandHourTexts)),
                    campaignRoiEnabled: campaignRoiEnabled,
                    roiHourTexts: JSON.parse(JSON.stringify(roiHourTexts))
                }],
                clockStyle: metalStyle
            };

            const builtGeo = window.SketchExtruder.buildClockUltraGeo(dummyModel);
            const toAdd = [];
            builtGeo.children.forEach(c => toAdd.push(c));
            toAdd.forEach(c => {
                builtGeo.remove(c);
                clockGroup.add(c);
            });
        }

        const scn = getScene();
        if (scn) {
            scn.animCbs = scn.animCbs || [];
            scn.animCbs = scn.animCbs.filter(cb => cb !== updateClockwork);
        }
    }

    function renderPanel() {
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'cu3-panel';
            document.body.appendChild(panel);
        }
        injectCSS();

        const l = L();
        panel.innerHTML = `
            <div class="hdr">
                <span class="hdr-title">${l.title}</span>
                <button class="x">✕</button>
            </div>
            
            <div class="sec">
                <div class="sec-t">🖼️ ${l.uploadLabel}</div>
                <div style="font-size:9.5px;color:#64748b;margin-bottom:6px;">${l.uploadHint}</div>
                <input type="file" id="cu3-file-input" accept="image/png, image/jpeg, .dxf" style="width:100%;font-size:10px;background:#0d1225;color:#818cf8;border:1px solid rgba(129,140,248,0.3);border-radius:4px;padding:5px;cursor:pointer;" />
                <div class="file-info" id="cu3-file-info">${dxfFileName ? l.dxfLoaded + ' ' + dxfFileName : (customLogoStr ? l.imgLoaded : l.noFile)}</div>
            </div>

            <div class="sec">
                <div class="sec-t">${l.faceGroup}</div>
                <div class="slider-row" style="flex-direction:column; align-items:flex-start; gap:6px;">
                    <span class="slider-label">${l.shapeLabel}</span>
                    <div style="display:flex;flex-wrap:wrap;gap:4px;width:100%;">
                        <button class="btn-choice ${faceShape==='circle'?'active':''}" id="cu3-shape-circle" style="padding:4.5px 7px;flex:1 1 auto;min-width:60px;">${l.shapeCircle}</button>
                        <button class="btn-choice ${faceShape==='square'?'active':''}" id="cu3-shape-square" style="padding:4.5px 7px;flex:1 1 auto;min-width:60px;">${l.shapeSquare}</button>
                        <button class="btn-choice ${faceShape==='none'?'active':''}" id="cu3-shape-none" style="padding:4.5px 7px;flex:1 1 auto;min-width:60px;">${l.shapeNone}</button>
                        <button class="btn-choice ${faceShape==='custom'?'active':''}" id="cu3-shape-custom" style="padding:4.5px 7px;flex:1 1 auto;min-width:60px;">${l.shapeCustom}</button>
                        <button class="btn-choice ${faceShape==='silhouette'?'active':''}" id="cu3-shape-silhouette" style="padding:4.5px 7px;flex:1 1 auto;min-width:90px;">${l.shapeSilhouette}</button>
                    </div>
                </div>
                <div class="slider-row">
                    <span class="slider-label">${l.metalLabel}</span>
                    <select id="cu3-metal-style" class="input-text" style="width:120px;padding:3px;">
                        <option value="none" ${metalStyle==='none'?'selected':''}>${l.metalNone}</option>
                        <option value="gold" ${metalStyle==='gold'?'selected':''}>Gold</option>
                        <option value="brass" ${metalStyle==='brass'?'selected':''}>Brass</option>
                        <option value="copper" ${metalStyle==='copper'?'selected':''}>Copper</option>
                        <option value="steel" ${metalStyle==='steel'?'selected':''}>Steel</option>
                    </select>
                </div>
                <div class="slider-row" id="cu3-face-color-row" style="display: ${faceShape!=='none'?'flex':'none'};">
                    <span class="slider-label">${l.faceColorLabel}</span>
                    <input type="color" id="cu3-face-color" value="${faceColor}" style="width:50px;height:24px;border:none;cursor:pointer;background:none;"/>
                </div>
                <div class="slider-row" id="cu3-model-color-row" style="display: ${(faceShape==='custom' || faceShape==='silhouette')?'flex':'none'};">
                    <span class="slider-label">${l.modelColorLabel}</span>
                    <input type="color" id="cu3-model-color" value="${modelColor}" style="width:50px;height:24px;border:none;cursor:pointer;background:none;"/>
                </div>
            </div>

            <div class="sec">
                <div class="sec-t">${l.pivotGroup}</div>
                <div class="slider-row">
                    <span class="slider-label">${l.pivotXLabel}</span>
                    <input type="range" id="cu3-pivot-x" class="slider" min="-30" max="30" step="0.5" value="${pivotX}"/>
                    <span class="slider-val" id="cu3-pivot-x-val">${pivotX}</span>
                </div>
                <div class="slider-row">
                    <span class="slider-label">${l.pivotYLabel}</span>
                    <input type="range" id="cu3-pivot-y" class="slider" min="-30" max="30" step="0.5" value="${pivotY}"/>
                    <span class="slider-val" id="cu3-pivot-y-val">${pivotY}</span>
                </div>
            </div>

            <div class="sec">
                <div class="sec-t">${l.handsGroup}</div>
                
                <div class="slider-row">
                    <span class="slider-label">${l.styleLabel}</span>
                    <select id="cu3-hand-style" class="input-text" style="width:120px;padding:3px;">
                        <option value="modern" ${handStyle==='modern'?'selected':''}>Modern Baton</option>
                        <option value="classic" ${handStyle==='classic'?'selected':''}>Classic Spade</option>
                        <option value="diamond" ${handStyle==='diamond'?'selected':''}>Diamond Tip</option>
                        <option value="neon" ${handStyle==='neon'?'selected':''}>Neon Glow</option>
                        <option value="arrow" ${handStyle==='arrow'?'selected':''}>Luxury Arrow</option>
                    </select>
                </div>

                <!-- Hour Hand -->
                <div style="border-top:1px solid rgba(255,255,255,0.04);margin-top:6px;padding-top:6px;">
                    <div class="slider-row">
                        <span class="slider-label" style="font-weight:700;">${l.handHColorLabel}</span>
                        <input type="color" id="cu3-hand-h-color" value="${handHColor}" style="width:30px;height:20px;border:none;cursor:pointer;background:none;"/>
                    </div>
                    <div class="slider-row">
                        <span class="slider-label">${l.handHLengthLabel}</span>
                        <input type="range" id="cu3-hand-h-len" class="slider" min="5" max="35" value="${handHLength}"/>
                        <span class="slider-val" id="cu3-hand-h-len-val">${handHLength}</span>
                    </div>
                    <div class="slider-row">
                        <span class="slider-label">${l.handHWidthLabel}</span>
                        <input type="range" id="cu3-hand-h-wid" class="slider" min="0.2" max="6.0" step="0.1" value="${handHWidth}"/>
                        <span class="slider-val" id="cu3-hand-h-wid-val">${handHWidth}</span>
                    </div>
                </div>

                <!-- Minute Hand -->
                <div style="border-top:1px solid rgba(255,255,255,0.04);margin-top:6px;padding-top:6px;">
                    <div class="slider-row">
                        <span class="slider-label" style="font-weight:700;">${l.handMColorLabel}</span>
                        <input type="color" id="cu3-hand-m-color" value="${handMColor}" style="width:30px;height:20px;border:none;cursor:pointer;background:none;"/>
                    </div>
                    <div class="slider-row">
                        <span class="slider-label">${l.handMLengthLabel}</span>
                        <input type="range" id="cu3-hand-m-len" class="slider" min="8" max="45" value="${handMLength}"/>
                        <span class="slider-val" id="cu3-hand-m-len-val">${handMLength}</span>
                    </div>
                    <div class="slider-row">
                        <span class="slider-label">${l.handMWidthLabel}</span>
                        <input type="range" id="cu3-hand-m-wid" class="slider" min="0.2" max="5.0" step="0.1" value="${handMWidth}"/>
                        <span class="slider-val" id="cu3-hand-m-wid-val">${handMWidth}</span>
                    </div>
                </div>

                <!-- Second Hand -->
                <div style="border-top:1px solid rgba(255,255,255,0.04);margin-top:6px;padding-top:6px;">
                    <div class="slider-row">
                        <span class="slider-label" style="font-weight:700;">${l.handSColorLabel}</span>
                        <input type="color" id="cu3-hand-s-color" value="${handSColor}" style="width:30px;height:20px;border:none;cursor:pointer;background:none;"/>
                    </div>
                    <div class="slider-row">
                        <span class="slider-label">${l.handSLengthLabel}</span>
                        <input type="range" id="cu3-hand-s-len" class="slider" min="10" max="50" value="${handSLength}"/>
                        <span class="slider-val" id="cu3-hand-s-len-val">${handSLength}</span>
                    </div>
                    <div class="slider-row">
                        <span class="slider-label">${l.handSWidthLabel}</span>
                        <input type="range" id="cu3-hand-s-wid" class="slider" min="0.1" max="3.0" step="0.1" value="${handSWidth}"/>
                        <span class="slider-val" id="cu3-hand-s-wid-val">${handSWidth}</span>
                    </div>
                </div>
            </div>

            <div class="sec">
                <div class="sec-t">${l.markerGroup}</div>
                <div class="slider-row">
                    <span class="slider-label">${l.markerStyleLabel}</span>
                    <select id="cu3-marker-style" class="input-text" style="width:120px;padding:3px;">
                        <option value="none" ${markerStyle==='none'?'selected':''}>${l.markerNone}</option>
                        <option value="lines" ${markerStyle==='lines'?'selected':''}>${l.markerLines}</option>
                        <option value="dots" ${markerStyle==='dots'?'selected':''}>${l.markerDots}</option>
                        <option value="roman" ${markerStyle==='roman'?'selected':''}>${l.markerRoman}</option>
                        <option value="arabic" ${markerStyle==='arabic'?'selected':''}>${l.markerArabic}</option>
                    </select>
                </div>
                <div class="slider-row">
                    <span class="slider-label">${l.markerColorLabel}</span>
                    <input type="color" id="cu3-marker-color" value="${markerColor}" style="width:30px;height:20px;border:none;cursor:pointer;background:none;"/>
                </div>
                <div class="slider-row">
                    <span class="slider-label">${l.markerRadiusLabel}</span>
                    <input type="range" id="cu3-marker-radius" class="slider" min="10" max="48" value="${markerRadius}"/>
                    <span class="slider-val" id="cu3-marker-radius-val">${markerRadius}</span>
                </div>
                <div class="slider-row">
                    <span class="slider-label">${l.markerSizeLabel}</span>
                    <input type="range" id="cu3-marker-size" class="slider" min="0.2" max="3.0" step="0.1" value="${markerSize}"/>
                    <span class="slider-val" id="cu3-marker-size-val">${markerSize}</span>
                </div>
            </div>

            <div class="sec">
                <div class="sec-t">${l.optionsGroup}</div>
                
                <label class="cb-row">
                    <input type="checkbox" id="cu3-opt-glass" ${glassCover?'checked':''} />
                    <span>${l.glassLabel}</span>
                </label>

                <label class="cb-row">
                    <input type="checkbox" id="cu3-opt-sound" ${soundEnabled?'checked':''} />
                    <span>${l.soundLabel}</span>
                </label>

                <label class="cb-row">
                    <input type="checkbox" id="cu3-opt-gears" ${gearsEnabled?'checked':''} />
                    <span>${l.gearsLabel}</span>
                </label>

                <label class="cb-row">
                    <input type="checkbox" id="cu3-opt-neon" ${neonBorderEnabled?'checked':''} />
                    <span>${l.neonBorderLabel}</span>
                </label>

                <div id="cu3-neon-color-row" class="slider-row" style="display: ${neonBorderEnabled?'flex':'none'}; margin-left: 20px; margin-bottom: 8px;">
                    <span class="slider-label">${l.neonBorderColorLabel}</span>
                    <input type="color" id="cu3-neon-color" value="${neonBorderColor}" style="width:30px;height:20px;border:none;cursor:pointer;background:none;"/>
                </div>

                <label class="cb-row">
                    <input type="checkbox" id="cu3-opt-glow" ${glowEnabled?'checked':''} />
                    <span>${l.glowLabel}</span>
                </label>
                
                <div id="cu3-glow-color-row" class="slider-row" style="display: ${glowEnabled?'flex':'none'}; margin-left: 20px; margin-bottom: 8px;">
                    <span class="slider-label">${l.glowColorLabel}</span>
                    <input type="color" id="cu3-glow-color" value="${glowColor}" style="width:30px;height:20px;border:none;cursor:pointer;background:none;"/>
                </div>

                <label class="cb-row">
                    <input type="checkbox" id="cu3-opt-parallax" ${parallaxEnabled?'checked':''} />
                    <span>${l.parallaxLabel}</span>
                </label>

                <label class="cb-row">
                    <input type="checkbox" id="cu3-opt-glare-sweep" ${glareSweepEnabled?'checked':''} />
                    <span>${l.glareSweepLabel}</span>
                </label>

                <label class="cb-row">
                    <input type="checkbox" id="cu3-opt-chrono" ${chronoEnabled?'checked':''} />
                    <span>${l.chronoEnabledLabel}</span>
                </label>

                <div id="cu3-chrono-controls" style="display: ${chronoEnabled?'block':'none'}; margin-left: 20px; margin-bottom: 12px; border-left: 2px solid rgba(139,92,246,0.3); padding-left: 10px;">
                    <div style="font-size:10px;color:#a5b4fc;margin-bottom:6px;font-weight:bold;">${l.chronoLabel}</div>
                    <div style="display:flex;gap:6px;margin-bottom:8px;">
                        <button id="cu3-chrono-start" class="btn-choice" style="flex:1;padding:5px;font-size:9.5px;">${chronoRunning ? '⏸️ Pause' : `▶️ ${l.chronoStart}`}</button>
                        <button id="cu3-chrono-reset" class="btn-choice" style="padding:5px 8px;font-size:9.5px;">🔁 ${l.chronoReset}</button>
                    </div>
                    <div class="slider-row" style="margin-bottom:4px;">
                        <span class="slider-label" style="font-size:10px;">${l.chronoColorLabel}</span>
                        <input type="color" id="cu3-chrono-color" value="${chronoColor}" style="width:30px;height:20px;border:none;cursor:pointer;background:none;"/>
                    </div>
                    <div class="slider-row">
                        <span class="slider-label" style="font-size:10px;">${l.chronoNeedleColorLabel}</span>
                        <input type="color" id="cu3-chrono-needle-color" value="${chronoNeedleColor}" style="width:30px;height:20px;border:none;cursor:pointer;background:none;"/>
                    </div>
                </div>

                <div style="border-top:1px solid rgba(255,255,255,0.06); margin-top:8px; padding-top:8px;">
                    <div style="font-size:10px; color:#10b981; margin-bottom:8px; font-weight:bold; text-transform:uppercase;">✍️ ${l.textGroup}</div>
                    
                    <!-- Tabs Selector -->
                    <div style="display:flex; gap:4px; margin-bottom:10px;">
                        <button class="btn-choice ${activeTextTab===0?'active':''}" id="cu3-text-tab-0" style="padding:4px 0; flex:1;">Text 1</button>
                        <button class="btn-choice ${activeTextTab===1?'active':''}" id="cu3-text-tab-1" style="padding:4px 0; flex:1;">Text 2</button>
                        <button class="btn-choice ${activeTextTab===2?'active':''}" id="cu3-text-tab-2" style="padding:4px 0; flex:1;">Text 3</button>
                    </div>

                    <div class="slider-row" style="flex-direction:column; align-items:flex-start; gap:4px; margin-bottom:8px;">
                        <span class="slider-label" style="font-size:10px;">${l.textLabel}</span>
                        <input type="text" id="cu3-dial-text" class="input-text" placeholder="e.g. ROLEX / CHRONO" value="${dialTexts[activeTextTab].text}" />
                    </div>

                    <!-- Presets Selector -->
                    <div class="slider-row" style="flex-direction:column; align-items:flex-start; gap:4px; margin-bottom:8px;">
                        <span class="slider-label" style="font-size:10px; font-weight:700;">${l.textPresetsLabel}</span>
                        <div style="display:flex; gap:4px; width:100%;">
                            <button class="btn-choice" id="cu3-preset-top" style="padding:4px 6px; flex:1; font-size:9px;">${l.textPresetTop}</button>
                            <button class="btn-choice" id="cu3-preset-bottom" style="padding:4px 6px; flex:1; font-size:9px;">${l.textPresetBottom}</button>
                            <button class="btn-choice" id="cu3-preset-center" style="padding:4px 6px; flex:1; font-size:9px;">${l.textPresetCenter}</button>
                        </div>
                    </div>

                    <div class="slider-row">
                        <span class="slider-label">${l.textColorLabel}</span>
                        <input type="color" id="cu3-dial-text-color" value="${dialTexts[activeTextTab].color}" style="width:30px;height:20px;border:none;cursor:pointer;background:none;"/>
                    </div>

                    <div class="slider-row">
                        <span class="slider-label">${l.textSizeLabel}</span>
                        <input type="range" id="cu3-dial-text-size" class="slider" min="4" max="48" step="1" value="${dialTexts[activeTextTab].size}"/>
                        <span class="slider-val" id="cu3-dial-text-size-val">${dialTexts[activeTextTab].size}</span>
                    </div>

                    <div class="slider-row">
                        <span class="slider-label">${l.textFontLabel}</span>
                        <select id="cu3-dial-text-font" class="input-text" style="width:120px;padding:3px;">
                            <option value="Inter" ${dialTexts[activeTextTab].font==='Inter'?'selected':''}>Inter</option>
                            <option value="Roboto" ${dialTexts[activeTextTab].font==='Roboto'?'selected':''}>Roboto</option>
                            <option value="Playfair Display" ${dialTexts[activeTextTab].font==='Playfair Display'?'selected':''}>Playfair</option>
                            <option value="Montserrat" ${dialTexts[activeTextTab].font==='Montserrat'?'selected':''}>Montserrat</option>
                            <option value="JetBrains Mono" ${dialTexts[activeTextTab].font==='JetBrains Mono'?'selected':''}>Monospace</option>
                        </select>
                    </div>

                    <div class="slider-row">
                        <span class="slider-label">${l.textXLabel}</span>
                        <input type="range" id="cu3-dial-text-x" class="slider" min="-30" max="30" step="0.5" value="${dialTexts[activeTextTab].x}"/>
                        <span class="slider-val" id="cu3-dial-text-x-val">${dialTexts[activeTextTab].x}</span>
                    </div>

                    <div class="slider-row">
                        <span class="slider-label">${l.textYLabel}</span>
                        <input type="range" id="cu3-dial-text-y" class="slider" min="-30" max="30" step="0.5" value="${dialTexts[activeTextTab].y}"/>
                        <span class="slider-val" id="cu3-dial-text-y-val">${dialTexts[activeTextTab].y}</span>
                    </div>

                    <div class="slider-row">
                        <span class="slider-label">${l.textRotLabel}</span>
                        <input type="range" id="cu3-dial-text-rot" class="slider" min="-180" max="180" step="5" value="${dialTexts[activeTextTab].rotation}"/>
                        <span class="slider-val" id="cu3-dial-text-rot-val">${dialTexts[activeTextTab].rotation}</span>
                    </div>

                    <div class="slider-row">
                        <span class="slider-label">${l.textOrientLabel}</span>
                        <select id="cu3-dial-text-orient" class="input-text" style="width:120px;padding:3px;">
                            <option value="horizontal" ${dialTexts[activeTextTab].orientation==='horizontal'?'selected':''}>Horizontal</option>
                            <option value="vertical" ${dialTexts[activeTextTab].orientation==='vertical'?'selected':''}>Vertical</option>
                        </select>
                    </div>

                    <div class="slider-row">
                        <span class="slider-label">${l.textPresetLabel}</span>
                        <select id="cu3-dial-text-preset" class="input-text" style="width:120px;padding:3px;">
                            <option value="flat" ${dialTexts[activeTextTab].preset==='flat'?'selected':''}>Flat Decal</option>
                            <option value="glow" ${dialTexts[activeTextTab].preset==='glow'?'selected':''}>Neon Glow</option>
                            <option value="metallic" ${dialTexts[activeTextTab].preset==='metallic'?'selected':''}>Metallic Engraved</option>
                            <option value="holographic" ${dialTexts[activeTextTab].preset==='holographic'?'selected':''}>Futuristic HUD</option>
                        </select>
                    </div>

                    <label class="cb-row">
                        <input type="checkbox" id="cu3-dial-text-warp" ${dialTexts[activeTextTab].warp?'checked':''} />
                        <span>${l.textWarpLabel}</span>
                    </label>

                    <div id="cu3-dial-text-warp-row" class="slider-row" style="display: ${dialTexts[activeTextTab].warp?'flex':'none'}; margin-left: 20px;">
                        <span class="slider-label">${l.textWarpRadLabel}</span>
                        <input type="range" id="cu3-dial-text-warp-rad" class="slider" min="10" max="40" step="1" value="${dialTexts[activeTextTab].warpRadius}"/>
                        <span class="slider-val" id="cu3-dial-text-warp-rad-val">${dialTexts[activeTextTab].warpRadius}</span>
                    </div>

                    <label class="cb-row">
                        <input type="checkbox" id="cu3-dial-text-pulse" ${dialTexts[activeTextTab].pulseWithTick?'checked':''} />
                        <span>${l.textPulseLabel}</span>
                    </label>
                </div>

                <div style="border-top:1px solid rgba(255,255,255,0.06); margin-top:8px; padding-top:8px;">
                    <div style="font-size:10px; color:#a78bfa; margin-bottom:8px; font-weight:bold; text-transform:uppercase;">${l.advDialLabel}</div>
                    
                    <div class="slider-row">
                        <span class="slider-label" style="font-size:10px;">${l.dialTextureLabel}</span>
                        <select id="cu3-dial-texture-preset" class="input-text" style="width:120px;padding:3px;">
                            <option value="none" ${dialTexturePreset==='none'?'selected':''}>${l.textureNone}</option>
                            <option value="carbon" ${dialTexturePreset==='carbon'?'selected':''}>${l.textureCarbon}</option>
                            <option value="sunburst" ${dialTexturePreset==='sunburst'?'selected':''}>${l.textureSunburst}</option>
                            <option value="marble" ${dialTexturePreset==='marble'?'selected':''}>${l.textureMarble}</option>
                            <option value="wood" ${dialTexturePreset==='wood'?'selected':''}>${l.textureWood}</option>
                            <option value="sidef" ${dialTexturePreset==='sidef'?'selected':''}>${l.textureSidef}</option>
                        </select>
                    </div>

                    <div class="slider-row">
                        <span class="slider-label" style="font-size:10px;">${l.weatherOverlayLabel}</span>
                        <select id="cu3-weather-overlay" class="input-text" style="width:120px;padding:3px;">
                            <option value="none" ${weatherOverlay==='none'?'selected':''}>${l.weatherNone}</option>
                            <option value="rain" ${weatherOverlay==='rain'?'selected':''}>${l.weatherRain}</option>
                            <option value="snow" ${weatherOverlay==='snow'?'selected':''}>${l.weatherSnow}</option>
                            <option value="mist" ${weatherOverlay==='mist'?'selected':''}>${l.weatherMist}</option>
                        </select>
                    </div>

                    <label class="cb-row">
                        <input type="checkbox" id="cu3-dynamic-time-color" ${dynamicTimeColor?'checked':''} />
                        <span>${l.dynamicTimeColorLabel}</span>
                    </label>

                    <label class="cb-row">
                        <input type="checkbox" id="cu3-audio-reactive" ${audioReactive?'checked':''} />
                        <span>${l.audioReactiveLabel}</span>
                    </label>

                    <div class="slider-row">
                        <span class="slider-label" style="font-size:10px;">${l.subDialModeLabel}</span>
                        <select id="cu3-subdial-mode" class="input-text" style="width:120px;padding:3px;">
                            <option value="chrono" ${subDialMode==='chrono'?'selected':''}>${l.subDialChrono}</option>
                            <option value="battery" ${subDialMode==='battery'?'selected':''}>${l.subDialBattery}</option>
                            <option value="gmt" ${subDialMode==='gmt'?'selected':''}>${l.subDialGMT}</option>
                            <option value="performance" ${subDialMode==='performance'?'selected':''}>${l.subDialPerformance}</option>
                            <option value="countdown" ${subDialMode==='countdown'?'selected':''}>${l.subDialCountdown}</option>
                        </select>
                    </div>
                    <div id="cu3-countdown-config" style="display: ${subDialMode==='countdown'?'block':'none'}; margin-left: 10px; margin-top: 6px; border-left: 2px solid #a855f7; padding-left: 8px; margin-bottom: 6px;">
                        <div class="slider-row" style="flex-direction:column; align-items:flex-start; gap:4px; margin-bottom:6px;">
                            <span class="slider-label" style="font-size:9.5px;color:#cbd5e1;">${l.countdownTargetLabel}</span>
                            <input type="datetime-local" id="cu3-countdown-target" class="input-text" value="${countdownTarget || ''}" style="width:100%;font-size:10px;padding:3px;" />
                        </div>
                    </div>



                <div style="border-top:1px solid rgba(255,255,255,0.06); margin-top:8px; padding-top:8px;">
                    <div style="font-size:10px; color:#60a5fa; margin-bottom:6px; font-weight:bold; text-transform:uppercase;">💎 Themes Ultra-Premium</div>
                    
                    <label class="cb-row">
                        <input type="checkbox" id="cu3-opt-tourbillon" ${tourbillonEnabled?'checked':''} />
                        <span>${l.tourbillonLabel}</span>
                    </label>
                    <label class="cb-row">
                        <input type="checkbox" id="cu3-opt-moonphase" ${moonPhaseEnabled?'checked':''} />
                        <span>${l.moonPhaseLabel}</span>
                    </label>
                    <label class="cb-row">
                        <input type="checkbox" id="cu3-opt-liquidneon" ${liquidNeonEnabled?'checked':''} />
                        <span>${l.liquidNeonLabel}</span>
                    </label>
                    <label class="cb-row">
                        <input type="checkbox" id="cu3-opt-steampipes" ${steamPipesEnabled?'checked':''} />
                        <span>${l.steamPipesLabel}</span>
                    </label>
                    <label class="cb-row">
                        <input type="checkbox" id="cu3-opt-holohud" ${holoHudEnabled?'checked':''} />
                        <span>${l.holoHudLabel}</span>
                    </label>
                </div>

                <div style="border-top:1px solid rgba(255,255,255,0.06); margin-top:8px; padding-top:8px;">
                    <div style="font-size:10px; color:#a855f7; margin-bottom:6px; font-weight:bold; text-transform:uppercase;">💎 ${l.newFeaturesGroup}</div>
                    
                    <div class="slider-row">
                        <span class="slider-label" style="font-size:10px;">${l.themePresetLabel}</span>
                        <select id="cu3-theme-preset" class="input-text" style="width:120px;padding:3px;">
                            <option value="custom" ${themePreset==='custom'?'selected':''}>Custom</option>
                            <option value="rolex_ocean" ${themePreset==='rolex_ocean'?'selected':''}>Rolex Ocean</option>
                            <option value="steampunk_oracle" ${themePreset==='steampunk_oracle'?'selected':''}>Steampunk Oracle</option>
                            <option value="zen_liquid" ${themePreset==='zen_liquid'?'selected':''}>Zen Liquid</option>
                        </select>
                    </div>

                    <label class="cb-row">
                        <input type="checkbox" id="cu3-opt-timetravel" ${timeTravelEnabled?'checked':''} />
                        <span>${l.timeTravelLabel}</span>
                    </label>
                    <label class="cb-row" id="cu3-timetravel-autoreturn-row" style="display: ${timeTravelEnabled?'flex':'none'}; margin-left: 20px;">
                        <input type="checkbox" id="cu3-opt-timetravel-autoreturn" ${timeTravelAutoReturn?'checked':''} />
                        <span>${l.timeTravelAutoReturnLabel}</span>
                    </label>

                    <label class="cb-row">
                        <input type="checkbox" id="cu3-opt-cursormagnetism" ${cursorMagnetismEnabled?'checked':''} />
                        <span>${l.cursorMagnetismLabel}</span>
                    </label>

                    <label class="cb-row">
                        <input type="checkbox" id="cu3-opt-ambienttick" ${ambientTickEnabled?'checked':''} />
                        <span>${l.ambientTickLabel}</span>
                    </label>
                    <label class="cb-row">
                        <input type="checkbox" id="cu3-opt-hourlychime" ${hourlyChimeEnabled?'checked':''} />
                        <span>${l.hourlyChimeLabel}</span>
                    </label>
                    <div style="margin-left: 20px; margin-bottom: 8px;">
                        <button class="action-btn secondary" id="cu3-chime-test" style="padding: 4px 8px; font-size: 10px; height:auto; width:auto; border-radius:4px;">${l.testChimeLabel}</button>
                    </div>

                    <!-- Navigator Menu Redirect -->
                    <label class="cb-row" style="border-top: 1px solid rgba(255,255,255,0.04); margin-top: 6px; padding-top: 6px;">
                        <input type="checkbox" id="cu3-opt-navmenu" ${navigatorMenuEnabled?'checked':''} />
                        <span>${l.navigatorMenuEnabledLabel}</span>
                    </label>

                    <!-- Clock-to-Book Scheduling -->
                    <label class="cb-row">
                        <input type="checkbox" id="cu3-opt-clocktobook" ${clockToBookEnabled?'checked':''} />
                        <span>${l.clockToBookEnabledLabel}</span>
                    </label>

                    <!-- Business Hours Ring -->
                    <label class="cb-row">
                        <input type="checkbox" id="cu3-opt-businesshours" ${businessHoursRingEnabled?'checked':''} />
                        <span>${l.businessHoursRingEnabledLabel}</span>
                    </label>
                    <div id="cu3-businesshours-controls" style="display: ${businessHoursRingEnabled?'block':'none'}; margin-left: 20px; padding: 6px; background: rgba(0,0,0,0.15); border-radius: 4px; margin-bottom: 8px;">
                        <div class="slider-row" style="margin-bottom: 4px;">
                            <span class="slider-label" style="font-size: 9.5px;">Start Hour: <span id="cu3-bh-start-val">${businessHoursStart}</span>:00</span>
                            <input type="range" id="cu3-businesshours-start" min="0" max="23" value="${businessHoursStart}" style="flex:1;height:4px;accent-color:#10b981;" />
                        </div>
                        <div class="slider-row">
                            <span class="slider-label" style="font-size: 9.5px;">End Hour: <span id="cu3-bh-end-val">${businessHoursEnd}</span>:00</span>
                            <input type="range" id="cu3-businesshours-end" min="0" max="23" value="${businessHoursEnd}" style="flex:1;height:4px;accent-color:#10b981;" />
                        </div>
                    </div>

                    <!-- Web Analytics Simulation -->
                    <label class="cb-row">
                        <input type="checkbox" id="cu3-opt-analytics" ${analyticsDisplayEnabled?'checked':''} />
                        <span>${l.analyticsDisplayEnabledLabel}</span>
                    </label>

                    <!-- Weather Sync & Blue Light Adaptive Filter -->
                    <label class="cb-row">
                        <input type="checkbox" id="cu3-opt-weathersync" ${weatherWeatherSyncEnabled?'checked':''} />
                        <span>${l.weatherWeatherSyncEnabledLabel}</span>
                    </label>
                    <label class="cb-row">
                        <input type="checkbox" id="cu3-opt-bluelight" ${blueLightFilterEnabled?'checked':''} />
                        <span>${l.blueLightFilterEnabledLabel}</span>
                    </label>

                    <!-- Pomodoro Timer Controls -->
                    <label class="cb-row" style="border-top: 1px solid rgba(255,255,255,0.04); margin-top: 6px; padding-top: 6px;">
                        <input type="checkbox" id="cu3-opt-pomodoro" ${pomodoroTimerEnabled?'checked':''} />
                        <span>${l.pomodoroTimerEnabledLabel}</span>
                    </label>
                    <div id="cu3-pomodoro-controls" style="display: ${pomodoroTimerEnabled?'block':'none'}; margin-left: 20px; padding: 6px; background: rgba(0,0,0,0.15); border-radius: 4px; margin-bottom: 8px;">
                        <div class="slider-row">
                            <span class="slider-label" style="font-size: 9.5px;">${l.pomodoroFocusTimeLabel}</span>
                            <input type="number" id="cu3-pomodoro-dur" min="1" max="120" value="${pomodoroDuration}" style="width: 50px; font-size: 10px; background: #070a13; color: #fff; border: 1px solid #1e293b; border-radius: 4px; padding: 2px 4px; outline:none;" />
                        </div>
                        <div style="display: flex; gap: 4px; margin-top: 6px;">
                            <button class="action-btn primary" id="cu3-pomodoro-btn-start" style="padding: 4px 8px; font-size: 10px; height:auto; width:auto; border-radius:4px; flex:1;">
                                ${pomodoroRunning ? l.pomodoroStopBtn : l.pomodoroStartBtn}
                            </button>
                            <span id="cu3-pomodoro-time-display" style="font-family: monospace; font-size: 11px; align-self: center; font-weight: bold; color: #ef4444; width: 40px; text-align: right;">
                                ${pomodoroRunning ? Math.floor(pomodoroTimeRemaining / 60) + ':' + String(pomodoroTimeRemaining % 60).padStart(2, '0') : ''}
                            </span>
                        </div>
                    </div>

                    <!-- ASMR Soundscape Mixer Controls -->
                    <label class="cb-row" style="border-top: 1px solid rgba(255,255,255,0.04); margin-top: 6px; padding-top: 6px;">
                        <input type="checkbox" id="cu3-opt-soundscape" ${soundscapeMixerEnabled?'checked':''} />
                        <span>${l.soundscapeMixerEnabledLabel}</span>
                    </label>
                    <div id="cu3-soundscape-controls" style="display: ${soundscapeMixerEnabled?'block':'none'}; margin-left: 20px; padding: 6px; background: rgba(0,0,0,0.15); border-radius: 4px; margin-bottom: 8px;">
                        <!-- Rain Volume -->
                        <div class="slider-row" style="margin-bottom: 4px;">
                            <span class="slider-label" style="font-size: 9.5px; width: 110px;">${l.soundscapeRainLabel}</span>
                            <input type="range" id="cu3-soundscape-rain" min="0" max="100" value="${soundscapeRainVol}" style="flex:1;" />
                            <span id="cu3-soundscape-rain-val" style="font-size: 9px; font-weight: bold; width: 25px; text-align: right; color:#94a3b8;">${soundscapeRainVol}%</span>
                        </div>
                        <!-- Wind Volume -->
                        <div class="slider-row" style="margin-bottom: 4px;">
                            <span class="slider-label" style="font-size: 9.5px; width: 110px;">${l.soundscapeWindLabel}</span>
                            <input type="range" id="cu3-soundscape-wind" min="0" max="100" value="${soundscapeWindVol}" style="flex:1;" />
                            <span id="cu3-soundscape-wind-val" style="font-size: 9px; font-weight: bold; width: 25px; text-align: right; color:#94a3b8;">${soundscapeWindVol}%</span>
                        </div>
                        <!-- Binaural Volume -->
                        <div class="slider-row">
                            <span class="slider-label" style="font-size: 9.5px; width: 110px;">${l.soundscapeBinauralLabel}</span>
                            <input type="range" id="cu3-soundscape-binaural" min="0" max="100" value="${soundscapeBinauralVol}" style="flex:1;" />
                            <span id="cu3-soundscape-binaural-val" style="font-size: 9px; font-weight: bold; width: 25px; text-align: right; color:#94a3b8;">${soundscapeBinauralVol}%</span>
                        </div>
                    </div>

                    <!-- Team Members per Hour -->
                    <label class="cb-row" style="border-top: 1px solid rgba(255,255,255,0.04); margin-top: 6px; padding-top: 6px;">
                        <input type="checkbox" id="cu3-opt-teammembers" ${teamMembersEnabled?"checked":""} />
                        <span>${l.teamMembersEnabledLabel}</span>
                    </label>

                    <!-- Interactive History & Milestones Mode -->
                    <label class="cb-row" style="border-top: 1px solid rgba(255,255,255,0.04); margin-top: 6px; padding-top: 6px;">
                        <input type="checkbox" id="cu3-opt-historytimeline" ${historyTimelineEnabled?"checked":""} />
                        <span>${l.historyTimelineEnabledLabel}</span>
                    </label>

                    <!-- Remote Team Presence Ring -->
                    <label class="cb-row">
                        <input type="checkbox" id="cu3-opt-teampresence" ${teamPresenceRingEnabled?"checked":""} />
                        <span>${l.teamPresenceRingEnabledLabel}</span>
                    </label>

                    <!-- KPI & Financial Dashboard 3D -->
                    <label class="cb-row">
                        <input type="checkbox" id="cu3-opt-kpidashboard" ${kpiDashboardEnabled?"checked":""} />
                        <span>${l.kpiDashboardEnabledLabel}</span>
                    </label>

                    <!-- Security Radar & Server Health -->
                    <label class="cb-row">
                        <input type="checkbox" id="cu3-opt-securityradar" ${securityRadarEnabled?"checked":""} />
                        <span>${l.securityRadarEnabledLabel}</span>
                    </label>

                    <!-- Audio Visualizer 3D -->
                    <label class="cb-row">
                        <input type="checkbox" id="cu3-opt-audiovisualizer" ${audioVisualizerEnabled?"checked":""} />
                        <span>${l.audioVisualizerEnabledLabel}</span>
                    </label>

                    <!-- Future Roadmap & Milestones -->
                    <label class="cb-row">
                        <input type="checkbox" id="cu3-opt-futureroadmap" ${futureRoadmapEnabled?"checked":""} />
                        <span>${l.futureRoadmapEnabledLabel}</span>
                    </label>

                    <!-- Crypto & Financial Live Ticker -->
                    <label class="cb-row">
                        <input type="checkbox" id="cu3-opt-financialticker" ${financialTickerEnabled?"checked":""} />
                        <span>${l.financialTickerEnabledLabel}</span>
                    </label>
                    <div id="cu3-financial-controls" style="display: ${financialTickerEnabled ? 'flex' : 'none'}; flex-direction: column; gap: 4px; padding-left: 18px; margin-top: 4px; margin-bottom: 8px;">
                        <div class="slider-row">
                            <span class="slider-label" style="font-size: 10px;">${l.financialAssetLabel}</span>
                            <select id="cu3-financial-asset" class="input-text" style="width: 100px; padding: 2px;">
                                <option value="BTC" ${financialAsset === 'BTC' ? 'selected' : ''}>Bitcoin (BTC)</option>
                                <option value="ETH" ${financialAsset === 'ETH' ? 'selected' : ''}>Ethereum (ETH)</option>
                                <option value="SOL" ${financialAsset === 'SOL' ? 'selected' : ''}>Solana (SOL)</option>
                                <option value="MOCK" ${financialAsset === 'MOCK' ? 'selected' : ''}>Bursă / Mock</option>
                            </select>
                        </div>
                        <div class="slider-row">
                            <span class="slider-label" style="font-size: 10px;">${l.financialCurrencyLabel}</span>
                            <select id="cu3-financial-currency" class="input-text" style="width: 100px; padding: 2px;">
                                <option value="USD" ${financialCurrency === 'USD' ? 'selected' : ''}>USD ($)</option>
                                <option value="EUR" ${financialCurrency === 'EUR' ? 'selected' : ''}>EUR (€)</option>
                            </select>
                        </div>
                    </div>

                    <!-- Celestial Orbit Tracker -->
                    <label class="cb-row">
                        <input type="checkbox" id="cu3-opt-celestialtracker" ${celestialTrackerEnabled?"checked":""} />
                        <span>${l.celestialTrackerEnabledLabel}</span>
                    </label>
                    <div id="cu3-celestial-controls" style="display: ${celestialTrackerEnabled ? 'flex' : 'none'}; flex-direction: column; gap: 4px; padding-left: 18px; margin-top: 4px; margin-bottom: 8px;">
                        <label class="cb-row" style="font-size: 10px;">
                            <input type="checkbox" id="cu3-celestial-stars" ${celestialShowStars?"checked":""} />
                            <span>${l.celestialShowStarsLabel}</span>
                        </label>
                    </div>

                    <!-- Astrological & Biorhythm -->
                    <label class="cb-row">
                        <input type="checkbox" id="cu3-opt-astrologicalbiorhythm" ${astrologicalBiorhythmEnabled?"checked":""} />
                        <span>${l.astrologicalBiorhythmEnabledLabel}</span>
                    </label>
                    <div id="cu3-astrological-controls" style="display: ${astrologicalBiorhythmEnabled ? 'flex' : 'none'}; flex-direction: column; gap: 4px; padding-left: 18px; margin-top: 4px; margin-bottom: 8px;">
                        <div class="slider-row">
                            <span class="slider-label" style="font-size: 10px;">${l.birthdateInputLabel || 'Birthdate:'}</span>
                            <input type="date" id="cu3-birthdate-input" class="input-text" value="${birthdateInput || '1995-01-01'}" style="width: 120px; padding: 2px;" />
                        </div>
                    </div>

                    <!-- World Globe Timezones -->
                    <label class="cb-row">
                        <input type="checkbox" id="cu3-opt-worldglobe" ${worldGlobeEnabled?"checked":""} />
                        <span>${l.worldGlobeEnabledLabel}</span>
                    </label>

                    <!-- Retro Arcade Game of Life -->
                    <label class="cb-row">
                        <input type="checkbox" id="cu3-opt-retroarcade" ${retroArcadeEnabled?"checked":""} />
                        <span>${l.retroArcadeEnabledLabel}</span>
                    </label>

                    <!-- Campaign ROI Heatmap -->
                    <label class="cb-row">
                        <input type="checkbox" id="cu3-opt-campaignroi" ${campaignRoiEnabled?"checked":""} />
                        <span>${l.campaignRoiEnabledLabel}</span>
                    </label>

                    <!-- Creative Brand Showcase -->
                    <label class="cb-row">
                        <input type="checkbox" id="cu3-opt-brandcarousel" ${brandCarouselEnabled?"checked":""} />
                        <span>${l.brandCarouselEnabledLabel}</span>
                    </label>

                    <!-- A/B Sentiment Radar -->
                    <label class="cb-row">
                        <input type="checkbox" id="cu3-opt-sentimentradar" ${sentimentRadarEnabled?"checked":""} />
                        <span>${l.sentimentRadarEnabledLabel}</span>
                    </label>

                    <!-- Live Weather & Forecast -->
                    <label class="cb-row">
                        <input type="checkbox" id="cu3-opt-weatherdial" ${weatherDialEnabled?"checked":""} />
                        <span>${l.weatherDialEnabledLabel}</span>
                    </label>

                    <!-- Social & Contact Dial -->
                    <label class="cb-row">
                        <input type="checkbox" id="cu3-opt-socialcontact" ${socialContactEnabled?"checked":""} />
                        <span>${l.socialContactEnabledLabel || '📲 Social & Contact Dial (Link-in-Bio)'}</span>
                    </label>

                    <!-- Billboard Campaign Mode -->
                    <label class="cb-row">
                        <input type="checkbox" id="cu3-opt-billboard" ${billboardCampaignEnabled?"checked":""} />
                        <span>📢 Billboard Campaign Mode</span>
                    </label>

                    <!-- AI Assistant Mode -->
                    <label class="cb-row">
                        <input type="checkbox" id="cu3-opt-aiagent" ${aiAgentEnabled?"checked":""} />
                        <span>${l.aiAgentEnabledLabel || '🤖 AI Watch Assistant & Visualizer'}</span>
                    </label>
                    <div style="margin-bottom: 8px;"></div>

                </div>

                <!-- Hour Content Editor (Dynamic panel) -->
                <div class="sec" id="cu3-hour-content-sec" style="display:none; border-top: 1px solid rgba(255,255,255,0.06); margin-top: 8px; padding-top: 8px;">
                    <div class="sec-t">${l.hourEditorTitle || '📝 Edit Hour Contents'}</div>
                    <div class="slider-row" style="margin-bottom: 8px;">
                        <span class="slider-label" style="font-size: 10px;">${l.hourSelectLabel || 'Select Hour:'}</span>
                        <select id="cu3-hour-editor-select" class="input-text" style="width: 120px; padding: 3px;"></select>
                    </div>
                    <div id="cu3-hour-editor-fields" style="display: flex; flex-direction: column; gap: 8px;"></div>
                </div>

                <!-- Billboard Campaign Editor Section -->
                <div class="sec" id="cu3-billboard-sec" style="display:${billboardCampaignEnabled?'block':'none'}; border-top: 1px solid rgba(255,255,255,0.06); margin-top: 8px; padding-top: 8px;">
                    <div class="sec-t">📢 Billboard & Ad Campaign</div>
                    
                    <div class="slider-row" style="margin-bottom: 8px;">
                        <span class="slider-label" style="font-size: 11px;">Clock Duration (s):</span>
                        <input type="number" id="cu3-billboard-clock-dur" class="input-text" style="width: 50px; padding: 2px;" min="5" max="300" value="${billboardClockDuration}" />
                    </div>

                    <label class="cb-row" style="margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                        <input type="checkbox" id="cu3-billboard-visual-preview" ${billboardVisualPreview ? "checked" : ""} />
                        <span style="font-size: 11px; font-weight: bold; color: #38bdf8;">👁️ Visual Ad Preview</span>
                    </label>

                    <div style="display: flex; gap: 4px; align-items: center; margin-bottom: 8px;">
                        <select id="cu3-billboard-slide-select" class="input-text" style="flex: 1; padding: 3px; font-size: 11px;"></select>
                        <button class="action-btn secondary" id="cu3-billboard-add-slide" style="padding: 3px 6px; font-size: 11px;">+ Add</button>
                        <button class="action-btn secondary" id="cu3-billboard-del-slide" style="padding: 3px 6px; font-size: 11px; background: #7f1d1d; color: #fca5a5;">Del</button>
                    </div>

                    <div id="cu3-billboard-slide-editor" style="display: flex; flex-direction: column; gap: 8px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 8px;">
                        <!-- Slide Duration -->
                        <div class="slider-row">
                            <span class="slider-label">Duration (sec):</span>
                            <input type="range" id="cu3-billboard-slide-dur" min="2" max="30" step="1" style="flex: 1;" />
                            <span id="cu3-billboard-slide-dur-val" style="font-size:10px; width:20px; text-align:right;"></span>
                        </div>

                        <!-- Media Type -->
                        <div class="slider-row">
                            <span class="slider-label">Media Type:</span>
                            <select id="cu3-billboard-media-type" class="input-text" style="width: 100px; padding: 2px;">
                                <option value="text-only">Text Only</option>
                                <option value="image">Image</option>
                                <option value="video">Video</option>
                            </select>
                        </div>

                        <!-- Media Upload -->
                        <div id="cu3-billboard-media-upload-row" style="display: none; flex-direction: column; gap: 4px;">
                            <span class="slider-label">Upload File:</span>
                            <div style="display: flex; gap: 4px; align-items: center;">
                                <input type="file" id="cu3-billboard-media-file" style="display: none;" accept="image/*,video/*" />
                                <button class="action-btn secondary" onclick="document.getElementById('cu3-billboard-media-file').click()" style="padding: 3px 6px; font-size: 11px; flex: 1;">Choose File</button>
                                <span id="cu3-billboard-media-name" style="font-size: 9px; color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 80px;"></span>
                            </div>
                        </div>

                        <!-- Media Display Styling (Fit & Size) -->
                        <div id="cu3-billboard-media-style-options" style="display: none; background: rgba(255,255,255,0.02); padding: 6px; border-radius: 4px; flex-direction: column; gap: 6px;">
                            <div class="slider-row" style="margin-bottom: 4px;">
                                <span class="slider-label">${l.billboardMediaFitLabel || 'Media Fit:'}</span>
                                <select id="cu3-billboard-media-fit" class="input-text" style="width: 100px; padding: 2px;">
                                    <option value="cover">Cover</option>
                                    <option value="contain">Contain</option>
                                    <option value="custom">Custom</option>
                                </select>
                            </div>
                            <div id="cu3-billboard-media-custom-row" style="display: none; flex-direction: column; gap: 6px;">
                                <div class="slider-row">
                                    <span class="slider-label">${l.billboardMediaScaleLabel || 'Media Scale (%):'}</span>
                                    <input type="range" id="cu3-billboard-media-scale" min="10" max="300" style="flex:1;" />
                                    <span id="cu3-billboard-media-scale-val" class="slider-val">100%</span>
                                </div>
                                <div class="slider-row">
                                    <span class="slider-label">${l.billboardMediaXLabel || 'Media Pos X (%):'}</span>
                                    <input type="range" id="cu3-billboard-media-x" min="0" max="100" style="flex:1;" />
                                </div>
                                <div class="slider-row">
                                    <span class="slider-label">${l.billboardMediaYLabel || 'Media Pos Y (%):'}</span>
                                    <input type="range" id="cu3-billboard-media-y" min="0" max="100" style="flex:1;" />
                                </div>
                            </div>
                        </div>

                        <!-- Title Settings -->
                        <div style="background: rgba(255,255,255,0.02); padding: 6px; border-radius: 4px;">
                            <div style="font-size: 10px; font-weight: bold; color: #94a3b8; margin-bottom: 4px;">Title</div>
                            <input type="text" id="cu3-billboard-title" class="input-text" style="width: 100%; margin-bottom: 4px;" placeholder="Ad Title" />
                            <div style="display: flex; gap: 4px; align-items: center; margin-bottom: 4px;">
                                <span class="slider-label">Color:</span>
                                <input type="color" id="cu3-billboard-title-color" style="width: 30px; height: 18px; border: none; padding: 0;" />
                                <span class="slider-label" style="margin-left: 8px;">Size:</span>
                                <input type="range" id="cu3-billboard-title-size" min="10" max="80" style="flex: 1;" />
                            </div>
                            <div class="slider-row">
                                <span class="slider-label">Pos X (%):</span>
                                <input type="range" id="cu3-billboard-title-x" min="0" max="100" style="flex:1;" />
                            </div>
                            <div class="slider-row">
                                <span class="slider-label">Pos Y (%):</span>
                                <input type="range" id="cu3-billboard-title-y" min="0" max="100" style="flex:1;" />
                            </div>
                        </div>

                        <!-- Description Settings -->
                        <div style="background: rgba(255,255,255,0.02); padding: 6px; border-radius: 4px;">
                            <div style="font-size: 10px; font-weight: bold; color: #94a3b8; margin-bottom: 4px;">Description</div>
                            <textarea id="cu3-billboard-desc" class="input-text" style="width: 100%; height: 40px; margin-bottom: 4px; font-size: 10px;" placeholder="Ad Description"></textarea>
                            <div style="display: flex; gap: 4px; align-items: center; margin-bottom: 4px;">
                                <span class="slider-label">Color:</span>
                                <input type="color" id="cu3-billboard-desc-color" style="width: 30px; height: 18px; border: none; padding: 0;" />
                                <span class="slider-label" style="margin-left: 8px;">Size:</span>
                                <input type="range" id="cu3-billboard-desc-size" min="10" max="40" style="flex: 1;" />
                            </div>
                            <div class="slider-row">
                                <span class="slider-label">Pos X (%):</span>
                                <input type="range" id="cu3-billboard-desc-x" min="0" max="100" style="flex:1;" />
                            </div>
                            <div class="slider-row">
                                <span class="slider-label">Pos Y (%):</span>
                                <input type="range" id="cu3-billboard-desc-y" min="0" max="100" style="flex:1;" />
                            </div>
                        </div>

                        <!-- CTA Settings -->
                        <div style="background: rgba(255,255,255,0.02); padding: 6px; border-radius: 4px;">
                            <div style="font-size: 10px; font-weight: bold; color: #94a3b8; margin-bottom: 4px;">Call-to-Action</div>
                            <input type="text" id="cu3-billboard-cta-text" class="input-text" style="width: 100%; margin-bottom: 4px;" placeholder="CTA Button Text" />
                            <input type="text" id="cu3-billboard-cta-url" class="input-text" style="width: 100%; margin-bottom: 4px;" placeholder="Destination URL" />
                            <div style="display: flex; gap: 4px; align-items: center;">
                                <span class="slider-label">Btn Color:</span>
                                <input type="color" id="cu3-billboard-cta-color" style="width: 30px; height: 18px; border: none; padding: 0;" />
                            </div>
                        </div>

                        <!-- Layout & QR Options -->
                        <div style="background: rgba(255,255,255,0.02); padding: 6px; border-radius: 4px;">
                            <div style="font-size: 10px; font-weight: bold; color: #94a3b8; margin-bottom: 4px;">${l.billboardLayoutTitle || 'Layout & QR Settings'}</div>
                            <div class="slider-row" style="margin-bottom: 4px;">
                                <span class="slider-label">${l.billboardLayoutLabel || 'Layout:'}</span>
                                <select id="cu3-billboard-layout-style" class="input-text" style="width: 120px; padding: 2px;">
                                    <option value="glass-card">${l.billboardLayoutGlassCard || 'Centered Card'}</option>
                                    <option value="split-half">${l.billboardLayoutSplitHalf || 'Left Split'}</option>
                                    <option value="minimal-banner">${l.billboardLayoutMinimalBanner || 'Bottom Banner'}</option>
                                </select>
                            </div>
                            <label class="cb-row" style="margin-bottom: 0; display: flex; align-items: center; gap: 6px;">
                                <input type="checkbox" id="cu3-billboard-show-qr" />
                                <span style="font-size: 10px;">${l.billboardShowQrLabel || 'Show QR Code (CTA)'}</span>
                            </label>
                        </div>

                        <!-- Background Theme Settings -->
                        <div style="background: rgba(255,255,255,0.02); padding: 6px; border-radius: 4px;">
                            <div style="font-size: 10px; font-weight: bold; color: #94a3b8; margin-bottom: 4px;">Background Styling</div>
                            <div class="slider-row" style="margin-bottom: 4px;">
                                <span class="slider-label">Bg Type:</span>
                                <select id="cu3-billboard-bg-type" class="input-text" style="width: 100px; padding: 2px;">
                                    <option value="solid">Solid Color</option>
                                    <option value="gradient">Gradient</option>
                                    <option value="glass">Glassmorphic Card</option>
                                </select>
                            </div>
                            <div style="display: flex; gap: 8px; align-items: center;">
                                <span class="slider-label">Color 1:</span>
                                <input type="color" id="cu3-billboard-bg-color1" style="width: 25px; height: 18px; border: none; padding: 0;" />
                                <span class="slider-label" id="cu3-billboard-bg-color2-label">Color 2:</span>
                                <input type="color" id="cu3-billboard-bg-color2" style="width: 25px; height: 18px; border: none; padding: 0;" />
                            </div>
                        </div>
                    </div>
                </div>

                <div style="border-top:1px solid rgba(255,255,255,0.04);margin-top:6px;padding-top:6px;">
                    <div style="font-size:11px;color:#cbd5e1;margin-bottom:6px;">${l.alarmLabel}</div>
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                        <input type="checkbox" id="cu3-alarm-enabled" ${alarmEnabled?'checked':''} />
                        <input type="time" class="input-text" id="cu3-alarm-time" value="${alarmTime}" style="width:90px;" />
                    </div>
                    <button class="action-btn secondary" id="cu3-alarm-test">${l.alarmTest}</button>
                </div>
            </div>

            <div class="sec" style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 10px;">
                <label class="cb-row" style="margin-bottom: 0;">
                    <input type="checkbox" id="cu3-opt-exportwhitelabel" ${exportWhiteLabel?'checked':''} />
                    <span>${l.exportWhiteLabelLabel || '⚪ White-Label (Hide Settings Panel in Export)'}</span>
                </label>
            </div>

            <div class="sec" style="border:none;">
                <button class="action-btn primary" id="cu3-btn-fuse">${l.fuseBtn}</button>
            </div>
        `;

        updateHourEditorUI();
        updateBillboardEditorUI();
        setupPanelEvents();
    }

    function updateHourEditorUI() {
        const sec = document.getElementById('cu3-hour-content-sec');
        if (!sec) return;

        let mode = '';
        let hours = [];
        if (kpiDashboardEnabled) { mode = 'kpi'; hours = [12, 2, 4, 6, 8, 10]; }
        else if (securityRadarEnabled) { mode = 'radar'; hours = [12, 2, 4, 6, 8, 10]; }
        else if (futureRoadmapEnabled) { mode = 'roadmap'; hours = [12, 6, 10]; }
        else if (historyTimelineEnabled) { mode = 'history'; hours = [12, 2, 4, 6, 8, 10]; }
        else if (teamMembersEnabled) { mode = 'team'; hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]; }
        else if (financialTickerEnabled) { mode = 'financial'; hours = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]; }
        else if (celestialTrackerEnabled) { mode = 'celestial'; hours = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]; }
        else if (astrologicalBiorhythmEnabled) { mode = 'astrology'; hours = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]; }
        else if (worldGlobeEnabled) { mode = 'worldglobe'; hours = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]; }
        else if (retroArcadeEnabled) { mode = 'retro'; hours = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]; }
        else if (campaignRoiEnabled) { mode = 'roi'; hours = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]; }
        else if (brandCarouselEnabled) { mode = 'brand'; hours = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]; }
        else if (sentimentRadarEnabled) { mode = 'sentiment'; hours = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]; }
        else if (weatherDialEnabled) { mode = 'weather'; hours = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]; }
        else if (socialContactEnabled) { mode = 'social'; hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]; }


        if (!mode) {
            sec.style.display = 'none';
            return;
        }

        sec.style.display = 'block';

        const select = document.getElementById('cu3-hour-editor-select');
        if (!select) return;

        const prevVal = select.value;
        select.innerHTML = '';
        hours.forEach(h => {
            const opt = document.createElement('option');
            opt.value = h;
            opt.textContent = `Hour ${h}`;
            select.appendChild(opt);
        });

        if (prevVal && hours.includes(parseInt(prevVal))) {
            select.value = prevVal;
        } else {
            select.value = hours[0];
        }

        renderHourFields(mode, parseInt(select.value));
    }

    function renderHourFields(mode, hour) {
        const container = document.getElementById('cu3-hour-editor-fields');
        if (!container) return;
        container.innerHTML = '';

        if (mode === 'kpi') {
            const data = kpiHourTexts.find(d => d.hour === hour) || { month: '', title: '', desc: '' };
            container.innerHTML = `
                <div class="slider-row">
                    <span class="slider-label" style="font-size: 9.5px;">Month Label:</span>
                    <input type="text" class="input-text" id="cu3-he-label" value="${data.month || data.label || ''}" style="width: 160px; padding: 4px;" />
                </div>
                <div class="slider-row">
                    <span class="slider-label" style="font-size: 9.5px;">Title:</span>
                    <input type="text" class="input-text" id="cu3-he-title" value="${data.title || ''}" style="width: 160px; padding: 4px;" />
                </div>
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <span class="slider-label" style="font-size: 9.5px;">Description:</span>
                    <textarea class="input-text" id="cu3-he-desc" style="width: 100%; height: 60px; padding: 4px; font-family:sans-serif; resize:none;">${data.desc || ''}</textarea>
                </div>
            `;
        } else if (mode === 'radar') {
            const data = radarHourTexts.find(d => d.hour === hour) || { region: '', title: '', desc: '' };
            container.innerHTML = `
                <div class="slider-row">
                    <span class="slider-label" style="font-size: 9.5px;">Region/Label:</span>
                    <input type="text" class="input-text" id="cu3-he-label" value="${data.region || data.label || ''}" style="width: 160px; padding: 4px;" />
                </div>
                <div class="slider-row">
                    <span class="slider-label" style="font-size: 9.5px;">Title:</span>
                    <input type="text" class="input-text" id="cu3-he-title" value="${data.title || ''}" style="width: 160px; padding: 4px;" />
                </div>
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <span class="slider-label" style="font-size: 9.5px;">Description:</span>
                    <textarea class="input-text" id="cu3-he-desc" style="width: 100%; height: 60px; padding: 4px; font-family:sans-serif; resize:none;">${data.desc || ''}</textarea>
                </div>
            `;
        } else if (mode === 'roadmap') {
            const data = roadmapHourTexts.find(d => d.hour === hour) || { target: '', title: '', desc: '' };
            container.innerHTML = `
                <div class="slider-row">
                    <span class="slider-label" style="font-size: 9.5px;">Target/Year:</span>
                    <input type="text" class="input-text" id="cu3-he-label" value="${data.target || data.label || ''}" style="width: 160px; padding: 4px;" />
                </div>
                <div class="slider-row">
                    <span class="slider-label" style="font-size: 9.5px;">Title:</span>
                    <input type="text" class="input-text" id="cu3-he-title" value="${data.title || ''}" style="width: 160px; padding: 4px;" />
                </div>
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <span class="slider-label" style="font-size: 9.5px;">Description:</span>
                    <textarea class="input-text" id="cu3-he-desc" style="width: 100%; height: 60px; padding: 4px; font-family:sans-serif; resize:none;">${data.desc || ''}</textarea>
                </div>
            `;
        } else if (mode === 'history') {
            const data = historyHourTexts.find(d => d.hour === hour) || { year: '', title: '', desc: '' };
            container.innerHTML = `
                <div class="slider-row">
                    <span class="slider-label" style="font-size: 9.5px;">Year:</span>
                    <input type="text" class="input-text" id="cu3-he-label" value="${data.year || data.label || ''}" style="width: 160px; padding: 4px;" />
                </div>
                <div class="slider-row">
                    <span class="slider-label" style="font-size: 9.5px;">Title:</span>
                    <input type="text" class="input-text" id="cu3-he-title" value="${data.title || ''}" style="width: 160px; padding: 4px;" />
                </div>
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <span class="slider-label" style="font-size: 9.5px;">Description:</span>
                    <textarea class="input-text" id="cu3-he-desc" style="width: 100%; height: 60px; padding: 4px; font-family:sans-serif; resize:none;">${data.desc || ''}</textarea>
                </div>
            `;
        } else if (mode === 'team') {
            const data = teamHourTexts.find(d => d.hour === hour) || { name: '', role: '', email: '', bio: '' };
            container.innerHTML = `
                <div class="slider-row">
                    <span class="slider-label" style="font-size: 9.5px;">Name:</span>
                    <input type="text" class="input-text" id="cu3-he-name" value="${data.name || ''}" style="width: 160px; padding: 4px;" />
                </div>
                <div class="slider-row">
                    <span class="slider-label" style="font-size: 9.5px;">Role:</span>
                    <input type="text" class="input-text" id="cu3-he-role" value="${data.role || ''}" style="width: 160px; padding: 4px;" />
                </div>
                <div class="slider-row">
                    <span class="slider-label" style="font-size: 9.5px;">Email:</span>
                    <input type="text" class="input-text" id="cu3-he-email" value="${data.email || ''}" style="width: 160px; padding: 4px;" />
                </div>
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <span class="slider-label" style="font-size: 9.5px;">Bio:</span>
                    <textarea class="input-text" id="cu3-he-bio" style="width: 100%; height: 60px; padding: 4px; font-family:sans-serif; resize:none;">${data.bio || ''}</textarea>
                </div>
            `;
        } else if (mode === 'world') {
            const data = worldHourTexts.find(d => d.hour === hour) || { name: '', country: '', zone: '' };
            container.innerHTML = `
                <div class="slider-row">
                    <span class="slider-label" style="font-size: 9.5px;">City Name:</span>
                    <input type="text" class="input-text" id="cu3-he-city" value="${data.name || ''}" style="width: 160px; padding: 4px;" />
                </div>
                <div class="slider-row">
                    <span class="slider-label" style="font-size: 9.5px;">Country:</span>
                    <input type="text" class="input-text" id="cu3-he-country" value="${data.country || ''}" style="width: 160px; padding: 4px;" />
                </div>
                <div class="slider-row">
                    <span class="slider-label" style="font-size: 9.5px;">Timezone:</span>
                    <input type="text" class="input-text" id="cu3-he-zone" value="${data.zone || ''}" style="width: 160px; padding: 4px;" placeholder="e.g. Europe/Paris" />
                </div>
            `;
        } else if (mode === 'financial') {
            const data = financialHourTexts.find(d => d.hour === hour) || { label: '', title: '', desc: '' };
            container.innerHTML = `
                <div class="slider-row">
                    <span class="slider-label" style="font-size: 9.5px;">Label/Time:</span>
                    <input type="text" class="input-text" id="cu3-he-label" value="${data.label || ''}" style="width: 160px; padding: 4px;" />
                </div>
                <div class="slider-row">
                    <span class="slider-label" style="font-size: 9.5px;">Price/Title:</span>
                    <input type="text" class="input-text" id="cu3-he-title" value="${data.title || ''}" style="width: 160px; padding: 4px;" />
                </div>
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <span class="slider-label" style="font-size: 9.5px;">Description/Notes:</span>
                    <textarea class="input-text" id="cu3-he-desc" style="width: 100%; height: 60px; padding: 4px; font-family:sans-serif; resize:none;">${data.desc || ''}</textarea>
                </div>
            `;
        } else if (mode === 'celestial') {
            const data = celestialHourTexts.find(d => d.hour === hour) || { label: '', title: '', desc: '' };
            container.innerHTML = `
                <div class="slider-row">
                    <span class="slider-label" style="font-size: 9.5px;">Astro/Label:</span>
                    <input type="text" class="input-text" id="cu3-he-label" value="${data.label || ''}" style="width: 160px; padding: 4px;" />
                </div>
                <div class="slider-row">
                    <span class="slider-label" style="font-size: 9.5px;">Fact/Title:</span>
                    <input type="text" class="input-text" id="cu3-he-title" value="${data.title || ''}" style="width: 160px; padding: 4px;" />
                </div>
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <span class="slider-label" style="font-size: 9.5px;">Description/Notes:</span>
                    <textarea class="input-text" id="cu3-he-desc" style="width: 100%; height: 60px; padding: 4px; font-family:sans-serif; resize:none;">${data.desc || ''}</textarea>
                </div>
            `;
        } else if (mode === 'astrology') {
            const data = astrologyHourTexts.find(d => d.hour === hour) || { label: '', title: '', desc: '' };
            container.innerHTML = `
                <div class="slider-row">
                    <span class="slider-label" style="font-size: 9.5px;">Zodiac Sign:</span>
                    <input type="text" class="input-text" id="cu3-he-label" value="${data.label || ''}" style="width: 160px; padding: 4px;" />
                </div>
                <div class="slider-row">
                    <span class="slider-label" style="font-size: 9.5px;">Element:</span>
                    <input type="text" class="input-text" id="cu3-he-title" value="${data.title || ''}" style="width: 160px; padding: 4px;" />
                </div>
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <span class="slider-label" style="font-size: 9.5px;">Zodiac Traits:</span>
                    <textarea class="input-text" id="cu3-he-desc" style="width: 100%; height: 60px; padding: 4px; font-family:sans-serif; resize:none;">${data.desc || ''}</textarea>
                </div>
            `;
        } else if (mode === 'worldglobe') {
            const data = worldGlobeHourTexts.find(d => d.hour === hour) || { label: '', title: '', desc: '' };
            container.innerHTML = `
                <div class="slider-row">
                    <span class="slider-label" style="font-size: 9.5px;">City/Zone:</span>
                    <input type="text" class="input-text" id="cu3-he-label" value="${data.label || ''}" style="width: 160px; padding: 4px;" />
                </div>
                <div class="slider-row">
                    <span class="slider-label" style="font-size: 9.5px;">Time Offset Name:</span>
                    <input type="text" class="input-text" id="cu3-he-title" value="${data.title || ''}" style="width: 160px; padding: 4px;" />
                </div>
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <span class="slider-label" style="font-size: 9.5px;">City Details:</span>
                    <textarea class="input-text" id="cu3-he-desc" style="width: 100%; height: 60px; padding: 4px; font-family:sans-serif; resize:none;">${data.desc || ''}</textarea>
                </div>
            `;
        } else if (mode === 'retro') {
            const data = retroArcadeHourTexts.find(d => d.hour === hour) || { label: '', title: '', desc: '' };
            container.innerHTML = `
                <div class="slider-row">
                    <span class="slider-label" style="font-size: 9.5px;">Arcade Level:</span>
                    <input type="text" class="input-text" id="cu3-he-label" value="${data.label || ''}" style="width: 160px; padding: 4px;" />
                </div>
                <div class="slider-row">
                    <span class="slider-label" style="font-size: 9.5px;">Stage Title:</span>
                    <input type="text" class="input-text" id="cu3-he-title" value="${data.title || ''}" style="width: 160px; padding: 4px;" />
                </div>
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <span class="slider-label" style="font-size: 9.5px;">Level Log/Info:</span>
                    <textarea class="input-text" id="cu3-he-desc" style="width: 100%; height: 60px; padding: 4px; font-family:sans-serif; resize:none;">${data.desc || ''}</textarea>
                </div>
            `;
        } else if (mode === 'roi') {
            const data = roiHourTexts.find(d => d.hour === hour) || { label: '', title: '', desc: '' };
            container.innerHTML = `
                <div class="slider-row">
                    <span class="slider-label" style="font-size: 9.5px;">Marketing Channel:</span>
                    <input type="text" class="input-text" id="cu3-he-label" value="${data.label || ''}" style="width: 160px; padding: 4px;" />
                </div>
                <div class="slider-row">
                    <span class="slider-label" style="font-size: 9.5px;">Sub-category:</span>
                    <input type="text" class="input-text" id="cu3-he-title" value="${data.title || ''}" style="width: 160px; padding: 4px;" />
                </div>
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <span class="slider-label" style="font-size: 9.5px;">Analytics Details (ROI/CTR):</span>
                    <textarea class="input-text" id="cu3-he-desc" style="width: 100%; height: 60px; padding: 4px; font-family:sans-serif; resize:none;">${data.desc || ''}</textarea>
                </div>
            `;
        } else if (mode === 'brand') {
            const data = brandHourTexts.find(d => d.hour === hour) || { label: '', title: '', desc: '' };
            container.innerHTML = `
                <div class="slider-row">
                    <span class="slider-label" style="font-size: 9.5px;">Campaign Brand:</span>
                    <input type="text" class="input-text" id="cu3-he-label" value="${data.label || ''}" style="width: 160px; padding: 4px;" />
                </div>
                <div class="slider-row">
                    <span class="slider-label" style="font-size: 9.5px;">Concept Tagline:</span>
                    <input type="text" class="input-text" id="cu3-he-title" value="${data.title || ''}" style="width: 160px; padding: 4px;" />
                </div>
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <span class="slider-label" style="font-size: 9.5px;">Project Pitch Info:</span>
                    <textarea class="input-text" id="cu3-he-desc" style="width: 100%; height: 60px; padding: 4px; font-family:sans-serif; resize:none;">${data.desc || ''}</textarea>
                </div>
            `;
        } else if (mode === 'sentiment') {
            const data = sentimentHourTexts.find(d => d.hour === hour) || { label: '', title: '', desc: '' };
            container.innerHTML = `
                <div class="slider-row">
                    <span class="slider-label" style="font-size: 9.5px;">Target/Variant:</span>
                    <input type="text" class="input-text" id="cu3-he-label" value="${data.label || ''}" style="width: 160px; padding: 4px;" />
                </div>
                <div class="slider-row">
                    <span class="slider-label" style="font-size: 9.5px;">Topic/Test Focus:</span>
                    <input type="text" class="input-text" id="cu3-he-title" value="${data.title || ''}" style="width: 160px; padding: 4px;" />
                </div>
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <span class="slider-label" style="font-size: 9.5px;">Metrics/Sentiment Data:</span>
                    <textarea class="input-text" id="cu3-he-desc" style="width: 100%; height: 60px; padding: 4px; font-family:sans-serif; resize:none;">${data.desc || ''}</textarea>
                </div>
            `;
        } else if (mode === 'weather') {
            const data = weatherHourTexts.find(d => d.hour === hour) || { label: '', title: '', desc: '' };
            container.innerHTML = `
                <div class="slider-row">
                    <span class="slider-label" style="font-size: 9.5px;">Forecast Hour:</span>
                    <input type="text" class="input-text" id="cu3-he-label" value="${data.label || ''}" style="width: 160px; padding: 4px;" />
                </div>
                <div class="slider-row">
                    <span class="slider-label" style="font-size: 9.5px;">Condition:</span>
                    <input type="text" class="input-text" id="cu3-he-title" value="${data.title || ''}" style="width: 160px; padding: 4px;" />
                </div>
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <span class="slider-label" style="font-size: 9.5px;">Temp/Wind/Humidity:</span>
                    <textarea class="input-text" id="cu3-he-desc" style="width: 100%; height: 60px; padding: 4px; font-family:sans-serif; resize:none;">${data.desc || ''}</textarea>
                </div>
            `;
        } else if (mode === 'social') {
            const SOCIAL_TYPES = ['website','phone','telegram','facebook','youtube','whatsapp','instagram','linkedin','x','tiktok','pinterest','email'];
            const data = socialContactHours.find(d => d.hour === hour) || { type: 'website', label: '', value: '', url: '' };
            container.innerHTML = `
                <div class="slider-row">
                    <span class="slider-label" style="font-size: 9.5px;">Platform:</span>
                    <select class="input-text" id="cu3-he-social-type" style="width: 140px; padding: 3px;">
                        ${SOCIAL_TYPES.map(t => `<option value="${t}" ${(data.type||'website')===t?'selected':''}>${t.charAt(0).toUpperCase()+t.slice(1)}</option>`).join('')}
                    </select>
                </div>
                <div class="slider-row">
                    <span class="slider-label" style="font-size: 9.5px;">Display Label:</span>
                    <input type="text" class="input-text" id="cu3-he-social-label" value="${data.label || ''}" style="width: 140px; padding: 4px;" />
                </div>
                <div class="slider-row">
                    <span class="slider-label" style="font-size: 9.5px;">Display Value:</span>
                    <input type="text" class="input-text" id="cu3-he-social-value" value="${data.value || ''}" style="width: 140px; padding: 4px;" />
                </div>
                <div class="slider-row">
                    <span class="slider-label" style="font-size: 9.5px;">URL / Link:</span>
                    <input type="text" class="input-text" id="cu3-he-social-url" value="${data.url || ''}" style="width: 140px; padding: 4px;" placeholder="https://..." />
                </div>
            `;
        }

        const inputLabel = document.getElementById('cu3-he-label');
        const inputTitle = document.getElementById('cu3-he-title');
        const inputDesc = document.getElementById('cu3-he-desc');

        const inputName = document.getElementById('cu3-he-name');
        const inputRole = document.getElementById('cu3-he-role');
        const inputEmail = document.getElementById('cu3-he-email');
        const inputBio = document.getElementById('cu3-he-bio');

        const inputCity = document.getElementById('cu3-he-city');
        const inputCountry = document.getElementById('cu3-he-country');
        const inputZone = document.getElementById('cu3-he-zone');

        const onValueChange = () => {
            if (mode === 'kpi') {
                const item = kpiHourTexts.find(d => d.hour === hour);
                if (item) {
                    item.month = inputLabel.value;
                    item.label = inputLabel.value;
                    item.title = inputTitle.value;
                    item.desc = inputDesc.value;
                }
            } else if (mode === 'radar') {
                const item = radarHourTexts.find(d => d.hour === hour);
                if (item) {
                    item.region = inputLabel.value;
                    item.label = inputLabel.value;
                    item.title = inputTitle.value;
                    item.desc = inputDesc.value;
                }
            } else if (mode === 'roadmap') {
                const item = roadmapHourTexts.find(d => d.hour === hour);
                if (item) {
                    item.target = inputLabel.value;
                    item.label = inputLabel.value;
                    item.title = inputTitle.value;
                    item.desc = inputDesc.value;
                }
            } else if (mode === 'history') {
                const item = historyHourTexts.find(d => d.hour === hour);
                if (item) {
                    item.year = inputLabel.value;
                    item.label = inputLabel.value;
                    item.title = inputTitle.value;
                    item.desc = inputDesc.value;
                }
            } else if (mode === 'team') {
                const item = teamHourTexts.find(d => d.hour === hour);
                if (item) {
                    item.name = inputName.value;
                    item.role = inputRole.value;
                    item.email = inputEmail.value;
                    item.bio = inputBio.value;
                    
                    const originalItem = teamMembers.find(t => t.hour === hour);
                    if (originalItem) {
                        originalItem.name = inputName.value;
                        originalItem.role = inputRole.value;
                        originalItem.email = inputEmail.value;
                    }
                }
            } else if (mode === 'financial') {
                const item = financialHourTexts.find(d => d.hour === hour);
                if (item) {
                    item.label = inputLabel.value;
                    item.title = inputTitle.value;
                    item.desc = inputDesc.value;
                }
            } else if (mode === 'celestial') {
                const item = celestialHourTexts.find(d => d.hour === hour);
                if (item) {
                    item.label = inputLabel.value;
                    item.title = inputTitle.value;
                    item.desc = inputDesc.value;
                }
            } else if (mode === 'astrology') {
                const item = astrologyHourTexts.find(d => d.hour === hour);
                if (item) {
                    item.label = inputLabel.value;
                    item.title = inputTitle.value;
                    item.desc = inputDesc.value;
                }
            } else if (mode === 'worldglobe') {
                const item = worldGlobeHourTexts.find(d => d.hour === hour);
                if (item) {
                    item.label = inputLabel.value;
                    item.title = inputTitle.value;
                    item.desc = inputDesc.value;
                }
            } else if (mode === 'retro') {
                const item = retroArcadeHourTexts.find(d => d.hour === hour);
                if (item) {
                    item.label = inputLabel.value;
                    item.title = inputTitle.value;
                    item.desc = inputDesc.value;
                }
            } else if (mode === 'roi') {
                const item = roiHourTexts.find(d => d.hour === hour);
                if (item) {
                    item.label = inputLabel.value;
                    item.title = inputTitle.value;
                    item.desc = inputDesc.value;
                }
            } else if (mode === 'brand') {
                const item = brandHourTexts.find(d => d.hour === hour);
                if (item) {
                    item.label = inputLabel.value;
                    item.title = inputTitle.value;
                    item.desc = inputDesc.value;
                }
            } else if (mode === 'sentiment') {
                const item = sentimentHourTexts.find(d => d.hour === hour);
                if (item) {
                    item.label = inputLabel.value;
                    item.title = inputTitle.value;
                    item.desc = inputDesc.value;
                }
            } else if (mode === 'weather') {
                const item = weatherHourTexts.find(d => d.hour === hour);
                if (item) {
                    item.label = inputLabel.value;
                    item.title = inputTitle.value;
                    item.desc = inputDesc.value;
                }
            } else if (mode === 'social') {
                const item = socialContactHours.find(d => d.hour === hour);
                if (item) {
                    const tSel = document.getElementById('cu3-he-social-type');
                    const lInp = document.getElementById('cu3-he-social-label');
                    const vInp = document.getElementById('cu3-he-social-value');
                    const uInp = document.getElementById('cu3-he-social-url');
                    if (tSel) item.type = tSel.value;
                    if (lInp) item.label = lInp.value;
                    if (vInp) item.value = vInp.value;
                    if (uInp) item.url = uInp.value;
                }
            }
            syncProModel();

        };

        if (inputLabel) inputLabel.oninput = onValueChange;
        if (inputTitle) inputTitle.oninput = onValueChange;
        if (inputDesc) inputDesc.oninput = onValueChange;

        if (inputName) inputName.oninput = onValueChange;
        if (inputRole) inputRole.oninput = onValueChange;
        if (inputEmail) inputEmail.oninput = onValueChange;
        if (inputBio) inputBio.oninput = onValueChange;

        if (inputCity) inputCity.oninput = onValueChange;
        if (inputCountry) inputCountry.oninput = onValueChange;
        if (inputZone) inputZone.oninput = onValueChange;

        const inputSocialType = document.getElementById('cu3-he-social-type');
        const inputSocialLabel = document.getElementById('cu3-he-social-label');
        const inputSocialValue = document.getElementById('cu3-he-social-value');
        const inputSocialUrl = document.getElementById('cu3-he-social-url');
        if (inputSocialType) inputSocialType.onchange = onValueChange;
        if (inputSocialLabel) inputSocialLabel.oninput = onValueChange;
        if (inputSocialValue) inputSocialValue.oninput = onValueChange;
        if (inputSocialUrl) inputSocialUrl.oninput = onValueChange;
    }

    function updateBillboardEditorUI() {
        const sec = document.getElementById('cu3-billboard-sec');
        if (!sec) return;
        
        if (!billboardCampaignEnabled) {
            sec.style.display = 'none';
            window._billboardForcePreviewIdx = null;
            window._billboardPreviewActive = false;
            return;
        }
        
        sec.style.display = 'block';
        
        const previewCheckbox = document.getElementById('cu3-billboard-visual-preview');
        if (previewCheckbox) {
            previewCheckbox.checked = billboardVisualPreview;
        }
        window._billboardPreviewActive = billboardVisualPreview;
        console.log("[Billboard Debug] window._billboardPreviewActive set to:", window._billboardPreviewActive);
        
        // Populate Slide Selector select dropdown
        const select = document.getElementById('cu3-billboard-slide-select');
        if (select) {
            const prevVal = select.value;
            select.innerHTML = '';
            billboardSlides.forEach((slide, idx) => {
                const opt = document.createElement('option');
                opt.value = idx;
                opt.textContent = `Slide ${idx + 1}: ${slide.title || 'Untitled'}`;
                select.appendChild(opt);
            });
            if (prevVal !== '' && parseInt(prevVal) < billboardSlides.length) {
                select.value = prevVal;
                billboardActiveEditIndex = parseInt(prevVal);
            } else {
                select.value = 0;
                billboardActiveEditIndex = 0;
            }
        }
        
        // Force live WebGL preview to show this slide
        window._billboardForcePreviewIdx = billboardActiveEditIndex;
        
        const activeSlide = billboardSlides[billboardActiveEditIndex];
        if (!activeSlide) {
            document.getElementById('cu3-billboard-slide-editor').style.display = 'none';
            return;
        }
        
        document.getElementById('cu3-billboard-slide-editor').style.display = 'flex';
        
        // Load active slide values to fields
        document.getElementById('cu3-billboard-slide-dur').value = activeSlide.duration || 7;
        document.getElementById('cu3-billboard-slide-dur-val').textContent = (activeSlide.duration || 7) + 's';
        document.getElementById('cu3-billboard-media-type').value = activeSlide.mediaType || 'text-only';
        document.getElementById('cu3-billboard-media-name').textContent = activeSlide.mediaName || 'No file chosen';
        document.getElementById('cu3-billboard-title').value = activeSlide.title || '';
        document.getElementById('cu3-billboard-title-color').value = activeSlide.titleColor || '#ffffff';
        document.getElementById('cu3-billboard-title-size').value = activeSlide.titleSize || 32;
        document.getElementById('cu3-billboard-title-x').value = activeSlide.titleX !== undefined ? activeSlide.titleX : 50;
        document.getElementById('cu3-billboard-title-y').value = activeSlide.titleY !== undefined ? activeSlide.titleY : 28;
        
        document.getElementById('cu3-billboard-desc').value = activeSlide.desc || '';
        document.getElementById('cu3-billboard-desc-color').value = activeSlide.descColor || '#e2e8f0';
        document.getElementById('cu3-billboard-desc-size').value = activeSlide.descSize || 16;
        document.getElementById('cu3-billboard-desc-x').value = activeSlide.descX !== undefined ? activeSlide.descX : 50;
        document.getElementById('cu3-billboard-desc-y').value = activeSlide.descY !== undefined ? activeSlide.descY : 42;
        
        document.getElementById('cu3-billboard-cta-text').value = activeSlide.ctaText || '';
        document.getElementById('cu3-billboard-cta-url').value = activeSlide.ctaUrl || '';
        document.getElementById('cu3-billboard-cta-color').value = activeSlide.ctaColor || '#0ea5e9';
        
        document.getElementById('cu3-billboard-layout-style').value = activeSlide.layoutStyle || 'glass-card';
        document.getElementById('cu3-billboard-show-qr').checked = !!activeSlide.showQr;
        
        document.getElementById('cu3-billboard-bg-type').value = activeSlide.bgType || 'gradient';
        document.getElementById('cu3-billboard-bg-color1').value = activeSlide.bgColor1 || '#090d1a';
        document.getElementById('cu3-billboard-bg-color2').value = activeSlide.bgColor2 || '#1e1b4b';
        
        // Show/hide background color 2 based on type
        const bgType = activeSlide.bgType || 'gradient';
        const isGradient = bgType === 'gradient';
        document.getElementById('cu3-billboard-bg-color2').style.display = isGradient ? 'inline-block' : 'none';
        document.getElementById('cu3-billboard-bg-color2-label').style.display = isGradient ? 'inline-block' : 'none';
        
        // Show/hide file upload row based on media type
        const mType = activeSlide.mediaType || 'text-only';
        const hasMedia = (mType === 'image' || mType === 'video');
        document.getElementById('cu3-billboard-media-upload-row').style.display = hasMedia ? 'flex' : 'none';
        document.getElementById('cu3-billboard-media-style-options').style.display = hasMedia ? 'flex' : 'none';
        
        // Load media fit values
        const mFit = activeSlide.mediaFit || 'cover';
        document.getElementById('cu3-billboard-media-fit').value = mFit;
        document.getElementById('cu3-billboard-media-scale').value = activeSlide.mediaScale !== undefined ? activeSlide.mediaScale : 100;
        document.getElementById('cu3-billboard-media-scale-val').textContent = (activeSlide.mediaScale !== undefined ? activeSlide.mediaScale : 100) + '%';
        document.getElementById('cu3-billboard-media-x').value = activeSlide.mediaX !== undefined ? activeSlide.mediaX : 50;
        document.getElementById('cu3-billboard-media-y').value = activeSlide.mediaY !== undefined ? activeSlide.mediaY : 50;
        
        document.getElementById('cu3-billboard-media-custom-row').style.display = (mFit === 'custom') ? 'flex' : 'none';
    }

    function makeElementDraggable(elmnt, dragHandle) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        if (dragHandle) {
            dragHandle.style.cursor = 'move';
            dragHandle.onpointerdown = dragMouseDown;
        } else {
            elmnt.onpointerdown = dragMouseDown;
        }

        function dragMouseDown(e) {
            const tag = e.target.tagName.toLowerCase();
            if (tag === 'input' || tag === 'button' || tag === 'select' || tag === 'textarea' || e.target.closest('button') || e.target.closest('input') || e.target.closest('.x')) {
                return;
            }
            e = e || window.event;
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            
            const rect = elmnt.getBoundingClientRect();
            elmnt.style.left = rect.left + 'px';
            elmnt.style.top = rect.top + 'px';
            elmnt.style.right = 'auto';
            elmnt.style.bottom = 'auto';

            document.onpointermove = elementDrag;
            document.onpointerup = closeDragElement;
        }

        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            
            let newTop = elmnt.offsetTop - pos2;
            let newLeft = elmnt.offsetLeft - pos1;
            
            const rect = elmnt.getBoundingClientRect();
            const minLeft = 0;
            const maxLeft = window.innerWidth - rect.width;
            const minTop = 0;
            const maxTop = window.innerHeight - rect.height;
            
            if (newLeft < minLeft) newLeft = minLeft;
            if (newLeft > maxLeft) newLeft = maxLeft;
            if (newTop < minTop) newTop = minTop;
            if (newTop > maxTop) newTop = maxTop;

            elmnt.style.top = newTop + "px";
            elmnt.style.left = newLeft + "px";
        }

        function closeDragElement() {
            document.onpointermove = null;
            document.onpointerup = null;
        }
    }

    function setupPanelEvents() {
        const l = L();

        // Close panel
        panel.querySelector('.x').onclick = () => {
            isOpen = false;
            panel.style.display = 'none';
            stopAlarm();
        };

        // File Uploader (JPG/PNG texture or DXF)
        const fileInput = document.getElementById('cu3-file-input');
        const fileInfo = document.getElementById('cu3-file-info');
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const name = file.name.toLowerCase();
            const reader = new FileReader();

            if (name.endsWith('.dxf')) {
                dxfFileName = file.name;
                reader.onload = (ev) => {
                    const text = ev.target.result;
                    dxfTextStr = text;
                    // base64 encode the DXF text to easily export it
                    dxfDataStr = btoa(unescape(encodeURIComponent(text)));
                    customLogoStr = null; // reset image
                    fileInfo.textContent = l.dxfLoaded + ' ' + file.name;
                    modelColor = '#06b6d4'; // default cyan for DXF
                    build3DClockwork();
                    syncProModel();
                    renderPanel();
                };
                reader.readAsText(file);
            } else {
                // Image loader
                dxfFileName = '';
                dxfDataStr = null;
                dxfTextStr = null;
                reader.onload = (ev) => {
                    customLogoStr = ev.target.result;
                    fileInfo.textContent = l.imgLoaded;
                    modelColor = '#ffffff'; // default white for images
                    analyzeImageOutline(customLogoStr, (hull, silhouette) => {
                        customOutlinePoints = hull;
                        customSilhouettePoints = silhouette;
                        build3DClockwork();
                        syncProModel();
                        renderPanel();
                    });
                };
                reader.readAsDataURL(file);
            }
        };

        // Shape buttons
        document.getElementById('cu3-shape-circle').onclick = () => {
            faceShape = 'circle';
            renderPanel(); build3DClockwork(); syncProModel();
        };
        document.getElementById('cu3-shape-square').onclick = () => {
            faceShape = 'square';
            renderPanel(); build3DClockwork(); syncProModel();
        };
        document.getElementById('cu3-shape-none').onclick = () => {
            faceShape = 'none';
            renderPanel(); build3DClockwork(); syncProModel();
        };
        document.getElementById('cu3-shape-custom').onclick = () => {
            faceShape = 'custom';
            renderPanel(); build3DClockwork(); syncProModel();
        };
        document.getElementById('cu3-shape-silhouette').onclick = () => {
            faceShape = 'silhouette';
            renderPanel(); build3DClockwork(); syncProModel();
        };

        // Select styles
        document.getElementById('cu3-metal-style').onchange = (e) => {
            metalStyle = e.target.value;
            build3DClockwork(); syncProModel();
        };
        const faceColorInput = document.getElementById('cu3-face-color');
        if (faceColorInput) {
            faceColorInput.oninput = (e) => {
                faceColor = e.target.value;
                build3DClockwork(); syncProModel();
            };
        }
        const modelColorInput = document.getElementById('cu3-model-color');
        if (modelColorInput) {
            modelColorInput.oninput = (e) => {
                modelColor = e.target.value;
                build3DClockwork(); syncProModel();
            };
        }
        document.getElementById('cu3-hand-style').onchange = (e) => {
            handStyle = e.target.value;
            build3DClockwork(); syncProModel();
        };
        document.getElementById('cu3-marker-style').onchange = (e) => {
            markerStyle = e.target.value;
            build3DClockwork(); syncProModel();
        };
        
        // Chronograph controls
        const optChrono = document.getElementById('cu3-opt-chrono');
        if (optChrono) {
            optChrono.onchange = (e) => {
                chronoEnabled = e.target.checked;
                const controls = document.getElementById('cu3-chrono-controls');
                if (controls) controls.style.display = chronoEnabled ? 'block' : 'none';
                // Rebuild needed to add/remove sub-dials, but avoid camera re-focus
                build3DClockwork();
                syncProModel();
            };
        }
        // Chrono color pickers
        const chronoColorInput = document.getElementById('cu3-chrono-color');
        if (chronoColorInput) {
            chronoColorInput.oninput = (e) => {
                chronoColor = e.target.value;
                build3DClockwork(); syncProModel();
            };
        }
        const chronoNeedleColorInput = document.getElementById('cu3-chrono-needle-color');
        if (chronoNeedleColorInput) {
            chronoNeedleColorInput.oninput = (e) => {
                chronoNeedleColor = e.target.value;
                build3DClockwork(); syncProModel();
            };
        }
        const getModel = () => {
            if (window.SketchExtruder && typeof window.SketchExtruder.getModels === 'function') {
                return window.SketchExtruder.getModels().find(m => m.format === 'clock-ultra');
            }
            return null;
        };
        const btnChronoStart = document.getElementById('cu3-chrono-start');
        if (btnChronoStart) {
            btnChronoStart.onclick = () => {
                const m = getModel();
                if (m) {
                    m.chronoRunning = !m.chronoRunning;
                    m.pusherStartAnim = 1.0;
                    updateChronoUI(m.chronoRunning);
                }
            };
        }
        const btnChronoReset = document.getElementById('cu3-chrono-reset');
        if (btnChronoReset) {
            btnChronoReset.onclick = () => {
                const m = getModel();
                if (m) {
                    m.chronoRunning = false;
                    m.chronoTime = 0;
                    m.pusherResetAnim = 1.0;
                    updateChronoUI(false);
                }
            };
        }

        // Pivots & Sliders
        const bindSlider = (id, valId, callback) => {
            const el = document.getElementById(id);
            if (el) {
                el.oninput = (e) => {
                    const val = parseFloat(e.target.value);
                    document.getElementById(valId).textContent = val;
                    callback(val);
                    build3DClockwork();
                    syncProModel();
                };
            }
        };

        bindSlider('cu3-pivot-x', 'cu3-pivot-x-val', (v) => pivotX = v);
        bindSlider('cu3-pivot-y', 'cu3-pivot-y-val', (v) => pivotY = v);

        // Hand configurations
        document.getElementById('cu3-hand-h-color').oninput = (e) => { handHColor = e.target.value; build3DClockwork(); syncProModel(); };
        bindSlider('cu3-hand-h-len', 'cu3-hand-h-len-val', (v) => handHLength = v);
        bindSlider('cu3-hand-h-wid', 'cu3-hand-h-wid-val', (v) => handHWidth = v);

        document.getElementById('cu3-hand-m-color').oninput = (e) => { handMColor = e.target.value; build3DClockwork(); syncProModel(); };
        bindSlider('cu3-hand-m-len', 'cu3-hand-m-len-val', (v) => handMLength = v);
        bindSlider('cu3-hand-m-wid', 'cu3-hand-m-wid-val', (v) => handMWidth = v);

        document.getElementById('cu3-hand-s-color').oninput = (e) => { handSColor = e.target.value; build3DClockwork(); syncProModel(); };
        bindSlider('cu3-hand-s-len', 'cu3-hand-s-len-val', (v) => handSLength = v);
        bindSlider('cu3-hand-s-wid', 'cu3-hand-s-wid-val', (v) => handSWidth = v);

        // Markers config
        document.getElementById('cu3-marker-color').oninput = (e) => { markerColor = e.target.value; build3DClockwork(); syncProModel(); };
        bindSlider('cu3-marker-radius', 'cu3-marker-radius-val', (v) => markerRadius = v);
        bindSlider('cu3-marker-size', 'cu3-marker-size-val', (v) => markerSize = v);

        // Options check box
        document.getElementById('cu3-opt-glass').onchange = (e) => { glassCover = e.target.checked; build3DClockwork(); syncProModel(); };
        document.getElementById('cu3-opt-sound').onchange = (e) => { soundEnabled = e.target.checked; syncProModel(); };
        document.getElementById('cu3-opt-gears').onchange = (e) => { gearsEnabled = e.target.checked; build3DClockwork(); syncProModel(); };
        document.getElementById('cu3-opt-neon').onchange = (e) => {
            neonBorderEnabled = e.target.checked;
            const neonRow = document.getElementById('cu3-neon-color-row');
            if (neonRow) neonRow.style.display = neonBorderEnabled ? 'flex' : 'none';
            build3DClockwork();
            syncProModel();
        };
        document.getElementById('cu3-neon-color').oninput = (e) => {
            neonBorderColor = e.target.value;
            build3DClockwork();
            syncProModel();
        };
        document.getElementById('cu3-opt-glow').onchange = (e) => {
            glowEnabled = e.target.checked;
            const glowRow = document.getElementById('cu3-glow-color-row');
            if (glowRow) glowRow.style.display = glowEnabled ? 'flex' : 'none';
            build3DClockwork();
            syncProModel();
        };
        document.getElementById('cu3-glow-color').oninput = (e) => {
            glowColor = e.target.value;
            build3DClockwork();
            syncProModel();
        };
        document.getElementById('cu3-opt-parallax').onchange = (e) => {
            parallaxEnabled = e.target.checked;
            build3DClockwork();
            syncProModel();
        };
        document.getElementById('cu3-opt-glare-sweep').onchange = (e) => {
            glareSweepEnabled = e.target.checked;
            build3DClockwork();
            syncProModel();
        };

        const optTexture = document.getElementById('cu3-dial-texture-preset');
        if (optTexture) {
            optTexture.onchange = (e) => {
                dialTexturePreset = e.target.value;
                build3DClockwork();
                syncProModel();
            };
        }

        const optWeather = document.getElementById('cu3-weather-overlay');
        if (optWeather) {
            optWeather.onchange = (e) => {
                weatherOverlay = e.target.value;
                build3DClockwork();
                syncProModel();
            };
        }

        const optDynamicTime = document.getElementById('cu3-dynamic-time-color');
        if (optDynamicTime) {
            optDynamicTime.onchange = (e) => {
                dynamicTimeColor = e.target.checked;
                build3DClockwork();
                syncProModel();
            };
        }

        const optAudioReactive = document.getElementById('cu3-audio-reactive');
        if (optAudioReactive) {
            optAudioReactive.onchange = (e) => {
                audioReactive = e.target.checked;
                build3DClockwork();
                syncProModel();
            };
        }

        const optSubDial = document.getElementById('cu3-subdial-mode');
        if (optSubDial) {
            optSubDial.onchange = (e) => {
                subDialMode = e.target.value;
                const configCountdown = document.getElementById('cu3-countdown-config');
                if (configCountdown) configCountdown.style.display = subDialMode === 'countdown' ? 'block' : 'none';
                build3DClockwork();
                syncProModel();
            };
        }

        // Bind new premium features
        const optThemePreset = document.getElementById('cu3-theme-preset');
        if (optThemePreset) {
            optThemePreset.onchange = (e) => {
                themePreset = e.target.value;
                if (themePreset !== 'custom') {
                    applyThemePreset(themePreset);
                } else {
                    syncProModel();
                }
            };
        }

        const optTimeTravel = document.getElementById('cu3-opt-timetravel');
        if (optTimeTravel) {
            optTimeTravel.onchange = (e) => {
                timeTravelEnabled = e.target.checked;
                const row = document.getElementById('cu3-timetravel-autoreturn-row');
                if (row) row.style.display = timeTravelEnabled ? 'flex' : 'none';
                syncProModel();
            };
        }

        const optTimeTravelAutoReturn = document.getElementById('cu3-opt-timetravel-autoreturn');
        if (optTimeTravelAutoReturn) {
            optTimeTravelAutoReturn.onchange = (e) => {
                timeTravelAutoReturn = e.target.checked;
                syncProModel();
            };
        }

        const optCursorMagnetism = document.getElementById('cu3-opt-cursormagnetism');
        if (optCursorMagnetism) {
            optCursorMagnetism.onchange = (e) => {
                cursorMagnetismEnabled = e.target.checked;
                syncProModel();
            };
        }

        const optAmbientTick = document.getElementById('cu3-opt-ambienttick');
        if (optAmbientTick) {
            optAmbientTick.onchange = (e) => {
                ambientTickEnabled = e.target.checked;
                syncProModel();
            };
        }

        const optHourlyChime = document.getElementById('cu3-opt-hourlychime');
        if (optHourlyChime) {
            optHourlyChime.onchange = (e) => {
                hourlyChimeEnabled = e.target.checked;
                syncProModel();
            };
        }

        const btnChimeTest = document.getElementById('cu3-chime-test');
        if (btnChimeTest) {
            btnChimeTest.onclick = () => {
                const now = new Date();
                playWestminsterChime(now.getHours());
            };
        }

        const optCountdownTarget = document.getElementById('cu3-countdown-target');
        if (optCountdownTarget) {
            optCountdownTarget.onchange = (e) => {
                countdownTarget = e.target.value;
                syncProModel();
            };
        }



        // Bind 5 new genius features
        const optNavMenu = document.getElementById('cu3-opt-navmenu');
        const optClockToBook = document.getElementById('cu3-opt-clocktobook');
        if (optNavMenu) {
            optNavMenu.onchange = (e) => {
                navigatorMenuEnabled = e.target.checked;
                if (e.target.checked && optClockToBook) {
                    optClockToBook.checked = false;
                    clockToBookEnabled = false;
                }
                syncProModel();
            };
        }
        if (optClockToBook) {
            optClockToBook.onchange = (e) => {
                clockToBookEnabled = e.target.checked;
                if (e.target.checked && optNavMenu) {
                    optNavMenu.checked = false;
                    navigatorMenuEnabled = false;
                }
                syncProModel();
            };
        }

        const optBusinessHours = document.getElementById('cu3-opt-businesshours');
        const divBhControls = document.getElementById('cu3-businesshours-controls');
        const sldBhStart = document.getElementById('cu3-businesshours-start');
        const sldBhEnd = document.getElementById('cu3-businesshours-end');
        
        if (optBusinessHours) {
            optBusinessHours.onchange = (e) => {
                businessHoursRingEnabled = e.target.checked;
                if (divBhControls) divBhControls.style.display = businessHoursRingEnabled ? 'block' : 'none';
                build3DClockwork();
                syncProModel();
            };
        }
        if (sldBhStart) {
            sldBhStart.oninput = (e) => {
                businessHoursStart = parseInt(e.target.value);
                const valDisp = document.getElementById('cu3-bh-start-val');
                if (valDisp) valDisp.textContent = businessHoursStart;
                build3DClockwork();
                syncProModel();
            };
        }
        if (sldBhEnd) {
            sldBhEnd.oninput = (e) => {
                businessHoursEnd = parseInt(e.target.value);
                const valDisp = document.getElementById('cu3-bh-end-val');
                if (valDisp) valDisp.textContent = businessHoursEnd;
                build3DClockwork();
                syncProModel();
            };
        }

        const optAnalytics = document.getElementById('cu3-opt-analytics');
        if (optAnalytics) {
            optAnalytics.onchange = (e) => {
                analyticsDisplayEnabled = e.target.checked;
                build3DClockwork();
                syncProModel();
            };
        }

        const optWeatherSync = document.getElementById('cu3-opt-weathersync');
        if (optWeatherSync) {
            optWeatherSync.onchange = (e) => {
                weatherWeatherSyncEnabled = e.target.checked;
                syncProModel();
            };
        }

        const optBlueLight = document.getElementById('cu3-opt-bluelight');
        if (optBlueLight) {
            optBlueLight.onchange = (e) => {
                blueLightFilterEnabled = e.target.checked;
                syncProModel();
            };
        }

        const optPomodoro = document.getElementById('cu3-opt-pomodoro');
        if (optPomodoro) {
            optPomodoro.onchange = (e) => {
                pomodoroTimerEnabled = e.target.checked;
                const ctrls = document.getElementById('cu3-pomodoro-controls');
                if (ctrls) ctrls.style.display = pomodoroTimerEnabled ? 'block' : 'none';
                if (!pomodoroTimerEnabled && pomodoroRunning) {
                    pomodoroRunning = false;
                }
                syncProModel();
            };
        }

        const optPomodoroDur = document.getElementById('cu3-pomodoro-dur');
        if (optPomodoroDur) {
            optPomodoroDur.onchange = (e) => {
                pomodoroDuration = Math.max(1, parseInt(e.target.value) || 25);
                syncProModel();
            };
        }

        const btnPomodoroStart = document.getElementById('cu3-pomodoro-btn-start');
        if (btnPomodoroStart) {
            btnPomodoroStart.onclick = () => {
                pomodoroRunning = !pomodoroRunning;
                if (pomodoroRunning) {
                    pomodoroTimeRemaining = pomodoroDuration * 60;
                    btnPomodoroStart.innerText = l.pomodoroStopBtn;
                    if (window.toast) window.toast("🍅 Focus session started!");
                } else {
                    btnPomodoroStart.innerText = l.pomodoroStartBtn;
                }
                syncProModel();
            };
        }

        const optSoundscape = document.getElementById('cu3-opt-soundscape');
        if (optSoundscape) {
            optSoundscape.onchange = (e) => {
                soundscapeMixerEnabled = e.target.checked;
                const ctrls = document.getElementById('cu3-soundscape-controls');
                if (ctrls) ctrls.style.display = soundscapeMixerEnabled ? 'block' : 'none';
                if (soundscapeMixerEnabled) {
                    initSoundscapeSynth();
                } else {
                    stopSoundscapeSynth();
                }
                syncProModel();
            };
        }

        const sldSoundscapeRain = document.getElementById('cu3-soundscape-rain');
        if (sldSoundscapeRain) {
            sldSoundscapeRain.oninput = (e) => {
                soundscapeRainVol = parseInt(e.target.value);
                const valDisp = document.getElementById('cu3-soundscape-rain-val');
                if (valDisp) valDisp.textContent = soundscapeRainVol + '%';
                updateSoundscapeVolumes();
                syncProModel();
            };
        }

        const sldSoundscapeWind = document.getElementById('cu3-soundscape-wind');
        if (sldSoundscapeWind) {
            sldSoundscapeWind.oninput = (e) => {
                soundscapeWindVol = parseInt(e.target.value);
                const valDisp = document.getElementById('cu3-soundscape-wind-val');
                if (valDisp) valDisp.textContent = soundscapeWindVol + '%';
                updateSoundscapeVolumes();
                syncProModel();
            };
        }

        const sldSoundscapeBinaural = document.getElementById('cu3-soundscape-binaural');
        if (sldSoundscapeBinaural) {
            sldSoundscapeBinaural.oninput = (e) => {
                soundscapeBinauralVol = parseInt(e.target.value);
                const valDisp = document.getElementById('cu3-soundscape-binaural-val');
                if (valDisp) valDisp.textContent = soundscapeBinauralVol + '%';
                updateSoundscapeVolumes();
                syncProModel();
            };
        }

        function resetExclusives(except) {
            if (except !== 'tm') { teamMembersEnabled = false; const el = document.getElementById('cu3-opt-teammembers'); if (el) el.checked = false; }
            if (except !== 'ht') { historyTimelineEnabled = false; const el = document.getElementById('cu3-opt-historytimeline'); if (el) el.checked = false; }
            if (except !== 'kpi') { kpiDashboardEnabled = false; const el = document.getElementById('cu3-opt-kpidashboard'); if (el) el.checked = false; }
            if (except !== 'radar') { securityRadarEnabled = false; const el = document.getElementById('cu3-opt-securityradar'); if (el) el.checked = false; }
            if (except !== 'av') { audioVisualizerEnabled = false; const el = document.getElementById('cu3-opt-audiovisualizer'); if (el) el.checked = false; }
            if (except !== 'roadmap') { futureRoadmapEnabled = false; const el = document.getElementById('cu3-opt-futureroadmap'); if (el) el.checked = false; }
            if (except !== 'financial') {
                financialTickerEnabled = false;
                const el = document.getElementById('cu3-opt-financialticker');
                if (el) el.checked = false;
                const ctrls = document.getElementById('cu3-financial-controls');
                if (ctrls) ctrls.style.display = 'none';
            }
            if (except !== 'celestial') {
                celestialTrackerEnabled = false;
                const el = document.getElementById('cu3-opt-celestialtracker');
                if (el) el.checked = false;
                const ctrls = document.getElementById('cu3-celestial-controls');
                if (ctrls) ctrls.style.display = 'none';
            }
            if (except !== 'astrology') {
                astrologicalBiorhythmEnabled = false;
                const el = document.getElementById('cu3-opt-astrologicalbiorhythm');
                if (el) el.checked = false;
                const ctrls = document.getElementById('cu3-astrological-controls');
                if (ctrls) ctrls.style.display = 'none';
            }
            if (except !== 'worldglobe') {
                worldGlobeEnabled = false;
                const el = document.getElementById('cu3-opt-worldglobe');
                if (el) el.checked = false;
            }
            if (except !== 'retro') {
                retroArcadeEnabled = false;
                const el = document.getElementById('cu3-opt-retroarcade');
                if (el) el.checked = false;
            }
            if (except !== 'roi') {
                campaignRoiEnabled = false;
                const el = document.getElementById('cu3-opt-campaignroi');
                if (el) el.checked = false;
            }
            if (except !== 'brand') {
                brandCarouselEnabled = false;
                const el = document.getElementById('cu3-opt-brandcarousel');
                if (el) el.checked = false;
            }
            if (except !== 'sentiment') {
                sentimentRadarEnabled = false;
                const el = document.getElementById('cu3-opt-sentimentradar');
                if (el) el.checked = false;
            }
            if (except !== 'weather') {
                weatherDialEnabled = false;
                const el = document.getElementById('cu3-opt-weatherdial');
                if (el) el.checked = false;
            }
            if (except !== 'social') {
                socialContactEnabled = false;
                const el = document.getElementById('cu3-opt-socialcontact');
                if (el) el.checked = false;
            }
            if (except !== 'billboard') {
                billboardCampaignEnabled = false;
                const el = document.getElementById('cu3-opt-billboard');
                if (el) el.checked = false;
                const ctrls = document.getElementById('cu3-billboard-sec');
                if (ctrls) ctrls.style.display = 'none';
            }
        }

        const optTeamMembers = document.getElementById('cu3-opt-teammembers');
        if (optTeamMembers) {
            optTeamMembers.onchange = (e) => {
                teamMembersEnabled = e.target.checked;
                if (teamMembersEnabled) resetExclusives('tm');
                syncProModel();
                updateHourEditorUI();
            };
        }

        const optHistoryTimeline = document.getElementById('cu3-opt-historytimeline');
        if (optHistoryTimeline) {
            optHistoryTimeline.onchange = (e) => {
                historyTimelineEnabled = e.target.checked;
                if (historyTimelineEnabled) resetExclusives('ht');
                syncProModel();
                updateHourEditorUI();
            };
        }

        const optTeamPresence = document.getElementById('cu3-opt-teampresence');
        if (optTeamPresence) {
            optTeamPresence.onchange = (e) => {
                teamPresenceRingEnabled = e.target.checked;
                build3DClockwork();
                syncProModel();
            };
        }

        const optKpiDashboard = document.getElementById('cu3-opt-kpidashboard');
        if (optKpiDashboard) {
            optKpiDashboard.onchange = (e) => {
                kpiDashboardEnabled = e.target.checked;
                if (kpiDashboardEnabled) resetExclusives('kpi');
                build3DClockwork();
                syncProModel();
                updateHourEditorUI();
            };
        }

        const optSecurityRadar = document.getElementById('cu3-opt-securityradar');
        if (optSecurityRadar) {
            optSecurityRadar.onchange = (e) => {
                securityRadarEnabled = e.target.checked;
                if (securityRadarEnabled) resetExclusives('radar');
                build3DClockwork();
                syncProModel();
                updateHourEditorUI();
            };
        }

        const optAudioVisualizer = document.getElementById('cu3-opt-audiovisualizer');
        if (optAudioVisualizer) {
            optAudioVisualizer.onchange = (e) => {
                audioVisualizerEnabled = e.target.checked;
                if (audioVisualizerEnabled) resetExclusives('av');
                build3DClockwork();
                syncProModel();
                updateHourEditorUI();
            };
        }

        const optFutureRoadmap = document.getElementById('cu3-opt-futureroadmap');
        if (optFutureRoadmap) {
            optFutureRoadmap.onchange = (e) => {
                futureRoadmapEnabled = e.target.checked;
                if (futureRoadmapEnabled) resetExclusives('roadmap');
                build3DClockwork();
                syncProModel();
                updateHourEditorUI();
            };
        }

        const optFinancialTicker = document.getElementById('cu3-opt-financialticker');
        if (optFinancialTicker) {
            optFinancialTicker.onchange = (e) => {
                financialTickerEnabled = e.target.checked;
                if (financialTickerEnabled) resetExclusives('financial');
                const ctrls = document.getElementById('cu3-financial-controls');
                if (ctrls) ctrls.style.display = financialTickerEnabled ? 'flex' : 'none';
                build3DClockwork();
                syncProModel();
                updateHourEditorUI();
            };
        }

        const optCelestialTracker = document.getElementById('cu3-opt-celestialtracker');
        if (optCelestialTracker) {
            optCelestialTracker.onchange = (e) => {
                celestialTrackerEnabled = e.target.checked;
                if (celestialTrackerEnabled) resetExclusives('celestial');
                const ctrls = document.getElementById('cu3-celestial-controls');
                if (ctrls) ctrls.style.display = celestialTrackerEnabled ? 'flex' : 'none';
                build3DClockwork();
                syncProModel();
                updateHourEditorUI();
            };
        }

        const optCelestialStars = document.getElementById('cu3-celestial-stars');
        if (optCelestialStars) {
            optCelestialStars.onchange = (e) => {
                celestialShowStars = e.target.checked;
                build3DClockwork();
                syncProModel();
            };
        }

        const optAstrologicalBiorhythm = document.getElementById('cu3-opt-astrologicalbiorhythm');
        if (optAstrologicalBiorhythm) {
            optAstrologicalBiorhythm.onchange = (e) => {
                astrologicalBiorhythmEnabled = e.target.checked;
                if (astrologicalBiorhythmEnabled) resetExclusives('astrology');
                const ctrls = document.getElementById('cu3-astrological-controls');
                if (ctrls) ctrls.style.display = astrologicalBiorhythmEnabled ? 'flex' : 'none';
                build3DClockwork();
                syncProModel();
                updateHourEditorUI();
            };
        }

        const inpBirthdate = document.getElementById('cu3-birthdate-input');
        if (inpBirthdate) {
            inpBirthdate.onchange = (e) => {
                birthdateInput = e.target.value;
                build3DClockwork();
                syncProModel();
            };
        }

        const optWorldGlobe = document.getElementById('cu3-opt-worldglobe');
        if (optWorldGlobe) {
            optWorldGlobe.onchange = (e) => {
                worldGlobeEnabled = e.target.checked;
                if (worldGlobeEnabled) resetExclusives('worldglobe');
                build3DClockwork();
                syncProModel();
                updateHourEditorUI();
            };
        }

        const optRetroArcade = document.getElementById('cu3-opt-retroarcade');
        if (optRetroArcade) {
            optRetroArcade.onchange = (e) => {
                retroArcadeEnabled = e.target.checked;
                if (retroArcadeEnabled) resetExclusives('retro');
                build3DClockwork();
                syncProModel();
                updateHourEditorUI();
            };
        }

        const optCampaignRoi = document.getElementById('cu3-opt-campaignroi');
        if (optCampaignRoi) {
            optCampaignRoi.onchange = (e) => {
                campaignRoiEnabled = e.target.checked;
                if (campaignRoiEnabled) resetExclusives('roi');
                build3DClockwork();
                syncProModel();
                updateHourEditorUI();
            };
        }

        const optBrandCarousel = document.getElementById('cu3-opt-brandcarousel');
        if (optBrandCarousel) {
            optBrandCarousel.onchange = (e) => {
                brandCarouselEnabled = e.target.checked;
                if (brandCarouselEnabled) resetExclusives('brand');
                build3DClockwork();
                syncProModel();
                updateHourEditorUI();
            };
        }

        const optSentimentRadar = document.getElementById('cu3-opt-sentimentradar');
        if (optSentimentRadar) {
            optSentimentRadar.onchange = (e) => {
                sentimentRadarEnabled = e.target.checked;
                if (sentimentRadarEnabled) resetExclusives('sentiment');
                build3DClockwork();
                syncProModel();
                updateHourEditorUI();
            };
        }

        const optWeatherDial = document.getElementById('cu3-opt-weatherdial');
        if (optWeatherDial) {
            optWeatherDial.onchange = (e) => {
                weatherDialEnabled = e.target.checked;
                if (weatherDialEnabled) {
                    resetExclusives('weather');
                    if (window._fetchLiveWeatherData) {
                        window._fetchLiveWeatherData();
                    }
                }
                build3DClockwork();
                syncProModel();
                updateHourEditorUI();
            };
        }

        const optSocialContact = document.getElementById('cu3-opt-socialcontact');
        if (optSocialContact) {
            optSocialContact.onchange = (e) => {
                socialContactEnabled = e.target.checked;
                if (socialContactEnabled) resetExclusives('social');
                try { build3DClockwork(); } catch(err) { console.warn('[social build err]', err); }
                syncProModel();
                // Force the editor panel visible immediately
                const sec = document.getElementById('cu3-hour-content-sec');
                if (sec) sec.style.display = socialContactEnabled ? 'block' : 'none';
                updateHourEditorUI();
            };
        }

        // Billboard Campaign Mode checkbox
        const optBillboard = document.getElementById('cu3-opt-billboard');
        if (optBillboard) {
            optBillboard.onchange = (e) => {
                billboardCampaignEnabled = e.target.checked;
                if (billboardCampaignEnabled) {
                    resetExclusives('billboard');
                } else {
                    window._billboardForcePreviewIdx = null;
                    window._billboardPreviewActive = false;
                }
                const sec = document.getElementById('cu3-billboard-sec');
                if (sec) sec.style.display = billboardCampaignEnabled ? 'block' : 'none';
                updateBillboardEditorUI();
                syncProModel();
            };
        }

        // AI Agent Mode checkbox
        const optAiAgent = document.getElementById('cu3-opt-aiagent');
        if (optAiAgent) {
            optAiAgent.onchange = (e) => {
                aiAgentEnabled = e.target.checked;
                syncProModel();
            };
        }

        // Billboard Visual Preview checkbox
        const cbBillboardPreview = document.getElementById('cu3-billboard-visual-preview');
        if (cbBillboardPreview) {
            cbBillboardPreview.onchange = (e) => {
                billboardVisualPreview = e.target.checked;
                window._billboardPreviewActive = billboardVisualPreview;
                syncProModel();
            };
        }

        // Billboard Clock duration
        const inBillboardClockDur = document.getElementById('cu3-billboard-clock-dur');
        if (inBillboardClockDur) {
            inBillboardClockDur.oninput = (e) => {
                billboardClockDuration = parseInt(e.target.value) || 30;
                syncProModel();
            };
        }

        // Billboard Slide select dropdown
        const selBillboardSlide = document.getElementById('cu3-billboard-slide-select');
        if (selBillboardSlide) {
            selBillboardSlide.onchange = (e) => {
                billboardActiveEditIndex = parseInt(e.target.value) || 0;
                updateBillboardEditorUI();
            };
        }

        // Billboard Add slide button
        const btnBillboardAdd = document.getElementById('cu3-billboard-add-slide');
        if (btnBillboardAdd) {
            btnBillboardAdd.onclick = () => {
                billboardSlides.push({
                    mediaType: 'text-only',
                    mediaData: null,
                    mediaName: '',
                    title: 'NEW ANNOUNCEMENT',
                    titleColor: '#38bdf8',
                    titleSize: 32,
                    titleX: 50,
                    titleY: 28,
                    desc: 'Write details or product feature descriptions here.',
                    descColor: '#e2e8f0',
                    descSize: 16,
                    descX: 50,
                    descY: 42,
                    ctaText: 'Learn More',
                    ctaUrl: 'https://example.com',
                    ctaColor: '#0ea5e9',
                    bgType: 'gradient',
                    bgColor1: '#090d1a',
                    bgColor2: '#1e1b4b',
                    duration: 7,
                    showQr: false,
                    layoutStyle: 'glass-card',
                    mediaFit: 'cover',
                    mediaScale: 100,
                    mediaX: 50,
                    mediaY: 50
                });
                billboardActiveEditIndex = billboardSlides.length - 1;
                updateBillboardEditorUI();
                syncProModel();
            };
        }

        // Billboard Delete slide button
        const btnBillboardDel = document.getElementById('cu3-billboard-del-slide');
        if (btnBillboardDel) {
            btnBillboardDel.onclick = () => {
                if (billboardSlides.length <= 1) {
                    alert("You must keep at least one advertisement slide.");
                    return;
                }
                billboardSlides.splice(billboardActiveEditIndex, 1);
                billboardActiveEditIndex = Math.max(0, billboardActiveEditIndex - 1);
                updateBillboardEditorUI();
                syncProModel();
            };
        }

        // Billboard active slide properties inputs
        const onBillboardSlideValueChange = () => {
            const activeSlide = billboardSlides[billboardActiveEditIndex];
            if (!activeSlide) return;
            
            activeSlide.duration = parseInt(document.getElementById('cu3-billboard-slide-dur').value) || 7;
            document.getElementById('cu3-billboard-slide-dur-val').textContent = activeSlide.duration + 's';
            
            const oldMediaType = activeSlide.mediaType;
            activeSlide.mediaType = document.getElementById('cu3-billboard-media-type').value;
            if (oldMediaType !== activeSlide.mediaType) {
                const hasMedia = (activeSlide.mediaType === 'image' || activeSlide.mediaType === 'video');
                document.getElementById('cu3-billboard-media-upload-row').style.display = hasMedia ? 'flex' : 'none';
                document.getElementById('cu3-billboard-media-style-options').style.display = hasMedia ? 'flex' : 'none';
            }
            
            const oldFit = activeSlide.mediaFit;
            activeSlide.mediaFit = document.getElementById('cu3-billboard-media-fit').value || 'cover';
            if (oldFit !== activeSlide.mediaFit) {
                document.getElementById('cu3-billboard-media-custom-row').style.display = (activeSlide.mediaFit === 'custom') ? 'flex' : 'none';
            }
            activeSlide.mediaScale = parseInt(document.getElementById('cu3-billboard-media-scale').value) || 100;
            document.getElementById('cu3-billboard-media-scale-val').textContent = activeSlide.mediaScale + '%';
            activeSlide.mediaX = parseInt(document.getElementById('cu3-billboard-media-x').value) || 50;
            activeSlide.mediaY = parseInt(document.getElementById('cu3-billboard-media-y').value) || 50;
            
            activeSlide.title = document.getElementById('cu3-billboard-title').value;
            activeSlide.titleColor = document.getElementById('cu3-billboard-title-color').value;
            activeSlide.titleSize = parseInt(document.getElementById('cu3-billboard-title-size').value) || 32;
            activeSlide.titleX = parseInt(document.getElementById('cu3-billboard-title-x').value) || 50;
            activeSlide.titleY = parseInt(document.getElementById('cu3-billboard-title-y').value) || 28;
            
            activeSlide.desc = document.getElementById('cu3-billboard-desc').value;
            activeSlide.descColor = document.getElementById('cu3-billboard-desc-color').value;
            activeSlide.descSize = parseInt(document.getElementById('cu3-billboard-desc-size').value) || 16;
            activeSlide.descX = parseInt(document.getElementById('cu3-billboard-desc-x').value) || 50;
            activeSlide.descY = parseInt(document.getElementById('cu3-billboard-desc-y').value) || 42;
            
            activeSlide.ctaText = document.getElementById('cu3-billboard-cta-text').value;
            activeSlide.ctaUrl = document.getElementById('cu3-billboard-cta-url').value;
            activeSlide.ctaColor = document.getElementById('cu3-billboard-cta-color').value;
            
            activeSlide.layoutStyle = document.getElementById('cu3-billboard-layout-style').value || 'glass-card';
            activeSlide.showQr = document.getElementById('cu3-billboard-show-qr').checked;
            
            activeSlide.bgType = document.getElementById('cu3-billboard-bg-type').value;
            activeSlide.bgColor1 = document.getElementById('cu3-billboard-bg-color1').value;
            activeSlide.bgColor2 = document.getElementById('cu3-billboard-bg-color2').value;
            
            // Show/hide bg-color2 based on type
            const isGradient = activeSlide.bgType === 'gradient';
            document.getElementById('cu3-billboard-bg-color2').style.display = isGradient ? 'inline-block' : 'none';
            document.getElementById('cu3-billboard-bg-color2-label').style.display = isGradient ? 'inline-block' : 'none';
            
            // Update slide select name option in selector
            const select = document.getElementById('cu3-billboard-slide-select');
            if (select && select.options[billboardActiveEditIndex]) {
                select.options[billboardActiveEditIndex].textContent = `Slide ${billboardActiveEditIndex + 1}: ${activeSlide.title || 'Untitled'}`;
            }
            
            syncProModel();
        };

        const slideInputs = [
            'cu3-billboard-slide-dur',
            'cu3-billboard-media-type',
            'cu3-billboard-title',
            'cu3-billboard-title-color',
            'cu3-billboard-title-size',
            'cu3-billboard-title-x',
            'cu3-billboard-title-y',
            'cu3-billboard-desc',
            'cu3-billboard-desc-color',
            'cu3-billboard-desc-size',
            'cu3-billboard-desc-x',
            'cu3-billboard-desc-y',
            'cu3-billboard-cta-text',
            'cu3-billboard-cta-url',
            'cu3-billboard-cta-color',
            'cu3-billboard-layout-style',
            'cu3-billboard-show-qr',
            'cu3-billboard-media-fit',
            'cu3-billboard-media-scale',
            'cu3-billboard-media-x',
            'cu3-billboard-media-y',
            'cu3-billboard-bg-type',
            'cu3-billboard-bg-color1',
            'cu3-billboard-bg-color2'
        ];
        
        slideInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (el.onchange === null || el.onchange === undefined) {
                    if (el.tagName === 'SELECT' || el.type === 'color') {
                        el.onchange = onBillboardSlideValueChange;
                    } else {
                        el.oninput = onBillboardSlideValueChange;
                    }
                }
            }
        });

        // Billboard file upload helper
        const fileBillboardMedia = document.getElementById('cu3-billboard-media-file');
        if (fileBillboardMedia) {
            fileBillboardMedia.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                const activeSlide = billboardSlides[billboardActiveEditIndex];
                if (!activeSlide) return;
                
                activeSlide.mediaName = file.name;
                document.getElementById('cu3-billboard-media-name').textContent = file.name;
                
                const reader = new FileReader();
                reader.onload = (ev) => {
                    activeSlide.mediaData = ev.target.result;
                    syncProModel();
                };
                reader.readAsDataURL(file);
            };
        }

        const selFinancialAsset = document.getElementById('cu3-financial-asset');
        if (selFinancialAsset) {
            selFinancialAsset.onchange = (e) => {
                financialAsset = e.target.value;
                build3DClockwork();
                syncProModel();
            };
        }

        const selFinancialCurrency = document.getElementById('cu3-financial-currency');
        if (selFinancialCurrency) {
            selFinancialCurrency.onchange = (e) => {
                financialCurrency = e.target.value;
                build3DClockwork();
                syncProModel();
            };
        }

        const optExportWhiteLabel = document.getElementById('cu3-opt-exportwhitelabel');
        if (optExportWhiteLabel) {
            optExportWhiteLabel.onchange = (e) => {
                exportWhiteLabel = e.target.checked;
                syncProModel();
            };
        }

        const hourSelect = document.getElementById('cu3-hour-editor-select');
        if (hourSelect) {
            hourSelect.onchange = (e) => {
                let mode = '';
                if (kpiDashboardEnabled) mode = 'kpi';
                else if (securityRadarEnabled) mode = 'radar';
                else if (futureRoadmapEnabled) mode = 'roadmap';
                else if (historyTimelineEnabled) mode = 'history';
                else if (teamMembersEnabled) mode = 'team';
                else if (financialTickerEnabled) mode = 'financial';
                else if (celestialTrackerEnabled) mode = 'celestial';
                else if (astrologicalBiorhythmEnabled) mode = 'astrology';
                else if (worldGlobeEnabled) mode = 'worldglobe';
                else if (retroArcadeEnabled) mode = 'retro';
                else if (campaignRoiEnabled) mode = 'roi';
                else if (brandCarouselEnabled) mode = 'brand';
                else if (sentimentRadarEnabled) mode = 'sentiment';
                else if (weatherDialEnabled) mode = 'weather';
                else if (socialContactEnabled) mode = 'social';
                renderHourFields(mode, parseInt(e.target.value));
            };
        }



        // Tabs events
        [0, 1, 2].forEach(tabIdx => {
            const btn = document.getElementById('cu3-text-tab-' + tabIdx);
            if (btn) {
                btn.onclick = () => {
                    activeTextTab = tabIdx;
                    renderPanel();
                };
            }
        });

        // Presets events
        const btnPresetTop = document.getElementById('cu3-preset-top');
        if (btnPresetTop) {
            btnPresetTop.onclick = () => {
                const activeText = dialTexts[activeTextTab];
                activeText.x = 0;
                activeText.y = 0;
                activeText.rotation = 0;
                activeText.warp = true;
                activeText.warpRadius = 22;
                renderPanel(); build3DClockwork(); syncProModel();
            };
        }
        const btnPresetBottom = document.getElementById('cu3-preset-bottom');
        if (btnPresetBottom) {
            btnPresetBottom.onclick = () => {
                const activeText = dialTexts[activeTextTab];
                activeText.x = 0;
                activeText.y = 0;
                activeText.rotation = 180;
                activeText.warp = true;
                activeText.warpRadius = 22;
                renderPanel(); build3DClockwork(); syncProModel();
            };
        }
        const btnPresetCenter = document.getElementById('cu3-preset-center');
        if (btnPresetCenter) {
            btnPresetCenter.onclick = () => {
                const activeText = dialTexts[activeTextTab];
                activeText.x = 0;
                activeText.y = 0;
                activeText.rotation = 0;
                activeText.warp = false;
                renderPanel(); build3DClockwork(); syncProModel();
            };
        }

        // Dial Text Customizer bindings
        const textInput = document.getElementById('cu3-dial-text');
        if (textInput) {
            textInput.oninput = (e) => {
                dialTexts[activeTextTab].text = e.target.value;
                build3DClockwork();
                syncProModel();
            };
        }

        const textColorInput = document.getElementById('cu3-dial-text-color');
        if (textColorInput) {
            textColorInput.oninput = (e) => {
                dialTexts[activeTextTab].color = e.target.value;
                build3DClockwork();
                syncProModel();
            };
        }

        bindSlider('cu3-dial-text-size', 'cu3-dial-text-size-val', (v) => dialTexts[activeTextTab].size = v);
        bindSlider('cu3-dial-text-x', 'cu3-dial-text-x-val', (v) => dialTexts[activeTextTab].x = v);
        bindSlider('cu3-dial-text-y', 'cu3-dial-text-y-val', (v) => dialTexts[activeTextTab].y = v);
        bindSlider('cu3-dial-text-rot', 'cu3-dial-text-rot-val', (v) => dialTexts[activeTextTab].rotation = v);
        bindSlider('cu3-dial-text-warp-rad', 'cu3-dial-text-warp-rad-val', (v) => dialTexts[activeTextTab].warpRadius = v);

        const textFontSelect = document.getElementById('cu3-dial-text-font');
        if (textFontSelect) {
            textFontSelect.onchange = (e) => {
                dialTexts[activeTextTab].font = e.target.value;
                build3DClockwork();
                syncProModel();
            };
        }

        const textOrientSelect = document.getElementById('cu3-dial-text-orient');
        if (textOrientSelect) {
            textOrientSelect.onchange = (e) => {
                dialTexts[activeTextTab].orientation = e.target.value;
                build3DClockwork();
                syncProModel();
            };
        }

        const textPresetSelect = document.getElementById('cu3-dial-text-preset');
        if (textPresetSelect) {
            textPresetSelect.onchange = (e) => {
                dialTexts[activeTextTab].preset = e.target.value;
                build3DClockwork();
                syncProModel();
            };
        }

        const textWarpCheck = document.getElementById('cu3-dial-text-warp');
        if (textWarpCheck) {
            textWarpCheck.onchange = (e) => {
                dialTexts[activeTextTab].warp = e.target.checked;
                const radRow = document.getElementById('cu3-dial-text-warp-row');
                if (radRow) radRow.style.display = dialTexts[activeTextTab].warp ? 'flex' : 'none';
                build3DClockwork();
                syncProModel();
            };
        }

        const textPulseCheck = document.getElementById('cu3-dial-text-pulse');
        if (textPulseCheck) {
            textPulseCheck.onchange = (e) => {
                dialTexts[activeTextTab].pulseWithTick = e.target.checked;
                build3DClockwork();
                syncProModel();
            };
        }

        document.getElementById('cu3-opt-tourbillon').onchange = (e) => { tourbillonEnabled = e.target.checked; build3DClockwork(); syncProModel(); };
        document.getElementById('cu3-opt-moonphase').onchange = (e) => { moonPhaseEnabled = e.target.checked; build3DClockwork(); syncProModel(); };
        document.getElementById('cu3-opt-liquidneon').onchange = (e) => { liquidNeonEnabled = e.target.checked; build3DClockwork(); syncProModel(); };
        document.getElementById('cu3-opt-steampipes').onchange = (e) => { steamPipesEnabled = e.target.checked; build3DClockwork(); syncProModel(); };
        document.getElementById('cu3-opt-holohud').onchange = (e) => { holoHudEnabled = e.target.checked; build3DClockwork(); syncProModel(); };

        // Alarm toggles
        document.getElementById('cu3-alarm-enabled').onchange = (e) => {
            alarmEnabled = e.target.checked;
            build3DClockwork();
            syncProModel();
        };
        document.getElementById('cu3-alarm-time').onchange = (e) => {
            alarmTime = e.target.value;
            build3DClockwork();
            syncProModel();
        };
        
        const alarmTestBtn = document.getElementById('cu3-alarm-test');
        alarmTestBtn.onclick = () => {
            if (alarmInterval) {
                stopAlarm();
                alarmTestBtn.textContent = l.alarmTest;
            } else {
                alarmTestBtn.textContent = l.alarmStop;
                triggerAlarm();
            }
        };

        // Fuse button
        const fuseBtn = document.getElementById('cu3-btn-fuse');
        fuseBtn.onclick = () => {
            const scn = getScene();
            if (!scn) {
                alert(l.errNoScene);
                return;
            }
            build3DClockwork();
            syncProModel();
            if (window.toast) {
                window.toast(l.successFused);
            } else {
                alert(l.successFused);
            }
        };

        const hdr = panel.querySelector('.hdr');
        if (hdr) {
            makeElementDraggable(panel, hdr);
        }
    }

    function updateChronoUI(running) {
        chronoRunning = running;
        const btnStart = document.getElementById('cu3-chrono-start');
        if (btnStart) {
            const l = L();
            btnStart.innerHTML = running ? `⏸️ Pause` : `▶️ ${l.chronoStart}`;
        }
    }

    function updateAlarmFromDrag(newTime) {
        alarmTime = newTime;
        const alarmInput = document.getElementById('cu3-alarm-time');
        if (alarmInput) {
            alarmInput.value = newTime;
        }
        syncProModel();
    }

    return {
        updateChronoUI: (running) => updateChronoUI(running),
        updateAlarmFromDrag: (newTime) => updateAlarmFromDrag(newTime),
        init: (sidebar, button) => {
            if (!button) return;
            button.onclick = () => {
                const scn = getScene();
                if (!scn) {
                    alert(L().errNoScene);
                    return;
                }

                isOpen = !isOpen;
                if (isOpen) {
                    ensureGroup();
                    
                    const activeModel = window.SketchExtruder.getModels().find(m => m.format === 'clock-ultra');
                    if (activeModel && activeModel.clockParts && activeModel.clockParts[0]) {
                        const p0 = activeModel.clockParts[0];
                        customLogoStr = p0.customLogo !== undefined ? p0.customLogo : customLogoStr;
                        dxfDataStr = p0.dxfData !== undefined ? p0.dxfData : dxfDataStr;
                        dxfTextStr = p0.dxfText !== undefined ? p0.dxfText : dxfTextStr;
                        dxfFileName = p0.dxfFileName !== undefined ? p0.dxfFileName : dxfFileName;
                        customOutlinePoints = p0.customOutlinePoints !== undefined ? p0.customOutlinePoints : customOutlinePoints;
                        customSilhouettePoints = p0.customSilhouettePoints !== undefined ? p0.customSilhouettePoints : customSilhouettePoints;
                        pivotX = p0.pivotX !== undefined ? p0.pivotX : pivotX;
                        pivotY = p0.pivotY !== undefined ? p0.pivotY : pivotY;
                        handStyle = p0.handStyle !== undefined ? p0.handStyle : handStyle;
                        markerStyle = p0.markerStyle !== undefined ? p0.markerStyle : markerStyle;
                        markerColor = p0.markerColor !== undefined ? p0.markerColor : markerColor;
                        markerSize = p0.markerSize !== undefined ? p0.markerSize : markerSize;
                        markerRadius = p0.markerRadius !== undefined ? p0.markerRadius : markerRadius;
                        glassCover = p0.glassCover !== undefined ? p0.glassCover : glassCover;
                        soundEnabled = p0.soundEnabled !== undefined ? p0.soundEnabled : soundEnabled;
                        alarmTime = p0.alarmTime !== undefined ? p0.alarmTime : alarmTime;
                        alarmEnabled = p0.alarmEnabled !== undefined ? p0.alarmEnabled : alarmEnabled;
                        handHColor = p0.handHColor !== undefined ? p0.handHColor : handHColor;
                        handMColor = p0.handMColor !== undefined ? p0.handMColor : handMColor;
                        handSColor = p0.handSColor !== undefined ? p0.handSColor : handSColor;
                        handHLength = p0.handHLength !== undefined ? p0.handHLength : handHLength;
                        handMLength = p0.handMLength !== undefined ? p0.handMLength : handMLength;
                        handSLength = p0.handSLength !== undefined ? p0.handSLength : handSLength;
                        handHWidth = p0.handHWidth !== undefined ? p0.handHWidth : handHWidth;
                        handMWidth = p0.handMWidth !== undefined ? p0.handMWidth : handMWidth;
                        handSWidth = p0.handSWidth !== undefined ? p0.handSWidth : handSWidth;
                        faceShape = p0.faceShape !== undefined ? p0.faceShape : faceShape;
                        faceColor = p0.faceColor !== undefined ? p0.faceColor : faceColor;
                        modelColor = p0.modelColor !== undefined ? p0.modelColor : modelColor;
                        chronoEnabled = p0.chronoEnabled !== undefined ? p0.chronoEnabled : chronoEnabled;
                        chronoColor = p0.chronoColor !== undefined ? p0.chronoColor : chronoColor;
                        chronoNeedleColor = p0.chronoNeedleColor !== undefined ? p0.chronoNeedleColor : chronoNeedleColor;
                        metalStyle = p0.metalStyle !== undefined ? p0.metalStyle : metalStyle;
                        glowEnabled = p0.glowEnabled !== undefined ? p0.glowEnabled : glowEnabled;
                        glowColor = p0.glowColor !== undefined ? p0.glowColor : glowColor;
                        parallaxEnabled = p0.parallaxEnabled !== undefined ? p0.parallaxEnabled : parallaxEnabled;
                        glareSweepEnabled = p0.glareSweepEnabled !== undefined ? p0.glareSweepEnabled : glareSweepEnabled;
                        gearsEnabled = p0.gearsEnabled !== undefined ? p0.gearsEnabled : gearsEnabled;
                        neonBorderEnabled = p0.neonBorderEnabled !== undefined ? p0.neonBorderEnabled : neonBorderEnabled;
                        neonBorderColor = p0.neonBorderColor !== undefined ? p0.neonBorderColor : neonBorderColor;
                        tourbillonEnabled = p0.tourbillonEnabled !== undefined ? p0.tourbillonEnabled : tourbillonEnabled;
                        moonPhaseEnabled = p0.moonPhaseEnabled !== undefined ? p0.moonPhaseEnabled : moonPhaseEnabled;
                        liquidNeonEnabled = p0.liquidNeonEnabled !== undefined ? p0.liquidNeonEnabled : liquidNeonEnabled;
                        steamPipesEnabled = p0.steamPipesEnabled !== undefined ? p0.steamPipesEnabled : steamPipesEnabled;
                        holoHudEnabled = p0.holoHudEnabled !== undefined ? p0.holoHudEnabled : holoHudEnabled;
                        dialTexturePreset = p0.dialTexturePreset !== undefined ? p0.dialTexturePreset : dialTexturePreset;
                        weatherOverlay = p0.weatherOverlay !== undefined ? p0.weatherOverlay : weatherOverlay;
                        dynamicTimeColor = p0.dynamicTimeColor !== undefined ? p0.dynamicTimeColor : dynamicTimeColor;
                        audioReactive = p0.audioReactive !== undefined ? p0.audioReactive : audioReactive;
                        subDialMode = p0.subDialMode !== undefined ? p0.subDialMode : subDialMode;
                        radioEnabled = p0.radioEnabled !== undefined ? p0.radioEnabled : radioEnabled;
                        radioFrequency = p0.radioFrequency !== undefined ? p0.radioFrequency : radioFrequency;
                        radioVolume = p0.radioVolume !== undefined ? p0.radioVolume : radioVolume;

                        timeTravelEnabled = p0.timeTravelEnabled !== undefined ? p0.timeTravelEnabled : false;
                        timeTravelAutoReturn = p0.timeTravelAutoReturn !== undefined ? p0.timeTravelAutoReturn : true;
                        cursorMagnetismEnabled = p0.cursorMagnetismEnabled !== undefined ? p0.cursorMagnetismEnabled : false;
                        ambientTickEnabled = p0.ambientTickEnabled !== undefined ? p0.ambientTickEnabled : false;
                        hourlyChimeEnabled = p0.hourlyChimeEnabled !== undefined ? p0.hourlyChimeEnabled : false;
                        countdownTarget = p0.countdownTarget !== undefined ? p0.countdownTarget : '';
                        themePreset = p0.themePreset !== undefined ? p0.themePreset : 'custom';

                        navigatorMenuEnabled = p0.navigatorMenuEnabled !== undefined ? p0.navigatorMenuEnabled : false;
                        clockToBookEnabled = p0.clockToBookEnabled !== undefined ? p0.clockToBookEnabled : false;
                        teamMembersEnabled = p0.teamMembersEnabled !== undefined ? p0.teamMembersEnabled : false;
                        historyTimelineEnabled = p0.historyTimelineEnabled !== undefined ? p0.historyTimelineEnabled : false;
                        teamPresenceRingEnabled = p0.teamPresenceRingEnabled !== undefined ? p0.teamPresenceRingEnabled : false;
                        kpiDashboardEnabled = p0.kpiDashboardEnabled !== undefined ? p0.kpiDashboardEnabled : false;
                        securityRadarEnabled = p0.securityRadarEnabled !== undefined ? p0.securityRadarEnabled : false;
                        audioVisualizerEnabled = p0.audioVisualizerEnabled !== undefined ? p0.audioVisualizerEnabled : false;
                        futureRoadmapEnabled = p0.futureRoadmapEnabled !== undefined ? p0.futureRoadmapEnabled : false;
                        exportWhiteLabel = p0.exportWhiteLabel !== undefined ? p0.exportWhiteLabel : false;
                        financialTickerEnabled = p0.financialTickerEnabled !== undefined ? p0.financialTickerEnabled : false;
                        financialAsset = p0.financialAsset !== undefined ? p0.financialAsset : 'BTC';
                        financialCurrency = p0.financialCurrency !== undefined ? p0.financialCurrency : 'USD';
                        kpiHourTexts = p0.kpiHourTexts !== undefined ? JSON.parse(JSON.stringify(p0.kpiHourTexts)) : kpiHourTexts;
                        radarHourTexts = p0.radarHourTexts !== undefined ? JSON.parse(JSON.stringify(p0.radarHourTexts)) : radarHourTexts;
                        roadmapHourTexts = p0.roadmapHourTexts !== undefined ? JSON.parse(JSON.stringify(p0.roadmapHourTexts)) : roadmapHourTexts;
                        historyHourTexts = p0.historyHourTexts !== undefined ? JSON.parse(JSON.stringify(p0.historyHourTexts)) : historyHourTexts;
                        teamHourTexts = p0.teamHourTexts !== undefined ? JSON.parse(JSON.stringify(p0.teamHourTexts)) : teamHourTexts;
                        worldHourTexts = p0.worldHourTexts !== undefined ? JSON.parse(JSON.stringify(p0.worldHourTexts)) : worldHourTexts;
                        financialHourTexts = p0.financialHourTexts !== undefined ? JSON.parse(JSON.stringify(p0.financialHourTexts)) : financialHourTexts;
                        celestialTrackerEnabled = p0.celestialTrackerEnabled !== undefined ? p0.celestialTrackerEnabled : false;
                        celestialLocation = p0.celestialLocation !== undefined ? p0.celestialLocation : 'Auto';
                        celestialShowStars = p0.celestialShowStars !== undefined ? p0.celestialShowStars : true;
                        celestialHourTexts = p0.celestialHourTexts !== undefined ? JSON.parse(JSON.stringify(p0.celestialHourTexts)) : celestialHourTexts;
                        businessHoursRingEnabled = p0.businessHoursRingEnabled !== undefined ? p0.businessHoursRingEnabled : false;
                        businessHoursStart = p0.businessHoursStart !== undefined ? p0.businessHoursStart : 9;
                        businessHoursEnd = p0.businessHoursEnd !== undefined ? p0.businessHoursEnd : 18;
                        analyticsDisplayEnabled = p0.analyticsDisplayEnabled !== undefined ? p0.analyticsDisplayEnabled : false;
                        pomodoroTimerEnabled = p0.pomodoroTimerEnabled !== undefined ? p0.pomodoroTimerEnabled : false;
                        weatherWeatherSyncEnabled = p0.weatherWeatherSyncEnabled !== undefined ? p0.weatherWeatherSyncEnabled : false;
                        blueLightFilterEnabled = p0.blueLightFilterEnabled !== undefined ? p0.blueLightFilterEnabled : false;
                        soundscapeMixerEnabled = p0.soundscapeMixerEnabled !== undefined ? p0.soundscapeMixerEnabled : false;
                        soundscapeRainVol = p0.soundscapeRainVol !== undefined ? p0.soundscapeRainVol : 0;
                        soundscapeWindVol = p0.soundscapeWindVol !== undefined ? p0.soundscapeWindVol : 0;
                        soundscapeBinauralVol = p0.soundscapeBinauralVol !== undefined ? p0.soundscapeBinauralVol : 0;
                        pomodoroDuration = p0.pomodoroDuration !== undefined ? p0.pomodoroDuration : 25;
                        pomodoroRunning = p0.pomodoroRunning !== undefined ? p0.pomodoroRunning : false;
                        pomodoroTimeRemaining = p0.pomodoroTimeRemaining !== undefined ? p0.pomodoroTimeRemaining : 0;

                        socialContactEnabled = p0.socialContactEnabled !== undefined ? p0.socialContactEnabled : false;
                        socialContactHours = p0.socialContactHours !== undefined ? JSON.parse(JSON.stringify(p0.socialContactHours)) : socialContactHours;
                        weatherDialEnabled = p0.weatherDialEnabled !== undefined ? p0.weatherDialEnabled : false;
                        weatherHourTexts = p0.weatherHourTexts !== undefined ? JSON.parse(JSON.stringify(p0.weatherHourTexts)) : weatherHourTexts;
                        sentimentRadarEnabled = p0.sentimentRadarEnabled !== undefined ? p0.sentimentRadarEnabled : false;
                        sentimentHourTexts = p0.sentimentHourTexts !== undefined ? JSON.parse(JSON.stringify(p0.sentimentHourTexts)) : sentimentHourTexts;
                        brandCarouselEnabled = p0.brandCarouselEnabled !== undefined ? p0.brandCarouselEnabled : false;
                        brandHourTexts = p0.brandHourTexts !== undefined ? JSON.parse(JSON.stringify(p0.brandHourTexts)) : brandHourTexts;
                        campaignRoiEnabled = p0.campaignRoiEnabled !== undefined ? p0.campaignRoiEnabled : false;
                        roiHourTexts = p0.roiHourTexts !== undefined ? JSON.parse(JSON.stringify(p0.roiHourTexts)) : roiHourTexts;
                        astrologicalBiorhythmEnabled = p0.astrologicalBiorhythmEnabled !== undefined ? p0.astrologicalBiorhythmEnabled : false;
                        birthdateInput = p0.birthdateInput !== undefined ? p0.birthdateInput : '1995-01-01';
                        astrologyHourTexts = p0.astrologyHourTexts !== undefined ? JSON.parse(JSON.stringify(p0.astrologyHourTexts)) : astrologyHourTexts;
                        worldGlobeEnabled = p0.worldGlobeEnabled !== undefined ? p0.worldGlobeEnabled : false;
                        worldGlobeHourTexts = p0.worldGlobeHourTexts !== undefined ? JSON.parse(JSON.stringify(p0.worldGlobeHourTexts)) : worldGlobeHourTexts;
                        retroArcadeEnabled = p0.retroArcadeEnabled !== undefined ? p0.retroArcadeEnabled : false;
                        retroArcadeHourTexts = p0.retroArcadeHourTexts !== undefined ? JSON.parse(JSON.stringify(p0.retroArcadeHourTexts)) : retroArcadeHourTexts;

                        billboardCampaignEnabled = p0.billboardCampaignEnabled !== undefined ? p0.billboardCampaignEnabled : false;
                        billboardClockDuration = p0.billboardClockDuration !== undefined ? p0.billboardClockDuration : 30;
                        billboardVisualPreview = p0.billboardVisualPreview !== undefined ? p0.billboardVisualPreview : true;
                        billboardSlides = p0.billboardSlides !== undefined ? JSON.parse(JSON.stringify(p0.billboardSlides)) : billboardSlides;
                        aiAgentEnabled = p0.aiAgentEnabled !== undefined ? p0.aiAgentEnabled : false;



                        if (radioEnabled) {
                            tuneRadio();
                        } else {
                            stopRadioAudio();
                        }

                        if (soundscapeMixerEnabled) {
                            initSoundscapeSynth();
                        } else {
                            stopSoundscapeSynth();
                        }
                        
                        if (p0.dialTexts && p0.dialTexts.length > 0) {
                            dialTexts = JSON.parse(JSON.stringify(p0.dialTexts));
                        } else if (p0.dialText !== undefined) {
                            dialTexts[0] = {
                                text: p0.dialText || '',
                                color: p0.dialTextColor || '#ffffff',
                                size: p0.dialTextSize !== undefined ? p0.dialTextSize : 14,
                                font: p0.dialTextFont || 'Inter',
                                x: p0.dialTextX !== undefined ? p0.dialTextX : 0,
                                y: p0.dialTextY !== undefined ? p0.dialTextY : 8,
                                rotation: p0.dialTextRotation !== undefined ? p0.dialTextRotation : 0,
                                orientation: p0.dialTextOrientation || 'horizontal',
                                preset: p0.dialTextPreset || 'flat',
                                warp: p0.dialTextWarp || false,
                                warpRadius: p0.dialTextWarpRadius !== undefined ? p0.dialTextWarpRadius : 25,
                                pulseWithTick: p0.dialTextPulseWithTick || false
                            };
                        }
                        
                        window._clockUltraModelId = activeModel.id;
                    }

                    if (!clockGroupAdded) {
                        const grp = window.SketchExtruder.getGroup();
                        if (grp) {
                            grp.add(clockGroup);
                            clockGroup.position.set(0, 30, 0);
                        }
                    }
                    renderPanel();
                    panel.style.display = 'block';
                    build3DClockwork();
                    syncProModel();
                } else {
                    panel.style.display = 'none';
                    stopAlarm();
                }
            };
            
            // Periodically check for global language toggles
            setInterval(() => {
                if (isOpen && panel && panel.style.display !== 'none') {
                    const header = panel.querySelector('.hdr-title');
                    if (header && header.textContent !== L().title) {
                        renderPanel();
                    }
                }
            }, 1000);
        }
    };
})();
