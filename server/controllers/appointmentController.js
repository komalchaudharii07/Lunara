const crypto = require("crypto");
const mongoose = require("mongoose");

const Appointment = require("../models/Appointment");
const DoctorSchedule = require("../models/DoctorSchedule");
const Doctor = require("../models/Doctor");
const User = require("../models/User");
const { esc, whenText, notify, sendBookedEmail } = require("../utils/appointmentEmails");
const {
  IST_OFFSET_MS,
  isDateKey,
  istDateKey,
  slotsForDate,
  validateSchedule,
} = require("../utils/slots");
const { buildReport } = require("./reportController");
const razorpay = require("../utils/razorpay");
const {
  HOLD_MS,
  expireStaleHolds,
  paymentParams,
  issueRefund,
} = require("../utils/payments");

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const CANCEL_BEFORE_MS = 2 * HOUR; // people can cancel until 2 hours before
const MAX_UPCOMING = 5; // active future appointments per person
const MAX_REASON = 500;

const VIDEO_BASE = (process.env.VIDEO_BASE_URL || "https://meet.jit.si").replace(/\/+$/, "");

const { SELF_HARM_ANY: CRISIS } = require("../utils/crisis");

const isId = (id) => mongoose.Types.ObjectId.isValid(id);

// a private, hard-to-guess room name for each appointment
const newMeetingLink = () =>
  `${VIDEO_BASE}/lunara-${crypto.randomBytes(12).toString("hex")}`;

const isHttpsUrl = (value) => {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && value.length <= 300;
  } catch {
    return false;
  }
};

// is this person an admin, or the doctor whose appointments these are?
const canManageDoctor = async (userId, doctorId) => {
  const user = await User.findById(userId).select("isAdmin doctorId").lean();
  if (!user) return false;
  return Boolean(
    user.isAdmin || (user.doctorId && String(user.doctorId) === String(doctorId))
  );
};

// ---------------------------------------------------------------- SLOTS

// GET /api/appointments/slots/:doctorId?date=YYYY-MM-DD
const getSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    if (!isId(doctorId)) return res.status(400).json({ message: "Invalid doctor" });
    if (!isDateKey(date)) return res.status(400).json({ message: "Choose a valid date" });

    const [doctor, schedule] = await Promise.all([
      Doctor.findOne({ _id: doctorId, available: true, verificationStatus: "approved" }).select("_id").lean(),
      DoctorSchedule.findOne({ doctor: doctorId }).lean(),
    ]);

    if (!doctor) return res.status(404).json({ message: "Doctor not found" });
    if (!schedule || !(schedule.weekly || []).length) {
      return res.json({ slots: [], slotMinutes: 30, maxAdvanceDays: 30, notScheduled: true });
    }

    const all = slotsForDate(schedule, date);
    if (!all.length) {
      return res.json({
        slots: [],
        slotMinutes: schedule.slotMinutes,
        maxAdvanceDays: schedule.maxAdvanceDays,
      });
    }

    // booked slots, and slots someone is paying for right now
    const taken = await Appointment.find({
      doctor: doctorId,
      holdsSlot: true,
      startsAt: { $gte: all[0].startsAt, $lte: all[all.length - 1].startsAt },
      $or: [{ status: "booked" }, { holdExpiresAt: { $gt: new Date() } }],
    })
      .select("startsAt")
      .lean();

    const takenSet = new Set(taken.map((a) => a.startsAt.getTime()));

    res.json({
      slots: all
        .filter((s) => !takenSet.has(s.startsAt.getTime()))
        .map((s) => ({ startsAt: s.startsAt, endsAt: s.endsAt })),
      slotMinutes: schedule.slotMinutes,
      maxAdvanceDays: schedule.maxAdvanceDays,
    });
  } catch (error) {
    console.error("Get slots error:", error);
    res.status(500).json({ message: "Couldn't load available times" });
  }
};

// ---------------------------------------------------------------- BOOKING

