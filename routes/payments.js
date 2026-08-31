const express = require("express");
const Razorpay = require("razorpay");
const router = express.Router();
const crypto = require("crypto");
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
// POST: Verify Payment Authenticity
router.post("/verify", (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Fail-Fast: Ensure the frontend sent all three pieces of the receipt
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Incomplete payment details provided." });
    }

    // Step 1: Combine the order ID and payment ID
    const body = razorpay_order_id + "|" + razorpay_payment_id;

    // Step 2: Hash that combination using your secret .env key
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(body.toString())
      .digest("hex");

    // Step 3: Compare our math with the signature the frontend sent
    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      res.status(200).json({
        success: true,
        message: "Payment cryptographically verified.",
        order_id: razorpay_order_id
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Invalid signature. Transaction rejected."
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Verification Server Error", error: error.message });
  }
});
module.exports = router;