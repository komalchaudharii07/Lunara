const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
password: {
  type: String,
  required: true,
  select: false,
},

    age: {
      type: Number,
    },

    height: {
      type: Number,
    },

    weight: {
      type: Number,
    },

    bloodGroup: {
      type: String,
      enum: [
        "A+",
        "A-",
        "B+",
        "B-",
        "AB+",
        "AB-",
        "O+",
        "O-",
      ],
    },

    phone: {
      type: String,
      trim: true,
    },

    location: {
      type: String,
      trim: true,
    },
    passwordChangedAt: { type: Date },

    // stored as a SHA-256 hash, never the raw token
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    consentAcceptedAt: { type: Date },
    consentVersion: { type: String },

    activityLevel: {
      type: String,
      enum: [
        "Sedentary",
        "Lightly Active",
        "Moderately Active",
        "Very Active",
      ],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);