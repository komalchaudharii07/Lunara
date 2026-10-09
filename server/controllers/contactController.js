const sendEmail = require("../utils/sendEmail");

const escapeHtml = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const sendContactMessage = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    const ok =
      [name, email, subject, message].every((v) => typeof v === "string") &&
      name.trim() && name.length <= 100 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 &&
      subject.trim() && subject.length <= 150 &&
      message.trim() && message.length <= 2000;

    if (!ok) {
      return res.status(400).json({ message: "Please fill in all fields correctly" });
    }

    const to = process.env.CONTACT_EMAIL;
    if (!to) {
      console.error("CONTACT_EMAIL is not configured");
      return res.status(500).json({ message: "Could not send message right now" });
    }

    await sendEmail({
      to,
      replyTo: email.trim(),
      subject: `[Lunara contact] ${subject.replace(/[\r\n]+/g, " ").trim()}`,
      text: `From: ${name} <${email}>\n\n${message}`,
      html: `<p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
<p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
    });

    res.json({ message: "Thanks! We'll get back to you soon." });
  } catch (error) {
    console.error("Contact error:", error);
    res.status(500).json({ message: "Could not send message right now" });
  }
};

module.exports = { sendContactMessage };