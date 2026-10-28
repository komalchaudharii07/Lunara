const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  getDoctors,
  getDoctor,
  getNearbyDoctors,
  getMyProfile,
  updateMyProfile,
  uploadPhoto,
  addDocuments,
  removeDocument,
  resubmit,
  listForReview,
  reviewDoctor,
} = require("../controllers/doctorController");

const protect = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/adminMiddleware");
const { requireDoctor } = require("../middleware/roles");
const { readUploads } = require("../middleware/upload");

const router = express.Router();

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user),
  message: { message: "Too many uploads. Please try again later." },
});

router.get("/", protect, getDoctors);
router.get("/nearby", protect, getNearbyDoctors);

// the doctor's own account (fixed paths go BEFORE "/:id")
router.get("/me/profile", protect, requireDoctor, getMyProfile);
router.put("/me/profile", protect, requireDoctor, updateMyProfile);
router.put("/me/photo", protect, requireDoctor, uploadLimiter, readUploads({ field: "photo", maxBytes: 2 * 1024 * 1024 }), uploadPhoto);
router.post("/me/documents", protect, requireDoctor, uploadLimiter, readUploads({ field: "documents", maxFiles: 3 }), addDocuments);
router.delete("/me/documents/:fileId", protect, requireDoctor, removeDocument);
router.post("/me/resubmit", protect, requireDoctor, resubmit);

// admin
router.get("/admin/review", protect, requireAdmin, listForReview);
router.patch("/admin/:id/review", protect, requireAdmin, reviewDoctor);

router.get("/:id", protect, getDoctor);

module.exports = router;