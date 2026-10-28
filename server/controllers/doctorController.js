const mongoose = require("mongoose");
const Doctor = require("../models/Doctor");
const DoctorSchedule = require("../models/DoctorSchedule");
const FileAsset = require("../models/FileAsset");
const Appointment = require("../models/Appointment");
const User = require("../models/User");
const { parseDoctorInput } = require("../utils/doctorInput");
const { storeUploads } = require("../middleware/upload");
const { removeFile } = require("../utils/fileStore");
const { esc, notify } = require("../utils/appointmentEmails");
const { slotsForDate, istDateKey } = require("../utils/slots");
const { notifyAdminsOfDoctor } = require("../utils/adminAlerts");

const MAX_DOCUMENTS = 5;
const DAY = 24 * 60 * 60 * 1000;

// only public profile fields ever go to other people (never phone, licence or documents)
const PUBLIC_FIELDS =
  "name specialization experience qualification consultationFee available bio clinicName clinicAddress photo";

// people can only see (and book) doctors who are approved and have bookings switched on
const LISTED = { available: true, verificationStatus: "approved" };

const isId = (id) => mongoose.Types.ObjectId.isValid(id);

// keeps only doctors who have set weekly hours (otherwise nobody could book them)
const withSchedule = async (doctors) => {
  if (doctors.length === 0) return doctors;
  const schedules = await DoctorSchedule.find({
    doctor: { $in: doctors.map((d) => d._id) },
    "weekly.0": { $exists: true },
  })
    .select("doctor")
    .lean();
  const ok = new Set(schedules.map((s) => String(s.doctor)));
  return doctors.filter((d) => ok.has(String(d._id)));
};

// the first free slot in the next 3 weeks, or null
const findNextSlot = async (doctorId) => {
  const schedule = await DoctorSchedule.findOne({ doctor: doctorId }).lean();
  if (!schedule || !(schedule.weekly || []).length) return null;

  const now = new Date();
  const taken = await Appointment.find({
    doctor: doctorId,
    holdsSlot: true,
    startsAt: { $gte: now, $lte: new Date(now.getTime() + 22 * DAY) },
    $or: [{ status: "booked" }, { holdExpiresAt: { $gt: now } }],
  })
    .select("startsAt")
    .lean();
  const takenSet = new Set(taken.map((a) => a.startsAt.getTime()));

  const days = Math.min(schedule.maxAdvanceDays || 30, 21);
  for (let i = 0; i <= days; i++) {
    const key = istDateKey(new Date(now.getTime() + i * DAY));
    const free = slotsForDate(schedule, key, now).find((s) => !takenSet.has(s.startsAt.getTime()));
    if (free) return { startsAt: free.startsAt, endsAt: free.endsAt };
  }
  return null;
};

// GET ALL LISTED DOCTORS
const getDoctors = async (req, res) => {
  try {
    const found = await Doctor.find(LISTED)
      .sort({ createdAt: -1 })
      .limit(100)
      .select(PUBLIC_FIELDS)
      .lean();

    res.json({ doctors: await withSchedule(found) });
  } catch (error) {
    console.error("Get doctors error:", error);
    res.status(500).json({ message: "Failed to fetch doctors" });
  }
};

// distance in km between two points on the earth
const distanceKm = (lat1, lng1, lat2, lng2) => {
  const rad = (d) => (d * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
};

// GET /api/doctors/nearby?lat=..&lng=..&km=25  (listed doctors with a clinic on the map)
// without lat/lng it returns every listed doctor who has a pin
const getNearbyDoctors = async (req, res) => {
  try {
    if (req.query.lat === undefined || req.query.lng === undefined) {
      const all = await Doctor.find({
        ...LISTED,
        lat: { $exists: true, $ne: null },
        lng: { $exists: true, $ne: null },
      })
        .select(PUBLIC_FIELDS + " lat lng")
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
      return res.json({ doctors: await withSchedule(all) });
    }

    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const km = Math.min(Math.max(Number(req.query.km) || 25, 1), 100);

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return res.status(400).json({ message: "Location isn't valid" });
    }

    // a quick box first, then the exact distance
    const dLat = km / 111;
    const dLng = km / (111 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));

    const found = await Doctor.find({
      ...LISTED,
      lat: { $gte: lat - dLat, $lte: lat + dLat },
      lng: { $gte: lng - dLng, $lte: lng + dLng },
    })
      .select(PUBLIC_FIELDS + " lat lng")
      .limit(200)
      .lean();

    const doctors = (await withSchedule(found))
      .map((d) => ({ ...d, distanceKm: Math.round(distanceKm(lat, lng, d.lat, d.lng) * 10) / 10 }))
      .filter((d) => d.distanceKm <= km)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 50);

    res.json({ doctors });
  } catch (error) {
    console.error("Nearby doctors error:", error);
    res.status(500).json({ message: "Failed to fetch nearby doctors" });
  }
};

