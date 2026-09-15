const Review = require("../models/Review");
const Doctor = require("../models/Doctor");

// GET DOCTOR REVIEWS
const getDoctorReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      doctor: req.params.doctorId,
    })
      .populate("user", "name")
      .sort({ createdAt: -1 });

    const totalReviews = reviews.length;

    const averageRating =
      totalReviews > 0
        ? (
          reviews.reduce(
            (sum, review) => sum + review.rating,
            0
          ) / totalReviews
        ).toFixed(1)
        : 0;

    res.json({
      reviews,
      averageRating: Number(averageRating),
      totalReviews,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch reviews",
    });
  }
};

// CREATE REVIEW
const createReview = async (req, res) => {
  try {
    const { rating, feedback } = req.body;

    if (!rating || !feedback) {
      return res.status(400).json({
        message: "Rating and feedback are required",
      });
    }

    const doctor = await Doctor.findById(
      req.params.doctorId
    );

    if (!doctor) {
      return res.status(404).json({
        message: "Doctor not found",
      });
    }

    const existingReview = await Review.findOne({
      doctor: req.params.doctorId,
      user: req.user,
    });

    if (existingReview) {
      return res.status(400).json({
        message: "You have already reviewed this doctor",
      });
    }

    const review = await Review.create({
      doctor: req.params.doctorId,
      user: req.user,
      rating,
      feedback,
      verifiedConsultation: false,
    });

    const populatedReview = await review.populate(
      "user",
      "name"
    );

    res.status(201).json({
      message: "Review added successfully",
      review: populatedReview,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create review",
    });
  }
};

module.exports = {
  getDoctorReviews,
  createReview,
};