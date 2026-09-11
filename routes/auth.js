const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { authMiddleware } = require("../middleware/authMiddleware");

const jwtSecret = process.env.JWT_SECRET || "super_secret_hackathon_key";
const tokenExpiry = process.env.JWT_EXPIRY || "1h";

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, phone, skills } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Email and password are required" 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: "Password must be at least 6 characters long" 
      });
    }

    if (name && name.length > 100) {
      return res.status(400).json({ 
        success: false, 
        message: "Name must be less than 100 characters" 
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: "User already exists with this email" 
      });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const validRoles = ["customer", "worker", "admin"];
    const userRole = validRoles.includes(role) ? role : "customer";

    const newUser = await User.create({
      name: name?.trim() || email.split("@")[0],
      email: email.toLowerCase(),
      password: hashedPassword,
      role: userRole,
      phone: phone?.trim() || "",
      skills: Array.isArray(skills) ? skills.map(s => s.trim()).filter(Boolean) : [],
      verificationStatus: userRole === "worker" ? "pending" : "verified",
      isVerified: userRole !== "worker"
    });

    const token = jwt.sign(
      { id: newUser._id, role: newUser.role }, 
      jwtSecret, 
      { expiresIn: tokenExpiry }
    );

    res.status(201).json({
      success: true,
      message: "User registered successfully!",
      token,
      user: { 
        id: newUser._id, 
        name: newUser.name, 
        email: newUser.email, 
        role: newUser.role,
        balance: newUser.balance,
        isVerified: newUser.isVerified,
        verificationStatus: newUser.verificationStatus
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: "Email already registered" 
      });
    }
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ 
        success: false, 
        message: messages.join(", ") 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: "Server error during registration", 
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Email and password are required" 
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid credentials" 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid credentials" 
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      jwtSecret, 
      { expiresIn: tokenExpiry }
    );

    res.json({ 
      success: true,
      message: "Login successful", 
      token,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        balance: user.balance,
        isVerified: user.isVerified,
        verificationStatus: user.verificationStatus,
        avatar: user.avatar
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Server error during login",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

router.get("/me", async (req, res) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ 
        success: false, 
        message: "No token provided" 
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, jwtSecret);
    
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        balance: user.balance,
        isVerified: user.isVerified,
        verificationStatus: user.verificationStatus,
        verificationNote: user.verificationNote,
        phone: user.phone,
        skills: user.skills,
        avatar: user.avatar,
        latitude: user.latitude,
        longitude: user.longitude,
        rating: user.rating,
        ratingCount: user.ratingCount,
        isAvailable: user.isAvailable,
        completedJobs: user.completedJobs,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ 
        success: false, 
        message: "Token expired" 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: "Error fetching user profile" 
    });
  }
});

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    balance: user.balance,
    isVerified: user.isVerified,
    verificationStatus: user.verificationStatus,
    verificationNote: user.verificationNote,
    phone: user.phone,
    skills: user.skills,
    avatar: user.avatar,
    latitude: user.latitude,
    longitude: user.longitude,
    rating: user.rating,
    ratingCount: user.ratingCount,
    isAvailable: user.isAvailable,
    completedJobs: user.completedJobs,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

router.patch("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const { phone, skills, isAvailable, latitude, longitude, name } = req.body || {};

    if (name !== undefined) {
      const n = String(name).trim();
      if (!n || n.length > 100) {
        return res.status(400).json({ success: false, message: "Name must be 1–100 characters" });
      }
      user.name = n;
    }

    if (phone !== undefined) user.phone = String(phone).trim();

    if (skills !== undefined) {
      const list = Array.isArray(skills)
        ? skills
        : String(skills).split(",").map((s) => s.trim());
      user.skills = list.map((s) => String(s).trim()).filter(Boolean);
    }

    if (isAvailable !== undefined) {
      user.isAvailable = isAvailable === true || isAvailable === "true";
    }

    if (latitude !== undefined) {
      const lat = latitude === null || latitude === "" ? null : Number(latitude);
      if (lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) {
        return res.status(400).json({ success: false, message: "Invalid latitude" });
      }
      user.latitude = lat;
    }

    if (longitude !== undefined) {
      const lng = longitude === null || longitude === "" ? null : Number(longitude);
      if (lng !== null && (!Number.isFinite(lng) || lng < -180 || lng > 180)) {
        return res.status(400).json({ success: false, message: "Invalid longitude" });
      }
      user.longitude = lng;
    }

    await user.save();
    res.json({ success: true, message: "Profile updated", user: publicUser(user) });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating profile",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

module.exports = router;