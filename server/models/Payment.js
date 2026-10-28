const mongoose = require("mongoose");

// A record of every online payment attempt. It is written next to the existing payment code
// (the appointment still holds the live status); this is the history you can audit.
const paymentSchema = new mongoose.Schema(
  {
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },

    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String },

    amountPaise: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },

    status: {
      type: String,
      enum: ["created", "paid", "failed", "refund_processing", "refund_pending", "refunded"],
      default: "created",
    },

    failureReason: { type: String, maxlength: 300 },
    paidAt: { type: Date },
    refundId: { type: String },
    refundedAt: { type: Date },

    // a simple trail: what happened and when
    events: {
      type: [
        new mongoose.Schema(
          { type: { type: String, required: true }, at: { type: Date, default: Date.now }, note: { type: String, maxlength: 300 } },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);