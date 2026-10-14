const express = require("express");
const rateLimit = require("express-rate-limit");
const { sendContactMessage } = require("../controllers/contactController");

const router = express.Router();

// public endpoint that sends an email on every call: keep it tight
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many messages. Please try again in an hour." },
});

router.post("/", contactLimiter, sendContactMessage);

module.exports = router;