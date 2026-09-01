require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db"); // Import the bridge

const app = express();

app.use(cors());
app.use(express.json());

// Connect to the database
connectDB();

// ---> THIS IS THE NEW PART THAT CONNECTS YOUR ROUTES <---
const authRoutes = require("./routes/auth");
const gigRoutes = require("./routes/gigs");
const paymentRoutes = require("./routes/payments");
app.use("/api/auth", authRoutes); 
app.use("/api/gigs", gigRoutes);
app.use("/api/payments", paymentRoutes);
app.get("/", (req, res) => {
  res.json({ message: "Cooperative Platform API is live!" });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});