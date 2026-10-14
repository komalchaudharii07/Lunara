const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  saveLog,
  getLogs,
  deleteLog,
  clearLogs,
} = require("../controllers/dailyLogController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user),
  message: { message: "Too many changes. Please try again in a few minutes." },
});

router.get("/", protect, getLogs);
router.delete("/", protect, writeLimiter, clearLogs);
router.put("/:date", protect, writeLimiter, saveLog);
router.delete("/:date", protect, writeLimiter, deleteLog);

module.exports = router;