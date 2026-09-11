const jwt = require("jsonwebtoken");
const User = require("../models/user");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ 
        success: false, 
        message: "Access denied. No token provided." 
      });
    }

    const token = authHeader.split(" ")[1];
    const jwtSecret = process.env.JWT_SECRET || "super_secret_hackathon_key";

    const decoded = jwt.verify(token, jwtSecret);
    
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: "User no longer exists." 
      });
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      name: user.name
    };
    
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ 
        success: false, 
        message: "Token expired. Please log in again." 
      });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid token." 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: "Authentication error." 
    });
  }
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required." 
      });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: "Insufficient permissions." 
      });
    }
    next();
  };
};

module.exports = { authMiddleware, requireRole };