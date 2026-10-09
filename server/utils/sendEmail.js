const { Resend } = require("resend");

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const sendEmail = async ({ to, subject, html, text, replyTo }) => {
  // Dev fallback: no key configured, print instead of sending
  if (!resend) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is not configured");
    }
    console.log("\n[DEV EMAIL]", { to, subject, text });
    return;
  }

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || "Lunara <onboarding@resend.dev>",
    to,
    subject,
    html,
    text,
    replyTo,
  });

  if (error) throw new Error(error.message);
};

module.exports = sendEmail;