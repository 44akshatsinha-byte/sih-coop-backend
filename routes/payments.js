const express = require("express");
const Razorpay = require("razorpay");
const router = express.Router();
const crypto = require("crypto");
const { authMiddleware } = require("../middleware/authMiddleware");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_dummy_key",
  key_secret: process.env.RAZORPAY_SECRET || "dummy_secret"
});

router.post("/create-order", authMiddleware, async (req, res) => {
  try {
    const { amount, currency = "INR", receipt, notes } = req.body;

    if (!amount) {
      return res.status(400).json({ 
        success: false, 
        message: "Amount is required to create an order" 
      });
    }

    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum < 1) {
      return res.status(400).json({ 
        success: false, 
        message: "Amount must be a valid number greater than 0" 
      });
    }

    const orderOptions = {
      amount: Math.round(amountNum * 100),
      currency,
      receipt: receipt || `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      notes: notes || {}
    };

    const order = await razorpay.orders.create(orderOptions);

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Payment Gateway Error", 
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

router.post("/verify", authMiddleware, async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature 
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ 
        success: false, 
        message: "Incomplete payment details provided" 
      });
    }

    const secret = process.env.RAZORPAY_SECRET;
    if (!secret || secret === "dummy_secret") {
      return res.status(500).json({ 
        success: false, 
        message: "Payment verification not configured" 
      });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      res.json({
        success: true,
        message: "Payment verified successfully",
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Invalid signature. Transaction rejected."
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Verification error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

router.get("/order/:orderId", authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await razorpay.orders.fetch(orderId);
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Error fetching order",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

router.get("/payment/:paymentId", authMiddleware, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await razorpay.payments.fetch(paymentId);
    res.json({ success: true, payment });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Error fetching payment",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

module.exports = router;