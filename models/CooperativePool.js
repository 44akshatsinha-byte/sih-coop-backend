const mongoose = require("mongoose");

const cooperativePoolSchema = new mongoose.Schema({
    totalBalance: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model(
    "CooperativePool",
    cooperativePoolSchema
);