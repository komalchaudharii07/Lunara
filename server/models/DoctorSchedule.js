const mongoose = require("mongoose");

// When a doctor can be booked. Kept separate from the Doctor profile.
const windowSchema = new mongoose.Schema(
  {
    day: { type: Number, min: 0, max: 6, required: true }, // 0 = Sunday
    start: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    end: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  },
  { _id: false }
);

const doctorScheduleSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      unique: true,
    },

    slotMinutes: {
      type: Number,
      enum: [15, 20, 30, 45, 60],
      default: 30,
    },

    weekly: { type: [windowSchema], default: [] },

    // dates (YYYY-MM-DD, India) with no appointments
    daysOff: { type: [String], default: [] },

    // how far ahead people can book
    maxAdvanceDays: { type: Number, min: 1, max: 60, default: 30 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DoctorSchedule", doctorScheduleSchema);