const mongoose = require("mongoose");

const dailyLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // the calendar day, stored at UTC midnight (same as periodStartDate)
    date: {
      type: Date,
      required: true,
    },

    flow: {
      type: String,
      enum: ["none", "spotting", "light", "medium", "heavy"],
    },

    // 0 = no pain, 10 = worst pain
    pain: {
      type: Number,
      min: 0,
      max: 10,
    },

    mood: {
      type: String,
      enum: ["Happy", "Calm", "Okay", "Low", "Irritated"],
    },

    symptoms: {
      type: [String],
      default: [],
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

// one entry per user per day
dailyLogSchema.index({ user: 1, date: -1 }, { unique: true });

module.exports = mongoose.model("DailyLog", dailyLogSchema);