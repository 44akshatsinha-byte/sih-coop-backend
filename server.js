require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const gigRoutes = require("./routes/gigs");
const paymentRoutes = require("./routes/payments");
const matchRoutes = require("./routes/match");

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/gigs", gigRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/match-worker", matchRoutes);

app.get("/", (req, res) => {
  res.json({ 
    message: "Cooperative Platform API is live!", 
    version: "1.0.0",
    documentation: "/api/docs"
  });
});

app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: `Route ${req.method} ${req.originalUrl} not found` 
  });
});

app.use((err, req, res, next) => {
  console.error("Error:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    time: new Date().toISOString()
  });

  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ 
      success: false, 
      message: messages.join(", ") 
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({ 
      success: false, 
      message: "Invalid ID format" 
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ 
      success: false, 
      message: `${field} already exists` 
    });
  }

  res.status(500).json({ 
    success: false, 
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function startServer() {
  try {
    if (!MONGO_URI) {
      console.error("❌ MONGO_URI or MONGODB_URI environment variable is required");
      process.exit(1);
    }

    await connectDB();
    
    const server = app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
    });

    const gracefulShutdown = async (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        await mongoose.connection.close();
        console.log("📴 Database connection closed");
        process.exit(0);
      });
      
      setTimeout(() => {
        console.error("⏱️ Forced shutdown after timeout");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();