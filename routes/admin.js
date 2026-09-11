const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Gig = require("../models/gig");
const { authMiddleware, requireRole } = require("../middleware/authMiddleware");
const { buildForecast } = require("../services/forecast");

router.get("/forecast", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const days = Number(req.query.days) === 30 ? 30 : 7;
    const data = await buildForecast({ days });
    res.json({ success: true, ...data });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error building forecast",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

router.get("/verification-queue", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const workers = await User.find({
      role: "worker",
      verificationStatus: "pending"
    }).select("name email phone skills avatar isVerified verificationStatus verificationNote latitude longitude rating ratingCount createdAt");

    res.json({ success: true, count: workers.length, data: workers });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error fetching verification queue" });
  }
});

router.put("/workers/:id/verify", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const status = String(req.body?.status || "").toLowerCase();
    if (!["verified", "rejected", "pending"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "status must be pending, verified, or rejected"
      });
    }

    const worker = await User.findById(req.params.id);
    if (!worker || worker.role !== "worker") {
      return res.status(404).json({ success: false, message: "Worker not found" });
    }

    worker.verificationStatus = status;
    worker.isVerified = status === "verified";
    if (req.body.note !== undefined || req.body.verificationNote !== undefined) {
      worker.verificationNote = String(req.body.note ?? req.body.verificationNote ?? "").trim();
    }
    await worker.save();

    res.json({
      success: true,
      message: `Worker ${status}`,
      data: {
        id: worker._id,
        name: worker.name,
        verificationStatus: worker.verificationStatus,
        isVerified: worker.isVerified,
        verificationNote: worker.verificationNote
      }
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid worker ID" });
    }
    res.status(500).json({ success: false, message: "Server error updating verification" });
  }
});

router.get("/flagged-reviews", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const status = req.query.status;
    const filter = { "reviewFlag.flagged": true };
    if (status) filter["reviewFlag.status"] = status;
    else filter["reviewFlag.status"] = { $in: ["open", "escalated"] };

    const gigs = await Gig.find(filter)
      .sort({ "review.createdAt": -1 })
      .populate("customer", "name email")
      .populate("worker", "name email rating ratingCount");

    res.json({ success: true, count: gigs.length, data: gigs });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error fetching flagged reviews" });
  }
});

router.put("/flagged-reviews/:gigId", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const action = String(req.body?.action || "").toLowerCase();
    if (!["dismiss", "escalate"].includes(action)) {
      return res.status(400).json({ success: false, message: "action must be dismiss or escalate" });
    }

    const gig = await Gig.findById(req.params.gigId);
    if (!gig) {
      return res.status(404).json({ success: false, message: "Gig not found" });
    }
    if (!gig.reviewFlag || !gig.reviewFlag.flagged) {
      return res.status(400).json({ success: false, message: "This gig has no flagged review" });
    }

    gig.reviewFlag.status = action === "dismiss" ? "dismissed" : "escalated";
    await gig.save();

    res.json({
      success: true,
      message: action === "dismiss" ? "Flag dismissed" : "Flag escalated",
      data: gig
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid gig ID" });
    }
    res.status(500).json({ success: false, message: "Server error updating flagged review" });
  }
});

module.exports = router;
