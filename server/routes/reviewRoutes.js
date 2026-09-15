const express = require("express");

const {
  getDoctorReviews,
  createReview,
} = require("../controllers/reviewController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
  "/doctor/:doctorId",
  protect,
  getDoctorReviews
);

router.post(
  "/doctor/:doctorId",
  protect,
  createReview
);

module.exports = router;