const mongoose = require("mongoose");

// One private file. The bytes live in GridFS; this record says who may read them.
// Nothing here is ever served as a public URL: files are streamed by /api/files/:id after an access check.
const fileAssetSchema = new mongoose.Schema(
  {
    gridId: { type: mongoose.Schema.Types.ObjectId, required: true },

    kind: {
      type: String,
      enum: ["doctor_photo", "doctor_licence", "medical_report"],
      required: true,
    },

    // shown to the person downloading it (cleaned, never used as a path)
    filename: { type: String, required: true, maxlength: 120 },
    mimeType: { type: String, required: true, enum: ["application/pdf", "image/jpeg", "image/png"] },
    size: { type: Number, required: true, min: 1 },

    // who uploaded it
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // who the file belongs to / is about (which of these are set depends on the kind)
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" },
  },
  { timestamps: true }
);

fileAssetSchema.index({ doctor: 1, kind: 1 });
fileAssetSchema.index({ patient: 1, kind: 1 });

module.exports = mongoose.model("FileAsset", fileAssetSchema);