// POST /api/appointments  { doctorId, startsAt, reason, shareReport }
const bookAppointment = async (req, res) => {
  try {
    const { doctorId, startsAt, reason = "", shareReport = false } = req.body;

    if (!isId(doctorId)) return res.status(400).json({ message: "Invalid doctor" });
    if (typeof startsAt !== "string") {
      return res.status(400).json({ message: "Choose a time" });
    }

    const start = new Date(startsAt);
    if (Number.isNaN(start.getTime())) {
      return res.status(400).json({ message: "Choose a valid time" });
    }
    if (typeof reason !== "string" || reason.trim().length > MAX_REASON) {
      return res
        .status(400)
        .json({ message: `Please keep the reason under ${MAX_REASON} characters` });
    }
    if (typeof shareReport !== "boolean") {
      return res.status(400).json({ message: "Invalid report sharing choice" });
    }

    const [doctor, schedule] = await Promise.all([
      Doctor.findOne({ _id: doctorId, available: true, verificationStatus: "approved" })
        .select("name consultationFee")
        .lean(),
      DoctorSchedule.findOne({ doctor: doctorId }).lean(),
    ]);

    if (!doctor || !schedule) {
      return res.status(404).json({ message: "This doctor can't be booked right now" });
    }

    // the time must be one of the doctor's real slots (clients can't invent times)
    const dateKey = istDateKey(start);
    const valid = slotsForDate(schedule, dateKey).some(
      (s) => s.startsAt.getTime() === start.getTime()
    );
    if (!valid) {
      return res
        .status(400)
        .json({ message: "That time isn't available. Please pick another." });
    }

    // clear holds nobody paid for, so their slots are free again
    await expireStaleHolds({ doctor: doctorId });

    // the person already started booking this very time: reopen that payment
    const existing = await Appointment.findOne({
      user: req.user,
      doctor: doctorId,
      startsAt: start,
      status: "pending_payment",
      holdExpiresAt: { $gt: new Date() },
    }).lean();
    if (existing?.razorpayOrderId) {
      return res.status(200).json({
        appointment: {
          _id: existing._id,
          startsAt: existing.startsAt,
          endsAt: existing.endsAt,
          status: existing.status,
          doctorName: doctor.name,
        },
        payment: paymentParams(existing, doctor.name),
        crisis: false,
      });
    }

    const upcoming = await Appointment.countDocuments({
      user: req.user,
      holdsSlot: true,
      startsAt: { $gte: new Date() },
    });
    if (upcoming >= MAX_UPCOMING) {
      return res.status(400).json({
        message: `You can have up to ${MAX_UPCOMING} upcoming appointments. Cancel one to book another.`,
      });
    }

    const end = new Date(start.getTime() + schedule.slotMinutes * 60 * 1000);

    // Online payment: needs the keys, and a fee above zero. Otherwise it books at once.
    const amountPaise = Math.round(Number(doctor.consultationFee || 0) * 100);
    const needsPayment = razorpay.isEnabled() && amountPaise >= 100;

    let appointment;
    try {
      appointment = await Appointment.create({
        user: req.user,
        doctor: doctorId,
        startsAt: start,
        endsAt: end,
        reason: reason.trim(),
        fee: doctor.consultationFee,
        shareReport,
        meetingLink: newMeetingLink(),
        ...(needsPayment
          ? {
              status: "pending_payment",
              paymentStatus: "pending",
              amountPaise,
              holdExpiresAt: new Date(Date.now() + HOLD_MS),
            }
          : {}),
      });
    } catch (err) {
      // the unique indexes: someone took the slot first, or you're already booked then
      if (err.code === 11000) {
        return res.status(409).json({
          message:
            "That time was just taken, or you already have an appointment then. Please pick another.",
        });
      }
      throw err;
    }

    if (needsPayment) {
      try {
        const order = await razorpay.createOrder({
          amountPaise,
          receipt: `appt_${appointment._id}`,
          notes: { appointment: String(appointment._id) },
        });
        appointment.razorpayOrderId = order.id;
        await appointment.save();
      } catch (err) {
        console.error("Create order error:", err.message);
        // let go of the slot again
        await Appointment.deleteOne({ _id: appointment._id });
        return res.status(502).json({
          message: "The payment service isn't responding. Please try again in a moment.",
        });
      }

      return res.status(201).json({
        appointment: {
          _id: appointment._id,
          startsAt: appointment.startsAt,
          endsAt: appointment.endsAt,
          status: appointment.status,
          doctorName: doctor.name,
        },
        payment: paymentParams(appointment, doctor.name),
        crisis: CRISIS.test(reason),
      });
    }

    sendBookedEmail({
      userId: req.user,
      doctorId,
      startsAt: start,
    });

    res.status(201).json({
      appointment: {
        _id: appointment._id,
        startsAt: appointment.startsAt,
        endsAt: appointment.endsAt,
        status: appointment.status,
        doctorName: doctor.name,
      },
      // the reason mentioned self-harm: the app shows help numbers
      crisis: CRISIS.test(reason),
    });
  } catch (error) {
    console.error("Book appointment error:", error);
    res.status(500).json({ message: "Couldn't book the appointment. Please try again." });
  }
};

