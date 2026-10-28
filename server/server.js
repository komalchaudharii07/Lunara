const dotenv = require("dotenv");

dotenv.config();

// Fail fast if a required secret is missing
const required = ["MONGO_URI", "JWT_SECRET", "GEMINI_API_KEY", "CLIENT_URL"];
if (process.env.NODE_ENV === "production") {
  required.push("RESEND_API_KEY", "CONTACT_EMAIL", "EMAIL_FROM");
}

required.forEach((key) => {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
});


// online payment needs both keys. Having only one is a mistake.
if (Boolean(process.env.RAZORPAY_KEY_ID) !== Boolean(process.env.RAZORPAY_KEY_SECRET)) {
  console.error("Set both RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET, or neither");
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET must be at least 32 characters long");
  process.exit(1);
}

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");
const cycleRoutes = require("./routes/cycleRoutes");
const logRoutes = require("./routes/logRoutes");
const aiRoutes = require("./routes/aiRoutes");
const chatRoutes = require("./routes/chatRoutes");
const postRoutes = require("./routes/postRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const contactRoutes = require("./routes/contactRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const reportRoutes = require("./routes/reportRoutes");
const fileRoutes = require("./routes/fileRoutes");
const medicalReportRoutes = require("./routes/medicalReportRoutes");

const paymentRoutes = require("./routes/paymentRoutes");
const { expireStaleHolds, retryPendingRefunds } = require("./utils/payments");

const connectDB = require("./config/db");

const app = express();

// Needed when deployed behind a proxy (Render, Railway, Nginx, etc.).
// 1 = exactly one proxy in front of the app. Use 2 if Cloudflare is also in front.
app.set("trust proxy", 1);

app.use(helmet());

const allowedOrigins = process.env.CLIENT_URL.split(",").map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
  })
);

// the webhook signature is calculated over the exact bytes Razorpay sent,
// so keep a copy of the raw body for that one route
app.use(
  express.json({
    limit: "32kb", // a prescription with 15 medicines is several KB
    verify: (req, res, buf) => {
      if (req.originalUrl.startsWith("/api/payments/webhook")) req.rawBody = buf;
    },
  })
);

// Express 5 leaves req.body undefined when a request has no JSON body.
// Controllers destructure it, so give them an empty object (-> clean 400, not 500).
app.use((req, res, next) => {
  if (req.body === undefined) req.body = {};
  next();
});

// General limit for every route
// (login, register, password reset, contact, AI and the rest have their own
// stricter limits inside their route files)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests. Please try again later." },
        // Razorpay's server calls the webhook. It is protected by its signature instead.
    // private files have their own per-user limit, and a page of doctor photos is many requests
    skip: (req) =>
      req.originalUrl.startsWith("/api/payments/webhook") ||
      req.originalUrl.startsWith("/api/files/"),
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/cycles", cycleRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/medical-reports", medicalReportRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Lunara API is running" });
});

// 404 for unknown routes
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Central error handler (always JSON, never a stack trace)
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON" });
  }

  if (err.type === "entity.too.large") {
    return res.status(413).json({ message: "Request is too large" });
  }

  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ message: "Origin not allowed" });
  }

  // other client errors (4xx) keep their status instead of becoming a 500
  if (Number.isInteger(err.status) && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ message: "Bad request" });
  }

  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Something went wrong" });
});

const PORT = process.env.PORT || 5000;

// Connect to the database first, then accept requests
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(
      process.env.RAZORPAY_KEY_ID
        ? "Online payment: ON"
        : "Online payment: OFF (set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to turn it on)"
    );
  });

  // every minute: free slots nobody paid for, and retry refunds that failed
  const sweep = () => {
    expireStaleHolds().catch((err) => console.error("Hold sweep failed:", err.message));
    if (process.env.RAZORPAY_KEY_ID) {
      retryPendingRefunds().catch((err) => console.error("Refund retry failed:", err.message));
    }
  };
  setInterval(sweep, 60 * 1000).unref();
});