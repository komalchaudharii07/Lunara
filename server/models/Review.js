const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    feedback: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    verifiedConsultation: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

reviewSchema.index(
  { doctor: 1, user: 1 },
  { unique: true }
);

module.exports = mongoose.model("Review", reviewSchema);