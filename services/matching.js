const { haversineKm } = require("./geo");
const { rankWithTopsis } = require("./algorithms/topsis");
const { rankWithEquity } = require("./algorithms/equity");

/**
 * Explainable matching weights. They sum to 1.0.
 * Tune these in one place; the API returns the same numbers in `weightsUsed`.
 */
const WEIGHTS = Object.freeze({
  distance: 0.35,
  skill: 0.30,
  rating: 0.20,
  availability: 0.15
});

const MAX_KM_NORMAL = 25;
const MAX_KM_EMERGENCY = 15;
const URGENCY_BONUS_MAX = 15;
const NEW_WORKER_RATING_PRIOR = 0.70;

const SKILL_ALIASES = {
  plumber: "plumbing",
  plumbing: "plumbing",
  electrician: "electrical",
  electrical: "electrical",
  electric: "electrical",
  carpenter: "carpentry",
  carpentry: "carpentry",
  painter: "painting",
  painting: "painting",
  cleaner: "cleaning",
  cleaning: "cleaning",
  housekeeping: "cleaning",
  driver: "driving",
  driving: "driving",
  gardener: "gardening",
  gardening: "gardening",
  caregiver: "caregiving",
  caregiving: "caregiving",
  technician: "technician",
  helper: "domestic",
  domestic: "domestic"
};

function normalizeSkill(skill) {
  const key = String(skill || "").trim().toLowerCase();
  return SKILL_ALIASES[key] || key;
}

function uniqueNormalized(skills = []) {
  return [...new Set(skills.map(normalizeSkill).filter(Boolean))];
}

function skillMatchScore(requiredSkills, workerSkills) {
  const required = uniqueNormalized(requiredSkills);
  const offered = uniqueNormalized(workerSkills);

  if (required.length === 0) {
    return { score: 0.5, matched: [], note: "No required skills sent; neutral skill score 0.50" };
  }
  if (offered.length === 0) {
    return { score: 0, matched: [], note: "Worker has no listed skills" };
  }

  const offeredSet = new Set(offered);
  const matched = required.filter((s) => offeredSet.has(s));
  const union = new Set([...required, ...offered]);
  const jaccard = matched.length / union.size;
  const coverage = matched.length / required.length;
  const score = Number((0.7 * coverage + 0.3 * jaccard).toFixed(4));

  return {
    score,
    matched,
    note: matched.length
      ? `Matched ${matched.join(", ")} (${matched.length}/${required.length} required)`
      : "No overlapping skills"
  };
}

function distanceScoreFromKm(km, isEmergency) {
  const maxKm = isEmergency ? MAX_KM_EMERGENCY : MAX_KM_NORMAL;
  const score = Math.max(0, 1 - km / maxKm);
  return {
    score: Number(score.toFixed(4)),
    maxKm,
    note: isEmergency
      ? `Emergency radius ${maxKm} km; closer workers score higher`
      : `Normal radius ${maxKm} km; score hits 0 at ${maxKm} km`
  };
}

function ratingScoreFromWorker(rating, ratingCount) {
  if (!ratingCount || ratingCount <= 0) {
    return {
      score: NEW_WORKER_RATING_PRIOR,
      note: `No ratings yet; using cooperative prior ${NEW_WORKER_RATING_PRIOR} so new workers are not punished`
    };
  }
  const clamped = Math.min(5, Math.max(0, Number(rating) || 0));
  return {
    score: Number((clamped / 5).toFixed(4)),
    note: `${clamped.toFixed(2)}/5 from ${ratingCount} reviews`
  };
}

function availabilityScoreFromWorker(isAvailable) {
  if (isAvailable) {
    return { score: 1, note: "Worker is marked available" };
  }
  return { score: 0, note: "Worker is unavailable right now" };
}

function urgencyBonus(isEmergency, distanceScore) {
  if (!isEmergency) {
    return { points: 0, note: "No urgency bonus (standard booking)" };
  }
  const points = Number((URGENCY_BONUS_MAX * distanceScore).toFixed(2));
  return {
    points,
    note: `Emergency bonus up to +${URGENCY_BONUS_MAX}: nearby workers get more (${points})`
  };
}

