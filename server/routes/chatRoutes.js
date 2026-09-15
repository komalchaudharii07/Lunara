const express = require("express");

const {
  getChatHistory,
  clearChatHistory,
} = require("../controllers/chatController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getChatHistory);
router.delete("/", protect, clearChatHistory);

module.exports = router;