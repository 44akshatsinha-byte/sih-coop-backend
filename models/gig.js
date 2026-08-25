const mongoose = require("mongoose");

const GigSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "in-progress", "completed"],
    default: "pending"
  },
  // This physically links the gig to the customer who posted it in the database
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", 
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model("Gig", GigSchema);