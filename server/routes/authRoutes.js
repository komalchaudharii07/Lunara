const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  deleteAccount,
  setAiConsent,
  logoutOtherDevices,
  exportData,
} = require("../controllers/authController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

const limiter = (windowMs, limit, message, extra = {}) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
    ...extra,
  });

// public routes: counted per IP, each route has its OWN counter
const loginLimiter = limiter(
  15 * 60 * 1000,
  10,
  "Too many login attempts. Try again in 15 minutes.",
  { skipSuccessfulRequests: true }
);
const registerLimiter = limiter(
  60 * 60 * 1000,
  10,
  "Too many sign-ups from this network. Try again later."
);
const forgotLimiter = limiter(
  60 * 60 * 1000,
  5,
  "Too many reset requests. Try again later."
);
const resetLimiter = limiter(
  15 * 60 * 1000,
  10,
  "Too many attempts. Try again later."
);

// sensitive routes: counted per logged-in user (run after protect).
// Each route gets its OWN counter, so using one doesn't use up another.
const sensitiveLimiter = () =>
  limiter(
    15 * 60 * 1000,
    5,
    "Too many attempts. Try again in a few minutes.",
    { keyGenerator: (req) => String(req.user) }
  );

// Public routes
router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.post("/forgot-password", forgotLimiter, forgotPassword);
router.post("/reset-password/:token", resetLimiter, resetPassword);

// Protected routes
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);
router.put("/change-password", protect, sensitiveLimiter(), changePassword);
router.put("/ai-consent", protect, setAiConsent);
router.post("/logout-all", protect, sensitiveLimiter(), logoutOtherDevices);
router.get("/export", protect, sensitiveLimiter(), exportData);
router.delete("/me", protect, sensitiveLimiter(), deleteAccount);

module.exports = router;