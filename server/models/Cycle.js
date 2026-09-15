const mongoose = require("mongoose");

const cycleSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    periodStartDate: {
      type: Date,
      required: true,
    },

    periodEndDate: {
      type: Date,
    },

    cycleLength: {
      type: Number,
    },

    periodLength: {
      type: Number,
    },

    symptoms: {
      type: [String],
      default: [],
    },

    mood: {
      type: String,
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Cycle", cycleSchema);