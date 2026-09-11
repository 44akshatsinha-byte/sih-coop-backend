/**
 * AI Dynamic Fair-Pricing Engine & NLP Task Auto-Tagger
 * Standardized on Government Public Sector Schedules (DSR - District Schedule of Rates)
 * Supports natural language input in both English and Hindi.
 */

const { normalizeSkill } = require("./matching");

// Category keyword mappings with bilingual support (English & Hindi transliteration)
const TAXONOMY = [
  {
    category: "plumbing",
    skills: ["plumbing", "technician"],
    baseLaborRate: 350,
    emergencyLaborRate: 550,
    typicalMaterials: 150,
    keywords: [
      "pipe", "leak", "leaking", "tap", "sink", "faucet", "drain", "drainage",
      "bathroom", "toilet", "flush", "water", "nal", "pani", "paani", "tonti",
      "geyser", "shower", "motor", "plumber"
    ]
  },
  {
    category: "electrical",
    skills: ["electrical", "technician"],
    baseLaborRate: 400,
    emergencyLaborRate: 600,
    typicalMaterials: 200,
    keywords: [
      "electric", "switch", "short circuit", "spark", "wiring", "wire", "mcb",
      "light", "fan", "bulb", "socket", "power", "fuse", "bijli", "tarr",
      "inverter", "current", "voltage", "plug"
    ]
  },
  {
    category: "carpentry",
    skills: ["carpentry"],
    baseLaborRate: 450,
    emergencyLaborRate: 650,
    typicalMaterials: 250,
    keywords: [
      "wood", "door", "window", "furniture", "table", "chair", "lock", "hinge",
      "cupboard", "almirah", "drawer", "plywood", "bed", "darwaza", "lakdi", "khati"
    ]
  },
  {
    category: "painting",
    skills: ["painting"],
    baseLaborRate: 500,
    emergencyLaborRate: 700,
    typicalMaterials: 400,
    keywords: [
      "paint", "painting", "wall", "color", "colour", "putty", "primer",
      "distemper", "whitewash", "rang", "deewar"
    ]
  },
  {
    category: "cleaning",
    skills: ["cleaning", "domestic"],
    baseLaborRate: 300,
    emergencyLaborRate: 450,
    typicalMaterials: 100,
    keywords: [
      "clean", "cleaning", "sweep", "mop", "dusting", "wash", "sofa clean",
      "deep clean", "bathroom cleaning", "safai", "pochha", "jhadu", "kachra"
    ]
  },
  {
    category: "technician",
    skills: ["technician", "electrical"],
    baseLaborRate: 450,
    emergencyLaborRate: 650,
    typicalMaterials: 300,
    keywords: [
      "ac", "refrigerator", "fridge", "microwave", "washing machine", "ro",
      "water purifier", "cooler", "tv", "appliance", "repair", "service"
    ]
  },
  {
    category: "gardening",
    skills: ["gardening"],
    baseLaborRate: 350,
    emergencyLaborRate: 500,
    typicalMaterials: 150,
    keywords: [
      "garden", "grass", "plant", "tree", "pruning", "pot", "lawn",
      "bagicha", "paudha", "gamla", "mali"
    ]
  }
];

const EMERGENCY_KEYWORDS = [
  "urgent", "urgently", "emergency", "immediately", "burst", "fire", "spark",
  "flooding", "flood", "overflowing", "short circuit", "abhi", "turant",
  "jaldi", "khatra", "shock"
];

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
    category: "general",
    skills: ["domestic", "general"],
    baseLaborRate: 300,
    emergencyLaborRate: 450,
    typicalMaterials: 100
  };

  // 2. Detect Urgency
  const isEmergency = EMERGENCY_KEYWORDS.some((kw) => text.includes(kw));
  const urgency = isEmergency ? "emergency" : "normal";

  // 3. Government DSR Scheduled Rate Calculation
  const labor = isEmergency ? matchedCategory.emergencyLaborRate : matchedCategory.baseLaborRate;
  const materials = text.includes("parts") || text.includes("material") || text.includes("replacement")
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

  // Title generation
  const words = description.trim().split(/\s+/).slice(0, 6).join(" ");
  const generatedTitle = words ? `${words}...` : `${matchedCategory.category} Assistance`;

  return {
    success: true,
    detected: {
      category: matchedCategory.category,
      urgency,
      requiredSkills: matchedCategory.skills.map(normalizeSkill),
      confidence: highestScore > 0 ? Math.min(0.98, 0.60 + highestScore * 0.12) : 0.50
    },
    suggestedDraft: {
      title: generatedTitle,
      category: matchedCategory.category,
      urgency,
      estimatedAmount: subtotal,
      estimatedDuration: isEmergency ? "1 - 2 hours" : "2 - 3 hours"
    },
    fairPricingBreakdown: {
      standardLaborFee: baseServiceFee,
      emergencySurcharge,
      estimatedMaterials: materialAllowance,
      totalRecommendedAmount: subtotal,
      currency: "INR",
      dsrStandard: "Cooperative Schedule of Rates (CSR-2026)",
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
    explainability: `Rate calculated under District Schedule of Rates (CSR-2026). ${isEmergency ? "Emergency response surcharge included." : "Standard civil trade rate applied."} 85% guaranteed to artisan, 15% deposited into worker welfare trust.`
  };
}

module.exports = {
  analyzeTaskNLP,
  TAXONOMY
};
