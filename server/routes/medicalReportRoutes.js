const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  uploadReport,
  listForAppointment,
  listMine,
  deleteReport,
} = require("../controllers/medicalReportController");

const protect = require("../middleware/authMiddleware");
const { requireApprovedDoctor } = require("../middleware/roles");
const { readUploads } = require("../middleware/upload");

const router = express.Router();

const limiter = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => String(req.user),
    message: { message },
  });

router.post(
  "/",
  protect,
  requireApprovedDoctor,
  limiter(60 * 60 * 1000, 40, "Too many uploads. Please try again later."),
  readUploads({ field: "file" }),
  uploadReport
);

// fixed paths first
router.get("/mine", protect, listMine);
router.get("/appointment/:appointmentId", protect, listForAppointment);
router.delete("/:id", protect, requireApprovedDoctor, limiter(15 * 60 * 1000, 30, "Too many changes."), deleteReport);

module.exports = router;