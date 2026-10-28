const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema(
  {
    // the login account that owns this profile
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    name: { type: String, required: true, trim: true, maxlength: 100 },
    specialization: { type: String, required: true, trim: true, maxlength: 100 },
    experience: { type: Number, required: true, min: 0, max: 70 },
    qualification: { type: String, required: true, trim: true, maxlength: 200 },
    consultationFee: { type: Number, required: true, min: 0, max: 100000 },
    bio: { type: String, trim: true, maxlength: 600, default: "" },

    // never shown to patients; admins use it to verify the doctor
    phone: { type: String, trim: true, maxlength: 20 },

    // profile picture and licence documents (private files, see FileAsset)
    photo: { type: mongoose.Schema.Types.ObjectId, ref: "FileAsset" },
    documents: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "FileAsset" }], default: [] },

    // where patients can visit; shown on the Nearby map
    clinicName: { type: String, trim: true, maxlength: 120, default: "" },
    clinicAddress: { type: String, trim: true, maxlength: 250, default: "" },
    lat: { type: Number, min: -90, max: 90 },
    lng: { type: Number, min: -180, max: 180 },

    // proof of licence, checked by an admin before the doctor goes public
    registrationNumber: { type: String, trim: true, maxlength: 40 },
    registrationCouncil: { type: String, trim: true, maxlength: 100 },

    verificationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    verificationNote: { type: String, trim: true, maxlength: 300, default: "" },
    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // the doctor can pause bookings without losing approval
    available: { type: Boolean, default: false },
  },
  { timestamps: true }
);

doctorSchema.index({ user: 1 }, { unique: true, sparse: true });
doctorSchema.index({ verificationStatus: 1, createdAt: -1 });
doctorSchema.index({ lat: 1, lng: 1 });

module.exports = mongoose.model("Doctor", doctorSchema);