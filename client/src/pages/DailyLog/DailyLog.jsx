import { useEffect, useMemo, useState } from "react";
import {
  getDailyLogs,
  saveDailyLog,
  deleteDailyLog,
  localDateKey,
} from "../../services/api";

const FLOWS = [
  ["none", "None"],
  ["spotting", "Spotting"],
  ["light", "Light"],
  ["medium", "Medium"],
  ["heavy", "Heavy"],
];

const MOODS = ["Happy", "Calm", "Okay", "Low", "Irritated"];

const SYMPTOMS = [
  "Cramps",
  "Headache",
  "Bloating",
  "Back pain",
  "Fatigue",
  "Breast tenderness",
  "Nausea",
  "Acne",
  "Trouble sleeping",
  "Cravings",
];

const HISTORY_DAYS = 59;

const emptyForm = { flow: "", pain: "", mood: "", symptoms: [], notes: "" };

const daysAgoKey = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDateKey(d);
};

const prettyDate = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const chip = (active) =>
  `rounded-full border px-4 py-2 text-sm transition ${
    active
      ? "border-[#e58da4] bg-[#fdf0f3] text-[#d97d96]"
      : "border-[#eadde1] text-gray-500 hover:border-[#e58da4]"
  }`;

export default function DailyLog() {
  const today = localDateKey();
  const oldest = daysAgoKey(HISTORY_DAYS);

  const [date, setDate] = useState(today);
  const [form, setForm] = useState(emptyForm);
  const [logs, setLogs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const logsByDate = useMemo(() => {
    const map = new Map();
    logs.forEach((log) => map.set(String(log.date).slice(0, 10), log));
    return map;
  }, [logs]);

  const toForm = (log) =>
    log
      ? {
          flow: log.flow || "",
          pain: log.pain ?? "",
          mood: log.mood || "",
          symptoms: log.symptoms || [],
          notes: log.notes || "",
        }
      : emptyForm;

  const loadLogs = async () => {
    const data = await getDailyLogs({ from: oldest, to: today });
    setLogs(data.logs || []);
    return data.logs || [];
  };

  useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        const data = await getDailyLogs({ from: oldest, to: today });
        if (ignore) return;
        const list = data.logs || [];
        setLogs(list);
        const todays = list.find((l) => String(l.date).slice(0, 10) === today);
        setForm(toForm(todays));
      } catch (err) {
        if (!ignore) setError(err.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickDate = (value) => {
    if (!value || value > today || value < oldest) return;
    setDate(value);
    setForm(toForm(logsByDate.get(value)));
    setMessage("");
    setError("");
  };

  const toggleSymptom = (symptom) =>
    setForm((prev) => ({
      ...prev,
      symptoms: prev.symptoms.includes(symptom)
        ? prev.symptoms.filter((s) => s !== symptom)
        : [...prev.symptoms, symptom],
    }));

  const isEmpty =
    !form.flow &&
    form.pain === "" &&
    !form.mood &&
    form.symptoms.length === 0 &&
    !form.notes.trim();

  const handleSave = async (e) => {
    e.preventDefault();

    if (isEmpty) {
      setError("Add at least one detail before saving.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      await saveDailyLog(date, {
        flow: form.flow || null,
        pain: form.pain === "" ? null : Number(form.pain),
        mood: form.mood || null,
        symptoms: form.symptoms,
        notes: form.notes.trim() || null,
      });
      await loadLogs();
      setMessage("Saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (key) => {
    if (!window.confirm(`Delete your log for ${prettyDate(key)}?`)) return;

    setMessage("");
    setError("");

    try {
      await deleteDailyLog(key);
      await loadLogs();
      if (key === date) setForm(emptyForm);
      setMessage("Log deleted.");
    } catch (err) {
      setError(err.message);
    }
  };

  const worrying = form.flow === "heavy" || Number(form.pain) >= 8;
  const hasLogForDate = logsByDate.has(date);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#fff5f7] -mx-5 -mt-20 px-5 pt-20 sm:-mx-8 sm:px-8 lg:-mx-10 lg:-mt-8 lg:px-10 lg:pt-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-7">
          <p className="text-sm font-medium text-[#df829b]">
            How are you today?
          </p>
          <h1 className="mt-1 font-serif text-4xl font-semibold text-[#292331]">
            Daily Log
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
            Note your flow, pain, mood and symptoms. Lunara AI can use your
            recent logs (only if you turn it on) to give better answers.
          </p>
        </div>

        <form
          onSubmit={handleSave}
          className="space-y-6 rounded-3xl bg-white p-6 shadow-[0_12px_40px_rgba(170,95,120,0.08)] sm:p-7"
        >
          <div>
            <label
              htmlFor="log-date"
              className="mb-2 block text-sm font-medium text-[#292331]"
            >
              Date
            </label>
            <input
              id="log-date"
              type="date"
              value={date}
              min={oldest}
              max={today}
              onChange={(e) => pickDate(e.target.value)}
              className="h-12 rounded-xl border border-[#eadde1] px-4 text-sm outline-none focus:border-[#e58da4]"
            />
            <p className="mt-2 text-xs text-gray-400">
              {hasLogForDate
                ? "You already logged this day. Saving will update it."
                : "You can fill in the last 60 days."}
            </p>
          </div>

          <div>
            <p className="mb-3 text-sm font-medium text-[#292331]">Flow</p>
            <div className="flex flex-wrap gap-2">
              {FLOWS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={form.flow === value}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      flow: prev.flow === value ? "" : value,
                    }))
                  }
                  className={chip(form.flow === value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-medium text-[#292331]">
              Pain (0 = none, 10 = worst)
            </p>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 11 }, (_, n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={form.pain === n}
                  aria-label={`Pain ${n} out of 10`}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      pain: prev.pain === n ? "" : n,
                    }))
                  }
                  className={`h-10 w-10 rounded-full border text-sm transition ${
                    form.pain === n
                      ? "border-[#e58da4] bg-[#fdf0f3] text-[#d97d96]"
                      : "border-[#eadde1] text-gray-500 hover:border-[#e58da4]"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {worrying && (
            <p
              role="alert"
              className="rounded-xl bg-[#fff0f1] px-4 py-3 text-sm leading-6 text-red-600"
            >
              Very heavy bleeding or severe pain can need medical care. If you
              are soaking a pad every hour, feel faint, or the pain is
              unbearable, please see a doctor or call 112 now.
            </p>
          )}

          <div>
            <p className="mb-3 text-sm font-medium text-[#292331]">Mood</p>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((mood) => (
                <button
                  key={mood}
                  type="button"
                  aria-pressed={form.mood === mood}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      mood: prev.mood === mood ? "" : mood,
                    }))
                  }
                  className={chip(form.mood === mood)}
                >
                  {mood}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-medium text-[#292331]">Symptoms</p>
            <div className="flex flex-wrap gap-2">
              {SYMPTOMS.map((symptom) => (
                <button
                  key={symptom}
                  type="button"
                  aria-pressed={form.symptoms.includes(symptom)}
                  onClick={() => toggleSymptom(symptom)}
                  className={chip(form.symptoms.includes(symptom))}
                >
                  {symptom}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="log-notes"
              className="mb-2 block text-sm font-medium text-[#292331]"
            >
              Notes
            </label>
            <textarea
              id="log-notes"
              value={form.notes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              rows="3"
              maxLength={1000}
              placeholder="Anything you'd like to remember..."
              className="w-full resize-none rounded-xl border border-[#eadde1] bg-[#fffafb] px-4 py-3 text-sm outline-none focus:border-[#e58da4]"
            />
          </div>

          {message && (
            <p
              role="status"
              className="rounded-xl bg-[#f0faf3] px-4 py-3 text-sm text-green-600"
            >
              {message}
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-[#fff0f1] px-4 py-3 text-sm text-red-500"
            >
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="h-12 flex-1 rounded-xl bg-[#e58da4] px-6 text-sm font-semibold text-white hover:bg-[#d97d96] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
            >
              {saving ? "Saving..." : hasLogForDate ? "Update log" : "Save log"}
            </button>

            {hasLogForDate && (
              <button
                type="button"
                onClick={() => handleDelete(date)}
                className="h-12 rounded-xl border border-[#eadde1] px-6 text-sm text-gray-500 hover:border-red-300 hover:text-red-500"
              >
                Delete this day
              </button>
            )}
          </div>
        </form>

        {/* RECENT ENTRIES */}
        <div className="mt-6 rounded-3xl bg-[#292331] p-6 text-white sm:p-7">
          <p className="text-xs text-white/40">Your records</p>
          <h2 className="mt-1 text-xl font-semibold">Recent entries</h2>

          {loading ? (
            <p className="mt-5 text-sm text-white/50">Loading...</p>
          ) : logs.length === 0 ? (
            <p className="mt-5 text-sm text-white/50">No entries yet.</p>
          ) : (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {logs.map((log) => {
                const key = String(log.date).slice(0, 10);
                return (
                  <div
                    key={key}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium">{prettyDate(key)}</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            pickDate(key);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="text-xs text-white/50 hover:text-white"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(key)}
                          className="text-xs text-white/50 hover:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <p className="mt-2 text-xs text-white/55">
                      {[
                        log.flow && `Flow: ${log.flow}`,
                        log.pain != null && `Pain: ${log.pain}/10`,
                        log.mood && `Mood: ${log.mood}`,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "No details"}
                    </p>

                    {log.symptoms?.length > 0 && (
                      <p className="mt-2 text-xs text-white/45">
                        {log.symptoms.join(", ")}
                      </p>
                    )}

                    {log.notes && (
                      <p className="mt-2 whitespace-pre-wrap text-xs text-white/40">
                        {log.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}