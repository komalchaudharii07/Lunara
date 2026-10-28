import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  getDoctorAppointments,
  getDoctorSchedule,
  getDoctors,
  getMyAppointments,
  getMyDoctorProfile,
  updateMyDoctorProfile,
  uploadDoctorDocuments,
  uploadDoctorPhoto,
  removeDoctorDocument,
  resubmitDoctor,
  openFile,
  downloadFile,
  uploadMedicalReport,
  getAppointmentReports,
  deleteMedicalReport,
  getSharedReport,
  saveDoctorSchedule,
  savePrescription,
  updateAppointmentByDoctor,
} from "../../services/api";
import ReportView from "../Reports/ReportView";
import SecureImage from "../../components/common/SecureImage";
import { formatDateTime } from "../../utils/dates";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SLOT_OPTIONS = [15, 20, 30, 45, 60];

const statusStyle = {
  booked: "bg-green-50 text-green-600",
  completed: "bg-gray-100 text-gray-500",
  cancelled: "bg-red-50 text-red-500",
};

const input =
  "h-10 rounded-lg border border-[#eadde1] bg-white px-2 text-sm text-[#292331] outline-none focus:border-[#e58da4]";

// ------------------------------------------------------------ medical reports

const payLabel = (a) => {
  const rupees = a.amountPaise ? `₹${(a.amountPaise / 100).toLocaleString("en-IN")}` : "";
  switch (a.paymentStatus) {
    case "paid":
      return { text: `Paid ${rupees}`.trim(), cls: "text-green-600" };
    case "refunded":
    case "refund_processing":
    case "refund_pending":
      return { text: `Refunded ${rupees}`.trim(), cls: "text-gray-500" };
    case "pending":
      return { text: "Payment pending", cls: "text-amber-600" };
    default:
      return { text: "No online payment", cls: "text-gray-400" };
  }
};

