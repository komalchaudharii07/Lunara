const express = require("express");
const rateLimit = require("express-rate-limit");

const { getMyReport } = require("../controllers/reportController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// building a report reads a lot of records, so keep it modest
const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === "production" ? 30 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user),
  message: { message: "Too many report requests. Please try again in a few minutes." },
});
router.get("/", protect, reportLimiter, getMyReport);

module.exports = router;