import { useState } from "react";
import { getAppointmentSlots, localDateKey, rescheduleAppointment } from "../../services/api";
import { formatDay, formatTime } from "../../utils/dates";

// Lets a patient move a confirmed visit to another free time of the same doctor.
export default function RescheduleBox({ appointment, onDone, onClose }) {
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [maxDays, setMaxDays] = useState(30);

  const today = localDateKey();
  const maxDate = localDateKey(new Date(Date.now() + maxDays * 24 * 60 * 60 * 1000));

  const pickDate = async (key) => {
    setDate(key);
    setSlot(null);
    setError("");
    if (!key) return setSlots([]);
    setLoading(true);
    try {
      const data = await getAppointmentSlots(appointment.doctor._id, key);
      setSlots(data.slots || []);
      if (data.maxAdvanceDays) setMaxDays(data.maxAdvanceDays);
    } catch (err) {
      setSlots([]);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    if (!slot) return;
    setSaving(true);
    setError("");
    try {
      await rescheduleAppointment(appointment._id, slot.startsAt);
      onDone();
    } catch (err) {
      setError(err.message);
      if (err.status === 409 || err.status === 400) pickDate(date);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 rounded-2xl bg-[#fdf7f8] p-4">
      <p className="text-sm font-medium text-[#292331]">Move to another time</p>
      <p className="mt-1 text-xs text-gray-500">You can do this once. There is nothing more to pay.</p>

      <input
        type="date"
        aria-label="New date"
        min={today}
        max={maxDate}
        value={date}
        onChange={(e) => pickDate(e.target.value)}
        className="mt-3 h-10 rounded-lg border border-[#eadde1] bg-white px-3 text-sm outline-none focus:border-[#e58da4]"
      />

      {loading && <p role="status" className="mt-3 text-xs text-gray-500">Loading times...</p>}
      {!loading && date && slots.length === 0 && !error && (
        <p className="mt-3 text-xs text-gray-500">No free times on {formatDay(date)}. Try another day.</p>
      )}

      {slots.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {slots.map((s) => (
            <button
              key={s.startsAt}
              type="button"
              onClick={() => setSlot(s)}
              className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                slot?.startsAt === s.startsAt
                  ? "border-[#e58da4] bg-[#e58da4] text-white"
                  : "border-[#eadde1] bg-white text-[#292331] hover:border-[#e58da4]"
              }`}
            >
              {formatTime(s.startsAt)}
            </button>
          ))}
        </div>
      )}

      {error && <p role="alert" className="mt-3 text-xs text-red-500">{error}</p>}

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          disabled={!slot || saving}
          onClick={confirm}
          className="h-10 rounded-xl bg-[#e58da4] px-5 text-sm font-semibold text-white hover:bg-[#d97d96] disabled:opacity-50"
        >
          {saving ? "Moving..." : "Confirm new time"}
        </button>
        <button type="button" onClick={onClose} className="h-10 rounded-xl border border-[#eadde1] px-4 text-sm text-gray-500">
          Close
        </button>
      </div>
    </div>
  );
}