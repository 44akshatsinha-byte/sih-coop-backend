/**
 * Technique for Order Preference by Similarity to Ideal Solution (TOPSIS)
 * Standard Multi-Criteria Decision Making (MCDM) algorithm tailored for public sector dispatch.
 * Evaluates candidate workers across 5 balanced criteria:
 * 1. Distance (Cost: lower is better)
 * 2. Skill Match (Benefit: higher is better)
 * 3. Worker Rating (Benefit: higher is better)
 * 4. Experience / Completed Jobs (Benefit: higher is better)
 * 5. Government Verification Status (Benefit: e-Shram / PM Vishwakarma verified = 1, else 0.5)
 */

const TOPSIS_WEIGHTS = Object.freeze({
  distance: 0.30,
  skill: 0.25,
  rating: 0.20,
  verification: 0.15,
  experience: 0.10
});

function rankWithTopsis(candidates = []) {
  if (!candidates.length) return [];
  if (candidates.length === 1) {
    return [{
      ...candidates[0],
      topsisScore: 100,
      relativeCloseness: 1.0,
      algorithmNote: "Sole eligible candidate satisfies all required criteria"
    }];
  }

  // 1. Build Decision Matrix (m workers x 5 criteria)
  // Distance is cost; others are benefits.
  const matrix = candidates.map((c) => {
    const dist = Math.max(0.1, Number(c.distanceKm) || 0.1);
    const skill = Math.max(0.01, Number(c.breakdown?.skill?.componentScore ?? c.features?.skill_score ?? 0.5));
    const rating = Math.max(0.1, Number(c.rating || (c.features?.rating_norm ? c.features.rating_norm * 5 : 3.5)));
    const verification = c.isVerified ? 1.0 : 0.5;
    const exp = Math.log1p(Math.max(0, Number(c.completedJobs || 0))); // Log scale to prevent monopoly

    return {
      worker: c,
      values: {
        distance: dist,
        skill,
        rating,
        verification,
        experience: exp
      }
    };
  });

  // 2. Vector Normalization: r_ij = x_ij / sqrt(sum(x_kj^2))
  const criteria = ["distance", "skill", "rating", "verification", "experience"];
  const sumSquares = {};
  for (const crit of criteria) {
    const sumSq = matrix.reduce((acc, row) => acc + Math.pow(row.values[crit], 2), 0);
    sumSquares[crit] = Math.sqrt(sumSq) || 1;
  }

  // 3. Weighted Normalized Matrix: v_ij = w_j * r_ij
  const weightedMatrix = matrix.map((row) => {
    const weightedValues = {};
    for (const crit of criteria) {
      const normalized = row.values[crit] / sumSquares[crit];
      weightedValues[crit] = normalized * TOPSIS_WEIGHTS[crit];
    }
    return {
      worker: row.worker,
      weightedValues
    };
  });

  // 4. Positive Ideal (A+) and Negative Ideal (A-) Solutions
  // Distance is a COST criterion (minimum is ideal)
  // Others are BENEFIT criteria (maximum is ideal)
  const idealPositive = {};
  const idealNegative = {};

  for (const crit of criteria) {
    const vals = weightedMatrix.map((r) => r.weightedValues[crit]);
    if (crit === "distance") {
      idealPositive[crit] = Math.min(...vals);
      idealNegative[crit] = Math.max(...vals);
    } else {
      idealPositive[crit] = Math.max(...vals);
      idealNegative[crit] = Math.min(...vals);
    }
  }

  // 5. Calculate Euclidean Separations (S+ and S-) and Relative Closeness (C_i)
  const scored = weightedMatrix.map((row) => {
    let dPlusSq = 0;
    let dMinusSq = 0;

    for (const crit of criteria) {
      const v = row.weightedValues[crit];
      dPlusSq += Math.pow(v - idealPositive[crit], 2);
      dMinusSq += Math.pow(v - idealNegative[crit], 2);
    }

    const sPlus = Math.sqrt(dPlusSq);
    const sMinus = Math.sqrt(dMinusSq);
    const closeness = sPlus + sMinus === 0 ? 0.5 : sMinus / (sPlus + sMinus);
    const topsisScore = Number((closeness * 100).toFixed(2));

    return {
      ...row.worker,
      topsisScore,
      relativeCloseness: Number(closeness.toFixed(4)),
      algorithmNote: `TOPSIS Pareto efficiency index: ${(closeness * 100).toFixed(1)}% (Distance to Ideal: ${sPlus.toFixed(3)}, Anti-Ideal: ${sMinus.toFixed(3)})`
    };
  });

  return scored.sort((a, b) => b.topsisScore - a.topsisScore);
}

module.exports = {
  TOPSIS_WEIGHTS,
  rankWithTopsis
};
