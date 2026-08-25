const express = require("express");
const Razorpay = require("razorpay");
const router = express.Router();

// POST: Create a Razorpay Order
router.post("/create-order", async (req, res) => {
  try {
    const { amount } = req.body;

    // Fail-Fast: Prevent blank orders
    if (!amount) {
      return res.status(400).json({ message: "Amount is required to create an order" });
    }

    // Initialize Razorpay (We will use dummy keys for now)
    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_dummy_key",
      key_secret: process.env.RAZORPAY_SECRET || "dummy_secret"
    });

    // Create the order options
    const options = {
      amount: amount * 100, // Converts Rupees to Paise
      currency: "INR",
      receipt: `receipt_${Math.floor(Math.random() * 1000)}`
    };

    // Ask Razorpay's servers for an official order
    const order = await instance.orders.create(options);

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order
    });
  } catch (error) {
    res.status(500).json({ message: "Payment Gateway Error", error: error.message });
  }
});

module.exports = router;