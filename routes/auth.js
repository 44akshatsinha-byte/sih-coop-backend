const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

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
      skills: Array.isArray(skills) ? skills.map(s => s.trim()).filter(Boolean) : []
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
        isVerified: newUser.isVerified
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
        phone: user.phone,
        skills: user.skills,
        avatar: user.avatar,
        createdAt: user.createdAt
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

module.exports = router;