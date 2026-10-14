const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  createCycle,
  updateCycle,
  deleteCycle,
  getCycles,
  getLatestCycle,
  clearCycleHistory,
  getCycleSummary,
} = require("../controllers/cycleController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// stops a script from filling one account with thousands of records
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user),
  message: { message: "Too many changes. Please try again in a few minutes." },
});

router.post("/", protect, writeLimiter, createCycle);
router.get("/", protect, getCycles);

// fixed paths first, so "latest" and "summary" are never read as an :id
router.get("/latest", protect, getLatestCycle);
router.get("/summary", protect, getCycleSummary);

router.delete("/", protect, writeLimiter, clearCycleHistory);

router.patch("/:id", protect, writeLimiter, updateCycle);
router.delete("/:id", protect, writeLimiter, deleteCycle);

module.exports = router;