// GET /api/appointments/mine
const getMyAppointments = async (req, res) => {
  try {
    await expireStaleHolds({ user: req.user });

    const [appointments, me] = await Promise.all([
      Appointment.find({ user: req.user, status: { $ne: "expired" } })
        .sort({ startsAt: -1 })
        .limit(100)
        .select(
          "doctor startsAt endsAt status reason fee shareReport reportViewedAt meetingLink cancelledBy paymentStatus amountPaise holdExpiresAt prescription"
        )
        .populate("doctor", "name specialization")
        .lean(),
      User.findById(req.user).select("isAdmin doctorId").lean(),
    ]);

    res.json({
      // the video link is only for confirmed visits, never for unpaid holds
      appointments: appointments.map((a) =>
        a.status === "booked" ? a : { ...a, meetingLink: undefined }
      ),
      doctorId: me?.doctorId || null,
      isAdmin: Boolean(me?.isAdmin),
    });
  } catch (error) {
    console.error("My appointments error:", error);
    res.status(500).json({ message: "Couldn't load your appointments" });
  }
};

// PATCH /api/appointments/:id/cancel  (the person who booked)
const cancelMyAppointment = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ message: "Invalid appointment" });

    const appointment = await Appointment.findOne({
      _id: req.params.id,
      user: req.user,
    }).populate("doctor", "name");

    if (!appointment) return res.status(404).json({ message: "Appointment not found" });
    const waitingForPayment = appointment.status === "pending_payment";

    if (appointment.status !== "booked" && !waitingForPayment) {
      return res.status(400).json({ message: "This appointment is already closed" });
    }
    // an unpaid hold can always be let go. A booked visit closes 2 hours before.
    if (
      !waitingForPayment &&
      appointment.startsAt.getTime() - Date.now() < CANCEL_BEFORE_MS
    ) {
      return res.status(400).json({
        message:
          "Appointments can be cancelled up to 2 hours before. Please contact the doctor directly.",
      });
    }

    // one atomic step, so two quick cancel requests can't both go through
    const closed = await Appointment.findOneAndUpdate(
      { _id: appointment._id, status: appointment.status },
      {
        $set: {
          status: "cancelled",
          holdsSlot: false,
          cancelledBy: "user",
          cancelledAt: new Date(),
        },
      },
      { new: true }
    );
    if (!closed) {
      return res
        .status(409)
        .json({ message: "This appointment was just changed. Please refresh and try again." });
    }

    // paid visits get the full amount back
    let refund = null;
    if (appointment.paymentStatus === "paid") {
      refund = await issueRefund(appointment._id);
    }

    if (refund) {
      return res.json({
        message: refund.refunded
          ? "Appointment cancelled. Your payment is being refunded. It reaches your account in 5 to 7 working days."
          : "Appointment cancelled. Your refund couldn't be started right now. We will retry it automatically.",
      });
    }

    res.json({ message: "Appointment cancelled" });
  } catch (error) {
    console.error("Cancel appointment error:", error);
    res.status(500).json({ message: "Couldn't cancel the appointment" });
  }
};

