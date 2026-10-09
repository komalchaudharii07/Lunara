const express = require("express");

const {
  createCycle,
  getCycles,
  getLatestCycle,
  clearCycleHistory,
} = require("../controllers/cycleController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, createCycle);

router.get("/", protect, getCycles);

router.get("/latest", protect, getLatestCycle);

router.delete("/", protect, clearCycleHistory);

router.get("/summary", protect, getCycleSummary);

module.exports = router;