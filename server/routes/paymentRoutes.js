const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  getPaymentConfig,
  verifyPayment,
  getCheckout,
  handleWebhook,
} = require("../controllers/paymentController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

const limiter = (limit, message) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => String(req.user),
    message: { message },
  });

// Razorpay calls this itself. It has no login: the signature is the proof.
router.post("/webhook", handleWebhook);

router.get("/config", protect, getPaymentConfig);
router.post("/verify", protect, limiter(30, "Too many attempts. Please wait a few minutes."), verifyPayment);
router.get("/checkout/:appointmentId", protect, limiter(30, "Too many attempts. Please wait a few minutes."), getCheckout);

module.exports = router;