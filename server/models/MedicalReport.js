const mongoose = require("mongoose");

// A report (lab result, scan, visit summary) a doctor attaches to one appointment.
// The file itself is a private FileAsset; only the patient and that doctor can read it.
const medicalReportSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", required: true, index: true },
    file: { type: mongoose.Schema.Types.ObjectId, ref: "FileAsset", required: true },

    title: { type: String, required: true, trim: true, maxlength: 100 },
    notes: { type: String, trim: true, maxlength: 500, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MedicalReport", medicalReportSchema);