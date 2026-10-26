const mongoose = require("mongoose");
const Doctor = require("../models/Doctor");
const User = require("../models/User");
const { parseDoctorInput } = require("../utils/doctorInput");

// only public profile fields ever go to other people
const PUBLIC_FIELDS =
  "name specialization experience qualification consultationFee available bio";

// people can only see (and book) doctors who are approved and have bookings switched on
const LISTED = { available: true, verificationStatus: "approved" };

// GET ALL LISTED DOCTORS
const getDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find(LISTED)
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

// GET SINGLE LISTED DOCTOR
const getDoctor = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid doctor ID" });
    }

    const doctor = await Doctor.findOne({ _id: req.params.id, ...LISTED })
      .select(PUBLIC_FIELDS)
      .lean();

    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    res.json({ doctor });
  } catch (error) {
    console.error("Get doctor error:", error);
    res.status(500).json({ message: "Failed to fetch doctor" });
  }
};

// ---------------------------------------------------------------- the doctor's own profile

const OWN_FIELDS =
  "name specialization experience qualification consultationFee bio available registrationNumber registrationCouncil verificationStatus verificationNote";

const findOwnDoctor = async (userId) => {
  const user = await User.findById(userId).select("doctorId").lean();
  if (!user?.doctorId) return null;
  return Doctor.findById(user.doctorId);
};

// GET /api/doctors/me/profile
const getMyProfile = async (req, res) => {
  try {
    const doctor = await findOwnDoctor(req.user);
    if (!doctor) return res.status(404).json({ message: "No doctor profile on this account" });

    const out = await Doctor.findById(doctor._id).select(OWN_FIELDS).lean();
    res.json({ doctor: out });
  } catch (error) {
    console.error("My doctor profile error:", error);
    res.status(500).json({ message: "Couldn't load your profile" });
  }
};

// PUT /api/doctors/me/profile  (licence details can't be changed here)
const updateMyProfile = async (req, res) => {
  try {
    const doctor = await findOwnDoctor(req.user);
    if (!doctor) return res.status(404).json({ message: "No doctor profile on this account" });

    const { error, value } = parseDoctorInput(req.body, { requireAll: false, withLicence: false });
    if (error) return res.status(400).json({ message: error });

    // only an approved doctor can switch bookings on
    if (value.available === true && doctor.verificationStatus !== "approved") {
      return res
        .status(403)
        .json({ message: "You can accept bookings once an admin approves your profile." });
    }

    Object.assign(doctor, value);
    await doctor.save();

    const out = await Doctor.findById(doctor._id).select(OWN_FIELDS).lean();
    res.json({ message: "Profile saved", doctor: out });
  } catch (error) {
    console.error("Update doctor profile error:", error);
    res.status(500).json({ message: "Couldn't save your profile" });
  }
};

// ---------------------------------------------------------------- admin review

const STATUSES = ["pending", "approved", "rejected"];

// GET /api/doctors/admin/review?status=pending
const listForReview = async (req, res) => {
  try {
    const status = STATUSES.includes(req.query.status) ? req.query.status : "pending";

    const doctors = await Doctor.find({ verificationStatus: status })
      .sort({ createdAt: 1 })
      .limit(100)
      .select(
        "name specialization experience qualification consultationFee bio registrationNumber registrationCouncil verificationStatus verificationNote createdAt user"
      )
      .populate("user", "email")
      .lean();

    res.json({ doctors });
  } catch (error) {
    console.error("Doctor review list error:", error);
    res.status(500).json({ message: "Couldn't load doctors" });
  }
};

// PATCH /api/doctors/admin/:id/review  { decision: "approve" | "reject", note }
const reviewDoctor = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid doctor ID" });
    }

    const { decision, note } = req.body || {};
    if (!["approve", "reject"].includes(decision)) {
      return res.status(400).json({ message: "Decision must be approve or reject" });
    }

    const cleanNote = typeof note === "string" ? note.trim().slice(0, 300) : "";
    if (decision === "reject" && cleanNote.length < 3) {
      return res.status(400).json({ message: "Please give a short reason for rejecting" });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    if (decision === "approve") {
      doctor.verificationStatus = "approved";
      doctor.available = true;
      doctor.verificationNote = "";
    } else {
      doctor.verificationStatus = "rejected";
      doctor.available = false;
      doctor.verificationNote = cleanNote;
    }
    doctor.reviewedAt = new Date();
    doctor.reviewedBy = req.user;
    await doctor.save();

    res.json({ message: decision === "approve" ? "Doctor approved" : "Doctor rejected" });
  } catch (error) {
    console.error("Review doctor error:", error);
    res.status(500).json({ message: "Couldn't save the decision" });
  }
};

module.exports = {
  getDoctors,
  getDoctor,
  getMyProfile,
  updateMyProfile,
  listForReview,
  reviewDoctor,
};