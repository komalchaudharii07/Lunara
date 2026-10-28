const User = require("../models/User");
const Doctor = require("../models/Doctor");

// Runs after `protect`. Lets only a logged-in doctor through and puts their profile id on the request.
// Pending or rejected doctors pass (they must be able to fix their application);
// routes that need approval use `requireApprovedDoctor`.
const requireDoctor = async (req, res, next) => {
  try {
    const user = await User.findById(req.user).select("doctorId").lean();
    if (!user?.doctorId) return res.status(403).json({ message: "This is only for doctors" });
    req.doctorId = String(user.doctorId);
    next();
  } catch (error) {
    console.error("requireDoctor error:", error);
    res.status(500).json({ message: "Couldn't check your account" });
  }
};

const requireApprovedDoctor = async (req, res, next) => {
  await requireDoctor(req, res, async (err) => {
    if (err) return next(err);
    try {
      const doctor = await Doctor.findById(req.doctorId).select("verificationStatus").lean();
      if (doctor?.verificationStatus !== "approved") {
        return res.status(403).json({ message: "Your profile must be approved first" });
      }
      next();
    } catch (error) {
      console.error("requireApprovedDoctor error:", error);
      res.status(500).json({ message: "Couldn't check your account" });
    }
  });
};

module.exports = { requireDoctor, requireApprovedDoctor };