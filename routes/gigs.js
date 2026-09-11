const express = require("express");
const router = express.Router();
const Gig = require("../models/gig");
const User = require("../models/user");
const CooperativePool = require("../models/CooperativePool");
const { authMiddleware, requireRole } = require("../middleware/authMiddleware");
const { parseUrgency, parseLocationPoint, coordsFromPoint } = require("../services/location");
const { evaluateReviewFlag } = require("../services/reviewFlagger");
const { rankWorkers } = require("../services/matching");

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

    const parsedUrgency = parseUrgency(urgency);
    const numAmount = Number(amount);
    let baseAmt = Number(req.body.baseAmount) || numAmount;
    let emFee = Number(req.body.emergencyFee) || 0;
    if (parsedUrgency === "emergency" && emFee === 0) {
      emFee = Math.round(baseAmt * 0.25) || 200;
    }
    const matCost = Number(req.body.materialCost) || 0;
    const eqCost = Number(req.body.equipmentCost) || 0;
    const finalTotal = baseAmt + emFee + matCost + eqCost;

    const payload = {
      title: title.trim(),
      description: description.trim(),
      amount: finalTotal,
      baseAmount: baseAmt,
      emergencyFee: emFee,
      materialCost: matCost,
      materials: Array.isArray(req.body.materials) ? req.body.materials : [],
      equipmentCost: eqCost,
      equipment: Array.isArray(req.body.equipment) ? req.body.equipment : [],
      category: (category || serviceType)?.trim() || "general",
      location: location?.trim() || "",
      estimatedDuration: estimatedDuration?.trim() || "",
      images: Array.isArray(images) ? images.filter(Boolean) : [],
      customer: req.user.id,
      urgency: parsedUrgency
    };
    if (point) payload.locationPoint = point;

    const newGig = await Gig.create(payload);

    const populatedGig = await Gig.findById(newGig._id)
      .populate("customerDetails", "name email avatar")
      .populate("workerDetails", "name email avatar skills rating ratingCount isVerified completedJobs")
      .populate("proposals.worker", "name email avatar skills phone isVerified rating ratingCount completedJobs");

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
        .populate("workerDetails", "name email avatar skills rating ratingCount isVerified completedJobs")
        .populate("proposals.worker", "name email avatar skills phone isVerified rating ratingCount completedJobs"),
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
        .populate("workerDetails", "name email avatar skills rating ratingCount isVerified completedJobs")
        .populate("proposals.worker", "name email avatar skills phone isVerified rating ratingCount completedJobs"),
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
      .populate("workerDetails", "name email phone avatar skills rating ratingCount isVerified completedJobs")
      .populate("proposals.worker", "name email avatar skills phone isVerified rating ratingCount completedJobs");

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
      .populate("workerDetails", "name email avatar skills rating ratingCount isAvailable isVerified completedJobs")
      .populate("proposals.worker", "name email avatar skills phone isVerified rating ratingCount completedJobs");

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
      .populate("workerDetails", "name email avatar skills rating ratingCount isVerified completedJobs")
      .populate("proposals.worker", "name email avatar skills phone isVerified rating ratingCount completedJobs");

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
      .populate("workerDetails", "name email avatar skills rating ratingCount isVerified completedJobs")
      .populate("proposals.worker", "name email avatar skills phone isVerified rating ratingCount completedJobs");

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

