const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    age: {
      type: Number,
      min: 10,
      max: 100,
    },

    height: {
      type: Number,
      min: 50,
      max: 250,
    },

    weight: {
      type: Number,
      min: 10,
      max: 300,
    },

    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },

    phone: {
      type: String,
      trim: true,
      maxlength: 20,
    },

    location: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    activityLevel: {
      type: String,
      enum: [
        "Sedentary",
        "Lightly Active",
        "Moderately Active",
        "Very Active",
      ],
    },

    passwordChangedAt: { type: Date },

    // stored as a SHA-256 hash, never the raw token
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },

    consentAcceptedAt: { type: Date },
    consentVersion: { type: String },

    // Lunara AI sends health data to Google, so it stays off until the user opts in
    aiConsent: { type: Boolean, default: false },
    aiConsentAt: { type: Date },

    // bumped on password change / "log out other devices": older tokens stop working
    tokenVersion: { type: Number, default: 0 },

    // set by hand in the database for the people who moderate the community
    isAdmin: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);