function scoreCandidate({ booking, worker }) {
  const isEmergency = booking.urgency === "emergency";
  const km = haversineKm(
    booking.latitude,
    booking.longitude,
    worker.latitude,
    worker.longitude
  );

  const distance = distanceScoreFromKm(km, isEmergency);
  const skill = skillMatchScore(booking.requiredSkills, worker.skills);
  const rating = ratingScoreFromWorker(worker.rating, worker.ratingCount);
  const availability = availabilityScoreFromWorker(worker.isAvailable);
  const bonus = urgencyBonus(isEmergency, distance.score);

  const weighted = {
    distance: Number((WEIGHTS.distance * distance.score * 100).toFixed(2)),
    skill: Number((WEIGHTS.skill * skill.score * 100).toFixed(2)),
    rating: Number((WEIGHTS.rating * rating.score * 100).toFixed(2)),
    availability: Number((WEIGHTS.availability * availability.score * 100).toFixed(2))
  };

  const raw =
    weighted.distance +
    weighted.skill +
    weighted.rating +
    weighted.availability +
    bonus.points;
  const total = Number(Math.max(0, Math.min(100, raw)).toFixed(2));

  return {
    score: total,
    distanceKm: Number(km.toFixed(3)),
    features: {
      distance_km: Number(km.toFixed(4)),
      skill_score: skill.score,
      rating_norm: rating.score,
      available: worker.isAvailable ? 1 : 0,
      is_emergency: isEmergency ? 1 : 0,
      completed_jobs: worker.completedJobs || 0
    },
    breakdown: {
      distance: {
        km: Number(km.toFixed(3)),
        componentScore: distance.score,
        weight: WEIGHTS.distance,
        weightedPoints: weighted.distance,
        note: distance.note
      },
      skill: {
        matched: skill.matched,
        componentScore: skill.score,
        weight: WEIGHTS.skill,
        weightedPoints: weighted.skill,
        note: skill.note
      },
      rating: {
        value: worker.rating || 0,
        ratingCount: worker.ratingCount || 0,
        componentScore: rating.score,
        weight: WEIGHTS.rating,
        weightedPoints: weighted.rating,
        note: rating.note
      },
      availability: {
        isAvailable: Boolean(worker.isAvailable),
        componentScore: availability.score,
        weight: WEIGHTS.availability,
        weightedPoints: weighted.availability,
        note: availability.note
      },
      urgencyBonus: {
        applied: isEmergency,
        points: bonus.points,
        note: bonus.note
      }
    }
  };
}

function getGovernmentBadges(worker) {
  const badges = [];
  if (worker.isVerified) {
    badges.push({ id: "eshram", label: "e-Shram Verified", color: "emerald" });
  }
  const traditionalSkills = ["carpentry", "plumbing", "painting", "domestic", "gardening"];
  const hasTraditionalCraft = (worker.skills || []).some((s) => traditionalSkills.includes(normalizeSkill(s)));
  if (hasTraditionalCraft) {
    badges.push({ id: "vishwakarma", label: "PM Vishwakarma Artisan", color: "amber" });
  }
  if ((worker.rating || 0) >= 4.5 && (worker.ratingCount || 0) >= 3) {
    badges.push({ id: "master", label: "Master Craftsman", color: "blue" });
  }
  if ((worker.completedJobs || 0) < 5) {
    badges.push({ id: "equity_priority", label: "Fair Income Priority", color: "purple" });
  }
  return badges;
}

