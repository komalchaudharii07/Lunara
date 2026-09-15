const express = require("express");

const { askLunaraAI } = require("../controllers/aiController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/ask", protect, askLunaraAI);

module.exports = router;