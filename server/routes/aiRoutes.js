const express = require("express");
const rateLimit = require("express-rate-limit");

const { askLunaraAI } = require("../controllers/aiController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

const byUser = (req) => String(req.user);

// burst limit
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true, // a failed AI call doesn't use up the user's quota
  keyGenerator: byUser,
  message: {
    message: "You've sent a lot of messages. Please try again in a few minutes.",
  },
});

// daily cost cap (each call is a paid request)
const aiDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true,
  keyGenerator: byUser,
  message: {
    message: "You've reached today's limit for Lunara AI. Please come back tomorrow.",
  },
});

// protect must run first so req.user exists for the limiters
router.post("/ask", protect, aiLimiter, aiDailyLimiter, askLunaraAI);

module.exports = router;