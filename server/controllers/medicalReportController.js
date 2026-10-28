const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");
const MedicalReport = require("../models/MedicalReport");
const FileAsset = require("../models/FileAsset");
const User = require("../models/User");
const { storeUploads } = require("../middleware/upload");
const { removeFile } = require("../utils/fileStore");
const { esc, whenText, notify } = require("../utils/appointmentEmails");

const isId = (id) => mongoose.Types.ObjectId.isValid(id);
const same = (a, b) => a != null && b != null && String(a) === String(b);
const DELETE_WINDOW_MS = 24 * 60 * 60 * 1000;

const text = (v, max) => (typeof v === "string" ? v.trim() : "").slice(0, max + 1);

const shape = (r) => ({
  _id: r._id,
  title: r.title,
  notes: r.notes,
  createdAt: r.createdAt,
  appointment: r.appointment?._id ? { _id: r.appointment._id, startsAt: r.appointment.startsAt } : r.appointment,
  doctor: r.doctor?._id ? { _id: r.doctor._id, name: r.doctor.name, specialization: r.doctor.specialization } : r.doctor,
  file: r.file?._id
    ? { _id: r.file._id, filename: r.file.filename, mimeType: r.file.mimeType, size: r.file.size }
    : r.file,
});

// POST /api/medical-reports  (multipart: file, appointmentId, title, notes)  approved doctors only
const uploadReport = async (req, res) => {
  try {
    const { appointmentId } = req.body || {};
    if (!isId(appointmentId)) return res.status(400).json({ message: "Invalid appointment" });

    const title = text(req.body.title, 100);
    const notes = text(req.body.notes, 500);
    if (title.length < 2 || title.length > 100) {
      return res.status(400).json({ message: "Please give the report a title (2 to 100 characters)" });
    }
    if (notes.length > 500) return res.status(400).json({ message: "Notes must be 500 characters or fewer" });

    const appointment = await Appointment.findById(appointmentId).populate("doctor", "name").lean();
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    // only the doctor of THIS appointment (admins don't write medical records)
    if (!same(appointment.doctor._id, req.doctorId)) {
      return res.status(403).json({ message: "Not allowed" });
    }
    if (!["booked", "completed"].includes(appointment.status)) {
      return res.status(400).json({ message: "Reports can be added to a confirmed visit" });
    }
    if (new Date(appointment.startsAt).getTime() > Date.now()) {
      return res.status(400).json({ message: "You can add a report once the visit has started" });
    }

    const [asset] = await storeUploads(req.file, {
      kind: "medical_report",
      owner: req.user,
      doctor: appointment.doctor._id,
      patient: appointment.user,
      appointment: appointment._id,
    });

    const report = await MedicalReport.create({
      patient: appointment.user,
      doctor: appointment.doctor._id,
      appointment: appointment._id,
      file: asset._id,
      title,
      notes,
    });

    // the email only says a report exists; the report itself stays in Lunara
    const patient = await User.findById(appointment.user).select("name email").lean();
    if (patient?.email) {
      notify({
        to: patient.email,
        subject: "A new medical report is ready on Lunara",
        text: `Hi ${patient.name},\n\n${appointment.doctor.name} added a report to your visit on ${whenText(appointment.startsAt)}. Log in to Lunara and open My Records to read it.\n\nLunara`,
        html: `<p>Hi ${esc(patient.name)},</p><p><strong>${esc(appointment.doctor.name)}</strong> added a report to your visit on <strong>${esc(whenText(appointment.startsAt))}</strong>. Log in to Lunara and open My Records to read it.</p><p>Lunara</p>`,
      });
    }

    res.status(201).json({
      message: "Report uploaded",
      report: shape({ ...report.toObject(), file: asset }),
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error("Upload report error:", error);
    res.status(500).json({ message: "Couldn't save the report" });
  }
};

// GET /api/medical-reports/appointment/:appointmentId  (the patient or that appointment's doctor)
const listForAppointment = async (req, res) => {
  try {
    if (!isId(req.params.appointmentId)) return res.status(400).json({ message: "Invalid appointment" });

    const appointment = await Appointment.findById(req.params.appointmentId).select("user doctor").lean();
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    const me = await User.findById(req.user).select("doctorId").lean();
    const allowed = same(appointment.user, req.user) || (me?.doctorId && same(appointment.doctor, me.doctorId));
    if (!allowed) return res.status(404).json({ message: "Appointment not found" });

    const reports = await MedicalReport.find({ appointment: appointment._id })
      .sort({ createdAt: -1 })
      .populate("file", "filename mimeType size")
      .lean();

    res.json({ reports: reports.map(shape) });
  } catch (error) {
    console.error("List appointment reports error:", error);
    res.status(500).json({ message: "Couldn't load the reports" });
  }
};

// GET /api/medical-reports/mine  (a patient's own reports)
const listMine = async (req, res) => {
  try {
    const reports = await MedicalReport.find({ patient: req.user })
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("file", "filename mimeType size")
      .populate("doctor", "name specialization")
      .populate("appointment", "startsAt")
      .lean();

    res.json({ reports: reports.map(shape) });
  } catch (error) {
    console.error("List my reports error:", error);
    res.status(500).json({ message: "Couldn't load your reports" });
  }
};

// DELETE /api/medical-reports/:id  (the doctor who added it, within 24 hours, e.g. a wrong file)
const deleteReport = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ message: "Invalid report" });

    const report = await MedicalReport.findById(req.params.id);
    if (!report || !same(report.doctor, req.doctorId)) {
      return res.status(404).json({ message: "Report not found" });
    }
    if (Date.now() - report.createdAt.getTime() > DELETE_WINDOW_MS) {
      return res.status(400).json({ message: "A report can only be removed within 24 hours of adding it." });
    }

    const asset = await FileAsset.findByIdAndDelete(report.file);
    await report.deleteOne();
    if (asset) await removeFile(asset.gridId);

    res.json({ message: "Report removed" });
  } catch (error) {
    console.error("Delete report error:", error);
    res.status(500).json({ message: "Couldn't remove the report" });
  }
};

module.exports = { uploadReport, listForAppointment, listMine, deleteReport };