const express = require("express");
const router = express.Router();
const Gig = require("../models/gig");
const User = require("../models/user");
const CooperativePool = require("../models/CooperativePool");
const { authMiddleware, requireRole } = require("../middleware/authMiddleware");
const { parseUrgency, parseLocationPoint } = require("../services/location");
const { evaluateReviewFlag } = require("../services/reviewFlagger");

const COOPERATIVE_SPLIT = 0.15;
const WORKER_SPLIT = 0.85;

router.post("/", authMiddleware, requireRole("customer", "admin"), async (req, res) => {
  try {
    const {
      title,
      description,
      amount,
      category,
      serviceType,
      location,
      estimatedDuration,
      images,
      urgency
    } = req.body;

    if (!title || !description || !amount) {
      return res.status(400).json({ 
        success: false, 
        message: "Title, description, and amount are required" 
      });
    }

    if (amount < 1) {
      return res.status(400).json({ 
        success: false, 
        message: "Amount must be greater than 0" 
      });
    }

    const point = parseLocationPoint(req.body);
    if (point === null) {
      return res.status(400).json({
        success: false,
        message: "Invalid coordinates. latitude [-90,90], longitude [-180,180]"
      });
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      amount: Number(amount),
      category: (category || serviceType)?.trim() || "general",
      location: location?.trim() || "",
      estimatedDuration: estimatedDuration?.trim() || "",
      images: Array.isArray(images) ? images.filter(Boolean) : [],
      customer: req.user.id,
      urgency: parseUrgency(urgency)
    };
    if (point) payload.locationPoint = point;

    const newGig = await Gig.create(payload);

    const populatedGig = await Gig.findById(newGig._id)
      .populate("customerDetails", "name email avatar")
      .populate("workerDetails", "name email avatar");

    res.status(201).json({
      success: true,
      message: "Gig created successfully",
      data: populatedGig
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ 
        success: false, 
        message: messages.join(", ") 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: "Server error creating gig",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const { 
      status, 
      category, 
      page = 1, 
      limit = 20, 
      sortBy = "createdAt", 
      sortOrder = "desc",
      minAmount,
      maxAmount,
      search
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (minAmount || maxAmount) {
      filter.amount = {};
      if (minAmount) filter.amount.$gte = Number(minAmount);
      if (maxAmount) filter.amount.$lte = Number(maxAmount);
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    const [gigs, total] = await Promise.all([
      Gig.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .populate("customerDetails", "name email avatar")
        .populate("workerDetails", "name email avatar"),
      Gig.countDocuments(filter)
    ]);

    res.json({
      success: true,
      count: gigs.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: gigs
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Server error fetching gigs",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

router.get("/my-gigs", authMiddleware, async (req, res) => {
  try {
    const { role } = req.user;
    const { status, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (role === "customer") {
      filter.customer = req.user.id;
    } else if (role === "worker") {
      filter.worker = req.user.id;
    }
    if (status) filter.status = status;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [gigs, total] = await Promise.all([
      Gig.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("customerDetails", "name email avatar")
        .populate("workerDetails", "name email avatar"),
      Gig.countDocuments(filter)
    ]);

    res.json({
      success: true,
      count: gigs.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: gigs
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Server error fetching your gigs" 
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id)
      .populate("customerDetails", "name email phone avatar")
      .populate("workerDetails", "name email phone avatar skills");

    if (!gig) {
      return res.status(404).json({ 
        success: false, 
        message: "Gig not found" 
      });
    }

    res.json({ success: true, data: gig });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid gig ID" 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: "Server error fetching gig" 
    });
  }
});

router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) {
      return res.status(404).json({ 
        success: false, 
        message: "Gig not found" 
      });
    }

    if (gig.customer.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ 
        success: false, 
        message: "Not authorized to update this gig" 
      });
    }

    if (!["pending", "accepted"].includes(gig.status)) {
      return res.status(400).json({ 
        success: false, 
        message: "Cannot update gig in current status" 
      });
    }

    const { title, description, amount, category, serviceType, location, estimatedDuration, images, urgency } = req.body;

    if (title) gig.title = title.trim();
    if (description) gig.description = description.trim();
    if (amount) gig.amount = Number(amount);
    if (category || serviceType) gig.category = (category || serviceType).trim();
    if (location !== undefined) gig.location = location.trim();
    if (estimatedDuration !== undefined) gig.estimatedDuration = estimatedDuration.trim();
    if (Array.isArray(images)) gig.images = images.filter(Boolean);
    if (urgency !== undefined) gig.urgency = parseUrgency(urgency);

    const point = parseLocationPoint(req.body);
    if (point === null) {
      return res.status(400).json({
        success: false,
        message: "Invalid coordinates. latitude [-90,90], longitude [-180,180]"
      });
    }
    if (point) gig.locationPoint = point;

    await gig.save();

    const updatedGig = await Gig.findById(gig._id)
      .populate("customerDetails", "name email avatar")
      .populate("workerDetails", "name email avatar");

    res.json({ 
      success: true, 
      message: "Gig updated successfully", 
      data: updatedGig 
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ 
        success: false, 
        message: messages.join(", ") 
      });
    }
    if (error.name === "CastError") {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid gig ID" 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: "Server error updating gig" 
    });
  }
});

router.put("/:id/assign", authMiddleware, requireRole("customer", "admin"), async (req, res) => {
  try {
    const { workerId } = req.body || {};
    if (!workerId) {
      return res.status(400).json({ success: false, message: "workerId is required" });
    }

    const gig = await Gig.findById(req.params.id);
    if (!gig) {
      return res.status(404).json({ success: false, message: "Gig not found" });
    }

    if (gig.customer.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized to assign this gig" });
    }

    if (gig.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Gig can only be assigned while pending (current status: ${gig.status})`
      });
    }

    const worker = await User.findById(workerId);
    if (!worker || worker.role !== "worker") {
      return res.status(400).json({ success: false, message: "Worker not found" });
    }

    if (worker._id.toString() === gig.customer.toString()) {
      return res.status(400).json({ success: false, message: "You cannot assign the gig to the customer" });
    }

    gig.worker = worker._id;
    gig.status = "accepted";
    await gig.save();

    const updatedGig = await Gig.findById(gig._id)
      .populate("customerDetails", "name email avatar")
      .populate("workerDetails", "name email avatar skills rating ratingCount isAvailable isVerified");

    res.json({
      success: true,
      message: "Worker assigned successfully",
      data: updatedGig
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid gig or worker ID" });
    }
    res.status(500).json({ success: false, message: "Server error assigning gig" });
  }
});

router.put("/:id/accept", authMiddleware, requireRole("worker", "admin"), async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) {
      return res.status(404).json({ 
        success: false, 
        message: "Gig not found" 
      });
    }

    if (gig.status !== "pending") {
      return res.status(400).json({ 
        success: false, 
        message: `Gig is not available (current status: ${gig.status})` 
      });
    }

    if (gig.customer.toString() === req.user.id) {
      return res.status(400).json({ 
        success: false, 
        message: "You cannot accept your own gig" 
      });
    }

    gig.status = "accepted";
    gig.worker = req.user.id;
    await gig.save();

    const updatedGig = await Gig.findById(gig._id)
      .populate("customerDetails", "name email avatar")
      .populate("workerDetails", "name email avatar skills");

    res.json({ 
      success: true, 
      message: "Gig accepted successfully", 
      data: updatedGig 
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid gig ID" 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: "Server error accepting gig" 
    });
  }
});

router.put("/:id/start", authMiddleware, requireRole("worker", "admin"), async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) {
      return res.status(404).json({ 
        success: false, 
        message: "Gig not found" 
      });
    }

    if (gig.status !== "accepted") {
      return res.status(400).json({ 
        success: false, 
        message: `Gig must be accepted first (current status: ${gig.status})` 
      });
    }

    if (gig.worker && gig.worker.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ 
        success: false, 
        message: "Only the assigned worker can start this gig" 
      });
    }

    gig.status = "in-progress";
    await gig.save();

    const updatedGig = await Gig.findById(gig._id)
      .populate("customerDetails", "name email avatar")
      .populate("workerDetails", "name email avatar skills");

    res.json({ 
      success: true, 
      message: "Gig marked as in-progress", 
      data: updatedGig 
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid gig ID" 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: "Server error starting gig" 
    });
  }
});

router.put("/:id/complete", authMiddleware, async (req, res) => {
  const session = await Gig.startSession();
  session.startTransaction();

  try {
    const gig = await Gig.findById(req.params.id).session(session);
    if (!gig) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false, 
        message: "Gig not found" 
      });
    }

    const isCustomer = gig.customer.toString() === req.user.id;
    const isWorker = gig.worker && gig.worker.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!isCustomer && !isWorker && !isAdmin) {
      await session.abortTransaction();
      return res.status(403).json({ 
        success: false, 
        message: "Not authorized to complete this gig" 
      });
    }

    if (gig.status !== "accepted" && gig.status !== "in-progress") {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false, 
        message: `Only accepted/in-progress gigs can be completed (current: ${gig.status})` 
      });
    }

    const totalAmount = gig.amount;
    const cooperativeAmount = Math.round(totalAmount * COOPERATIVE_SPLIT * 100) / 100;
    const workerAmount = Math.round(totalAmount * WORKER_SPLIT * 100) / 100;

    if (gig.worker) {
      await User.findByIdAndUpdate(
        gig.worker,
        { $inc: { balance: workerAmount, completedJobs: 1 } },
        { session }
      );
    }

    let pool = await CooperativePool.findOne().session(session);
    if (!pool) {
      pool = await CooperativePool.create([{
        totalBalance: cooperativeAmount,
        transactions: [{
          gigId: gig._id,
          amount: cooperativeAmount,
          type: "contribution",
          description: `Cooperative contribution from gig: ${gig.title}`
        }]
      }], { session });
      pool = pool[0];
    } else {
      pool.totalBalance += cooperativeAmount;
      pool.transactions.push({
        gigId: gig._id,
        amount: cooperativeAmount,
        type: "contribution",
        description: `Cooperative contribution from gig: ${gig.title}`
      });
      await pool.save({ session });
    }

    gig.status = "completed";
    gig.paymentStatus = "paid";
    gig.completedAt = new Date();
    await gig.save({ session });

    await session.commitTransaction();

    const completedGig = await Gig.findById(gig._id)
      .populate("customerDetails", "name email avatar")
      .populate("workerDetails", "name email avatar");

    res.json({
      success: true,
      message: "Gig completed and payment distributed successfully!",
      totalAmount,
      workerAmount,
      cooperativeAmount,
      data: completedGig
    });
  } catch (error) {
    await session.abortTransaction();
    if (error.name === "CastError") {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid gig ID" 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: "Server error completing gig",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  } finally {
    session.endSession();
  }
});

router.post("/:id/review", authMiddleware, requireRole("customer", "admin"), async (req, res) => {
  try {
    const rating = Number(req.body?.rating);
    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "rating must be an integer from 1 to 5" });
    }

    const gig = await Gig.findById(req.params.id);
    if (!gig) {
      return res.status(404).json({ success: false, message: "Gig not found" });
    }

    if (gig.customer.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only the customer can review this gig" });
    }

    if (gig.status !== "completed") {
      return res.status(400).json({ success: false, message: "Gig must be completed before review" });
    }

    if (gig.review && gig.review.rating) {
      return res.status(400).json({ success: false, message: "This gig already has a review" });
    }

    if (!gig.worker) {
      return res.status(400).json({ success: false, message: "No worker assigned to review" });
    }

    gig.review = { rating, text, createdAt: new Date() };
    gig.reviewFlag = await evaluateReviewFlag(Gig, {
      gig,
      workerId: gig.worker,
      rating,
      text
    });
    await gig.save();

    const worker = await User.findById(gig.worker);
    if (worker) {
      const nextCount = (worker.ratingCount || 0) + 1;
      const nextAvg = ((worker.rating || 0) * (worker.ratingCount || 0) + rating) / nextCount;
      worker.rating = Math.round(nextAvg * 100) / 100;
      worker.ratingCount = nextCount;
      await worker.save();
    }

    const updatedGig = await Gig.findById(gig._id)
      .populate("customerDetails", "name email avatar")
      .populate("workerDetails", "name email avatar skills rating ratingCount");

    res.status(201).json({
      success: true,
      message: "Review submitted",
      data: updatedGig
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid gig ID" });
    }
    res.status(500).json({ success: false, message: "Server error submitting review" });
  }
});

router.put("/:id/cancel", authMiddleware, async (req, res) => {
  try {
    const { reason } = req.body;
    const gig = await Gig.findById(req.params.id);
    if (!gig) {
      return res.status(404).json({ 
        success: false, 
        message: "Gig not found" 
      });
    }

    const isCustomer = gig.customer.toString() === req.user.id;
    const isWorker = gig.worker && gig.worker.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!isCustomer && !isWorker && !isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: "Not authorized to cancel this gig" 
      });
    }

    if (!["pending", "accepted"].includes(gig.status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot cancel gig in current status: ${gig.status}` 
      });
    }

    gig.status = "cancelled";
    gig.cancelledAt = new Date();
    gig.cancellationReason = reason?.trim() || "Cancelled by user";
    await gig.save();

    const populatedGig = await Gig.findById(gig._id)
      .populate("customerDetails", "name email phone avatar")
      .populate("workerDetails", "name email phone avatar skills");

    res.json({ 
      success: true, 
      message: "Gig cancelled successfully", 
      data: populatedGig 
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid gig ID" 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: "Server error cancelling gig" 
    });
  }
});

router.delete("/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const gig = await Gig.findByIdAndDelete(req.params.id);
    if (!gig) {
      return res.status(404).json({ 
        success: false, 
        message: "Gig not found" 
      });
    }

    res.json({ 
      success: true, 
      message: "Gig deleted successfully" 
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid gig ID" 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: "Server error deleting gig" 
    });
  }
});

module.exports = router;