const express = require("express");
const rateLimit = require("express-rate-limit");

const { askLunaraAI } = require("../controllers/aiController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user),
  message: {
    message: "You've sent a lot of messages. Please try again in a few minutes.",
  },
});

// protect must run first so req.user exists for the limiter
router.post("/ask", protect, aiLimiter, askLunaraAI);

module.exports = router;