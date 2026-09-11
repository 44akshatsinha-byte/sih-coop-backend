/**
 * AI Dynamic Fair-Pricing Engine & NLP Task Auto-Tagger
 * Standardized on Government Public Sector Schedules (CSR/DSR - District Schedule of Rates)
 * Supports natural language input in both English, Hindi, and Hinglish.
 */

const { normalizeSkill } = require("./matching");

// Category keyword mappings with rich bilingual support (English & Hindi transliteration)
const TAXONOMY = [
  {
    category: "plumbing",
    label: "Plumbing & Sanitary",
    skills: ["plumbing", "technician"],
    baseLaborRate: 350,
    emergencyLaborRate: 550,
    typicalMaterials: 150,
    keywords: [
      "pipe", "leak", "leaking", "leakage", "tap", "sink", "faucet", "drain", "drainage",
      "bathroom", "toilet", "flush", "water", "nal", "pani", "paani", "tonti",
      "geyser", "shower", "motor", "plumber", "tanki", "seepage", "overflow", "basin",
      "commode", "cistern", "tank"
    ]
  },
  {
    category: "electrical",
    label: "Electrical & Power",
    skills: ["electrical", "technician"],
    baseLaborRate: 400,
    emergencyLaborRate: 600,
    typicalMaterials: 200,
    keywords: [
      "electric", "switch", "short circuit", "spark", "sparking", "wiring", "wire", "mcb",
      "light", "fan", "bulb", "socket", "power", "fuse", "bijli", "tarr",
      "inverter", "current", "voltage", "plug", "tripping", "board", "tubelight", "choke"
    ]
  },
  {
    category: "carpentry",
    label: "Carpentry & Woodwork",
    skills: ["carpentry"],
    baseLaborRate: 450,
    emergencyLaborRate: 650,
    typicalMaterials: 250,
    keywords: [
      "wood", "door", "window", "furniture", "table", "chair", "lock", "hinge",
      "cupboard", "almirah", "drawer", "plywood", "bed", "darwaza", "lakdi", "khati",
      "chabi", "kundi", "handle", "latch", "sliding", "wardrobe"
    ]
  },
  {
    category: "painting",
    label: "Painting & Whitewashing",
    skills: ["painting"],
    baseLaborRate: 500,
    emergencyLaborRate: 700,
    typicalMaterials: 400,
    keywords: [
      "paint", "painting", "wall", "color", "colour", "putty", "primer",
      "distemper", "whitewash", "rang", "deewar", "texture", "varnish", "stain", "touchup"
    ]
  },
  {
    category: "cleaning",
    label: "Deep Cleaning & Sanitation",
    skills: ["cleaning", "domestic"],
    baseLaborRate: 300,
    emergencyLaborRate: 450,
    typicalMaterials: 100,
    keywords: [
      "clean", "cleaning", "sweep", "mop", "dusting", "wash", "sofa clean", "carpet",
      "deep clean", "bathroom cleaning", "safai", "pochha", "jhadu", "kachra", "kitchen clean",
      "water tank clean"
    ]
  },
  {
    category: "appliance",
    label: "Appliance & AC Repair",
    skills: ["technician", "electrical"],
    baseLaborRate: 450,
    emergencyLaborRate: 650,
    typicalMaterials: 300,
    keywords: [
      "ac", "air conditioner", "refrigerator", "fridge", "microwave", "washing machine", "ro",
      "water purifier", "cooler", "tv", "appliance", "repair", "service", "cooling", "gas refill",
      "compressor", "filter"
    ]
  },
  {
    category: "masonry",
    label: "Masonry & Civil Repair",
    skills: ["masonry"],
    baseLaborRate: 500,
    emergencyLaborRate: 750,
    typicalMaterials: 350,
    keywords: [
      "cement", "brick", "wall break", "plaster", "tile", "grouting", "flooring", "stone",
      "crack", "rajmistri", "pathar", "concrete", "slab"
    ]
  },
  {
    category: "gardening",
    label: "Gardening & Landscape",
    skills: ["gardening"],
    baseLaborRate: 350,
    emergencyLaborRate: 500,
    typicalMaterials: 150,
    keywords: [
      "garden", "grass", "plant", "tree", "pruning", "pot", "lawn",
      "bagicha", "paudha", "gamla", "mali", "grass cutting", "weed"
    ]
  }
];

const EMERGENCY_KEYWORDS = [
  "urgent", "urgently", "emergency", "immediately", "burst", "fire", "spark", "sparking",
  "flooding", "flood", "overflowing", "short circuit", "abhi", "turant",
  "jaldi", "khatra", "shock", "current lag raha", "tripping repeatedly"
];