// PATCH /api/appointments/:id/share  { shareReport: true | false }
const setReportSharing = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ message: "Invalid appointment" });
    if (typeof req.body.shareReport !== "boolean") {
      return res.status(400).json({ message: "Invalid choice" });
    }

    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id, user: req.user, status: "booked" },
      { shareReport: req.body.shareReport },
      { new: true }
    )
      .select("shareReport")
      .lean();

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found or already closed" });
    }

    res.json({ shareReport: appointment.shareReport });
  } catch (error) {
    console.error("Report sharing error:", error);
    res.status(500).json({ message: "Couldn't update sharing" });
  }
};

// ---------------------------------------------------------------- DOCTOR SIDE

// GET /api/appointments/schedule/:doctorId
const getSchedule = async (req, res) => {
  try {
    const { doctorId } = req.params;
    if (!isId(doctorId)) return res.status(400).json({ message: "Invalid doctor" });
    if (!(await canManageDoctor(req.user, doctorId))) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const schedule = await DoctorSchedule.findOne({ doctor: doctorId })
      .select("slotMinutes weekly daysOff maxAdvanceDays")
      .lean();

    res.json({
      schedule: schedule || { slotMinutes: 30, weekly: [], daysOff: [], maxAdvanceDays: 30 },
    });
  } catch (error) {
    console.error("Get schedule error:", error);
    res.status(500).json({ message: "Couldn't load the schedule" });
  }
};

// PUT /api/appointments/schedule/:doctorId
const saveSchedule = async (req, res) => {
  try {
    const { doctorId } = req.params;
    if (!isId(doctorId)) return res.status(400).json({ message: "Invalid doctor" });
    if (!(await canManageDoctor(req.user, doctorId))) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const { value, error } = validateSchedule(req.body);
    if (error) return res.status(400).json({ message: error });

    if (!(await Doctor.exists({ _id: doctorId }))) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    const schedule = await DoctorSchedule.findOneAndUpdate(
      { doctor: doctorId },
      { $set: value, $setOnInsert: { doctor: doctorId } },
     { returnDocument: "after", upsert: true, runValidators: true }
    )
      .select("slotMinutes weekly daysOff maxAdvanceDays")
      .lean();

    res.json({ schedule });
  } catch (error) {
    console.error("Save schedule error:", error);
    res.status(500).json({ message: "Couldn't save the schedule" });
  }
};

// GET /api/appointments/doctor/:doctorId?scope=upcoming|past
const getDoctorAppointments = async (req, res) => {
  try {
    const { doctorId } = req.params;
    if (!isId(doctorId)) return res.status(400).json({ message: "Invalid doctor" });
    if (!(await canManageDoctor(req.user, doctorId))) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const upcoming = req.query.scope !== "past";
    const edge = new Date(Date.now() - HOUR); // an appointment stays "upcoming" for an hour

    const appointments = await Appointment.find({
      doctor: doctorId,
      startsAt: upcoming ? { $gte: edge } : { $lt: edge },
      // never unpaid holds, expired holds or bookings dropped before paying
      $or: [
        { status: { $in: ["booked", "completed"] } },
        { status: "cancelled", paymentStatus: { $ne: "pending" } },
      ],
    })
      .sort({ startsAt: upcoming ? 1 : -1 })
      .limit(200)
      .select(
        "user startsAt endsAt status reason fee shareReport reportViewedAt meetingLink cancelledBy paymentStatus prescription"
      )
      .populate("user", "name") // never the patient's email or phone
      .lean();

    res.json({ appointments });
  } catch (error) {
    console.error("Doctor appointments error:", error);
    res.status(500).json({ message: "Couldn't load appointments" });
  }
};

