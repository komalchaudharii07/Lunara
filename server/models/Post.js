const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    category: {
      type: String,
      enum: ["Periods", "PCOS & PCOD", "Pregnancy", "Wellness"],
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    anonymous: {
      type: Boolean,
      default: true,
    },

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // moderation
    status: {
      type: String,
      enum: ["visible", "hidden", "removed"],
      default: "visible",
    },

    reports: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        reason: {
          type: String,
          enum: ["spam", "harassment", "misinformation", "self-harm", "other"],
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    reportCount: { type: Number, default: 0 },

    // the text looked like a crisis: a moderator should look at it
    flaggedCrisis: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// the feed
postSchema.index({ status: 1, category: 1, createdAt: -1, _id: -1 });
// "remove my likes" when an account is deleted
postSchema.index({ likes: 1 });
postSchema.index({ user: 1 });

module.exports = mongoose.model("Post", postSchema);