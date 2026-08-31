const mongoose = require("mongoose");

const gigSchema = new mongoose.Schema({
    service: {
        type: String,
        required: true
    },

    description: {
        type: String
    },

    totalAmount: {
        type: Number,
        required: true
    },

    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    worker: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    status: {
        type: String,
        enum: [
            "pending",
            "accepted",
            "in-progress",
            "completed",
            "cancelled"
        ],
        default: "pending"
    },

    paymentStatus: {
        type: String,
        enum: ["pending", "paid"],
        default: "pending"
    }
});

module.exports = mongoose.model("Gig", gigSchema);