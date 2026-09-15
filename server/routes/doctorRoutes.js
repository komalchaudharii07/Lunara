const express = require("express");

const {
  getDoctors,
  getDoctor,
} = require("../controllers/doctorController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getDoctors);
router.get("/:id", protect, getDoctor);

module.exports = router;