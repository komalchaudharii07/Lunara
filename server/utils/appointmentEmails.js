const sendEmail = require("./sendEmail");
const User = require("../models/User");
const Doctor = require("../models/Doctor");

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));

const whenText = (date) =>
  new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }) + " IST";

// emails never block or break the request
const notify = (payload) => {
  sendEmail(payload).catch((err) =>
    console.error("Appointment email failed:", err.message)
  );
};

// "Your appointment is booked" (also used after a payment is confirmed)
const sendBookedEmail = async ({ userId, doctorId, startsAt, amountPaise }) => {
  try {
    const [user, doctor] = await Promise.all([
      User.findById(userId).select("name email").lean(),
      Doctor.findById(doctorId).select("name").lean(),
    ]);
    if (!user?.email || !doctor) return;

    const paid = amountPaise
      ? ` Your payment of Rs ${(amountPaise / 100).toLocaleString("en-IN")} was received.`
      : "";

    notify({
      to: user.email,
      subject: "Your Lunara appointment is booked",
      text:
        `Hi ${user.name},\n\nYour appointment with ${doctor.name} is booked for ${whenText(startsAt)}.${paid}\n` +
        `You can join the video call from the Appointments page in Lunara shortly before the time.\n\n` +
        `If you can't make it, please cancel at least 2 hours before.\n\nLunara`,
      html:
        `<p>Hi ${esc(user.name)},</p>` +
        `<p>Your appointment with <strong>${esc(doctor.name)}</strong> is booked for <strong>${esc(whenText(startsAt))}</strong>.${esc(paid)}</p>` +
        `<p>You can join the video call from the Appointments page in Lunara shortly before the time.</p>` +
        `<p>If you can't make it, please cancel at least 2 hours before.</p><p>Lunara</p>`,
    });
  } catch (error) {
    console.error("Booked email error:", error.message);
  }
};

module.exports = { esc, whenText, notify, sendBookedEmail };