router.put("/:id/materials", authMiddleware, async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) {
      return res.status(404).json({ success: false, message: "Gig not found" });
    }

    const isWorker = gig.worker && gig.worker.toString() === req.user.id;
    const isCustomer = gig.customer.toString() === req.user.id;
    const isProposingWorker = req.user.role === "worker";
    const isAdmin = req.user.role === "admin";

    if (!isWorker && !isCustomer && !isProposingWorker && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to modify materials for this gig"
      });
    }

    if (gig.status === "completed" || gig.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: `Cannot update materials on a ${gig.status} gig`
      });
    }

    const { materials } = req.body || {};
    if (!Array.isArray(materials)) {
      return res.status(400).json({
        success: false,
        message: "materials must be an array of { name, cost }"
      });
    }

    const cleanMaterials = materials
      .filter((m) => m && m.name)
      .map((m) => ({
        name: String(m.name).trim(),
        cost: Math.max(0, Number(m.cost) || 0)
      }));

    const newMaterialCost = cleanMaterials.reduce((sum, item) => sum + item.cost, 0);

    const baseService =
      gig.baseAmount > 0
        ? gig.baseAmount
        : Math.max(0, gig.amount - (gig.materialCost || 0) - (gig.equipmentCost || 0) - (gig.emergencyFee || 0));

    gig.materials = cleanMaterials;
    gig.materialCost = newMaterialCost;
    gig.baseAmount = baseService;
    gig.amount = baseService + (gig.emergencyFee || 0) + (gig.equipmentCost || 0) + newMaterialCost;

    await gig.save();

    const updated = await Gig.findById(gig._id)
      .populate("customerDetails", "name email avatar")
      .populate("workerDetails", "name email avatar skills rating ratingCount isVerified completedJobs")
      .populate("proposals.worker", "name email avatar skills phone isVerified rating ratingCount completedJobs");

    res.json({
      success: true,
      message: "Materials and pricing updated successfully",
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error updating materials",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

router.put("/:id/equipment", authMiddleware, async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) {
      return res.status(404).json({ success: false, message: "Gig not found" });
    }

    const isWorker = gig.worker && gig.worker.toString() === req.user.id;
    const isCustomer = gig.customer.toString() === req.user.id;
    const isProposingWorker = req.user.role === "worker";
    const isAdmin = req.user.role === "admin";

    if (!isWorker && !isCustomer && !isProposingWorker && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to modify equipment for this gig"
      });
    }

    if (gig.status === "completed" || gig.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: `Cannot update equipment on a ${gig.status} gig`
      });
    }

    const { equipment } = req.body || {};
    if (!Array.isArray(equipment)) {
      return res.status(400).json({
        success: false,
        message: "equipment must be an array of { name, cost }"
      });
    }

    const cleanEquipment = equipment
      .filter((item) => item && item.name)
      .map((item) => ({
        name: String(item.name).trim(),
        cost: Math.max(0, Number(item.cost) || 0)
      }));

    const newEquipmentCost = cleanEquipment.reduce((sum, item) => sum + item.cost, 0);

    const baseService =
      gig.baseAmount > 0
        ? gig.baseAmount
        : Math.max(0, gig.amount - (gig.materialCost || 0) - (gig.equipmentCost || 0) - (gig.emergencyFee || 0));

    gig.equipment = cleanEquipment;
    gig.equipmentCost = newEquipmentCost;
    gig.baseAmount = baseService;
    gig.amount = baseService + (gig.emergencyFee || 0) + (gig.materialCost || 0) + newEquipmentCost;

    await gig.save();

    const updated = await Gig.findById(gig._id)
      .populate("customerDetails", "name email avatar")
      .populate("workerDetails", "name email avatar skills rating ratingCount isVerified completedJobs")
      .populate("proposals.worker", "name email avatar skills phone isVerified rating ratingCount completedJobs");

    res.json({
      success: true,
      message: "Equipment and pricing updated successfully",
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error updating equipment",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

router.post("/:id/proposals", authMiddleware, requireRole("worker", "admin"), async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) {
      return res.status(404).json({ success: false, message: "Gig not found" });
    }

    if (gig.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot submit custom proposal on a ${gig.status} gig`
      });
    }

    if (gig.customer.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "Customer cannot submit proposal on their own gig"
      });
    }

    const { requestedAmount, note, equipmentCost, equipmentDetails } = req.body || {};
    const numAmount = Number(requestedAmount);

    if (!numAmount || numAmount < 1) {
      return res.status(400).json({
        success: false,
        message: "requestedAmount is required and must be greater than 0"
      });
    }

    const eqCost = Math.max(0, Number(equipmentCost) || 0);

    if (!Array.isArray(gig.proposals)) {
      gig.proposals = [];
    }

    const existingIndex = gig.proposals.findIndex(
      (p) => p.worker && p.worker.toString() === req.user.id
    );

    if (existingIndex >= 0) {
      gig.proposals[existingIndex].requestedAmount = numAmount;
      gig.proposals[existingIndex].note = note?.trim() || "";
      gig.proposals[existingIndex].equipmentCost = eqCost;
      gig.proposals[existingIndex].equipmentDetails = equipmentDetails?.trim() || "";
      gig.proposals[existingIndex].status = "pending";
      gig.proposals[existingIndex].createdAt = new Date();
    } else {
      gig.proposals.push({
        worker: req.user.id,
        requestedAmount: numAmount,
        note: note?.trim() || "",
        equipmentCost: eqCost,
        equipmentDetails: equipmentDetails?.trim() || "",
        status: "pending",
        createdAt: new Date()
      });
    }

    await gig.save();

    const updated = await Gig.findById(gig._id)
      .populate("customerDetails", "name email avatar")
      .populate("workerDetails", "name email avatar skills rating ratingCount isVerified completedJobs")
      .populate("proposals.worker", "name email avatar skills phone isVerified rating ratingCount completedJobs");

    res.json({
      success: true,
      message: "Custom pay proposal submitted successfully",
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error submitting proposal",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

router.put("/:id/proposals/:proposalId/accept", authMiddleware, requireRole("customer", "admin"), async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) {
      return res.status(404).json({ success: false, message: "Gig not found" });
    }

    if (gig.customer.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized to accept proposals on this gig" });
    }

    if (gig.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Gig can only be assigned while pending (current status: ${gig.status})`
      });
    }

    const proposal = (gig.proposals || []).id(req.params.proposalId);
    if (!proposal) {
      return res.status(404).json({ success: false, message: "Proposal not found" });
    }

    const worker = await User.findById(proposal.worker);
    if (!worker || worker.role !== "worker") {
      return res.status(400).json({ success: false, message: "Worker not found" });
    }

    gig.proposals.forEach((p) => {
      if (p._id.toString() === proposal._id.toString()) {
        p.status = "accepted";
      } else if (p.status === "pending") {
        p.status = "rejected";
      }
    });

    gig.worker = proposal.worker;
    gig.status = "accepted";
    gig.baseAmount = proposal.requestedAmount;

    if (proposal.equipmentCost > 0) {
      gig.equipmentCost = proposal.equipmentCost;
      if (proposal.equipmentDetails) {
        gig.equipment = [{ name: proposal.equipmentDetails, cost: proposal.equipmentCost }];
      }
    }

    const matCost = gig.materialCost || 0;
    const eqCost = gig.equipmentCost || 0;
    const emFee = gig.emergencyFee || (gig.urgency === "emergency" ? Math.round(proposal.requestedAmount * 0.25) : 0);
    gig.emergencyFee = emFee;
    gig.amount = proposal.requestedAmount + emFee + matCost + eqCost;

    await gig.save();

    const updated = await Gig.findById(gig._id)
      .populate("customerDetails", "name email avatar")
      .populate("workerDetails", "name email avatar skills rating ratingCount isAvailable isVerified completedJobs")
      .populate("proposals.worker", "name email avatar skills phone isVerified rating ratingCount completedJobs");

    res.json({
      success: true,
      message: "Worker proposal accepted and gig booked successfully!",
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error accepting proposal",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
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
    const materialCost = gig.materialCost || 0;
    const equipmentCost = gig.equipmentCost || 0;
    const directReimbursement = materialCost + equipmentCost;
    const serviceAmount = Math.max(0, totalAmount - directReimbursement);
    const cooperativeAmount = Math.round(serviceAmount * COOPERATIVE_SPLIT * 100) / 100;
    const workerAmount = Math.round((serviceAmount * WORKER_SPLIT + directReimbursement) * 100) / 100;

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
      .populate("workerDetails", "name email avatar skills rating ratingCount isVerified completedJobs")
      .populate("proposals.worker", "name email avatar skills phone isVerified rating ratingCount completedJobs");

    const welfareInsurance = Math.round(cooperativeAmount * 0.60 * 100) / 100;
    const toolMicrocredit = Math.round(cooperativeAmount * 0.25 * 100) / 100;
    const unionReserve = Math.round((cooperativeAmount - welfareInsurance - toolMicrocredit) * 100) / 100;

    res.json({
      success: true,
      message: "Gig completed and payment distributed successfully!",
      totalAmount,
      serviceAmount,
      materialCost,
      equipmentCost,
      workerAmount,
      cooperativeAmount,
      cooperativeWelfareAllocations: {
        healthAndAccidentInsurance: welfareInsurance,
        toolSubsidyFund: toolMicrocredit,
        unionReserve
      },
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

router.post("/:id/auto-dispatch", authMiddleware, requireRole("customer", "admin"), async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) {
      return res.status(404).json({ success: false, message: "Gig not found" });
    }
    if (gig.status !== "pending") {
      return res.status(400).json({ success: false, message: `Gig is not pending (current: ${gig.status})` });
    }
    if (gig.customer.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized to auto-dispatch this gig" });
    }

    const { algorithm = "hybrid" } = req.body || {};
    const coords = coordsFromPoint(gig.locationPoint);
    const bookingLat = coords ? coords.latitude : 28.6139;
    const bookingLng = coords ? coords.longitude : 77.2090;
    const categorySkill = gig.category && gig.category !== "general" ? [gig.category] : [];

    const workers = await User.find({
      role: "worker",
      isAvailable: true,
      latitude: { $ne: null },
      longitude: { $ne: null }
    }).select("name avatar skills phone isVerified latitude longitude rating ratingCount isAvailable completedJobs");

    if (!workers.length) {
      return res.status(404).json({
        success: false,
        message: "No available workers currently found in the cooperative pool"
      });
    }

    const booking = {
      latitude: bookingLat,
      longitude: bookingLng,
      requiredSkills: categorySkill,
      urgency: gig.urgency || "normal"
    };

    const workerPayloads = workers.map((u) => ({
      _id: u._id,
      name: u.name,
      avatar: u.avatar || "",
      skills: u.skills,
      phone: u.phone,
      isVerified: u.isVerified,
      latitude: u.latitude,
      longitude: u.longitude,
      rating: u.rating,
      ratingCount: u.ratingCount,
      isAvailable: u.isAvailable,
      completedJobs: u.completedJobs
    }));

    const ranked = rankWorkers(booking, workerPayloads, 5, algorithm);
    if (!ranked.length) {
      return res.status(404).json({
        success: false,
        message: "No workers matched the required trade and location criteria"
      });
    }

    const bestWorker = ranked[0];
    gig.worker = bestWorker.workerId;
    gig.status = "accepted";
    await gig.save();

    const updatedGig = await Gig.findById(gig._id)
      .populate("customerDetails", "name email avatar")
      .populate("workerDetails", "name email avatar skills rating ratingCount isVerified completedJobs");

    res.json({
      success: true,
      message: `Autonomous dispatch completed! Assigned to top-ranked worker: ${bestWorker.name}`,
      algorithmUsed: algorithm,
      assignedWorker: bestWorker,
      alternativeCandidatesCount: ranked.length - 1,
      data: updatedGig
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error running auto-dispatch", error: error.message });
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
      worker.rating = Math.round(nextAvg * 10) / 10;
      worker.ratingCount = nextCount;
      await worker.save();
    }

    const updatedGig = await Gig.findById(gig._id)
      .populate("customerDetails", "name email avatar")
      .populate("workerDetails", "name email avatar skills rating ratingCount isVerified completedJobs")
      .populate("proposals.worker", "name email avatar skills phone isVerified rating ratingCount completedJobs");

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