const mongoose = require("mongoose");

const cooperativePoolSchema = new mongoose.Schema({
  totalBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  transactions: [{
    gigId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gig"
    },
    amount: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      enum: ["contribution", "withdrawal", "distribution"],
      required: true
    },
    description: {
      type: String,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  lastDistributionAt: {
    type: Date,
    default: null
  },
  distributionHistory: [{
    amount: {
      type: Number,
      required: true
    },
    distributedTo: {
      type: String,
      enum: ["community", "workers", "platform"],
      required: true
    },
    description: {
      type: String,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, { 
  timestamps: true 
});

cooperativePoolSchema.index({ createdAt: -1 });

module.exports = mongoose.model("CooperativePool", cooperativePoolSchema);