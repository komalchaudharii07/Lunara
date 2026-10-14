const mongoose = require("mongoose");

const Appointment = require("../models/Appointment");
const razorpay = require("../utils/razorpay");
const {
  expireStaleHolds,
  finalizePaid,
  paymentParams,
} = require("../utils/payments");
const { sendBookedEmail } = require("../utils/appointmentEmails");

// one confirmation email, whichever of the browser or the webhook gets there first
const emailIfBooked = (result) => {
  if (result.outcome !== "booked") return;
  const a = result.appointment;
  sendBookedEmail({
    userId: a.user,
    doctorId: a.doctor,
    startsAt: a.startsAt,
    amountPaise: a.amountPaise,
  });
};

const isId = (id) => mongoose.Types.ObjectId.isValid(id);

// GET /api/payments/config  (the app uses it to decide what to show)
const getPaymentConfig = (req, res) => {
  res.json({ enabled: razorpay.isEnabled() });
};

// POST /api/payments/verify
// body: { appointmentId, razorpay_order_id, razorpay_payment_id, razorpay_signature }
const verifyPayment = async (req, res) => {
  try {
    const {
      appointmentId,
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    } = req.body;

    if (
      !isId(appointmentId) ||
      typeof orderId !== "string" ||
      typeof paymentId !== "string" ||
      typeof signature !== "string"
    ) {
      return res.status(400).json({ message: "Invalid payment details" });
    }

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      user: req.user,
    })
      .select("razorpayOrderId")
      .lean();

    // the order must be the one made for THIS appointment
    if (!appointment || appointment.razorpayOrderId !== orderId) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (!razorpay.verifyPaymentSignature(orderId, paymentId, signature)) {
      return res.status(400).json({ message: "We couldn't confirm this payment." });
    }

    const result = await finalizePaid(appointmentId, paymentId);
    emailIfBooked(result);

    if (result.outcome === "refunded" || result.outcome === "missing") {
      return res.status(409).json({
        message:
          "Your payment arrived after this time was taken. It will be refunded to your account in 5 to 7 working days. Please book another time.",
      });
    }

    res.json({ status: "booked", appointmentId });
  } catch (error) {
    console.error("Verify payment error:", error);
    res.status(500).json({
      message:
        "We couldn't finish confirming your payment. If money was taken, your appointment will be confirmed shortly or refunded.",
    });
  }
};

// GET /api/payments/checkout/:appointmentId
// Opens the payment window again for an appointment that is still waiting for payment.
const getCheckout = async (req, res) => {
  try {
    if (!isId(req.params.appointmentId)) {
      return res.status(400).json({ message: "Invalid appointment" });
    }

    await expireStaleHolds({ _id: req.params.appointmentId });

    const appointment = await Appointment.findOne({
      _id: req.params.appointmentId,
      user: req.user,
      status: "pending_payment",
    }).populate("doctor", "name");

    if (!appointment || !appointment.razorpayOrderId) {
      return res.status(404).json({
        message: "This booking is no longer waiting for payment. Please book again.",
      });
    }

    res.json({ payment: paymentParams(appointment, appointment.doctor?.name || "your doctor") });
  } catch (error) {
    console.error("Checkout error:", error);
    res.status(500).json({ message: "Couldn't open the payment window" });
  }
};

// POST /api/payments/webhook  (called by Razorpay, signed with RAZORPAY_WEBHOOK_SECRET)
// This confirms the booking even if the person closes the browser right after paying.
const handleWebhook = async (req, res) => {
  try {
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
      return res.status(503).json({ message: "Webhook is not configured" });
    }

    if (
      !razorpay.verifyWebhookSignature(req.rawBody, req.get("x-razorpay-signature"))
    ) {
      return res.status(400).json({ message: "Invalid signature" });
    }

    let event;
    try {
      event = JSON.parse(req.rawBody.toString("utf8"));
    } catch {
      return res.status(400).json({ message: "Invalid body" });
    }

    if (event.event === "payment.captured" || event.event === "order.paid") {
      const payment = event.payload?.payment?.entity;
      const orderId = payment?.order_id || event.payload?.order?.entity?.id;

      if (typeof payment?.id === "string" && typeof orderId === "string") {
        const appointment = await Appointment.findOne({ razorpayOrderId: orderId })
          .select("_id")
          .lean();

        if (appointment) {
          emailIfBooked(await finalizePaid(appointment._id, payment.id));
        }
      }
    }

    // anything else is acknowledged and ignored
    res.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    // a 500 makes Razorpay try again later
    res.status(500).json({ message: "Webhook failed" });
  }
};

module.exports = { getPaymentConfig, verifyPayment, getCheckout, handleWebhook };