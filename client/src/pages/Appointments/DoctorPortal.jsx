import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getDoctorAppointments,
  getDoctorSchedule,
  getDoctors,
  getMyAppointments,
  getSharedReport,
  saveDoctorSchedule,
  updateAppointmentByDoctor,
} from "../../services/api";
import ReportView from "../../components/report/ReportView";
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

// ------------------------------------------------------------ appointments

function AppointmentCard({ a, onChanged }) {
  const [link, setLink] = useState(a.meetingLink || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

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
          <h3 className="font-semibold text-[#292331]">{a.user?.name || "Patient"}</h3>

        <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusStyle[a.status]}`}>
          {a.status}
        </span>
      </div>

      {a.reason && <p className="mt-3 text-sm text-gray-500">“{a.reason}”</p>}

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
                onClick={() => act({ meetingLink: link.trim() }, "Link saved.")}
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
                if (window.confirm(`Cancel the appointment with ${a.user?.name || "this patient"}? They will get an email.`)) {
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

  const load = useCallback(async () => {
    try {
      const data = await getDoctorAppointments(doctorId, scope);
      setItems(data.appointments || []);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
    setSaving(true);
    setError("");
    setMessage("");
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

// ------------------------------------------------------------ page

export default function DoctorPortal() {
  const [me, setMe] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [doctorId, setDoctorId] = useState("");
  const [tab, setTab] = useState("appointments");
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

      {doctorId && (
        <>
          <div className="mb-5 flex w-fit rounded-2xl bg-white p-1.5 shadow-[0_8px_30px_rgba(170,95,120,0.06)]">
            {[
              ["appointments", "Appointments"],
              ["schedule", "Schedule"],
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

          {tab === "appointments" ? (
            <AppointmentsTab key={doctorId} doctorId={doctorId} />
          ) : (
            <ScheduleTab key={doctorId} doctorId={doctorId} />
          )}
        </>
      )}
    </div>
  );
}