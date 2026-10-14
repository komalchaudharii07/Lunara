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
      min: 15,
      max: 60,
    },

    periodLength: {
      type: Number,
      min: 1,
      max: 15,
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
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

// one period per start date per user (also makes every cycle query use an index)
cycleSchema.index({ user: 1, periodStartDate: -1 }, { unique: true });

cycleSchema.pre("validate", function () {
  if (this.periodEndDate && this.periodStartDate > this.periodEndDate) {
    this.invalidate(
      "periodEndDate",
      "Period end date must be on or after the start date"
    );
  }
});

module.exports = mongoose.model("Cycle", cycleSchema);