const NEGATIVE_KEYWORDS = [
  "scam",
  "fraud",
  "fake",
  "cheat",
  "cheated",
  "stole",
  "stolen",
  "abuse",
  "abusive",
  "horrible",
  "terrible",
  "worst",
  "useless",
  "never again",
  "don't hire",
  "do not hire",
  "thief",
  "harass"
];

const BURST_WINDOW_MS = 24 * 60 * 60 * 1000;
const BURST_THRESHOLD = 3;

function findNegativeKeywords(text = "") {
  const hay = String(text).toLowerCase();
  return NEGATIVE_KEYWORDS.filter((kw) => hay.includes(kw));
}

/**
 * Flags suspicious reviews: 5★ with negative language, or a burst of reviews
 * on the same worker within 24 hours.
 */
async function evaluateReviewFlag(Gig, { gig, workerId, rating, text }) {
  const reasons = [];

  if (Number(rating) === 5) {
    const hits = findNegativeKeywords(text);
    if (hits.length) {
      reasons.push(`five_star_negative_language:${hits.join(",")}`);
    }
  }

  if (workerId) {
    const since = new Date(Date.now() - BURST_WINDOW_MS);
    const recentCount = await Gig.countDocuments({
      worker: workerId,
      "review.createdAt": { $gte: since },
      _id: { $ne: gig._id }
    });
    if (recentCount + 1 >= BURST_THRESHOLD) {
      reasons.push(`review_burst:${recentCount + 1}_in_24h`);
    }
  }

  if (!reasons.length) {
    return {
      flagged: false,
      reasons: [],
      status: "clear"
    };
  }

  return {
    flagged: true,
    reasons,
    status: "open"
  };
}

module.exports = { evaluateReviewFlag, findNegativeKeywords };
