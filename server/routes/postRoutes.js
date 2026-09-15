const express = require("express");

const {
  createPost,
  getPosts,
  toggleLike,
} = require("../controllers/postController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getPosts);
router.post("/", protect, createPost);
router.put("/:id/like", protect, toggleLike);

module.exports = router;