// GET SINGLE LISTED DOCTOR (full public profile + next free time)
const getDoctor = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ message: "Invalid doctor ID" });

    const doctor = await Doctor.findOne({ _id: req.params.id, ...LISTED })
      .select(PUBLIC_FIELDS + " lat lng")
      .lean();

    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    res.json({ doctor, nextSlot: await findNextSlot(doctor._id) });
  } catch (error) {
    console.error("Get doctor error:", error);
    res.status(500).json({ message: "Failed to fetch doctor" });
  }
};

// ---------------------------------------------------------------- the doctor's own profile

const OWN_FIELDS =
  "name specialization experience qualification consultationFee bio available clinicName clinicAddress lat lng phone photo documents registrationNumber registrationCouncil verificationStatus verificationNote";

const findOwnDoctor = async (userId) => {
  const user = await User.findById(userId).select("doctorId").lean();
  if (!user?.doctorId) return null;
  return Doctor.findById(user.doctorId);
};

const ownView = (id) =>
  Doctor.findById(id).select(OWN_FIELDS).populate("documents", "filename mimeType size createdAt").lean();

// GET /api/doctors/me/profile
const getMyProfile = async (req, res) => {
  try {
    const doctor = await findOwnDoctor(req.user);
    if (!doctor) return res.status(404).json({ message: "No doctor profile on this account" });
    res.json({ doctor: await ownView(doctor._id) });
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

    res.json({ message: "Profile saved", doctor: await ownView(doctor._id) });
  } catch (error) {
    console.error("Update doctor profile error:", error);
    res.status(500).json({ message: "Couldn't save your profile" });
  }
};

// PUT /api/doctors/me/photo  (multipart: photo)
const uploadPhoto = async (req, res) => {
  try {
    const doctor = await findOwnDoctor(req.user);
    if (!doctor) return res.status(404).json({ message: "No doctor profile on this account" });

    const [asset] = await storeUploads(req.file, {
      kind: "doctor_photo",
      owner: req.user,
      doctor: doctor._id,
      allowPdf: false,
    });

    const oldId = doctor.photo;
    doctor.photo = asset._id;
    await doctor.save();

    if (oldId) {
      const old = await FileAsset.findOneAndDelete({ _id: oldId, kind: "doctor_photo", doctor: doctor._id });
      if (old) await removeFile(old.gridId);
    }

    res.json({ message: "Photo saved", doctor: await ownView(doctor._id) });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error("Upload doctor photo error:", error);
    res.status(500).json({ message: "Couldn't save the photo" });
  }
};

// POST /api/doctors/me/documents  (multipart: documents[])  licence and ID proof
const addDocuments = async (req, res) => {
  try {
    const doctor = await findOwnDoctor(req.user);
    if (!doctor) return res.status(404).json({ message: "No doctor profile on this account" });

    if (doctor.verificationStatus === "approved") {
      return res.status(400).json({ message: "Your profile is already approved." });
    }
    const files = req.files || [];
    if (doctor.documents.length + files.length > MAX_DOCUMENTS) {
      return res.status(400).json({ message: `You can keep up to ${MAX_DOCUMENTS} documents.` });
    }

    const assets = await storeUploads(files, {
      kind: "doctor_licence",
      owner: req.user,
      doctor: doctor._id,
    });

    doctor.documents.push(...assets.map((a) => a._id));
    await doctor.save();
        User.findById(req.user).select("email").lean()
      .then((account) => notifyAdminsOfDoctor(doctor, account, "documents"))
      .catch(() => {});

    res.status(201).json({ message: "Documents uploaded", doctor: await ownView(doctor._id) });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error("Add doctor documents error:", error);
    res.status(500).json({ message: "Couldn't save the documents" });
  }
};

