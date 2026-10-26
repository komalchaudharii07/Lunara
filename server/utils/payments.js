// Everything that moves an appointment through the payment steps.
// Used by the appointment controller, the payment routes and the background sweeper.
const Appointment = require("../models/Appointment");
const razorpay = require("./razorpay");

const HOLD_MS = 10 * 60 * 1000; // a slot is held for 10 minutes while the person pays

// pending holds nobody paid for stop blocking the slot
const expireStaleHolds = (extra = {}) =>
  Appointment.updateMany(
    { status: "pending_payment", holdExpiresAt: { $lt: new Date() }, ...extra },
    { $set: { status: "expired", holdsSlot: false } }
  );

// what the browser needs to open Razorpay Checkout
const paymentParams = (appointment, doctorName) => ({
  keyId: razorpay.keyId(),
  orderId: appointment.razorpayOrderId,
  amount: appointment.amountPaise,
  currency: "INR",
  description: `Consultation with ${doctorName}`,
  holdExpiresAt: appointment.holdExpiresAt,
  appointmentId: String(appointment._id),
});

// Gives the money back for a paid appointment. Safe to call twice.
const issueRefund = async (appointmentId) => {
  // claim it, so two requests never refund the same payment
  const appointment = await Appointment.findOneAndUpdate(
    {
      _id: appointmentId,
      paymentStatus: { $in: ["paid", "refund_pending"] },
      razorpayPaymentId: { $ne: null },
    },
    { $set: { paymentStatus: "refund_processing" } },
    { new: true }
  );

  if (!appointment) return { refunded: false };

  try {
    const refund = await razorpay.refundPayment(appointment.razorpayPaymentId, {
      amountPaise: appointment.amountPaise,
      receipt: `refund_${appointment._id}`,
      notes: { appointment: String(appointment._id) },
    });

    await Appointment.updateOne(
      { _id: appointment._id },
      { $set: { paymentStatus: "refunded", refundId: refund.id, refundedAt: new Date() } }
    );
    return { refunded: true };
  } catch (error) {
    // Razorpay says it was already refunded: that is a success
    if (
      /already.*refund|fully refunded/i.test(error.message) ||
      /already.*refund|fully refunded/i.test(error.description || "")
    ) {
      await Appointment.updateOne(
        { _id: appointment._id },
        { $set: { paymentStatus: "refunded", refundedAt: new Date() } }
      );
      return { refunded: true };
    }

    console.error("Refund failed for appointment", String(appointment._id), error.message);
    await Appointment.updateOne(
      { _id: appointment._id },
      { $set: { paymentStatus: "refund_pending" } }
    );
    return { refunded: false, error: error.message };
  }
};

// tries again for refunds that failed or got stuck
const retryPendingRefunds = async () => {
  const stuck = new Date(Date.now() - 10 * 60 * 1000);
  const list = await Appointment.find({
    $or: [
      { paymentStatus: "refund_pending" },
      { paymentStatus: "refund_processing", updatedAt: { $lt: stuck } },
    ],
  })
    .select("_id")
    .limit(20)
    .lean();

  for (const item of list) {
    if (item._id) {
      // a stuck "processing" one has to go back to "pending" before it can be claimed
      await Appointment.updateOne(
        { _id: item._id, paymentStatus: "refund_processing", updatedAt: { $lt: stuck } },
        { $set: { paymentStatus: "refund_pending" } }
      );
      await issueRefund(item._id);
    }
  }
};

/**
 * A payment for this appointment went through. Called after the browser's
 * confirmation AND from the webhook, so it must be safe to run twice.
 * Returns { outcome: "booked" | "already" | "refunded" | "missing", appointment? }
 */
const finalizePaid = async (appointmentId, paymentId) => {
  const now = new Date();

  // normal case: the slot is still held for this person
  let appointment = await Appointment.findOneAndUpdate(
    { _id: appointmentId, status: "pending_payment" },
    {
      $set: {
        status: "booked",
        paymentStatus: "paid",
        razorpayPaymentId: paymentId,
        paidAt: now,
      },
      $unset: { holdExpiresAt: "" },
    },
    { new: true }
  );
  if (appointment) return { outcome: "booked", appointment };

  appointment = await Appointment.findById(appointmentId);
  if (!appointment) return { outcome: "missing" };

  // already handled (the browser and the webhook both report the same payment)
  if (appointment.razorpayPaymentId === paymentId) {
    // a payment that was refunded must not look like a confirmed booking
    return ["booked", "completed"].includes(appointment.status)
      ? { outcome: "already", appointment }
      : { outcome: "refunded" };
  }

  // paid after the hold ran out: still fine if nobody else took the slot
  if (appointment.status === "expired" && appointment.startsAt > now) {
    try {
      const revived = await Appointment.findOneAndUpdate(
        { _id: appointmentId, status: "expired" },
        {
          $set: {
            status: "booked",
            holdsSlot: true,
            paymentStatus: "paid",
            razorpayPaymentId: paymentId,
            paidAt: now,
          },
          $unset: { holdExpiresAt: "" },
        },
        { new: true }
      );
      if (revived) return { outcome: "booked", appointment: revived };
    } catch (error) {
      if (error.code !== 11000) throw error; // slot was taken meanwhile: refund below
    }
  }

  // anything else (slot taken, appointment cancelled meanwhile): give the money back
  const attached = await Appointment.updateOne(
    { _id: appointmentId, razorpayPaymentId: null },
    { $set: { paymentStatus: "paid", razorpayPaymentId: paymentId, paidAt: now } }
  );

  if (attached.matchedCount === 0) {
    // a different payment is already attached to this appointment: never refund that one
    console.error(
      "Duplicate payment needs a manual refund:",
      paymentId,
      "appointment",
      String(appointmentId)
    );
    return { outcome: "refunded" };
  }

  await issueRefund(appointmentId);
  return { outcome: "refunded" };
};

module.exports = {
  HOLD_MS,
  expireStaleHolds,
  paymentParams,
  issueRefund,
  retryPendingRefunds,
  finalizePaid,
};