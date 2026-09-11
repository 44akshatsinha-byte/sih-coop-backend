const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"]
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ["customer", "worker", "admin"],
    default: "customer"
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  phone: {
    type: String,
    trim: true,
    default: ""
  },
  skills: [{
    type: String,
    trim: true
  }],
  isVerified: {
    type: Boolean,
    default: false
  },
  avatar: {
    type: String,
    default: ""
  },
  latitude: {
    type: Number,
    default: null,
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    default: null,
    min: -180,
    max: 180
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  ratingCount: {
    type: Number,
    default: 0,
    min: 0
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  completedJobs: {
    type: Number,
    default: 0,
    min: 0
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ role: 1, isAvailable: 1 });

UserSchema.virtual("gigsPosted", {
  ref: "Gig",
  localField: "_id",
  foreignField: "customer"
});

UserSchema.virtual("gigsAccepted", {
  ref: "Gig",
  localField: "_id",
  foreignField: "worker"
});

module.exports = mongoose.model("User", UserSchema);