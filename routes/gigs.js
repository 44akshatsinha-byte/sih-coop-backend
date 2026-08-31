const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

// Temporary in-memory storage for gigs
const gigs = [
  { id: 1, title: "Fix Leaking Sink", description: "Kitchen pipe is leaking", amount: 500, status: "pending" }
];
// POST: Create a new gig
router.post("/", (req, res) => {
  const { title, description, amount } = req.body;

  // Fail-Fast Validation
  if (!title || !description || !amount) {
    return res.status(400).json({ message: "Please provide title, description, and amount." });
  }

  // Create the temporary gig
  const newGig = {
    id: gigs.length + 1,
    title: title,
    description: description,
    amount: amount,
    status: "pending"
  };

  gigs.push(newGig); // Save it to the array

  res.status(201).json({
    success: true,
    message: "Gig successfully created",
    data: newGig
  });
});
// GET: Fetch available gigs (Tejas will use this for the dashboard)
router.get("/", async (req, res) => {
  try {
    // If the URL has ?status=pending, it filters the array. Otherwise, it shows all.
    const statusFilter = req.query.status;
    let availableGigs = gigs;

    if (statusFilter) {
      availableGigs = gigs.filter(g => g.status === statusFilter);
    }

    res.status(200).json({
      success: true,
      count: availableGigs.length,
      data: availableGigs
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});
// PUT: Worker accepts a gig
router.put("/:id/accept", (req, res) => {
  const gigId = parseInt(req.params.id); // Grabs the ID from the URL
  
  // Find the exact gig in our temporary array
  const gigIndex = gigs.findIndex(g => g.id === gigId);

  // Fail-Fast: Check if the gig exists
  if (gigIndex === -1) {
    return res.status(404).json({ message: "Gig not found" });
  }

  // Fail-Fast: Ensure it isn't already taken
  if (gigs[gigIndex].status !== "pending") {
    return res.status(400).json({ message: "This gig is no longer available" });
  }

  // Update the status
  gigs[gigIndex].status = "in-progress";

  res.status(200).json({
    success: true,
    message: "Gig successfully accepted",
    data: gigs[gigIndex]
  });
});
// PUT: Complete a gig and split the payout
router.put("/:id/complete", (req, res) => {
  const gigId = parseInt(req.params.id);
  const gigIndex = gigs.findIndex(g => g.id === gigId);

  // Fail-Fast: Does the gig exist?
  if (gigIndex === -1) {
    return res.status(404).json({ message: "Gig not found" });
  }

  // Fail-Fast: Is it actually in progress?
  if (gigs[gigIndex].status !== "in-progress") {
    return res.status(400).json({ message: "Only in-progress gigs can be completed" });
  }

  // The Cooperative Financial Engine (5% platform pool, 95% worker)
  const totalAmount = gigs[gigIndex].amount;
  const poolContribution = totalAmount * 0.05; 
  const workerPayout = totalAmount - poolContribution;

  // Update the gig status
  gigs[gigIndex].status = "completed";

  res.status(200).json({
    success: true,
    message: "Gig completed and funds distributed",
    payout_breakdown: {
      total_charged: totalAmount,
      worker_earnings: workerPayout,
      cooperative_pool_contribution: poolContribution,
      currency: "INR"
    },
    data: gigs[gigIndex]
  });
});
module.exports = router;