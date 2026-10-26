const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  getSlots,
  bookAppointment,
  getMyAppointments,
  cancelMyAppointment,
  setReportSharing,
  getSchedule,
  saveSchedule,
  getDoctorAppointments,
  updateByDoctor,
  getSharedReport,
  savePrescription,
  getPrescription,
} = require("../controllers/appointmentController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// each route gets its own limiter instance (limits are per user, after protect)
const limiter = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => String(req.user),
    message: { message },
  });

const bookLimiter = () =>
  limiter(15 * 60 * 1000, 10, "Too many booking attempts. Please try again in a few minutes.");
const changeLimiter = () =>
  limiter(15 * 60 * 1000, 60, "Too many changes. Please try again in a few minutes.");
const slotLimiter = () =>
  limiter(5 * 60 * 1000, 120, "Too many requests. Please slow down for a moment.");

// people
router.get("/slots/:doctorId", protect, slotLimiter(), getSlots);
router.post("/", protect, bookLimiter(), bookAppointment);
router.get("/mine", protect, getMyAppointments);

// doctors and admins (checked inside the controller)
router.get("/schedule/:doctorId", protect, getSchedule);
router.put("/schedule/:doctorId", protect, changeLimiter(), saveSchedule);
router.get("/doctor/:doctorId", protect, getDoctorAppointments);

// one appointment
router.patch("/:id/cancel", protect, changeLimiter(), cancelMyAppointment);
router.patch("/:id/share", protect, changeLimiter(), setReportSharing);
router.patch("/:id/doctor", protect, changeLimiter(), updateByDoctor);
router.get("/:id/report", protect, changeLimiter(), getSharedReport);
router.put("/:id/prescription", protect, changeLimiter(), savePrescription);
router.get("/:id/prescription", protect, changeLimiter(), getPrescription);

module.exports = router;