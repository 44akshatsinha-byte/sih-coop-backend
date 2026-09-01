const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true // Prevents two people from registering with the same email
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["customer", "worker"], // Strictly limits roles to these two options
    default: "customer"
  }
}, { timestamps: true }); // Automatically adds createdAt and updatedAt dates

module.exports = mongoose.model("User", UserSchema);