function ReportsBox({ appointment }) {
  const [reports, setReports] = useState(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await getAppointmentReports(appointment._id);
      setReports(data.reports || []);
    } catch (err) {
      setError(err.message);
    }
  }, [appointment._id]);

  useEffect(() => {
    load();
  }, [load]);

  const pick = (e) => {
    const f = e.target.files[0];
    if (!f) return setFile(null);
    if (!["application/pdf", "image/jpeg", "image/png"].includes(f.type)) {
      e.target.value = "";
      return setError("The report must be a PDF, JPG or PNG.");
    }
    if (f.size > 5 * 1024 * 1024) {
      e.target.value = "";
      return setError("The report must be 5 MB or smaller.");
    }
    setError("");
    setFile(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return setError("Choose a file first.");
    setBusy(true);
    setError("");
    setNote("");
    try {
      await uploadMedicalReport({ appointmentId: appointment._id, title: title.trim(), notes: notes.trim(), file });
      setTitle("");
      setNotes("");
      setFile(null);
      e.target.reset();
      setNote("Report uploaded. The patient can see it now.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Remove this report? The patient will no longer see it.")) return;
    setError("");
    try {
      await deleteMedicalReport(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="mt-4 rounded-2xl bg-[#fdf7f8] p-4">
      <p className="text-sm font-medium text-[#292331]">Medical reports</p>

      {reports && reports.length === 0 && <p className="mt-2 text-xs text-gray-500">No reports added yet.</p>}
      {reports && reports.length > 0 && (
        <ul className="mt-2 space-y-2">
          {reports.map((r) => (
            <li key={r._id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm">
              <span className="min-w-0 truncate text-gray-700">{r.title}</span>
              <span className="flex shrink-0 gap-3 text-xs">
                <button type="button" onClick={() => openFile(r.file._id).catch((err) => setError(err.message))}
                  className="font-medium text-[#d97d96]">View</button>
                <button type="button" onClick={() => downloadFile(r.file._id, r.file.filename).catch((err) => setError(err.message))}
                  className="text-gray-500">Download</button>
                <button type="button" onClick={() => remove(r._id)} className="text-gray-500 hover:text-red-500">Remove</button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="mt-3 space-y-2">
        <input required minLength={2} maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Report title (e.g. Blood test results)" className={`${input} w-full`} />
        <input maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Note for the patient (optional)" className={`${input} w-full`} />
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={pick} className="block text-xs text-gray-500" />
        <button type="submit" disabled={busy || !file}
          className="h-9 rounded-lg bg-[#e58da4] px-4 text-xs font-semibold text-white hover:bg-[#d97d96] disabled:opacity-50">
          {busy ? "Uploading..." : "Upload report"}
        </button>
      </form>

      {note && <p role="status" className="mt-2 text-xs text-green-600">{note}</p>}
      {error && <p role="alert" className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ------------------------------------------------------------ prescription

const emptyMedicine = { name: "", dose: "", frequency: "", duration: "", notes: "" };

function PrescriptionForm({ appointment, onSaved }) {
  const saved = appointment.prescription;
  const [diagnosis, setDiagnosis] = useState(saved?.diagnosis || "");
  const [advice, setAdvice] = useState(saved?.advice || "");
  const [followUp, setFollowUp] = useState(saved?.followUp || "");
  const [medicines, setMedicines] = useState(
    saved?.medicines?.length ? saved.medicines : [{ ...emptyMedicine }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const setMed = (i, key, value) =>
    setMedicines((list) => list.map((m, idx) => (idx === i ? { ...m, [key]: value } : m)));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setNote("");
    try {
      await savePrescription(appointment._id, { diagnosis, advice, followUp, medicines });
      setNote("Prescription saved. The patient can see it now.");
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const wide = `${input} w-full`;

  return (
    <form onSubmit={submit} className="mt-4 space-y-4 rounded-2xl bg-[#fdf7f8] p-4">
      <label className="block text-xs text-gray-500">Diagnosis
        <textarea rows={2} maxLength={500} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[#eadde1] bg-white px-2 py-2 text-sm outline-none focus:border-[#e58da4]" />
      </label>

      <div>
        <p className="text-xs text-gray-500">Medicines</p>
        <div className="mt-2 space-y-3">
          {medicines.map((m, i) => (
            <div key={i} className="grid gap-2 rounded-xl bg-white p-3 sm:grid-cols-4">
              <input aria-label="Medicine name" placeholder="Medicine" maxLength={100} value={m.name}
                onChange={(e) => setMed(i, "name", e.target.value)} className={`${wide} sm:col-span-4`} />
              <input aria-label="Dose" placeholder="Dose (e.g. 500 mg)" maxLength={60} value={m.dose}
                onChange={(e) => setMed(i, "dose", e.target.value)} className={wide} />
              <input aria-label="How often" placeholder="How often (e.g. twice a day)" maxLength={60} value={m.frequency}
                onChange={(e) => setMed(i, "frequency", e.target.value)} className={wide} />
              <input aria-label="For how long" placeholder="For (e.g. 5 days)" maxLength={60} value={m.duration}
                onChange={(e) => setMed(i, "duration", e.target.value)} className={wide} />
              <button type="button" onClick={() => setMedicines((list) => list.filter((_, idx) => idx !== i))}
                className="rounded-lg border border-[#eadde1] px-2 text-xs text-gray-500 hover:border-red-300 hover:text-red-500">
                Remove
              </button>
              <input aria-label="Note" placeholder="Note (e.g. after food)" maxLength={200} value={m.notes}
                onChange={(e) => setMed(i, "notes", e.target.value)} className={`${wide} sm:col-span-4`} />
            </div>
          ))}
        </div>
        {medicines.length < 15 && (
          <button type="button" onClick={() => setMedicines((list) => [...list, { ...emptyMedicine }])}
            className="mt-2 text-xs font-medium text-[#d97d96]">
            + Add medicine
          </button>
        )}
      </div>

      <label className="block text-xs text-gray-500">Advice
        <textarea rows={3} maxLength={1500} value={advice} onChange={(e) => setAdvice(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[#eadde1] bg-white px-2 py-2 text-sm outline-none focus:border-[#e58da4]" />
      </label>

      <label className="block text-xs text-gray-500">Follow-up
        <input maxLength={200} value={followUp} onChange={(e) => setFollowUp(e.target.value)}
          placeholder="e.g. Review after 2 weeks" className={`${wide} mt-1`} />
      </label>

      {note && <p role="status" className="text-xs text-green-600">{note}</p>}
      {error && <p role="alert" className="text-xs text-red-500">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={saving}
          className="h-10 rounded-xl bg-[#e58da4] px-5 text-sm font-semibold text-white hover:bg-[#d97d96] disabled:opacity-60">
          {saving ? "Saving..." : saved?.issuedAt ? "Update prescription" : "Send prescription"}
        </button>
        {saved?.issuedAt && (
          <Link to={`/appointments/${appointment._id}/prescription`} className="text-xs font-medium text-[#d97d96]">
            View / print
          </Link>
        )}
      </div>
    </form>
  );
}

// ------------------------------------------------------------ appointments

function AppointmentCard({ a, onChanged }) {
  const [link, setLink] = useState(a.meetingLink || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [rxOpen, setRxOpen] = useState(false);
  const [rpOpen, setRpOpen] = useState(false);
  const pay = payLabel(a);

  const active = a.status === "booked";
  const started = new Date(a.startsAt).getTime() <= Date.now();

  const act = async (body, success) => {
    setBusy(true);
    setError("");
    setNote("");
    try {
      await updateAppointmentByDoctor(a._id, body);
      setNote(success);
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const openReport = async () => {
    if (report) return setReport(null);
    setReportLoading(true);
    setError("");
    try {
      const data = await getSharedReport(a._id);
      setReport(data.report);
    } catch (err) {
      setError(err.message);
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="rounded-3xl bg-white p-5 shadow-[0_12px_40px_rgba(170,95,120,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[#292331]">
            {a.user?.name || "Patient"}
            {a.user?.age ? <span className="ml-2 text-sm font-normal text-gray-400">{a.user.age} yrs</span> : null}
          </h3>
          <p className="mt-1 text-sm text-gray-500">{formatDateTime(a.startsAt)}</p>
        </div>

        <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusStyle[a.status] || statusStyle.completed}`}>
          {a.status}
        </span>
      </div>

      {a.reason && <p className="mt-3 text-sm text-gray-500">“{a.reason}”</p>}
      {a.status !== "cancelled" || a.paymentStatus !== "not_required" ? (
        <p className={`mt-2 text-xs ${pay.cls}`}>{pay.text}</p>
      ) : null}

      {a.status !== "cancelled" && (
        <div className="mt-4">
          {a.shareReport ? (
            <button
              type="button"
              onClick={openReport}
              disabled={reportLoading}
              className="rounded-lg border border-[#eadde1] px-3 py-2 text-xs font-medium text-[#d97d96] hover:border-[#e58da4] disabled:opacity-50"
            >
              {reportLoading ? "Opening..." : report ? "Hide cycle report" : "View cycle report"}
            </button>
          ) : (
            <p className="text-xs text-gray-400">This patient has not shared a cycle report.</p>
          )}
        </div>
      )}

      {["booked", "completed"].includes(a.status) && started && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setRxOpen((v) => !v)}
            className="rounded-lg border border-[#e58da4] px-3 py-2 text-xs font-medium text-[#d97d96] hover:bg-[#fdf1f4]"
          >
            {rxOpen ? "Close prescription" : a.prescription?.issuedAt ? "Edit prescription" : "Write prescription"}
          </button>
          {rxOpen && <PrescriptionForm appointment={a} onSaved={onChanged} />}

          <button
            type="button"
            onClick={() => setRpOpen((v) => !v)}
            className="ml-2 rounded-lg border border-[#eadde1] px-3 py-2 text-xs font-medium text-[#292331] hover:border-[#e58da4]"
          >
            {rpOpen ? "Close reports" : "Medical reports"}
          </button>
          {rpOpen && <ReportsBox appointment={a} />}
        </div>
      )}

      {active && (
        <div className="mt-4 space-y-3 border-t border-[#f2e8eb] pt-4">
          <div>
            <label htmlFor={`link-${a._id}`} className="text-xs text-gray-500">
              Video call link (a private room is made for you; replace it with Google Meet or Zoom if you prefer)
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id={`link-${a._id}`}
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                maxLength={300}
                className={`${input} min-w-0 flex-1`}
              />
              <button
                type="button"
                disabled={busy || link.trim() === (a.meetingLink || "")}
                onClick={() => {
                  if (!/^https:\/\//i.test(link.trim())) {
                    setError("The video link must start with https://");
                    return;
                  }
                  act({ meetingLink: link.trim() }, "Link saved.");
                }}
                className="rounded-lg bg-[#e58da4] px-3 text-xs font-semibold text-white disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {a.meetingLink && (
              <a
                href={a.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-[#eadde1] px-3 py-2 text-xs font-medium text-[#292331] hover:border-[#e58da4]"
              >
                Open video call
              </a>
            )}
            <button
              type="button"
              disabled={busy || !started}
              title={started ? "" : "Available once the visit has started"}
              onClick={() => act({ status: "completed" }, "Marked as completed.")}
              className="rounded-lg border border-[#eadde1] px-3 py-2 text-xs text-gray-600 hover:border-green-300 hover:text-green-600 disabled:opacity-50"
            >
              Mark completed
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (window.confirm(`Cancel the appointment with ${a.user?.name || "this patient"}? They will get an email, and any payment is refunded in full.`)) {
                  act({ status: "cancelled" }, "Appointment cancelled.");
                }
              }}
              className="rounded-lg border border-[#eadde1] px-3 py-2 text-xs text-gray-600 hover:border-red-300 hover:text-red-500 disabled:opacity-50"
            >
              Cancel appointment
            </button>
          </div>
        </div>
      )}

      {note && <p role="status" className="mt-3 text-xs text-green-600">{note}</p>}
      {error && <p role="alert" className="mt-3 text-xs text-red-500">{error}</p>}

      {report && (
        <div className="mt-4">
          <ReportView report={report} shared />
        </div>
      )}
    </div>
  );
}

function AppointmentsTab({ doctorId }) {
  const [scope, setScope] = useState("upcoming");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ignores answers that arrive after the doctor switched Upcoming / Past
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const mine = ++requestId.current;
    try {
      const data = await getDoctorAppointments(doctorId, scope);
      if (mine !== requestId.current) return;
      setItems(data.appointments || []);
      setError("");
    } catch (err) {
      if (mine === requestId.current) setError(err.message);
    } finally {
      if (mine === requestId.current) setLoading(false);
    }
  }, [doctorId, scope]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  return (
    <div>
      <div className="mb-4 flex w-fit rounded-xl bg-white p-1 shadow-[0_8px_30px_rgba(170,95,120,0.06)]">
        {["upcoming", "past"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScope(s)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize ${
              scope === s ? "bg-[#e58da4] text-white" : "text-gray-500"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="mb-3 text-sm text-red-500">{error}</p>}

      {loading ? (
        <p role="status" className="text-sm text-gray-500">Loading...</p>
      ) : items.length === 0 ? (
        <div className="rounded-3xl bg-white p-8 text-center text-sm text-gray-500">
          No {scope} appointments.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((a) => (
            <AppointmentCard key={a._id} a={a} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------ schedule

// the server stores a flat list; the editor works with one list per weekday
const toByDay = (weekly) =>
  DAY_NAMES.map((_, day) =>
    weekly.filter((w) => w.day === day).map((w) => ({ start: w.start, end: w.end }))
  );

const toWeekly = (byDay) =>
  byDay.flatMap((windows, day) => windows.map((w) => ({ day, start: w.start, end: w.end })));

function ScheduleTab({ doctorId }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [slotMinutes, setSlotMinutes] = useState(30);
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(30);
  const [byDay, setByDay] = useState(DAY_NAMES.map(() => []));
  const [daysOff, setDaysOff] = useState([]);
  const [newOff, setNewOff] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDoctorSchedule(doctorId)
      .then(({ schedule }) => {
        if (cancelled) return;
        setSlotMinutes(schedule.slotMinutes);
        setMaxAdvanceDays(schedule.maxAdvanceDays);
        setByDay(toByDay(schedule.weekly || []));
        setDaysOff(schedule.daysOff || []);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [doctorId]);

  const setWindow = (day, i, field, value) =>
    setByDay((prev) =>
      prev.map((w, d) =>
        d === day ? w.map((x, idx) => (idx === i ? { ...x, [field]: value } : x)) : w
      )
    );

  const addWindow = (day) =>
    setByDay((prev) =>
      prev.map((w, d) => (d === day ? [...w, { start: "10:00", end: "13:00" }] : w))
    );

  const removeWindow = (day, i) =>
    setByDay((prev) => prev.map((w, d) => (d === day ? w.filter((_, idx) => idx !== i) : w)));

  const addOff = () => {
    if (!newOff || daysOff.includes(newOff)) return;
    setDaysOff((prev) => [...prev, newOff].sort());
    setNewOff("");
  };

  const handleSave = async () => {
    setError("");
    setMessage("");

    const ahead = Number(maxAdvanceDays);
    if (!Number.isInteger(ahead) || ahead < 1 || ahead > 60) {
      setError("Days ahead must be a whole number from 1 to 60.");
      return;
    }
    const badWindow = byDay.some((windows) =>
      windows.some((w) => !w.start || !w.end || w.end <= w.start)
    );
    if (badWindow) {
      setError("Each set of hours must end after it starts.");
      return;
    }

    setSaving(true);
    try {
      await saveDoctorSchedule(doctorId, {
        slotMinutes,
        maxAdvanceDays: Number(maxAdvanceDays),
        weekly: toWeekly(byDay),
        daysOff,
      });
      setMessage("Schedule saved. Patients can book these times now.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p role="status" className="text-sm text-gray-500">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-3xl bg-white p-5 shadow-[0_12px_40px_rgba(170,95,120,0.08)] sm:grid-cols-2">
        <label className="text-sm text-gray-600">
          Length of each appointment
          <select
            value={slotMinutes}
            onChange={(e) => setSlotMinutes(Number(e.target.value))}
            className={`${input} mt-1 w-full`}
          >
            {SLOT_OPTIONS.map((m) => (
              <option key={m} value={m}>{m} minutes</option>
            ))}
          </select>
        </label>

        <label className="text-sm text-gray-600">
          How many days ahead patients can book
          <input
            type="number"
            min="1"
            max="60"
            value={maxAdvanceDays}
            onChange={(e) => setMaxAdvanceDays(e.target.value)}
            className={`${input} mt-1 w-full`}
          />
        </label>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-[0_12px_40px_rgba(170,95,120,0.08)]">
        <h3 className="font-semibold text-[#292331]">Weekly hours (India time)</h3>
        <p className="mt-1 text-xs text-gray-500">
          Leave a day empty if you don&apos;t see patients that day.
        </p>

        <div className="mt-4 space-y-4">
          {DAY_NAMES.map((name, day) => (
            <div key={name} className="flex flex-col gap-2 border-t border-[#f6eef0] pt-3 sm:flex-row sm:items-start">
              <p className="w-28 shrink-0 pt-2 text-sm font-medium text-[#292331]">{name}</p>

              <div className="flex-1 space-y-2">
                {byDay[day].length === 0 && <p className="pt-2 text-sm text-gray-400">Closed</p>}

                {byDay[day].map((w, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="time"
                      aria-label={`${name} start`}
                      value={w.start}
                      onChange={(e) => setWindow(day, i, "start", e.target.value)}
                      className={input}
                    />
                    <span className="text-gray-400">to</span>
                    <input
                      type="time"
                      aria-label={`${name} end`}
                      value={w.end}
                      onChange={(e) => setWindow(day, i, "end", e.target.value)}
                      className={input}
                    />
                    <button
                      type="button"
                      onClick={() => removeWindow(day, i)}
                      aria-label={`Remove ${name} hours`}
                      className="px-2 text-gray-400 hover:text-red-500"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => addWindow(day)}
                  className="text-xs font-medium text-[#d97d96]"
                >
                  + Add hours
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-[0_12px_40px_rgba(170,95,120,0.08)]">
        <h3 className="font-semibold text-[#292331]">Days off</h3>

        <div className="mt-3 flex gap-2">
          <input
            type="date"
            aria-label="Day off"
            value={newOff}
            onChange={(e) => setNewOff(e.target.value)}
            className={input}
          />
          <button
            type="button"
            onClick={addOff}
            disabled={!newOff}
            className="rounded-lg bg-[#e58da4] px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            Add
          </button>
        </div>

        {daysOff.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {daysOff.map((d) => (
              <span key={d} className="flex items-center gap-2 rounded-full bg-[#fdf0f3] px-3 py-1 text-xs text-[#d97d96]">
                {d}
                <button
                  type="button"
                  onClick={() => setDaysOff((prev) => prev.filter((x) => x !== d))}
                  aria-label={`Remove ${d}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {message && <p role="status" className="rounded-xl bg-[#f0faf3] px-4 py-3 text-sm text-green-600">{message}</p>}
      {error && <p role="alert" className="rounded-xl bg-[#fff0f1] px-4 py-3 text-sm text-red-500">{error}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="h-12 w-full rounded-xl bg-[#e58da4] text-sm font-semibold text-white hover:bg-[#d97d96] disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save schedule"}
      </button>
    </div>
  );
}

// ------------------------------------------------------------ profile

const STATUS_TEXT = {
  pending: {
    cls: "bg-amber-50 text-amber-700",
    text: "Waiting for admin approval. Patients can't see or book you yet.",
  },
  approved: { cls: "bg-green-50 text-green-700", text: "Approved. Patients can book you." },
  rejected: { cls: "bg-red-50 text-red-600", text: "Not approved." },
};

function StatusBanner({ profile }) {
  const info = STATUS_TEXT[profile.verificationStatus] || STATUS_TEXT.pending;
  return (
    <div className={`mb-5 rounded-xl px-4 py-3 text-sm ${info.cls}`}>
      {info.text}
      {profile.verificationStatus === "rejected" && profile.verificationNote
        ? ` Reason: ${profile.verificationNote}`
        : ""}
    </div>
  );
}

function DoctorFiles({ profile, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const locked = profile.verificationStatus === "approved";

  const run = async (fn, success) => {
    setBusy(true);
    setError("");
    setNote("");
    try {
      const data = await fn();
      if (data?.doctor) onSaved(data.doctor);
      setNote(success);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const chooseDocs = (e) => {
    const list = [...e.target.files];
    e.target.value = "";
    if (list.length === 0) return;
    if (list.length + (profile.documents?.length || 0) > 5) return setError("You can keep up to 5 documents.");
    if (list.length > 3) return setError("Choose up to 3 files at a time.");
    if (list.some((f) => f.size > 5 * 1024 * 1024)) return setError("Each document must be 5 MB or smaller.");
    run(() => uploadDoctorDocuments(list), "Documents uploaded.");
  };

  const choosePhoto = (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    if (!["image/jpeg", "image/png"].includes(f.type)) return setError("The photo must be a JPG or PNG.");
    if (f.size > 2 * 1024 * 1024) return setError("The photo must be 2 MB or smaller.");
    run(() => uploadDoctorPhoto(f), "Photo saved.");
  };

  return (
    <div className="space-y-5 rounded-3xl bg-white p-6 shadow-[0_12px_40px_rgba(170,95,120,0.08)]">
      <div className="flex items-center gap-4">
        <SecureImage fileId={profile.photo} name={profile.name} size={72} />
        <label className="text-sm text-gray-600">
          Profile photo
          <input type="file" accept=".jpg,.jpeg,.png" disabled={busy} onChange={choosePhoto}
            className="mt-1 block text-xs text-gray-500" />
        </label>
      </div>

      <div>
        <p className="text-sm font-medium text-[#292331]">Verification documents</p>
        <p className="mt-1 text-xs text-gray-500">
          Only you and the Lunara team can see these. Patients never can.
        </p>

        {(profile.documents || []).length === 0 ? (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
            No document yet. Upload your medical registration certificate so an admin can verify you.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {profile.documents.map((d) => (
              <li key={d._id} className="flex items-center justify-between gap-3 rounded-xl border border-[#f2e8eb] px-3 py-2 text-sm">
                <span className="min-w-0 truncate text-gray-700">{d.filename}</span>
                <span className="flex shrink-0 gap-3 text-xs">
                  <button type="button" onClick={() => openFile(d._id).catch((err) => setError(err.message))}
                    className="font-medium text-[#d97d96]">View</button>
                  {!locked && (
                    <button type="button" disabled={busy}
                      onClick={() => run(() => removeDoctorDocument(d._id), "Document removed.")}
                      className="text-gray-500 hover:text-red-500">Remove</button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}

        {!locked && (
          <label className="mt-3 block text-xs text-gray-500">
            Add documents (PDF, JPG or PNG, 5 MB each)
            <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" disabled={busy} onChange={chooseDocs}
              className="mt-1 block text-xs text-gray-500" />
          </label>
        )}

        {profile.verificationStatus === "rejected" && (
          <button type="button" disabled={busy || !(profile.documents || []).length}
            onClick={() => run(resubmitDoctor, "Sent for review again.")}
            className="mt-4 h-10 rounded-xl bg-[#e58da4] px-5 text-sm font-semibold text-white hover:bg-[#d97d96] disabled:opacity-50">
            Send for review again
          </button>
        )}
      </div>

      {note && <p role="status" className="text-xs text-green-600">{note}</p>}
      {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function ProfileTab({ profile, onSaved }) {
  const [form, setForm] = useState({
    name: profile.name || "",
    specialization: profile.specialization || "",
    qualification: profile.qualification || "",
    experience: String(profile.experience ?? ""),
    consultationFee: String(profile.consultationFee ?? ""),
    bio: profile.bio || "",
    phone: profile.phone || "",
    available: Boolean(profile.available),
    clinicName: profile.clinicName || "",
    clinicAddress: profile.clinicAddress || "",
    lat: profile.lat ?? "",
    lng: profile.lng ?? "",
  });
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const approved = profile.verificationStatus === "approved";

  const useMyLocation = () => {
    if (!navigator.geolocation) return setError("Your browser can't share its location.");
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          lat: Math.round(pos.coords.latitude * 1e6) / 1e6,
          lng: Math.round(pos.coords.longitude * 1e6) / 1e6,
        }));
        setLocating(false);
      },
      () => {
        setError("Couldn't get your location. Allow location access, or find it from the address.");
        setLocating(false);
      },
      { timeout: 10000 }
    );
  };

  // finds the map point for the typed address (OpenStreetMap)
  const findFromAddress = async () => {
    const q = form.clinicAddress.trim();
    if (!q) return setError("Type the clinic address first.");
    setLocating(true);
    setError("");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(q)}`
      );
      const rows = await res.json();
      if (!rows?.[0]) throw new Error("We couldn't find that address on the map. Add the area or pincode.");
      setForm((f) => ({
        ...f,
        lat: Math.round(Number(rows[0].lat) * 1e6) / 1e6,
        lng: Math.round(Number(rows[0].lon) * 1e6) / 1e6,
      }));
    } catch (err) {
      setError(err.message || "The map search isn't working right now.");
    } finally {
      setLocating(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setNote("");
    setError("");
    try {
      const data = await updateMyDoctorProfile({
        name: form.name.trim(),
        specialization: form.specialization.trim(),
        qualification: form.qualification.trim(),
        experience: Number(form.experience),
        consultationFee: Number(form.consultationFee),
        bio: form.bio.trim(),
        phone: form.phone.trim(),
        clinicName: form.clinicName.trim(),
        clinicAddress: form.clinicAddress.trim(),
        lat: form.lat === "" ? null : Number(form.lat),
        lng: form.lng === "" ? null : Number(form.lng),
        ...(approved ? { available: form.available } : {}),
      });
      onSaved(data.doctor);
      setNote("Saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const wide = `${input} w-full`;

  return (
    <div className="space-y-5">
    <DoctorFiles profile={profile} onSaved={onSaved} />
    <form onSubmit={save} className="space-y-4 rounded-3xl bg-white p-6 shadow-[0_12px_40px_rgba(170,95,120,0.08)]">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-gray-600">Name
          <input required maxLength={100} value={form.name} onChange={set("name")} className={`${wide} mt-1`} />
        </label>
        <label className="text-sm text-gray-600">Specialization
          <input required maxLength={100} value={form.specialization} onChange={set("specialization")} className={`${wide} mt-1`} />
        </label>
        <label className="text-sm text-gray-600 sm:col-span-2">Phone (only the Lunara team sees this)
          <input required type="tel" maxLength={20} value={form.phone} onChange={set("phone")} className={`${wide} mt-1`} />
        </label>
        <label className="text-sm text-gray-600 sm:col-span-2">Qualification
          <input required maxLength={200} value={form.qualification} onChange={set("qualification")} className={`${wide} mt-1`} />
        </label>
        <label className="text-sm text-gray-600">Experience (years)
          <input required type="number" min="0" max="70" value={form.experience} onChange={set("experience")} className={`${wide} mt-1`} />
        </label>
        <label className="text-sm text-gray-600">Consultation fee (₹)
          <input required type="number" min="0" max="100000" value={form.consultationFee} onChange={set("consultationFee")} className={`${wide} mt-1`} />
        </label>
      </div>

      <label className="block text-sm text-gray-600">About you
        <textarea rows={3} maxLength={600} value={form.bio} onChange={set("bio")}
          className="mt-1 w-full rounded-lg border border-[#eadde1] bg-white px-2 py-2 text-sm outline-none focus:border-[#e58da4]" />
      </label>

      <div className="space-y-3 rounded-2xl bg-[#fdf7f8] p-4">
        <p className="text-sm font-medium text-[#292331]">Clinic on the map</p>
        <p className="text-xs text-gray-500">
          Patients near you will see a pin with a Book button. Your location is required.
        </p>
        <input aria-label="Clinic name" placeholder="Clinic or hospital name" maxLength={120}
          value={form.clinicName} onChange={set("clinicName")} className={wide} />
        <input aria-label="Clinic address" placeholder="Address, area, city, pincode" maxLength={250}
          value={form.clinicAddress} onChange={set("clinicAddress")} className={wide} />
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={findFromAddress} disabled={locating}
            className="rounded-lg border border-[#eadde1] bg-white px-3 py-2 text-xs font-medium text-[#292331] hover:border-[#e58da4] disabled:opacity-50">
            Find on map from address
          </button>
          <button type="button" onClick={useMyLocation} disabled={locating}
            className="rounded-lg border border-[#eadde1] bg-white px-3 py-2 text-xs font-medium text-[#292331] hover:border-[#e58da4] disabled:opacity-50">
            Use my current location
          </button>
          {form.lat !== "" && form.lng !== "" ? (
            <span className="text-xs text-green-600">Pin set ({form.lat}, {form.lng})</span>
          ) : (
            <span className="text-xs text-gray-400">No pin yet</span>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Registration: {profile.registrationCouncil || "—"} · {profile.registrationNumber || "—"} (can&apos;t be changed here)
      </p>

      <label className={`flex items-center gap-2 text-sm ${approved ? "text-gray-600" : "text-gray-400"}`}>
        <input type="checkbox" disabled={!approved} checked={form.available}
          onChange={(e) => setForm((f) => ({ ...f, available: e.target.checked }))}
          className="accent-[#e58da4]" />
        Accepting new bookings
      </label>

      {note && <p role="status" className="text-sm text-green-600">{note}</p>}
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}

      <button type="submit" disabled={saving}
        className="h-11 rounded-xl bg-[#e58da4] px-6 text-sm font-semibold text-white hover:bg-[#d97d96] disabled:opacity-60">
        {saving ? "Saving..." : "Save profile"}
      </button>
    </form>
    </div>
  );
}

// ------------------------------------------------------------ page

export default function DoctorPortal() {
  const [me, setMe] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [doctorId, setDoctorId] = useState("");
  const [tab, setTab] = useState("appointments");
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const mine = await getMyAppointments();
        if (cancelled) return;
        setMe(mine);

        if (mine.doctorId) {
          setDoctorId(mine.doctorId);
          const own = await getMyDoctorProfile();
          if (!cancelled) {
            setProfile(own.doctor);
            // a new doctor starts on the profile tab to see their approval status
            if (own.doctor?.verificationStatus !== "approved") setTab("profile");
          }
        } else if (mine.isAdmin) {
          // admins pick which doctor to manage
          const list = await getDoctors();
          if (!cancelled) setDoctors(list.doctors || []);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p role="alert" className="rounded-xl bg-[#fff0f1] px-4 py-3 text-sm text-red-500">{error}</p>;
  }

  if (!me) return <p role="status" className="text-sm text-gray-500">Loading...</p>;

  if (!me.doctorId && !me.isAdmin) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center">
        <p className="text-sm text-gray-600">
          This page is for doctors. Your account isn&apos;t linked to a doctor profile.
        </p>
        <Link to="/appointments" className="mt-4 inline-block text-sm text-[#d97d96]">
          Back to appointments
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <p className="text-sm font-medium text-[#df829b]">For doctors</p>
        <h1 className="mt-1 font-serif text-4xl font-semibold text-[#292331]">Doctor portal</h1>
      </div>

      {!me.doctorId && (
        <label className="mb-5 block text-sm text-gray-600">
          Doctor (admin view)
          <select
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            className={`${input} mt-1 w-full`}
          >
            <option value="">Choose a doctor...</option>
            {doctors.map((d) => (
              <option key={d._id} value={d._id}>{d.name}</option>
            ))}
          </select>
        </label>
      )}

      {profile && <StatusBanner profile={profile} />}

      {doctorId && (
        <>
          <div className="mb-5 flex w-fit rounded-2xl bg-white p-1.5 shadow-[0_8px_30px_rgba(170,95,120,0.06)]">
            {[
              ["appointments", "Appointments"],
              ["schedule", "Schedule"],
              ...(profile ? [["profile", "Profile"]] : []),
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded-xl px-5 py-2.5 text-sm font-medium transition ${
                  tab === id ? "bg-[#e58da4] text-white" : "text-gray-500 hover:text-[#d77f97]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "appointments" && <AppointmentsTab key={doctorId} doctorId={doctorId} />}
          {tab === "schedule" && <ScheduleTab key={doctorId} doctorId={doctorId} />}
          {tab === "profile" && profile && (
            <ProfileTab key={profile.verificationStatus} profile={profile} onSaved={setProfile} />
          )}
        </>
      )}
    </div>
  );
}