function rankWorkers(booking, workers, limit = 5, mode = "formula") {
  const required = uniqueNormalized(booking.requiredSkills);
  const scored = workers
    .filter((w) => Number.isFinite(w.latitude) && Number.isFinite(w.longitude))
    .map((worker) => {
      const result = scoreCandidate({ booking, worker });
      const badges = getGovernmentBadges(worker);
      return {
        workerId: worker._id?.toString?.() || worker.id,
        name: worker.name,
        avatar: worker.avatar || "",
        skills: worker.skills || [],
        phone: worker.phone || "",
        isVerified: Boolean(worker.isVerified),
        rating: worker.rating || 0,
        ratingCount: worker.ratingCount || 0,
        completedJobs: worker.completedJobs || 0,
        isAvailable: Boolean(worker.isAvailable),
        latitude: worker.latitude,
        longitude: worker.longitude,
        governmentBadges: badges,
        ...result
      };
    })
    .filter((row) => {
      if (required.length === 0) return true;
      return row.breakdown.skill.componentScore > 0;
    });

  let ranked = [];
  const selectedMode = String(mode).toLowerCase();

  if (selectedMode === "topsis") {
    ranked = rankWithTopsis(scored);
  } else if (selectedMode === "equity") {
    ranked = rankWithEquity(scored);
  } else if (selectedMode === "proximity") {
    ranked = [...scored].sort((a, b) => a.distanceKm - b.distanceKm);
  } else if (selectedMode === "hybrid") {
    // Government Consensus: 40% TOPSIS Pareto closeness + 30% Equity Boost + 30% Formula Score
    const topsisScored = rankWithTopsis(scored);
    const equityScored = rankWithEquity(topsisScored);
    ranked = equityScored.map((c) => {
      const topsis = c.topsisScore ?? c.score;
      const equity = c.equityScore ?? c.score;
      const hybridScore = Number((0.40 * topsis + 0.30 * equity + 0.30 * c.score).toFixed(2));
      return {
        ...c,
        score: hybridScore,
        hybridScore,
        algorithmNote: `Government Consensus Blend (40% TOPSIS, 30% Equity Balancing, 30% Proximity/Skill)`
      };
    }).sort((a, b) => b.score - a.score);
  } else {
    // Default standard formula
    ranked = scored.sort((a, b) => b.score - a.score);
  }

  return ranked.slice(0, limit).map((row, index) => ({ rank: index + 1, ...row }));
}

function formulaDescription() {
  return {
    equation:
      "score = 100 × (0.35×distance + 0.30×skill + 0.20×rating + 0.15×availability) + urgencyBonus",
    weights: WEIGHTS,
    supportedAlgorithms: [
      {
        id: "hybrid",
        name: "Government Consensus Blend",
        description: "Equitably weights Pareto efficiency (TOPSIS 40%), worker welfare (Equity 30%), and geo-skill proximity (30%).",
        idealFor: "Public cooperative societies and inclusive civic dispatch"
      },
      {
        id: "topsis",
        name: "TOPSIS Multi-Criteria Decision Analysis",
        description: "Evaluates geometric distance to positive-ideal and negative-ideal solutions across 5 criteria.",
        idealFor: "Objective, mathematically optimal tender and task allocation"
      },
      {
        id: "equity",
        name: "Affirmative Income Equity & Anti-Monopoly",
        description: "Crumbs-to-crust distribution boosting under-served and new artisans while penalizing monopolistic gig-hoarding.",
        idealFor: "e-Shram and PM Vishwakarma affirmative action"
      },
      {
        id: "proximity",
        name: "Emergency Proximity-First",
        description: "Minimizes transit time and carbon footprint via geodesic Haversine distance.",
        idealFor: "Urgent leaks, electrical fires, and medical emergencies"
      },
      {
        id: "ml",
        name: "Random Forest Machine Learning Ranker",
        description: "Scikit-Learn trained ensemble predicting match quality from historical gig completions.",
        idealFor: "Data-rich historical optimization"
      }
    ],
    distance: {
      method: "Haversine (km)",
      normal: `score = max(0, 1 - km/${MAX_KM_NORMAL})`,
      emergency: `score = max(0, 1 - km/${MAX_KM_EMERGENCY})`
    },
    skill: "0.7 × required-skill coverage + 0.3 × Jaccard overlap (after aliasing plumber→plumbing, etc.)",
    rating: `rating/5, or prior ${NEW_WORKER_RATING_PRIOR} when the worker has zero reviews`,
    availability: "1 if available, else 0",
    urgencyBonus: `emergency only: +${URGENCY_BONUS_MAX} × distanceScore (max +${URGENCY_BONUS_MAX})`,
    clamp: "final score clamped to [0, 100]"
  };
}

module.exports = {
  WEIGHTS,
  MAX_KM_NORMAL,
  MAX_KM_EMERGENCY,
  URGENCY_BONUS_MAX,
  haversineKm,
  normalizeSkill,
  skillMatchScore,
  scoreCandidate,
  rankWorkers,
  formulaDescription,
  rankWithTopsis,
  rankWithEquity,
  getGovernmentBadges
};
