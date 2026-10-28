const express = require("express");
const rateLimit = require("express-rate-limit");

const { getFile } = require("../controllers/fileController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

const fileLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user),
  message: { message: "Too many downloads. Please wait a moment." },
});

router.get("/:id", protect, fileLimiter, getFile);

module.exports = router;