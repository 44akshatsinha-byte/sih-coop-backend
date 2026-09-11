const mongoose = require("mongoose");

const GigSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  baseAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  emergencyFee: {
    type: Number,
    default: 0,
    min: 0
  },
  materialCost: {
    type: Number,
    default: 0,
    min: 0
  },
  materials: [{
    name: { type: String, trim: true },
    cost: { type: Number, default: 0, min: 0 }
  }],
  equipmentCost: {
    type: Number,
    default: 0,
    min: 0
  },
  equipment: [{
    name: { type: String, trim: true },
    cost: { type: Number, default: 0, min: 0 }
  }],
  proposals: [{
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    requestedAmount: {
      type: Number,
      required: true,
      min: 1
    },
    note: {
      type: String,
      trim: true,
      default: ""
    },
    equipmentCost: {
      type: Number,
      default: 0,
      min: 0
    },
    equipmentDetails: {
      type: String,
      trim: true,
      default: ""
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending"
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ["pending", "accepted", "in-progress", "completed", "cancelled"],
    default: "pending"
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "refunded", "failed"],
    default: "pending"
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  category: {
    type: String,
    trim: true,
    default: "general"
  },
  location: {
    type: String,
    trim: true,
    default: ""
  },
  locationPoint: {
    type: {
      type: String,
      enum: ["Point"]
    },
    coordinates: {
      type: [Number]
    }
  },
  urgency: {
    type: String,
    enum: ["normal", "emergency"],
    default: "normal"
  },
  review: {
    rating: { type: Number, min: 1, max: 5, default: null },
    text: { type: String, trim: true, default: "" },
    createdAt: { type: Date, default: null }
  },
  reviewFlag: {
    flagged: { type: Boolean, default: false },
    reasons: [{ type: String, trim: true }],
    status: {
      type: String,
      enum: ["clear", "open", "dismissed", "escalated"],
      default: "clear"
    }
  },
  estimatedDuration: {
    type: String,
    trim: true,
    default: ""
  },
  images: [{
    type: String,
    trim: true
  }],
  completedAt: {
    type: Date,
    default: null
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  cancellationReason: {
    type: String,
    trim: true,
    default: ""
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

GigSchema.index({ status: 1 });
GigSchema.index({ customer: 1 });
GigSchema.index({ worker: 1 });
GigSchema.index({ createdAt: -1 });
GigSchema.index({ category: 1 });
GigSchema.index({ locationPoint: "2dsphere" });
GigSchema.index({ "reviewFlag.flagged": 1, "reviewFlag.status": 1 });

GigSchema.virtual("customerDetails", {
  ref: "User",
  localField: "customer",
  foreignField: "_id",
  justOne: true
});

GigSchema.virtual("workerDetails", {
  ref: "User",
  localField: "worker",
  foreignField: "_id",
  justOne: true
});

module.exports = mongoose.model("Gig", GigSchema);