function generateCleanTitle(text, categoryMeta, isEmergency) {
  const clean = text.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, " ").trim();
  const words = clean.split(/\s+/).filter(Boolean);

  // Determine an intelligent descriptive title
  const prefix = isEmergency ? "🚨 Urgent" : "🔧";
  const catLabel = categoryMeta.label.split("&")[0].trim();

  // Try extracting the core issue
  if (words.length <= 6 && words.length > 0) {
    const capitalized = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    return `${prefix} ${capitalized}`;
  }

  // Pick prominent descriptive words
  const keyAction = words.slice(0, 5).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  return `${prefix} ${catLabel}: ${keyAction}`;
}

function analyzeTaskNLP(description = "") {
  const text = String(description).toLowerCase();
  
  // 1. Detect Category by keyword frequency
  let bestMatch = null;
  let highestScore = 0;

  for (const item of TAXONOMY) {
    let score = 0;
    for (const kw of item.keywords) {
      if (text.includes(kw)) {
        score += 1;
      }
    }
    if (score > highestScore) {
      highestScore = score;
      bestMatch = item;
    }
  }

  const matchedCategory = bestMatch || {
    category: "other",
    label: "General Maintenance",
    skills: ["domestic", "general"],
    baseLaborRate: 350,
    emergencyLaborRate: 500,
    typicalMaterials: 100
  };

  // 2. Detect Urgency
  const isEmergency = EMERGENCY_KEYWORDS.some((kw) => text.includes(kw));
  const urgency = isEmergency ? "emergency" : "normal";

  // 3. Government DSR Scheduled Rate Calculation
  const labor = isEmergency ? matchedCategory.emergencyLaborRate : matchedCategory.baseLaborRate;
  const materials = text.includes("parts") || text.includes("material") || text.includes("replacement") || text.includes("naya")
    ? matchedCategory.typicalMaterials * 1.5
    : matchedCategory.typicalMaterials;
  
  const baseServiceFee = labor;
  const emergencySurcharge = isEmergency ? 150 : 0;
  const materialAllowance = Math.round(materials);
  const subtotal = baseServiceFee + emergencySurcharge + materialAllowance;

  // Cooperative 85/15 Financial Division
  const workerPayout = Math.round(subtotal * 0.85);
  const cooperativeWelfareDeduction = subtotal - workerPayout;

  // Split of the 15% cooperative pool
  const insuranceReserve = Math.round(cooperativeWelfareDeduction * 0.60);
  const toolSubsidyFund = Math.round(cooperativeWelfareDeduction * 0.25);
  const administrativeReserve = cooperativeWelfareDeduction - insuranceReserve - toolSubsidyFund;

  const generatedTitle = generateCleanTitle(description, matchedCategory, isEmergency);

  return {
    success: true,
    detected: {
      category: matchedCategory.category,
      categoryLabel: matchedCategory.label,
      urgency,
      isEmergency,
      requiredSkills: matchedCategory.skills.map(normalizeSkill),
      confidence: highestScore > 0 ? Math.min(0.98, 0.65 + highestScore * 0.10) : 0.50
    },
    suggestedDraft: {
      title: generatedTitle,
      category: matchedCategory.category,
      urgency,
      estimatedAmount: subtotal,
      baseLaborFee: baseServiceFee,
      emergencySurcharge,
      materialAllowance,
      estimatedDuration: isEmergency ? "1 - 2 hours" : "2 - 3 hours"
    },
    fairPricingBreakdown: {
      standardLaborFee: baseServiceFee,
      emergencySurcharge,
      estimatedMaterials: materialAllowance,
      totalRecommendedAmount: subtotal,
      currency: "INR",
      dsrStandard: "Government Cooperative Schedule of Rates (CSR-2026)",
      cooperativeDistribution: {
        workerEarnings: workerPayout,
        cooperativeWelfarePool: cooperativeWelfareDeduction,
        welfareFundAllocations: {
          healthAndAccidentInsurance: insuranceReserve,
          toolCreditSubsidy: toolSubsidyFund,
          unionOperationsReserve: administrativeReserve
        }
      }
    },
    explainability: `Rate calculated under District Schedule of Rates (CSR-2026). ${isEmergency ? "Emergency response rush surcharge included (+₹150)." : "Standard civil trade rate applied."} 85% guaranteed directly to worker, 15% allocated to cooperative social security.`
  };
}

module.exports = {
  analyzeTaskNLP,
  TAXONOMY
};

