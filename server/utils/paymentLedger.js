// Writes the payment history. It never throws: a problem here must not break a real payment.
const Payment = require("../models/Payment");

const safe = (label, fn) =>
  fn().catch((error) => console.error(`Payment ledger (${label}) failed:`, error.message));

// a new Razorpay order was created for an appointment
const logOrder = (appointment, order) =>
  safe("order", () =>
    Payment.updateOne(
      { razorpayOrderId: order.id },
      {
        $setOnInsert: {
          appointment: appointment._id,
          user: appointment.user,
          doctor: appointment.doctor,
          razorpayOrderId: order.id,
          amountPaise: appointment.amountPaise,
          status: "created",
        },
        $push: { events: { type: "order_created", at: new Date() } },
      },
      { upsert: true }
    )
  );

// the payment was confirmed (browser or webhook; safe to call twice)
const logPaid = (appointment, paymentId) =>
  safe("paid", () =>
    Payment.updateOne(
      { appointment: appointment._id, status: { $in: ["created", "failed"] } },
      {
        $set: { status: "paid", razorpayPaymentId: paymentId, paidAt: new Date(), failureReason: undefined },
        $push: { events: { type: "paid", at: new Date() } },
      }
    )
  );

// Razorpay told us an attempt failed (the person can still try again)
const logFailed = (orderId, paymentId, reason) =>
  safe("failed", () =>
    Payment.updateOne(
      { razorpayOrderId: orderId, status: "created" },
      {
        $set: { status: "failed", razorpayPaymentId: paymentId, failureReason: String(reason || "").slice(0, 300) },
        $push: { events: { type: "failed", at: new Date(), note: String(reason || "").slice(0, 300) } },
      }
    )
  );

// refund moved forward: status is refund_processing | refund_pending | refunded
const logRefund = (appointmentId, status, refundId) =>
  safe("refund", () =>
    Payment.updateOne(
      { appointment: appointmentId, status: { $in: ["paid", "refund_processing", "refund_pending"] } },
      {
        $set: {
          status,
          ...(refundId ? { refundId } : {}),
          ...(status === "refunded" ? { refundedAt: new Date() } : {}),
        },
        $push: { events: { type: status, at: new Date() } },
      }
    )
  );

module.exports = { logOrder, logPaid, logFailed, logRefund };