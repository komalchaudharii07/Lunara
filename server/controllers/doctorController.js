const mongoose = require("mongoose");
const Doctor = require("../models/Doctor");

// only public profile fields ever go to the client
const PUBLIC_FIELDS =
  "name specialization experience qualification consultationFee available";

// GET ALL DOCTORS
const getDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find({ available: true })
      .sort({ createdAt: -1 })
      .limit(100)
      .select(PUBLIC_FIELDS)
      .lean();

    res.json({ doctors });
  } catch (error) {
    console.error("Get doctors error:", error);
    res.status(500).json({ message: "Failed to fetch doctors" });
  }
};

// GET SINGLE DOCTOR
const getDoctor = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid doctor ID" });
    }

    const doctor = await Doctor.findOne({
      _id: req.params.id,
      available: true,
    })
      .select(PUBLIC_FIELDS)
      .lean();

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    res.json({ doctor });
  } catch (error) {
    console.error("Get doctor error:", error);
    res.status(500).json({ message: "Failed to fetch doctor" });
  }
};

module.exports = {
  getDoctors,
  getDoctor,
};