// DELETE /api/doctors/me/documents/:fileId
const removeDocument = async (req, res) => {
  try {
    if (!isId(req.params.fileId)) return res.status(400).json({ message: "Invalid file" });

    const doctor = await findOwnDoctor(req.user);
    if (!doctor) return res.status(404).json({ message: "No doctor profile on this account" });
    if (doctor.verificationStatus === "approved") {
      return res.status(400).json({ message: "Approved documents can't be removed." });
    }
    if (!doctor.documents.some((d) => String(d) === req.params.fileId)) {
      return res.status(404).json({ message: "File not found" });
    }

    doctor.documents = doctor.documents.filter((d) => String(d) !== req.params.fileId);
    await doctor.save();

    const asset = await FileAsset.findOneAndDelete({
      _id: req.params.fileId,
      kind: "doctor_licence",
      doctor: doctor._id,
    });
    if (asset) await removeFile(asset.gridId);

    res.json({ message: "Document removed", doctor: await ownView(doctor._id) });
  } catch (error) {
    console.error("Remove doctor document error:", error);
    res.status(500).json({ message: "Couldn't remove the document" });
  }
};

// POST /api/doctors/me/resubmit  (a rejected doctor asks for another review)
const resubmit = async (req, res) => {
  try {
    const doctor = await findOwnDoctor(req.user);
    if (!doctor) return res.status(404).json({ message: "No doctor profile on this account" });

    if (doctor.verificationStatus !== "rejected") {
      return res.status(400).json({ message: "Only a rejected application can be sent again." });
    }
    if (doctor.documents.length === 0) {
      return res.status(400).json({ message: "Please upload your licence document first." });
    }

    doctor.verificationStatus = "pending";
    doctor.verificationNote = "";
    await doctor.save();

    res.json({ message: "Sent for review again", doctor: await ownView(doctor._id) });
  } catch (error) {
    console.error("Resubmit doctor error:", error);
    res.status(500).json({ message: "Couldn't send it for review" });
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
        "name specialization experience qualification consultationFee bio phone photo clinicName clinicAddress registrationNumber registrationCouncil verificationStatus verificationNote createdAt user documents"
      )
      .populate("user", "email")
      .populate("documents", "filename mimeType size createdAt")
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
    if (!isId(req.params.id)) return res.status(400).json({ message: "Invalid doctor ID" });

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
      if (doctor.documents.length === 0) {
        return res.status(400).json({ message: "This doctor hasn't uploaded a licence document yet." });
      }
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

    // tell the doctor (best effort)
    const owner = doctor.user ? await User.findById(doctor.user).select("email name").lean() : null;
    if (owner?.email) {
      const approved = decision === "approve";
      notify({
        to: owner.email,
        subject: approved ? "Your Lunara doctor profile is approved" : "Your Lunara doctor application needs changes",
        text: approved
          ? `Hi ${owner.name},\n\nYour doctor profile has been approved. Patients can now find and book you. Please set your weekly schedule in the Doctor Portal if you haven't yet.\n\nLunara`
          : `Hi ${owner.name},\n\nYour application wasn't approved yet.\nReason: ${cleanNote}\n\nYou can fix this in the Doctor Portal, upload new documents and send it for review again.\n\nLunara`,
        html: approved
          ? `<p>Hi ${esc(owner.name)},</p><p>Your doctor profile has been <strong>approved</strong>. Patients can now find and book you. Please set your weekly schedule in the Doctor Portal if you haven't yet.</p><p>Lunara</p>`
          : `<p>Hi ${esc(owner.name)},</p><p>Your application wasn't approved yet.</p><p><strong>Reason:</strong> ${esc(cleanNote)}</p><p>You can fix this in the Doctor Portal, upload new documents and send it for review again.</p><p>Lunara</p>`,
      });
    }

    res.json({ message: decision === "approve" ? "Doctor approved" : "Doctor rejected" });
  } catch (error) {
    console.error("Review doctor error:", error);
    res.status(500).json({ message: "Couldn't save the decision" });
  }
};

module.exports = {
  getDoctors,
  getDoctor,
  getNearbyDoctors,
  getMyProfile,
  updateMyProfile,
  uploadPhoto,
  addDocuments,
  removeDocument,
  resubmit,
  listForReview,
  reviewDoctor,
};