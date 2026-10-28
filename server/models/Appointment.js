const mongoose = require("mongoose");

// one medicine line on a prescription
const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    dose: { type: String, trim: true, maxlength: 60, default: "" },
    frequency: { type: String, trim: true, maxlength: 60, default: "" },
    duration: { type: String, trim: true, maxlength: 60, default: "" },
    notes: { type: String, trim: true, maxlength: 200, default: "" },
  },
  { _id: false }
);

// an older version of the prescription, kept when the doctor edits it
const revisionSchema = new mongoose.Schema(
  {
    at: { type: Date, required: true },
    diagnosis: { type: String, default: "" },
    medicines: { type: [medicineSchema], default: [] },
    advice: { type: String, default: "" },
    followUp: { type: String, default: "" },
  },
  { _id: false }
);

// written by the doctor after (or during) the visit; only the patient and that doctor can read it
const prescriptionSchema = new mongoose.Schema(
  {
    diagnosis: { type: String, trim: true, maxlength: 500, default: "" },
    medicines: { type: [medicineSchema], default: [] },
    advice: { type: String, trim: true, maxlength: 1500, default: "" },
    followUp: { type: String, trim: true, maxlength: 200, default: "" },
    issuedAt: { type: Date },
    updatedAt: { type: Date },
    // the last 20 earlier versions (newest last); only the doctor can see them
    revisions: { type: [revisionSchema], default: [] },
  },
  { _id: false }
);

const appointmentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },

    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },

    // pending_payment: slot held while the person pays (10 minutes)
    // expired: the hold ran out without a payment
    status: {
      type: String,
      enum: ["pending_payment", "booked", "completed", "cancelled", "expired"],
      default: "booked",
    },

    // true while the appointment owns its time slot. Set automatically from status.
    holdsSlot: { type: Boolean, default: false },

    reason: { type: String, trim: true, maxlength: 500, default: "" },

    // the fee when it was booked (the doctor's fee may change later)
    fee: { type: Number, min: 0 },

    // ---- payment
    paymentStatus: {
      type: String,
      enum: [
        "not_required", // free visit, or online payment is switched off
        "pending",
        "paid",
        "refund_processing",
        "refund_pending", // the refund failed and will be retried
        "refunded",
      ],
      default: "not_required",
    },
    amountPaise: { type: Number, min: 0 },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    paidAt: { type: Date },
    holdExpiresAt: { type: Date },
    refundId: { type: String },
    refundedAt: { type: Date },

    // the person chose to let the doctor see their cycle report for this visit
    shareReport: { type: Boolean, default: false },
    reportViewedAt: { type: Date },

    // video call room (https only)
    meetingLink: { type: String, trim: true, maxlength: 300 },

    // the doctor's prescription / visit summary
    prescription: { type: prescriptionSchema },

    // moving the visit to another time (once, and not within 2 hours of the start)
    rescheduleCount: { type: Number, default: 0, min: 0 },
    previousStartsAt: { type: Date },
    rescheduledAt: { type: Date },

    cancelledBy: { type: String, enum: ["user", "doctor"] },
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);

appointmentSchema.pre("validate", function () {
  this.holdsSlot = this.status === "booked" || this.status === "pending_payment";
});

// The database itself refuses a double booking: one active appointment per
// doctor per time, and one per person per time. A held (unpaid) slot counts.
appointmentSchema.index(
  { doctor: 1, startsAt: 1, holdsSlot: 1 },
  { unique: true, partialFilterExpression: { holdsSlot: true }, name: "doctor_slot_held" }
);
appointmentSchema.index(
  { user: 1, startsAt: 1, holdsSlot: 1 },
  { unique: true, partialFilterExpression: { holdsSlot: true }, name: "user_slot_held" }
);
appointmentSchema.index({ user: 1, startsAt: -1 });
appointmentSchema.index({ doctor: 1, startsAt: -1 });
appointmentSchema.index({ razorpayOrderId: 1 }, { sparse: true });
appointmentSchema.index({ status: 1, holdExpiresAt: 1 });

module.exports = mongoose.model("Appointment", appointmentSchema);