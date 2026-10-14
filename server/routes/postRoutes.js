const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  createPost,
  getPosts,
  toggleLike,
  deletePost,
  reportPost,
  getModerationQueue,
  setPostStatus,
} = require("../controllers/postController");

const protect = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/adminMiddleware");

const router = express.Router();

const byUser = (req) => String(req.user);

const limiter = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: byUser,
    message: { message },
  });

const postLimiter = limiter(60 * 60 * 1000, 5, "You're posting a lot. Please try again later.");
const likeLimiter = limiter(15 * 60 * 1000, 60, "Too many likes. Please slow down.");
const reportLimiter = limiter(60 * 60 * 1000, 20, "Too many reports. Please try again later.");

router.get("/", protect, getPosts);
router.post("/", protect, postLimiter, createPost);

// moderators (static paths go BEFORE the "/:id" routes)
router.get("/moderation/queue", protect, requireAdmin, getModerationQueue);
router.patch("/:id/status", protect, requireAdmin, setPostStatus);

router.put("/:id/like", protect, likeLimiter, toggleLike);
router.post("/:id/report", protect, reportLimiter, reportPost);
router.delete("/:id", protect, deletePost);

module.exports = router;