// PATCH /api/appointments/:id/doctor  { status?: "completed" | "cancelled", meetingLink? }
const updateByDoctor = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ message: "Invalid appointment" });

    const appointment = await Appointment.findById(req.params.id).populate(
      "doctor",
      "name"
    );
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    if (!(await canManageDoctor(req.user, appointment.doctor._id))) {
      return res.status(403).json({ message: "Not allowed" });
    }
    if (appointment.status !== "booked") {
      return res.status(400).json({ message: "This appointment is already closed" });
    }

    const { status, meetingLink } = req.body;
    let cancelled = false;

    if (meetingLink !== undefined) {
      if (typeof meetingLink !== "string" || !isHttpsUrl(meetingLink.trim())) {
        return res
          .status(400)
          .json({ message: "The video link must start with https://" });
      }
      appointment.meetingLink = meetingLink.trim();
    }

    if (status !== undefined) {
      if (status === "completed") {
        if (appointment.startsAt.getTime() > Date.now()) {
          return res
            .status(400)
            .json({ message: "You can mark it completed once it has started" });
        }
        appointment.status = "completed";
      } else if (status === "cancelled") {
        if (appointment.endsAt.getTime() < Date.now()) {
          return res.status(400).json({
            message: "This visit has already ended. Mark it completed instead.",
          });
        }
        appointment.status = "cancelled";
        appointment.cancelledBy = "doctor";
        appointment.cancelledAt = new Date();
        cancelled = true;
      } else {
        return res.status(400).json({ message: "Invalid status" });
      }
    }

    await appointment.save();

    let refundNote = "";
    if (cancelled && appointment.paymentStatus === "paid") {
      const refund = await issueRefund(appointment._id);
      refundNote = refund.refunded
        ? " Your payment is being refunded in full and reaches your account in 5 to 7 working days."
        : " Your payment will be refunded in full.";
    }

    if (cancelled) {
      const patient = await User.findById(appointment.user).select("name email").lean();
      if (patient?.email) {
        notify({
          to: patient.email,
          subject: "Your Lunara appointment was cancelled",
          text:
            `Hi ${patient.name},\n\nYour appointment with ${appointment.doctor.name} on ` +
            `${whenText(appointment.startsAt)} was cancelled by the doctor.${refundNote} ` +
            `You can book another time from the Doctors page.\n\nLunara`,
          html:
            `<p>Hi ${esc(patient.name)},</p><p>Your appointment with <strong>${esc(appointment.doctor.name)}</strong> on ` +
            `<strong>${esc(whenText(appointment.startsAt))}</strong> was cancelled by the doctor.${esc(refundNote)} ` +
            `You can book another time from the Doctors page.</p><p>Lunara</p>`,
        });
      }
    }

    res.json({ status: appointment.status, meetingLink: appointment.meetingLink });
  } catch (error) {
    console.error("Doctor update error:", error);
    res.status(500).json({ message: "Couldn't update the appointment" });
  }
};

// GET /api/appointments/:id/report
// Only when the patient chose to share it, from 24 hours before until 7 days after.
const getSharedReport = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ message: "Invalid appointment" });

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    if (!(await canManageDoctor(req.user, appointment.doctor))) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const now = Date.now();
    const start = appointment.startsAt.getTime();

    if (
      !appointment.shareReport ||
      !["booked", "completed"].includes(appointment.status) ||
      now < start - DAY ||
      now > start + 7 * DAY
    ) {
      return res.status(403).json({
        message: "This patient hasn't shared a report for this appointment.",
      });
    }

    const to = istDateKey(new Date(now));
    const from = istDateKey(new Date(now - 180 * DAY));

    const report = await buildReport(appointment.user, {
      from,
      to,
      todayKey: to,
      includeNotes: false,
    });

    // the patient can see that it was opened
    appointment.reportViewedAt = new Date();
    await appointment.save();

    res.json({ report });
  } catch (error) {
    console.error("Shared report error:", error);
    res.status(500).json({ message: "Couldn't load the report" });
  }
};

// ---------------------------------------------------------------- PRESCRIPTION

const text = (v, max) => (typeof v === "string" ? v.trim() : "").slice(0, max + 1);

