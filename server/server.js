const dotenv = require("dotenv");

dotenv.config();

// Fail fast if a required secret is missing
["MONGO_URI", "JWT_SECRET", "GEMINI_API_KEY", "CLIENT_URL"].forEach((key) => {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
});

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
const aiRoutes = require("./routes/aiRoutes");
const chatRoutes = require("./routes/chatRoutes");
const postRoutes = require("./routes/postRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const contactRoutes = require("./routes/contactRoutes");

const connectDB = require("./config/db");

const app = express();

// Needed when deployed behind a proxy (Render, Railway, Nginx, etc.)
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

app.use(express.json({ limit: "10kb" }));

// General limit for every route
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests. Please try again later." },
  })
);

// Strict limit for login and registration
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again in 15 minutes." },
});
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/reset-password", authLimiter);
app.use("/api/contact", rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: "Too many messages. Please try again later." },
}));

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/cycles", cycleRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/contact", contactRoutes);

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

  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Something went wrong" });
});

const PORT = process.env.PORT || 5000;

// Connect to the database first, then accept requests
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});