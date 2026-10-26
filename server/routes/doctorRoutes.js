const express = require("express");

const {
  getDoctors,
  getDoctor,
  getMyProfile,
  updateMyProfile,
  listForReview,
  reviewDoctor,
} = require("../controllers/doctorController");

const protect = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/adminMiddleware");

const router = express.Router();

router.get("/", protect, getDoctors);

// fixed paths go BEFORE "/:id" so "me" and "admin" are never read as an id
router.get("/me/profile", protect, getMyProfile);
router.put("/me/profile", protect, updateMyProfile);

router.get("/admin/review", protect, requireAdmin, listForReview);
router.patch("/admin/:id/review", protect, requireAdmin, reviewDoctor);

router.get("/:id", protect, getDoctor);

module.exports = router;