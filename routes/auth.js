const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Dummy in-memory storage to test before connecting the database
const users = [];

// POST: Register a new user
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Check 2: Is the password too short?
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    const existingUser = users.find((u) => u.email === email);
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
      id: users.length + 1,
      name,
      email,
      password: hashedPassword,
      role: role || "customer",
    };
    users.push(newUser);

    res.status(201).json({
      message: "User registered successfully!",
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// POST: Login a user
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = users.find((u) => u.email === email);
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, role: user.role }, 
      "super_secret_hackathon_key", 
      { expiresIn: "1h" }
    );

    res.json({ message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;