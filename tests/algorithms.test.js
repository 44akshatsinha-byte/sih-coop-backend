const { rankWithTopsis, TOPSIS_WEIGHTS } = require("../services/algorithms/topsis");
const { rankWithEquity } = require("../services/algorithms/equity");
const { analyzeTaskNLP } = require("../services/aiPricing");
const { rankWorkers } = require("../services/matching");

describe("TOPSIS Multi-Criteria Decision Algorithm", () => {
  const candidates = [
    {
      workerId: "w1",
      name: "Worker Close But Lower Rating",
      distanceKm: 2.0,
      rating: 3.8,
      completedJobs: 10,
      isVerified: true,
      breakdown: { skill: { componentScore: 0.9 } }
    },
    {
      workerId: "w2",
      name: "Worker Far With High Rating",
      distanceKm: 18.0,
      rating: 4.9,
      completedJobs: 80,
      isVerified: false,
      breakdown: { skill: { componentScore: 0.7 } }
    }
  ];

  test("calculates relative closeness to ideal solution", () => {
    const results = rankWithTopsis(candidates);
    expect(results).toHaveLength(2);
    expect(results[0].topsisScore).toBeGreaterThanOrEqual(0);
    expect(results[0].topsisScore).toBeLessThanOrEqual(100);
    expect(results[0].relativeCloseness).toBeDefined();
    expect(results[0].algorithmNote).toContain("TOPSIS Pareto efficiency");
  });

  test("handles single candidate edge case", () => {
    const single = rankWithTopsis([candidates[0]]);
    expect(single[0].topsisScore).toBe(100);
    expect(single[0].relativeCloseness).toBe(1.0);
  });
});

describe("Government Affirmative Income Equity Algorithm", () => {
  const workers = [
    {
      workerId: "w1",
      name: "Experienced Monopolist",
      score: 85,
      completedJobs: 60,
      isVerified: true
    },
    {
      workerId: "w2",
      name: "New Verified Artisan",
      score: 70,
      completedJobs: 2,
      isVerified: true
    }
  ];

  test("applies positive affirmative boost to under-served artisan", () => {
    const ranked = rankWithEquity(workers);
    const newArtisan = ranked.find((w) => w.workerId === "w2");
    const veteran = ranked.find((w) => w.workerId === "w1");

    expect(newArtisan.equityBreakdown.equityBoost).toBeGreaterThan(0);
    expect(newArtisan.equityScore).toBeGreaterThan(newArtisan.equityBreakdown.baseScore);
    expect(veteran.equityBreakdown.equityBoost).toBeLessThanOrEqual(0);
  });
});

describe("AI Dynamic Fair-Pricing & NLP Task Auto-Tagger", () => {
  test("analyzes English plumbing emergency", () => {
    const res = analyzeTaskNLP("Kitchen pipe burst, water leaking urgently all over bathroom floor");
    expect(res.success).toBe(true);
    expect(res.detected.category).toBe("plumbing");
    expect(res.detected.urgency).toBe("emergency");
    expect(res.fairPricingBreakdown.totalRecommendedAmount).toBeGreaterThan(500);
    expect(res.fairPricingBreakdown.cooperativeDistribution.welfareFundAllocations.healthAndAccidentInsurance).toBeGreaterThan(0);
  });

  test("analyzes Hindi description", () => {
    const res = analyzeTaskNLP("nal se paani tapak raha hai kitchen me turant theek karna hai");
    expect(res.success).toBe(true);
    expect(res.detected.category).toBe("plumbing");
    expect(res.detected.urgency).toBe("emergency");
  });

  test("analyzes electrical task", () => {
    const res = analyzeTaskNLP("main bedroom light switch and fan short circuit wiring problem");
    expect(res.success).toBe(true);
    expect(res.detected.category).toBe("electrical");
  });
});

describe("Multi-Algorithm Selection in Matching Service", () => {
  const booking = {
    latitude: 28.6139,
    longitude: 77.2090,
    requiredSkills: ["plumbing"],
    urgency: "normal"
  };

  const pool = [
    {
      id: "p1",
      name: "Ramesh Plumber",
      latitude: 28.62,
      longitude: 77.21,
      skills: ["plumbing"],
      rating: 4.8,
      ratingCount: 15,
      isAvailable: true,
      completedJobs: 2,
      isVerified: true
    },
    {
      id: "p2",
      name: "Suresh Plumber",
      latitude: 28.65,
      longitude: 77.23,
      skills: ["plumbing"],
      rating: 4.6,
      ratingCount: 50,
      isAvailable: true,
      completedJobs: 45,
      isVerified: false
    }
  ];

  test("supports hybrid, topsis, and equity modes", () => {
    const hybrid = rankWorkers(booking, pool, 2, "hybrid");
    const topsis = rankWorkers(booking, pool, 2, "topsis");
    const equity = rankWorkers(booking, pool, 2, "equity");

    expect(hybrid).toHaveLength(2);
    expect(topsis).toHaveLength(2);
    expect(equity).toHaveLength(2);

    expect(hybrid[0].governmentBadges).toBeDefined();
    expect(topsis[0].topsisScore).toBeDefined();
    expect(equity[0].equityScore).toBeDefined();
  });
});
