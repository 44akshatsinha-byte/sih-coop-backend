const express = require("express");
const router = express.Router();
const { analyzeTaskNLP, TAXONOMY } = require("../services/aiPricing");

/**
 * POST /api/ai/estimate
 * Implements the AI Pricing Bridge specified in API_DOCS.md.
 * Automatically analyzes problem description (English or Hindi),
 * determines category, urgency, required skills, and computes
 * standardized government cooperative fair pricing (CSR/DSR).
 */
router.post("/estimate", (req, res) => {
  try {
    const { description } = req.body || {};

    if (!description || typeof description !== "string" || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: "A task description string is required (e.g., 'Kitchen pipe is leaking' or 'nal se paani tapak raha hai')"
      });
    }

    const result = analyzeTaskNLP(description);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error processing AI task estimate",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

/**
 * POST /api/ai/auto-tag
 * Lightweight endpoint for quick form autofill.
 */
router.post("/auto-tag", (req, res) => {
  try {
    const { description } = req.body || {};
    if (!description) {
      return res.status(400).json({ success: false, message: "Description required" });
    }
    const result = analyzeTaskNLP(description);
    return res.json({
      success: true,
      suggestedDraft: result.suggestedDraft,
      detected: result.detected
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/ai/taxonomy
 * Public reference of standardized cooperative trades and schedule rates.
 */
router.get("/taxonomy", (req, res) => {
  res.json({
    success: true,
    count: TAXONOMY.length,
    schedule: "Cooperative Schedule of Rates (CSR-2026)",
    data: TAXONOMY.map((t) => ({
      category: t.category,
      skills: t.skills,
      baseLaborRate: t.baseLaborRate,
      emergencyLaborRate: t.emergencyLaborRate,
      typicalMaterials: t.typicalMaterials
    }))
  });
});

module.exports = router;
