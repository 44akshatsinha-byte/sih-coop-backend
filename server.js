require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const gigRoutes = require("./routes/gigs");
const paymentRoutes = require("./routes/payments");
const matchRoutes = require("./routes/match");
const adminRoutes = require("./routes/admin");
const aiRoutes = require("./routes/ai");

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

app.get("/api/docs", (req, res) => {
  res.json({
    title: "Cooperative Gig Services Platform API",
    version: "1.0.0",
    baseUrl: "/api",
    endpoints: {
      auth: {
        "POST /auth/register": "Register new user (customer/worker/admin)",
        "POST /auth/login": "Login and get JWT token",
        "GET /auth/me": "Get current user profile",
        "PATCH /auth/me": "Update skills, availability, phone, location"
      },
      gigs: {
        "POST /gigs": "Create gig (customer/admin)",
        "GET /gigs": "List gigs with filters & pagination",
        "GET /gigs/my-gigs": "Get current user's gigs",
        "GET /gigs/:id": "Get single gig details",
        "PUT /gigs/:id": "Update gig (owner/admin, pending/accepted only)",
        "PUT /gigs/:id/assign": "Customer/admin books a matched worker",
        "PUT /gigs/:id/accept": "Worker accepts gig",
        "PUT /gigs/:id/start": "Worker starts gig (in-progress)",
        "POST /gigs/:id/review": "Customer rates a completed gig",
        "PUT /gigs/:id/complete": "Complete gig & distribute payment",
        "PUT /gigs/:id/cancel": "Cancel gig (owner/worker/admin)",
        "DELETE /gigs/:id": "Delete gig (admin)"
      },
      payments: {
        "GET /payments/config": "Public Razorpay keyId for Checkout.js",
        "POST /payments/create-order": "Create Razorpay order (auth required)",
        "POST /payments/verify": "Verify payment signature (auth required)",
        "GET /payments/order/:orderId": "Fetch order details (auth required)",
        "GET /payments/payment/:paymentId": "Fetch payment details (auth required)"
      },
      matching: {
        "GET /match-worker/formula": "Get matching formula details",
        "POST /match-worker": "Rank workers for a booking (gigId + stored coords supported)"
      },
      admin: {
        "GET /admin/forecast": "Demand vs supply series and shortage alerts",
        "GET /admin/verification-queue": "Workers pending verification",
        "PUT /admin/workers/:id/verify": "Set verification status",
        "GET /admin/flagged-reviews": "Open/escalated review flags",
        "PUT /admin/flagged-reviews/:gigId": "dismiss or escalate"
      },
      ai: {
        "POST /ai/estimate": "AI Dynamic Fair-Pricing Bridge & NLP Auto-Tagger (English/Hindi)",
        "POST /ai/auto-tag": "Extract category, urgency, and suggested draft from task description",
        "GET /ai/taxonomy": "Reference of standardized trades, skills, and base scheduled rates"
      }
    },
    auth: "Bearer JWT in Authorization header (except public endpoints)"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/gigs", gigRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/match-worker", matchRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ai", aiRoutes);

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