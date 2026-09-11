const { haversineKm } = require("../services/geo");
const { scoreCandidate, rankWorkers, skillMatchScore } = require("../services/matching");

describe("haversineKm", () => {
  test("same point is 0 km", () => {
    expect(haversineKm(28.6139, 77.209, 28.6139, 77.209)).toBeCloseTo(0, 6);
  });

  test("Delhi to Noida is roughly 20 km", () => {
    const km = haversineKm(28.6139, 77.209, 28.5355, 77.391);
    expect(km).toBeGreaterThan(15);
    expect(km).toBeLessThan(30);
  });
});

describe("skillMatchScore", () => {
  test("aliases plumber to plumbing", () => {
    const result = skillMatchScore(["plumbing"], ["plumber"]);
    expect(result.score).toBeGreaterThan(0.9);
    expect(result.matched).toContain("plumbing");
  });

  test("no overlap is zero", () => {
    expect(skillMatchScore(["electrical"], ["gardening"]).score).toBe(0);
  });
});

describe("scoreCandidate", () => {
  const booking = {
    latitude: 28.6139,
    longitude: 77.209,
    requiredSkills: ["plumbing"],
    urgency: "normal"
  };

  const nearbyPlumber = {
    latitude: 28.62,
    longitude: 77.21,
    skills: ["plumbing"],
    rating: 4.8,
    ratingCount: 40,
    isAvailable: true,
    completedJobs: 50
  };

  const farPainter = {
    latitude: 19.076,
    longitude: 72.8777,
    skills: ["painting"],
    rating: 5,
    ratingCount: 100,
    isAvailable: true,
    completedJobs: 80
  };

  test("nearby matching worker beats far mismatch", () => {
    const near = scoreCandidate({ booking, worker: nearbyPlumber });
    const far = scoreCandidate({
      booking: { ...booking, requiredSkills: ["painting"] },
      worker: farPainter
    });
    expect(near.score).toBeGreaterThan(far.score);
    expect(near.breakdown.distance.weightedPoints).toBeGreaterThan(0);
  });

  test("emergency adds a nearby bonus you can point to on stage", () => {
    const normal = scoreCandidate({ booking, worker: nearbyPlumber });
    const emergency = scoreCandidate({
      booking: { ...booking, urgency: "emergency" },
      worker: nearbyPlumber
    });
    expect(emergency.breakdown.urgencyBonus.points).toBeGreaterThan(0);
    expect(emergency.score).toBeGreaterThan(normal.score);
  });

  test("unavailable worker loses the availability component", () => {
    const available = scoreCandidate({ booking, worker: nearbyPlumber });
    const busy = scoreCandidate({
      booking,
      worker: { ...nearbyPlumber, isAvailable: false }
    });
    expect(available.score - busy.score).toBeCloseTo(15, 0);
  });
});

describe("rankWorkers", () => {
  test("returns at most 5 ranked candidates with breakdowns", () => {
    const booking = {
      latitude: 28.6139,
      longitude: 77.209,
      requiredSkills: ["plumbing"],
      urgency: "emergency"
    };
    const workers = Array.from({ length: 8 }, (_, i) => ({
      _id: `w${i}`,
      name: `Worker ${i}`,
      latitude: 28.6139 + i * 0.01,
      longitude: 77.209,
      skills: ["plumbing"],
      rating: 4,
      ratingCount: 10,
      isAvailable: true,
      completedJobs: i
    }));

    const ranked = rankWorkers(booking, workers, 5);
    expect(ranked).toHaveLength(5);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[4].score);
    expect(ranked[0].breakdown.urgencyBonus.applied).toBe(true);
  });
});
