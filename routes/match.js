const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Gig = require("../models/gig");
const { authMiddleware, requireRole } = require("../middleware/authMiddleware");
const { rankWorkers, formulaDescription } = require("../services/matching");
const { modelExists, predictMatchQuality } = require("../services/mlRanker");
const { parseUrgency, parseLocationPoint, coordsFromPoint } = require("../services/location");

function toWorkerPayload(user) {
  return {
    _id: user._id,
    name: user.name,
    avatar: user.avatar || "",
    skills: user.skills,
    phone: user.phone,
    isVerified: user.isVerified,
    latitude: user.latitude,
    longitude: user.longitude,
    rating: user.rating,
    ratingCount: user.ratingCount,
    isAvailable: user.isAvailable,
    completedJobs: user.completedJobs
  };
}

router.get("/formula", (req, res) => {
  res.json({
    success: true,
    data: formulaDescription()
  });
});

router.post("/", authMiddleware, requireRole("customer", "admin"), async (req, res) => {
  try {
    const {
      gigId,
      latitude,
      longitude,
      requiredSkills,
      category,
      urgency,
      limit,
      mode
    } = req.body || {};

    let bookingLat = latitude;
    let bookingLng = longitude;
    let skills = Array.isArray(requiredSkills) ? requiredSkills : [];
    let bookingUrgency = parseUrgency(urgency);

    let currentGig = null;
    if (gigId) {
      currentGig = await Gig.findById(gigId).populate("proposals.worker", "name email avatar skills phone isVerified rating ratingCount completedJobs");
      if (!currentGig) {
        return res.status(404).json({ success: false, message: "Gig not found" });
      }
      if (!skills.length && currentGig.category && currentGig.category !== "general") {
        skills = [currentGig.category];
      }
      if (urgency == null) {
        bookingUrgency = parseUrgency(currentGig.urgency);
      }
      const stored = coordsFromPoint(currentGig.locationPoint);
      if (stored && (bookingLat == null || bookingLng == null)) {
        bookingLat = stored.latitude;
        bookingLng = stored.longitude;
      }
    }

    if (!skills.length && category) {
      skills = [category];
    }

    const bodyPoint = parseLocationPoint({ latitude: bookingLat, longitude: bookingLng });
    if (bodyPoint) {
      bookingLat = bodyPoint.coordinates[1];
      bookingLng = bodyPoint.coordinates[0];
    } else {
      bookingLat = Number(bookingLat);
      bookingLng = Number(bookingLng);
    }

    if (!Number.isFinite(bookingLat) || !Number.isFinite(bookingLng)) {
      return res.status(400).json({
        success: false,
        message: "latitude and longitude are required numbers (WGS84)"
      });
    }

    if (bookingLat < -90 || bookingLat > 90 || bookingLng < -180 || bookingLng > 180) {
      return res.status(400).json({
        success: false,
        message: "latitude must be [-90, 90] and longitude must be [-180, 180]"
      });
    }

    const topN = Math.min(10, Math.max(1, parseInt(limit, 10) || 5));
    const validModes = ["hybrid", "topsis", "equity", "proximity", "formula", "ml"];
    const inputMode = String(mode || "hybrid").toLowerCase();
    const rankMode = validModes.includes(inputMode) ? inputMode : "hybrid";
    const availableOnly = String(req.body.availableOnly || "true").toLowerCase() !== "false";

    const workerFilter = {
      role: "worker",
      latitude: { $ne: null },
      longitude: { $ne: null }
    };
    if (availableOnly) {
      workerFilter.isAvailable = true;
    }

    const workers = await User.find(workerFilter).select(
      "name avatar skills phone isVerified latitude longitude rating ratingCount isAvailable completedJobs"
    );

    const booking = {
      latitude: bookingLat,
      longitude: bookingLng,
      requiredSkills: skills,
      urgency: bookingUrgency
    };

    const ranked = rankWorkers(booking, workers.map(toWorkerPayload), Math.max(topN, 20), rankMode);

    let candidates = ranked.slice(0, topN);
    let mlMeta = { used: false, modelLoaded: modelExists() };

    if (rankMode === "ml") {
      try {
        const prediction = await predictMatchQuality(ranked.map((row) => row.features));
        const scores = prediction.scores || [];
        candidates = ranked
          .map((row, i) => ({
            ...row,
            mlScore: Number((scores[i] ?? row.score).toFixed(2))
          }))
          .sort((a, b) => b.mlScore - a.mlScore)
          .slice(0, topN)
          .map((row, index) => ({ ...row, rank: index + 1 }));
        mlMeta = {
          used: true,
          modelLoaded: true,
          featureImportances: prediction.feature_importances || null
        };
      } catch (err) {
        return res.status(503).json({
          success: false,
          message: err.code === "MODEL_MISSING"
            ? err.message
            : "ML ranker failed; use mode=formula or train the model",
          error: process.env.NODE_ENV === "development" ? err.message : undefined
        });
      }
    }

    res.json({
      success: true,
      mode: rankMode,
      count: candidates.length,
      booking: {
        latitude: bookingLat,
        longitude: bookingLng,
        requiredSkills: skills,
        urgency: bookingUrgency
      },
      formula: formulaDescription(),
      ml: mlMeta,
      gig: currentGig ? {
        _id: currentGig._id,
        title: currentGig.title,
        amount: currentGig.amount,
        baseAmount: currentGig.baseAmount,
        emergencyFee: currentGig.emergencyFee,
        materialCost: currentGig.materialCost,
        equipmentCost: currentGig.equipmentCost || 0,
        equipment: currentGig.equipment || [],
        urgency: currentGig.urgency,
        category: currentGig.category,
        status: currentGig.status
      } : null,
      proposals: currentGig ? (currentGig.proposals || []) : [],
      data: candidates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error matching workers",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

module.exports = router;
