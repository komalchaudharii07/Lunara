import { useEffect, useMemo, useState } from "react";
import {
  createCycle,
  getCycles,
  clearCycleHistory,
  getCycleSummary,
  updateCycle,
  deleteCycle,
} from "../../services/api";

const symptomsList = [
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

const moodsList = ["Happy", "Calm", "Okay", "Low", "Irritated"];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const pad = (value) => String(value).padStart(2, "0");

const dateToKey = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const keyToDate = (key) => {
  if (!key) return null;
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const formatDate = (date) => {
  if (!date) return "";

  const value =
    typeof date === "string" ? keyToDate(date.slice(0, 10)) : new Date(date);

  if (!value || Number.isNaN(value.getTime())) return "";

  return value.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const isDateBetween = (dateKey, startKey, endKey) => {
  if (!startKey) return false;
  if (!endKey) return dateKey === startKey;
  return dateKey >= startKey && dateKey <= endKey;
};

export default function Tracker() {
  const [form, setForm] = useState({
    periodStartDate: "",
    periodEndDate: "",
    mood: "",
    notes: "",
  });

  const [goal, setGoal] = useState("tracking");
  const [symptoms, setSymptoms] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [summary, setSummary] = useState(null);

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [editing, setEditing] = useState(null); // { id, start, end }
  const [editSaving, setEditSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadSummary = async () => {
    try {
      const data = await getCycleSummary();
      setSummary(data.summary);
    } catch {
      // keep showing the previous estimates; the save itself already worked
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        // one failing call must not hide the other
        const [cycleResult, summaryResult] = await Promise.allSettled([
          getCycles(),
          getCycleSummary(),
        ]);

        if (cycleResult.status === "fulfilled") {
          setCycles(cycleResult.value.cycles || []);
        } else {
          setError(cycleResult.reason.message);
        }

        if (summaryResult.status === "fulfilled") {
          setSummary(summaryResult.value.summary);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const ready = !!summary?.ready;
  const hasFertile = ready && !!summary.ovulation;

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const startingDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < startingDay; i++) days.push(null);
    for (let day = 1; day <= totalDays; day++) {
      days.push(new Date(year, month, day));
    }
    return days;
  }, [calendarMonth]);

  const previousMonth = () =>
    setCalendarMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
    );

  const nextMonth = () =>
    setCalendarMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
    );

  const goToToday = () => {
    const now = new Date();
    setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  /*
    Calendar selection:
    first click = start, second click = end, third click = new period
  */
  const handleCalendarDateClick = (date) => {
    const selectedKey = dateToKey(date);

    setMessage("");
    setError("");

    if (selectedKey > dateToKey(new Date())) {
      setError("You can't log a period in the future.");
      return;
    }

    if (!form.periodStartDate) {
      setForm((prev) => ({
        ...prev,
        periodStartDate: selectedKey,
        periodEndDate: "",
      }));
      return;
    }

    if (form.periodStartDate && !form.periodEndDate) {
      if (selectedKey === form.periodStartDate) return;

      if (selectedKey < form.periodStartDate) {
        setForm((prev) => ({
          ...prev,
          periodStartDate: selectedKey,
          periodEndDate: prev.periodStartDate,
        }));
      } else {
        setForm((prev) => ({ ...prev, periodEndDate: selectedKey }));
      }
      return;
    }

    setForm((prev) => ({
      ...prev,
      periodStartDate: selectedKey,
      periodEndDate: "",
    }));
  };

  const clearDateSelection = () =>
    setForm((prev) => ({ ...prev, periodStartDate: "", periodEndDate: "" }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setMessage("");
    setError("");
  };

  const toggleSymptom = (symptom) =>
    setSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter((item) => item !== symptom)
        : [...prev, symptom]
    );

  // SAVE CYCLE
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.periodStartDate) {
      setError("Please select your period start date.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      // periodLength and cycleLength are calculated by the server
      const data = await createCycle({
        periodStartDate: form.periodStartDate,
        periodEndDate: form.periodEndDate || undefined,
        symptoms,
        mood: form.mood,
        notes: form.notes,
      });

      // reload the list: a back-dated entry also changes the next cycle's gap
      try {
        const fresh = await getCycles();
        setCycles(fresh.cycles || []);
      } catch {
        setCycles((prev) => [data.cycle, ...prev]);
      }

      setForm({ periodStartDate: "", periodEndDate: "", mood: "", notes: "" });
      setSymptoms([]);
      setMessage(
        data.warning
          ? `Saved. ${data.warning}`
          : "Your cycle has been saved successfully."
      );

      // predictions change after every save
      await loadSummary();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // reload cycles and estimates after an edit or delete
  const refreshAll = async () => {
    const [cycleResult, summaryResult] = await Promise.allSettled([
      getCycles(),
      getCycleSummary(),
    ]);
    if (cycleResult.status === "fulfilled") {
      setCycles(cycleResult.value.cycles || []);
    }
    if (summaryResult.status === "fulfilled") {
      setSummary(summaryResult.value.summary);
    }
  };

  const startEdit = (cycle) => {
    setMessage("");
    setError("");
    setEditing({
      id: cycle._id,
      start: cycle.periodStartDate ? cycle.periodStartDate.slice(0, 10) : "",
      end: cycle.periodEndDate ? cycle.periodEndDate.slice(0, 10) : "",
    });
  };

  const cancelEdit = () => setEditing(null);

  // EDIT ONE CYCLE
  const saveEdit = async () => {
    if (!editing) return;

    if (!editing.start) {
      setError("Please choose a start date.");
      return;
    }

    const today = dateToKey(new Date());
    if (editing.start > today || (editing.end && editing.end > today)) {
      setError("You can't log a period in the future.");
      return;
    }

    if (editing.end && editing.end < editing.start) {
      setError("The end date can't be before the start date.");
      return;
    }

    setEditSaving(true);
    setMessage("");
    setError("");

    try {
      await updateCycle(editing.id, {
        periodStartDate: editing.start,
        // null removes the end date (period still going)
        periodEndDate: editing.end || null,
      });
      setEditing(null);
      await refreshAll();
      setMessage("Your cycle has been updated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setEditSaving(false);
    }
  };

  // DELETE ONE CYCLE
  const handleDeleteCycle = async (cycle) => {
    if (
      !window.confirm(
        `Delete the period that started on ${formatDate(cycle.periodStartDate)}?`
      )
    )
      return;

    setMessage("");
    setError("");

    try {
      await deleteCycle(cycle._id);
      if (editing?.id === cycle._id) setEditing(null);
      await refreshAll();
      setMessage("That period has been deleted.");
    } catch (err) {
      setError(err.message);
    }
  };

  // CLEAR HISTORY
  const handleClearHistory = async () => {
    if (!cycles.length) return;

    if (
      !window.confirm(
        "Are you sure you want to delete your complete cycle history?"
      )
    )
      return;

    setClearing(true);
    setMessage("");
    setError("");

    try {
      await clearCycleHistory();
      setCycles([]);
      await loadSummary();
      setMessage("Your cycle history has been cleared.");
    } catch (err) {
      setError(err.message);
    } finally {
      setClearing(false);
    }
  };

  const isSavedPeriodDate = (dateKey) =>
    cycles.some((cycle) =>
      isDateBetween(
        dateKey,
        cycle.periodStartDate ? cycle.periodStartDate.slice(0, 10) : "",
        cycle.periodEndDate ? cycle.periodEndDate.slice(0, 10) : ""
      )
    );

  const isSelectedPeriodDate = (dateKey) =>
    isDateBetween(dateKey, form.periodStartDate, form.periodEndDate);

  // the server may send full ISO strings, so compare only YYYY-MM-DD
  const day = (value) => (value ? String(value).slice(0, 10) : "");

  // never highlight fertile days when the goal is to avoid pregnancy
  const showFertile = hasFertile && goal !== "avoid";

  const isFertileDate = (dateKey) =>
    showFertile &&
    dateKey >= day(summary.fertileStart) &&
    dateKey <= day(summary.fertileEnd);

  const isOvulationDate = (dateKey) =>
    showFertile && dateKey === day(summary.ovulation);

  const isTodayKey = (dateKey) => dateKey === dateToKey(new Date());

  // text shown inside goal panels when there are no predictions
  const noEstimateText = !ready
    ? "Log at least 3 periods to see estimates. Lunara doesn't guess before it has enough history."
    : "Your cycles vary by more than a week, so Lunara doesn't estimate a fertile window.";

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#fff5f7] -mx-5 -mt-20 px-5 pt-20 sm:-mx-8 sm:px-8 lg:-mx-10 lg:-mt-8 lg:px-10 lg:pt-8">
      <div className="mx-auto max-w-5xl">
        {/* HEADER */}
        <div className="mb-7">
          <p className="text-sm font-medium text-[#df829b]">
            Your personal cycle space
          </p>

          <h1 className="mt-1 font-serif text-4xl font-semibold text-[#292331]">
            Cycle Tracker
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
            Track your period, understand your cycle pattern and get
            personalized estimates.
          </p>
        </div>

        {/* CALENDAR */}
        <div className="mb-6 rounded-3xl bg-white p-5 shadow-[0_12px_40px_rgba(170,95,120,0.08)] sm:p-6">
          <div className="mx-auto max-w-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[#df829b]">
                  Cycle calendar
                </p>

                <h2 className="mt-1 text-xl font-semibold text-[#292331]">
                  {MONTHS[calendarMonth.getMonth()]}{" "}
                  {calendarMonth.getFullYear()}
                </h2>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={goToToday}
                  className="rounded-lg border border-[#eadde1] px-2.5 py-1.5 text-xs text-gray-500 hover:border-[#e58da4]"
                >
                  Today
                </button>

                <button
                  type="button"
                  onClick={previousMonth}
                  aria-label="Previous month"
                  className="h-8 w-8 rounded-lg border border-[#eadde1] text-lg text-[#292331] hover:bg-[#fff5f7]"
                >
                  ‹
                </button>

                <button
                  type="button"
                  onClick={nextMonth}
                  aria-label="Next month"
                  className="h-8 w-8 rounded-lg border border-[#eadde1] text-lg text-[#292331] hover:bg-[#fff5f7]"
                >
                  ›
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-[#fff7f8] px-3 py-2.5">
              <p className="text-xs text-gray-500">
                {!form.periodStartDate
                  ? "Click your period start date."
                  : !form.periodEndDate
                  ? "Now click your period end date."
                  : `${formatDate(form.periodStartDate)} — ${formatDate(
                      form.periodEndDate
                    )}`}
              </p>
            </div>

            {/* WEEKDAYS */}
            <div className="mt-4 grid grid-cols-7 gap-1">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="py-1.5 text-center text-[10px] font-medium uppercase text-gray-400"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* DAYS */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, index) => {
                if (!date) {
                  return (
                    <div key={`empty-${index}`} className="h-10 sm:h-11" />
                  );
                }

                const key = dateToKey(date);
                const saved = isSavedPeriodDate(key);
                const selected = isSelectedPeriodDate(key);
                const fertile = isFertileDate(key);
                const ovulation = isOvulationDate(key);
                const isToday = isTodayKey(key);

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleCalendarDateClick(date)}
                    aria-label={`${formatDate(key)}${
                      saved ? ", period" : ""
                    }${ovulation ? ", estimated ovulation" : ""}${
                      fertile && !ovulation ? ", estimated fertile" : ""
                    }`}
                    className={`relative h-10 rounded-lg text-xs font-medium transition sm:h-11 ${
                      selected
                        ? "bg-[#e58da4] text-white"
                        : saved
                        ? "bg-[#f6b7c7] text-[#7e4053]"
                        : ovulation
                        ? "bg-[#f4d7a2] text-[#78581f]"
                        : fertile
                        ? "bg-[#edf6e8] text-[#5c754e]"
                        : "text-[#292331] hover:bg-[#fff0f3]"
                    }`}
                  >
                    {date.getDate()}

                    {isToday && (
                      <span
                        className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${
                          selected ? "bg-white" : "bg-[#e58da4]"
                        }`}
                      />
                    )}

                    {ovulation && !selected && (
                      <span className="absolute right-1 top-1 h-1 w-1 rounded-full bg-[#c48a25]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* LEGEND */}
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-[#f3e4e7] pt-4">
              {[
                ["#e58da4", "Selected"],
                ["#f6b7c7", "Period"],
                ["#edf6e8", "Fertile (estimate)"],
                ["#f4d7a2", "Ovulation (estimate)"],
              ].map(([color, label]) => (
                <div
                  key={label}
                  className="flex items-center gap-1.5 text-[10px] text-gray-500"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {label}
                </div>
              ))}
            </div>

            {form.periodStartDate && (
              <button
                type="button"
                onClick={clearDateSelection}
                className="mt-3 text-xs font-medium text-[#d97d96] hover:underline"
              >
                Clear selected dates
              </button>
            )}
          </div>
        </div>

        {/* PREDICTIONS (from saved history, always visible) */}
        {!loading && summary && (
          <div className="mb-6 rounded-3xl bg-[#292331] p-5 text-white sm:p-6">
            {ready ? (
              <>
                <div className="grid gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-[11px] text-white/40">Current cycle</p>
                    <p className="mt-1 text-xl font-semibold">
                      {summary.currentDay ? `Day ${summary.currentDay}` : "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] text-white/40">Average cycle</p>
                    <p className="mt-1 text-xl font-semibold">
                      {summary.averageCycleLength} days
                    </p>
                    <p className="mt-1 text-[10px] text-white/35">
                      Range {summary.shortestCycle}–{summary.longestCycle}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] text-white/40">Ovulation</p>
                    <p className="mt-1 text-lg font-semibold">
                      {summary.ovulation && goal !== "avoid"
                        ? formatDate(summary.ovulation)
                        : "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] text-white/40">Next period</p>
                    <p className="mt-1 text-lg font-semibold">
                      {formatDate(summary.nextPeriod)}
                    </p>
                    {summary.daysLate > 0 && (
                      <p className="mt-1 text-[10px] text-white/35">
                        {summary.daysLate} day
                        {summary.daysLate > 1 ? "s" : ""} past this date
                      </p>
                    )}
                  </div>
                </div>
                                <div
                  className={`mt-4 rounded-2xl bg-[#e58da4]/10 p-4 ${
                    goal === "avoid" ? "hidden" : ""
                  }`}
                >
                  <p className="text-[11px] font-medium uppercase tracking-wider text-[#f2a9bb]">
                    Fertile window
                  </p>

                  {hasFertile ? (
                    <p className="mt-1 text-base font-semibold">
                      {formatDate(summary.fertileStart)} —{" "}
                      {formatDate(summary.fertileEnd)}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-white/70">
                      Your cycles vary by more than a week, so Lunara doesn't
                      estimate a fertile window.
                    </p>
                  )}

                  <p className="mt-1.5 text-[10px] leading-4 text-white/40">
                    Based on your last {summary.cyclesUsed ?? Math.min(summary.cyclesTracked - 1, 6)}{" "}
                    cycles. Estimates can vary from cycle to cycle.
                  </p>
                </div>
              </>
            ) : (
              <div>
                <p className="font-semibold">Building your predictions</p>
                <p className="mt-1 text-sm leading-6 text-white/60">
                  {summary.cyclesTracked} of 3 periods logged. Lunara needs at
                  least 3 to estimate your next period. It won't guess before
                  that.
                </p>
              </div>
            )}
          </div>
        )}

        {/* MAIN FORM */}
        <div className="rounded-3xl bg-white p-6 shadow-[0_12px_40px_rgba(170,95,120,0.08)] sm:p-7">
          <div className="mb-7">
            <h2 className="text-xl font-semibold text-[#292331]">
              Complete your cycle log
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Add details to make your insights more useful.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* SELECTED DATES */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#f3dfe4] bg-[#fff6f8] p-4">
                <p className="text-[11px] text-gray-400">Period started</p>
                <p className="mt-1 text-base font-semibold text-[#292331]">
                  {form.periodStartDate
                    ? formatDate(form.periodStartDate)
                    : "Select on calendar"}
                </p>
              </div>

              <div className="rounded-2xl border border-[#f3dfe4] bg-[#fff6f8] p-4">
                <p className="text-[11px] text-gray-400">Period ended</p>
                <p className="mt-1 text-base font-semibold text-[#292331]">
                  {form.periodEndDate
                    ? formatDate(form.periodEndDate)
                    : "Select on calendar"}
                </p>
              </div>
            </div>

            {/* GOAL */}
            <div>
              <p className="text-sm font-medium text-[#292331]">
                What are you planning for?
              </p>

              <p className="mt-1 text-xs text-gray-400">
                Select one and Lunara will show the relevant guidance.
              </p>

              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {[
                  ["tracking", "Just tracking", "Understand your period and cycle pattern."],
                  ["conceive", "Trying to conceive", "See fertile days and estimated ovulation."],
                  ["avoid", "Avoid pregnancy", "See fertility awareness and prevention guidance."],
                ].map(([id, title, text]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={goal === id}
                    onClick={() => setGoal(id)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      goal === id
                        ? "border-[#e58da4] bg-[#fff0f3]"
                        : "border-[#eadde1] hover:border-[#e58da4]"
                    }`}
                  >
                    <p className="font-medium text-[#292331]">{title}</p>
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      {text}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* TRACKING PANEL */}
            {goal === "tracking" && (
              <div className="rounded-2xl border border-[#eadde1] bg-[#fffafb] p-5">
                <p className="font-semibold text-[#292331]">
                  Your cycle overview
                </p>

                {ready ? (
                  <div className="mt-3 space-y-2 text-sm text-gray-600">
                    <p>
                      Next expected period:{" "}
                      <strong>{formatDate(summary.nextPeriod)}</strong>
                    </p>

                    {hasFertile ? (
                      <>
                        <p>
                          Estimated ovulation:{" "}
                          <strong>{formatDate(summary.ovulation)}</strong>
                        </p>
                        <p>
                          Estimated fertile window:{" "}
                          <strong>
                            {formatDate(summary.fertileStart)} —{" "}
                            {formatDate(summary.fertileEnd)}
                          </strong>
                        </p>
                      </>
                    ) : (
                      <p className="text-gray-500">{noEstimateText}</p>
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-gray-500">
                    {noEstimateText}
                  </p>
                )}
              </div>
            )}

            {/* CONCEIVE PANEL */}
            {goal === "conceive" && (
              <div className="rounded-2xl border border-[#f0d9df] bg-[#fff7f8] p-5">
                <p className="font-semibold text-[#292331]">
                  Trying to conceive
                </p>

                {hasFertile ? (
                  <>
                    <p className="mt-3 text-sm leading-6 text-gray-600">
                      Your estimated fertile window is{" "}
                      <strong>{formatDate(summary.fertileStart)}</strong> to{" "}
                      <strong>{formatDate(summary.fertileEnd)}</strong>.
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-white p-4">
                        <p className="text-[11px] text-gray-400">
                          Estimated ovulation
                        </p>
                        <p className="mt-1 font-semibold text-[#292331]">
                          {formatDate(summary.ovulation)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-white p-4">
                        <p className="text-[11px] text-gray-400">
                          Best time to try
                        </p>
                        <p className="mt-1 font-semibold text-[#292331]">
                          During the fertile window
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 text-xs leading-5 text-gray-400">
                      Having sex every 1–2 days during the fertile window can
                      help maximize the chance of conception. These calendar
                      dates are estimates.
                    </p>
                  </>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-gray-500">
                    {noEstimateText}
                  </p>
                )}
              </div>
            )}

            {/* AVOID PANEL */}
            {goal === "avoid" && (
              <div className="rounded-2xl border border-[#eadde1] bg-[#fff7f8] p-5">
                <p className="font-semibold text-[#292331]">
                  Pregnancy prevention
                </p>

                <div className="mt-3 rounded-xl bg-white p-4">
                  <p className="text-sm leading-6 text-gray-600">
                    Lunara doesn&apos;t show fertile days when your goal is to
                    avoid pregnancy, because calendar-based estimates are not
                    a reliable way to prevent it. Please don&apos;t rely on
                    predicted &ldquo;safe days&rdquo;.
                  </p>
                </div>

                <p className="mt-3 text-xs leading-5 text-gray-500">
                  Use reliable contraception consistently, and talk to a
                  doctor or pharmacist about the best option for you. Cycle
                  predictions can be inaccurate, especially with irregular
                  cycles.
                </p>
              </div>
            )}

            {/* MOOD */}
            <div>
              <p className="mb-3 text-sm font-medium text-[#292331]">
                How are you feeling?
              </p>

              <div className="flex flex-wrap gap-2">
                {moodsList.map((mood) => (
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
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      form.mood === mood
                        ? "border-[#e58da4] bg-[#fdf0f3] text-[#d97d96]"
                        : "border-[#eadde1] text-gray-500 hover:border-[#e58da4]"
                    }`}
                  >
                    {mood}
                  </button>
                ))}
              </div>
            </div>

            {/* SYMPTOMS */}
            <div>
              <p className="mb-3 text-sm font-medium text-[#292331]">
                Symptoms
              </p>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {symptomsList.map((symptom) => (
                  <button
                    key={symptom}
                    type="button"
                    aria-pressed={symptoms.includes(symptom)}
                    onClick={() => toggleSymptom(symptom)}
                    className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                      symptoms.includes(symptom)
                        ? "border-[#e58da4] bg-[#fdf0f3] text-[#d97d96]"
                        : "border-[#eadde1] text-gray-500 hover:border-[#e58da4]"
                    }`}
                  >
                    {symptom}
                  </button>
                ))}
              </div>
            </div>

            {/* NOTES */}
            <div>
              <label
                htmlFor="notes"
                className="mb-2 block text-sm font-medium text-[#292331]"
              >
                Notes
              </label>

              <textarea
                id="notes"
                name="notes"
                value={form.notes}
                onChange={handleChange}
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

            <button
              type="submit"
              disabled={saving || !form.periodStartDate}
              className="h-12 w-full rounded-xl bg-[#e58da4] text-sm font-semibold text-white hover:bg-[#d97d96] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save my cycle"}
            </button>
          </form>
        </div>

        {/* HISTORY */}
        <div className="mt-6 rounded-3xl bg-[#292331] p-6 text-white sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs text-white/40">Your records</p>
              <h2 className="mt-1 text-xl font-semibold">Cycle history</h2>
            </div>

            {cycles.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                disabled={clearing}
                className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 transition hover:border-red-300/30 hover:text-red-300 disabled:opacity-50"
              >
                {clearing ? "Clearing..." : "Clear history"}
              </button>
            )}
          </div>

          {(editing || message === "That period has been deleted.") &&
            (error || message) && (
              <p
                role={error ? "alert" : "status"}
                className={`mt-4 rounded-xl px-4 py-3 text-sm ${
                  error
                    ? "bg-red-500/10 text-red-300"
                    : "bg-green-500/10 text-green-300"
                }`}
              >
                {error || message}
              </p>
            )}

          {loading ? (
            <p className="mt-6 text-sm text-white/50">
              Loading your history...
            </p>
          ) : cycles.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-white/50">No cycle history yet.</p>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {cycles.map((cycle) => (
                <div
                  key={cycle._id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {formatDate(cycle.periodStartDate)}
                      </p>

                      {cycle.periodEndDate && (
                        <p className="mt-1 text-xs text-white/35">
                          to {formatDate(cycle.periodEndDate)}
                        </p>
                      )}
                    </div>

                    {cycle.mood && (
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/60">
                        {cycle.mood}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-white/35">Period</p>
                      <p className="mt-1 text-white/65">
                        {cycle.periodLength ? `${cycle.periodLength} days` : "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-white/35">Gap before</p>
                      <p className="mt-1 text-white/65">
                        {cycle.cycleLength ? `${cycle.cycleLength} days` : "—"}
                      </p>
                    </div>
                  </div>

                  {cycle.symptoms?.length > 0 && (
                    <p className="mt-3 text-xs text-white/45">
                      {cycle.symptoms.join(", ")}
                    </p>
                  )}

                  {editing?.id === cycle._id ? (
                    <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="grid grid-cols-2 gap-3">
                        <label className="text-xs text-white/50">
                          Start
                          <input
                            type="date"
                            value={editing.start}
                            max={dateToKey(new Date())}
                            onChange={(e) =>
                              setEditing((prev) => ({
                                ...prev,
                                start: e.target.value,
                              }))
                            }
                            className="mt-1 w-full rounded-lg border border-white/10 bg-transparent px-2 py-2 text-sm text-white [color-scheme:dark]"
                          />
                        </label>

                        <label className="text-xs text-white/50">
                          End
                          <input
                            type="date"
                            value={editing.end}
                            min={editing.start || undefined}
                            max={dateToKey(new Date())}
                            onChange={(e) =>
                              setEditing((prev) => ({
                                ...prev,
                                end: e.target.value,
                              }))
                            }
                            className="mt-1 w-full rounded-lg border border-white/10 bg-transparent px-2 py-2 text-sm text-white [color-scheme:dark]"
                          />
                        </label>
                      </div>

                      <p className="text-[11px] text-white/35">
                        Leave the end date empty if your period hasn't ended.
                      </p>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={saveEdit}
                          disabled={editSaving}
                          className="rounded-lg bg-[#e58da4] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          {editSaving ? "Saving..." : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(cycle)}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:text-white"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCycle(cycle)}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:border-red-300/30 hover:text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}