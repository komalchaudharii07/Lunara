const Doctor = require("../models/Doctor");

// GET ALL DOCTORS
const getDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find({
      available: true,
    }).sort({ createdAt: -1 });

    res.json({ doctors });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch doctors",
    });
  }
};

// GET SINGLE DOCTOR
const getDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({
        message: "Doctor not found",
      });
    }

    res.json({ doctor });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch doctor",
    });
  }
};

module.exports = {
  getDoctors,
  getDoctor,
};