// checks what the doctor typed; returns { error } or { value }
const cleanPrescription = (body = {}) => {
  const diagnosis = text(body.diagnosis, 500);
  const advice = text(body.advice, 1500);
  const followUp = text(body.followUp, 200);
  if (diagnosis.length > 500) return { error: "Diagnosis must be 500 characters or fewer" };
  if (advice.length > 1500) return { error: "Advice must be 1500 characters or fewer" };
  if (followUp.length > 200) return { error: "Follow-up must be 200 characters or fewer" };

  const rawMeds = Array.isArray(body.medicines) ? body.medicines : [];
  if (rawMeds.length > 15) return { error: "A prescription can have up to 15 medicines" };

  const medicines = [];
  for (const m of rawMeds) {
    const name = text(m?.name, 100);
    if (!name) continue; // skip empty rows
    const med = {
      name,
      dose: text(m?.dose, 60),
      frequency: text(m?.frequency, 60),
      duration: text(m?.duration, 60),
      notes: text(m?.notes, 200),
    };
    if (name.length > 100 || med.dose.length > 60 || med.frequency.length > 60 ||
        med.duration.length > 60 || med.notes.length > 200) {
      return { error: "One of the medicine fields is too long" };
    }
    medicines.push(med);
  }

  if (!diagnosis && !advice && medicines.length === 0) {
    return { error: "Please write a diagnosis, advice or at least one medicine" };
  }
  return { value: { diagnosis, advice, followUp, medicines } };
};

// PUT /api/appointments/:id/prescription  (the doctor, or an admin)
const savePrescription = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ message: "Invalid appointment" });

    const appointment = await Appointment.findById(req.params.id).populate("doctor", "name");
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    if (!(await canManageDoctor(req.user, appointment.doctor._id))) {
      return res.status(403).json({ message: "Not allowed" });
    }
    if (!["booked", "completed"].includes(appointment.status)) {
      return res.status(400).json({ message: "A prescription needs a confirmed visit" });
    }
    if (appointment.startsAt.getTime() > Date.now()) {
      return res.status(400).json({ message: "You can write it once the visit has started" });
    }

    const { error, value } = cleanPrescription(req.body);
    if (error) return res.status(400).json({ message: error });

    const first = !appointment.prescription?.issuedAt;
    const now = new Date();
    appointment.prescription = {
      ...value,
      issuedAt: appointment.prescription?.issuedAt || now,
      updatedAt: now,
    };
    await appointment.save();

    // the email says a prescription is ready; the medicines themselves are never emailed
    if (first) {
      const patient = await User.findById(appointment.user).select("name email").lean();
      if (patient?.email) {
        notify({
          to: patient.email,
          subject: "Your Lunara prescription is ready",
          text:
            `Hi ${patient.name},\n\n${appointment.doctor.name} has added a prescription for your ` +
            `visit on ${whenText(appointment.startsAt)}. Log in to Lunara and open Appointments to read it.\n\nLunara`,
          html:
            `<p>Hi ${esc(patient.name)},</p><p><strong>${esc(appointment.doctor.name)}</strong> has added a prescription for your ` +
            `visit on <strong>${esc(whenText(appointment.startsAt))}</strong>. Log in to Lunara and open Appointments to read it.</p><p>Lunara</p>`,
        });
      }
    }

    res.json({ message: "Prescription saved", prescription: appointment.prescription });
  } catch (error) {
    console.error("Save prescription error:", error);
    res.status(500).json({ message: "Couldn't save the prescription" });
  }
};

// GET /api/appointments/:id/prescription  (the patient, that doctor, or an admin)
const getPrescription = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ message: "Invalid appointment" });

    const appointment = await Appointment.findById(req.params.id)
      .populate("doctor", "name specialization qualification registrationNumber registrationCouncil")
      .populate("user", "name age")
      .lean();
    if (!appointment || !appointment.prescription?.issuedAt) {
      return res.status(404).json({ message: "No prescription for this appointment" });
    }

    const isPatient = String(appointment.user._id) === String(req.user);
    if (!isPatient && !(await canManageDoctor(req.user, appointment.doctor._id))) {
      return res.status(403).json({ message: "Not allowed" });
    }

    res.json({
      prescription: {
        ...appointment.prescription,
        appointmentId: appointment._id,
        visitAt: appointment.startsAt,
        doctor: appointment.doctor,
        patient: { name: appointment.user.name, age: appointment.user.age },
      },
    });
  } catch (error) {
    console.error("Get prescription error:", error);
    res.status(500).json({ message: "Couldn't load the prescription" });
  }
};

module.exports = {
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
  IST_OFFSET_MS, // exported for tests
};