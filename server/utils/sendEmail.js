const { Resend } = require("resend");

// created on first use, so it never depends on when dotenv was loaded
let resend;
const getResend = () => {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
};

const sendEmail = async ({ to, subject, html, text, replyTo }) => {
  const client = getResend();

  if (!client) {
    // Printing emails to the console is for local development ONLY.
    // Set NODE_ENV=development in your local .env to use it.
    // Anywhere else we fail, so reset links are never written to server logs.
    if (process.env.NODE_ENV === "development") {
      console.log("\n[DEV EMAIL]", { to, subject, text });
      return;
    }
    throw new Error("RESEND_API_KEY is not configured");
  }

  const { error } = await client.emails.send({
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