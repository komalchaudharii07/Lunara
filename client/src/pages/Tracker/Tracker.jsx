import { useEffect, useMemo, useState } from "react";
import {
  createCycle,
  getCycles,
  clearCycleHistory,
} from "../../services/api";

const symptomsList = [
  "Cramps",
  "Headache",
  "Bloating",
  "Back pain",
  "Fatigue",
  "Breast tenderness",
];

const moodsList = [
  "Happy",
  "Calm",
  "Okay",
  "Low",
  "Irritated",
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

const pad = (value) =>
  String(value).padStart(2, "0");

const dateToKey = (date) =>
  `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}`;

const keyToDate = (key) => {
  if (!key) return null;

  const [year, month, day] =
    key.split("-").map(Number);

  return new Date(year, month - 1, day);
};

const formatDate = (date) => {
  if (!date) return "";

  const value =
    typeof date === "string"
      ? keyToDate(date.slice(0, 10))
      : new Date(date);

  if (!value || Number.isNaN(value.getTime())) {
    return "";
  }

  return value.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getDaysBetween = (start, end) => {
  const first =
    typeof start === "string"
      ? keyToDate(start.slice(0, 10))
      : new Date(start);

  const second =
    typeof end === "string"
      ? keyToDate(end.slice(0, 10))
      : new Date(end);

  return Math.round(
    (second - first) /
    (1000 * 60 * 60 * 24)
  );
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(
    result.getDate() + days
  );
  return result;
};

const isDateBetween = (
  dateKey,
  startKey,
  endKey
) => {
  if (!startKey) return false;

  if (!endKey) {
    return dateKey === startKey;
  }

  return (
    dateKey >= startKey &&
    dateKey <= endKey
  );
};

export default function Tracker() {
  const today = new Date();

  const [form, setForm] = useState({
    periodStartDate: "",
    periodEndDate: "",
    mood: "",
    notes: "",
  });

  const [goal, setGoal] =
    useState("tracking");

  const [symptoms, setSymptoms] =
    useState([]);

  const [cycles, setCycles] =
    useState([]);

  const [calendarMonth, setCalendarMonth] =
    useState(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      )
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [clearing, setClearing] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const getToken = () =>
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

  useEffect(() => {
    const fetchCycles = async () => {
      try {
        const token = getToken();

        if (!token) {
          setError("Please login again.");
          return;
        }

        const data = await getCycles(token);

        setCycles(data.cycles || []);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCycles();
  }, []);

  /*
    Calculate user's average cycle length.
  */
  const averageCycleLength = useMemo(() => {
    if (cycles.length < 2) {
      return null;
    }

    const sorted = [...cycles].sort(
      (a, b) =>
        new Date(a.periodStartDate) -
        new Date(b.periodStartDate)
    );

    const lengths = [];

    for (let i = 1; i < sorted.length; i++) {
      const days = getDaysBetween(
        sorted[i - 1].periodStartDate,
        sorted[i].periodStartDate
      );

      if (days >= 15 && days <= 60) {
        lengths.push(days);
      }
    }

    if (!lengths.length) {
      return null;
    }

    const total = lengths.reduce(
      (sum, value) => sum + value,
      0
    );

    return Math.round(
      total / lengths.length
    );
  }, [cycles]);

  /*
    Until Lunara has enough history,
    use 28 days as a temporary estimate.
  */
  const calculationCycleLength =
    averageCycleLength || 28;

  const periodLength = useMemo(() => {
    if (
      !form.periodStartDate ||
      !form.periodEndDate
    ) {
      return null;
    }

    const days = getDaysBetween(
      form.periodStartDate,
      form.periodEndDate
    );

    return days >= 0 ? days + 1 : null;
  }, [
    form.periodStartDate,
    form.periodEndDate,
  ]);

  /*
    Fertility calculation.
  */
  const cycleInfo = useMemo(() => {
    if (!form.periodStartDate) {
      return null;
    }

    const start = keyToDate(
      form.periodStartDate
    );

    const todayDate = new Date();

    todayDate.setHours(
      0,
      0,
      0,
      0
    );

    const currentDay =
      getDaysBetween(
        start,
        todayDate
      ) + 1;

    const nextPeriod = addDays(
      start,
      calculationCycleLength
    );

    const ovulation = addDays(
      nextPeriod,
      -14
    );

    const fertileStart = addDays(
      ovulation,
      -5
    );

    const fertileEnd = addDays(
      ovulation,
      1
    );

    return {
      currentDay:
        currentDay > 0
          ? currentDay
          : null,

      nextPeriod,

      ovulation,

      fertileStart,

      fertileEnd,

      isUsingDefault:
        !averageCycleLength,
    };
  }, [
    form.periodStartDate,
    averageCycleLength,
    calculationCycleLength,
  ]);

  /*
    Calendar days.
  */
  const calendarDays = useMemo(() => {
    const year =
      calendarMonth.getFullYear();

    const month =
      calendarMonth.getMonth();

    const firstDay = new Date(
      year,
      month,
      1
    );

    const totalDays = new Date(
      year,
      month + 1,
      0
    ).getDate();

    const startingDay =
      firstDay.getDay();

    const days = [];

    for (
      let i = 0;
      i < startingDay;
      i++
    ) {
      days.push(null);
    }

    for (
      let day = 1;
      day <= totalDays;
      day++
    ) {
      days.push(
        new Date(
          year,
          month,
          day
        )
      );
    }

    return days;
  }, [calendarMonth]);

  const previousMonth = () => {
    setCalendarMonth(
      (prev) =>
        new Date(
          prev.getFullYear(),
          prev.getMonth() - 1,
          1
        )
    );
  };

  const nextMonth = () => {
    setCalendarMonth(
      (prev) =>
        new Date(
          prev.getFullYear(),
          prev.getMonth() + 1,
          1
        )
    );
  };

  const goToToday = () => {
    const now = new Date();

    setCalendarMonth(
      new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      )
    );
  };

  /*
    Calendar selection:
    first click = start
    second click = end
    third click = new period
  */
  const handleCalendarDateClick = (
    date
  ) => {
    const selectedKey =
      dateToKey(date);

    setMessage("");
    setError("");

    if (!form.periodStartDate) {
      setForm((prev) => ({
        ...prev,
        periodStartDate:
          selectedKey,
        periodEndDate: "",
      }));

      return;
    }

    if (
      form.periodStartDate &&
      !form.periodEndDate
    ) {
      if (
        selectedKey ===
        form.periodStartDate
      ) {
        return;
      }

      if (
        selectedKey <
        form.periodStartDate
      ) {
        setForm((prev) => ({
          ...prev,
          periodStartDate:
            selectedKey,
          periodEndDate:
            prev.periodStartDate,
        }));
      } else {
        setForm((prev) => ({
          ...prev,
          periodEndDate:
            selectedKey,
        }));
      }

      return;
    }

    setForm((prev) => ({
      ...prev,
      periodStartDate:
        selectedKey,
      periodEndDate: "",
    }));
  };

  const clearDateSelection = () => {
    setForm((prev) => ({
      ...prev,
      periodStartDate: "",
      periodEndDate: "",
    }));
  };

  const handleChange = (e) => {
    const {
      name,
      value,
    } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setMessage("");
    setError("");
  };

  const toggleSymptom = (
    symptom
  ) => {
    setSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter(
          (item) =>
            item !== symptom
        )
        : [...prev, symptom]
    );
  };

  /*
    Save cycle.
  */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.periodStartDate) {
      setError(
        "Please select your period start date."
      );
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const token = getToken();

      if (!token) {
        throw new Error(
          "Please login again."
        );
      }

      const data =
        await createCycle(
          {
            periodStartDate:
              form.periodStartDate,

            periodEndDate:
              form.periodEndDate ||
              undefined,

            periodLength:
              periodLength ||
              undefined,

            symptoms,

            mood: form.mood,

            notes: form.notes,
          },
          token
        );

      setCycles((prev) => [
        data.cycle,
        ...prev,
      ]);

      setForm({
        periodStartDate: "",
        periodEndDate: "",
        mood: "",
        notes: "",
      });

      setSymptoms([]);

      setMessage(
        "Your cycle has been saved successfully."
      );
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  /*
    Clear complete history.
  */
  const handleClearHistory = async () => {
    if (!cycles.length) return;

    const confirmed =
      window.confirm(
        "Are you sure you want to delete your complete cycle history?"
      );

    if (!confirmed) return;

    setClearing(true);
    setMessage("");
    setError("");

    try {
      const token = getToken();

      if (!token) {
        throw new Error(
          "Please login again."
        );
      }

      await clearCycleHistory(token);

      setCycles([]);

      setMessage(
        "Your cycle history has been cleared."
      );
    } catch (error) {
      setError(error.message);
    } finally {
      setClearing(false);
    }
  };

  const isSavedPeriodDate = (
    dateKey
  ) => {
    return cycles.some((cycle) => {
      const start =
        cycle.periodStartDate
          ? cycle.periodStartDate.slice(
            0,
            10
          )
          : "";

      const end =
        cycle.periodEndDate
          ? cycle.periodEndDate.slice(
            0,
            10
          )
          : "";

      return isDateBetween(
        dateKey,
        start,
        end
      );
    });
  };

  const isSelectedPeriodDate = (
    dateKey
  ) => {
    return isDateBetween(
      dateKey,
      form.periodStartDate,
      form.periodEndDate
    );
  };

  const isFertileDate = (
    date
  ) => {
    if (!cycleInfo) {
      return false;
    }

    const current =
      dateToKey(date);

    const start =
      dateToKey(
        cycleInfo.fertileStart
      );

    const end =
      dateToKey(
        cycleInfo.fertileEnd
      );

    return (
      current >= start &&
      current <= end
    );
  };

  const isOvulationDate = (
    date
  ) => {
    if (!cycleInfo) {
      return false;
    }

    return (
      dateToKey(date) ===
      dateToKey(
        cycleInfo.ovulation
      )
    );
  };

  const isToday = (date) => {
    return (
      dateToKey(date) ===
      dateToKey(new Date())
    );
  };

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
            Track your period, understand your
            cycle pattern and get personalized
            fertility insights.
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
                  {MONTHS[
                    calendarMonth.getMonth()
                  ]}{" "}
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
                  className="h-8 w-8 rounded-lg border border-[#eadde1] text-lg text-[#292331] hover:bg-[#fff5f7]"
                >
                  ‹
                </button>

                <button
                  type="button"
                  onClick={nextMonth}
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
                    : `${formatDate(
                      form.periodStartDate
                    )} — ${formatDate(
                      form.periodEndDate
                    )}`}
              </p>
            </div>

            {/* WEEKDAYS */}
            <div className="mt-4 grid grid-cols-7 gap-1">
              {WEEKDAYS.map(
                (day) => (
                  <div
                    key={day}
                    className="py-1.5 text-center text-[10px] font-medium uppercase text-gray-400"
                  >
                    {day}
                  </div>
                )
              )}
            </div>

            {/* CALENDAR DAYS */}
            <div className="grid grid-cols-7 gap-1">

              {calendarDays.map(
                (date, index) => {
                  if (!date) {
                    return (
                      <div
                        key={`empty-${index}`}
                        className="h-10 sm:h-11"
                      />
                    );
                  }

                  const key =
                    dateToKey(date);

                  const saved =
                    isSavedPeriodDate(
                      key
                    );

                  const selected =
                    isSelectedPeriodDate(
                      key
                    );

                  const fertile =
                    isFertileDate(date);

                  const ovulation =
                    isOvulationDate(
                      date
                    );

                  const today =
                    isToday(date);

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        handleCalendarDateClick(
                          date
                        )
                      }
                      className={`
                        relative h-10 rounded-lg text-xs font-medium transition sm:h-11
                        ${selected
                          ? "bg-[#e58da4] text-white"
                          : saved
                            ? "bg-[#f6b7c7] text-[#7e4053]"
                            : ovulation
                              ? "bg-[#f4d7a2] text-[#78581f]"
                              : fertile
                                ? "bg-[#edf6e8] text-[#5c754e]"
                                : "text-[#292331] hover:bg-[#fff0f3]"
                        }
                      `}
                    >
                      {date.getDate()}

                      {today && (
                        <span
                          className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${selected
                              ? "bg-white"
                              : "bg-[#e58da4]"
                            }`}
                        />
                      )}

                      {ovulation &&
                        !selected && (
                          <span className="absolute right-1 top-1 h-1 w-1 rounded-full bg-[#c48a25]" />
                        )}
                    </button>
                  );
                }
              )}

            </div>

            {/* LEGEND */}
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-[#f3e4e7] pt-4">

              <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                <span className="h-2.5 w-2.5 rounded-full bg-[#e58da4]" />
                Selected
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                <span className="h-2.5 w-2.5 rounded-full bg-[#f6b7c7]" />
                Period
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                <span className="h-2.5 w-2.5 rounded-full bg-[#edf6e8]" />
                Fertile
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                <span className="h-2.5 w-2.5 rounded-full bg-[#f4d7a2]" />
                Ovulation
              </div>

            </div>

            {form.periodStartDate && (
              <button
                type="button"
                onClick={
                  clearDateSelection
                }
                className="mt-3 text-xs font-medium text-[#d97d96] hover:underline"
              >
                Clear selected dates
              </button>
            )}

          </div>
        </div>

        {/* INSIGHTS */}
        {form.periodStartDate &&
          cycleInfo && (
            <div className="mb-6 rounded-3xl bg-[#292331] p-5 text-white sm:p-6">

              <div className="grid gap-4 sm:grid-cols-4">

                <div>
                  <p className="text-[11px] text-white/40">
                    Current cycle
                  </p>

                  <p className="mt-1 text-xl font-semibold">
                    {cycleInfo.currentDay
                      ? `Day ${cycleInfo.currentDay}`
                      : "—"}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] text-white/40">
                    Cycle length
                  </p>

                  <p className="mt-1 text-xl font-semibold">
                    {calculationCycleLength} days
                  </p>

                  {!averageCycleLength && (
                    <p className="mt-1 text-[10px] text-white/35">
                      Temporary estimate
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-[11px] text-white/40">
                    Ovulation
                  </p>

                  <p className="mt-1 text-lg font-semibold">
                    {formatDate(
                      cycleInfo.ovulation
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] text-white/40">
                    Next period
                  </p>

                  <p className="mt-1 text-lg font-semibold">
                    {formatDate(
                      cycleInfo.nextPeriod
                    )}
                  </p>
                </div>

              </div>

              <div className="mt-4 rounded-2xl bg-[#e58da4]/10 p-4">

                <p className="text-[11px] font-medium uppercase tracking-wider text-[#f2a9bb]">
                  Fertile window
                </p>

                <p className="mt-1 text-base font-semibold">
                  {formatDate(
                    cycleInfo.fertileStart
                  )}
                  {" — "}
                  {formatDate(
                    cycleInfo.fertileEnd
                  )}
                </p>

                <p className="mt-1.5 text-[10px] leading-4 text-white/40">
                  {cycleInfo.isUsingDefault
                    ? "This is an initial estimate using a 28-day cycle. Lunara will personalize it as more cycle history is saved."
                    : "Based on your saved cycle history. Actual ovulation can vary."}
                </p>

              </div>

            </div>
          )}

        {/* MAIN FORM */}
        <div className="rounded-3xl bg-white p-6 shadow-[0_12px_40px_rgba(170,95,120,0.08)] sm:p-7">

          <div className="mb-7">
            <h2 className="text-xl font-semibold text-[#292331]">
              Complete your cycle log
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Add details to make your insights
              more useful.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >

            {/* SELECTED DATES */}
            <div className="grid gap-3 sm:grid-cols-2">

              <div className="rounded-2xl border border-[#f3dfe4] bg-[#fff6f8] p-4">
                <p className="text-[11px] text-gray-400">
                  Period started
                </p>

                <p className="mt-1 text-base font-semibold text-[#292331]">
                  {form.periodStartDate
                    ? formatDate(
                      form.periodStartDate
                    )
                    : "Select on calendar"}
                </p>
              </div>

              <div className="rounded-2xl border border-[#f3dfe4] bg-[#fff6f8] p-4">
                <p className="text-[11px] text-gray-400">
                  Period ended
                </p>

                <p className="mt-1 text-base font-semibold text-[#292331]">
                  {form.periodEndDate
                    ? formatDate(
                      form.periodEndDate
                    )
                    : "Select on calendar"}
                </p>
              </div>

            </div>

            {/* GOAL */}
            <div>

              <label className="text-sm font-medium text-[#292331]">
                What are you planning for?
              </label>

              <p className="mt-1 text-xs text-gray-400">
                Select one and Lunara will show
                the relevant guidance.
              </p>

              <div className="mt-3 grid gap-3 md:grid-cols-3">

                <button
                  type="button"
                  onClick={() =>
                    setGoal("tracking")
                  }
                  className={`rounded-2xl border p-4 text-left transition ${goal === "tracking"
                      ? "border-[#e58da4] bg-[#fff0f3]"
                      : "border-[#eadde1] hover:border-[#e58da4]"
                    }`}
                >
                  <p className="font-medium text-[#292331]">
                    Just tracking
                  </p>

                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Understand your period and
                    cycle pattern.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setGoal("conceive")
                  }
                  className={`rounded-2xl border p-4 text-left transition ${goal === "conceive"
                      ? "border-[#e58da4] bg-[#fff0f3]"
                      : "border-[#eadde1] hover:border-[#e58da4]"
                    }`}
                >
                  <p className="font-medium text-[#292331]">
                    Trying to conceive
                  </p>

                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    See fertile days and estimated
                    ovulation.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setGoal("avoid")
                  }
                  className={`rounded-2xl border p-4 text-left transition ${goal === "avoid"
                      ? "border-[#e58da4] bg-[#fff0f3]"
                      : "border-[#eadde1] hover:border-[#e58da4]"
                    }`}
                >
                  <p className="font-medium text-[#292331]">
                    Avoid pregnancy
                  </p>

                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    See fertility awareness and
                    prevention guidance.
                  </p>
                </button>

              </div>
            </div>

            {/* TRACKING PANEL */}
            {goal === "tracking" && (
              <div className="rounded-2xl border border-[#eadde1] bg-[#fffafb] p-5">

                <p className="font-semibold text-[#292331]">
                  Your cycle overview
                </p>

                {cycleInfo ? (
                  <div className="mt-3 space-y-2 text-sm text-gray-600">
                    <p>
                      Next expected period:{" "}
                      <strong>
                        {formatDate(
                          cycleInfo.nextPeriod
                        )}
                      </strong>
                    </p>

                    <p>
                      Estimated ovulation:{" "}
                      <strong>
                        {formatDate(
                          cycleInfo.ovulation
                        )}
                      </strong>
                    </p>

                    <p>
                      Estimated fertile window:{" "}
                      <strong>
                        {formatDate(
                          cycleInfo.fertileStart
                        )}{" "}
                        —{" "}
                        {formatDate(
                          cycleInfo.fertileEnd
                        )}
                      </strong>
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-gray-500">
                    Select your period start date
                    on the calendar to see your
                    cycle insights.
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

                {cycleInfo ? (
                  <>
                    <p className="mt-3 text-sm leading-6 text-gray-600">
                      Your estimated fertile window
                      is{" "}
                      <strong>
                        {formatDate(
                          cycleInfo.fertileStart
                        )}
                      </strong>{" "}
                      to{" "}
                      <strong>
                        {formatDate(
                          cycleInfo.fertileEnd
                        )}
                      </strong>
                      .
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">

                      <div className="rounded-xl bg-white p-4">
                        <p className="text-[11px] text-gray-400">
                          Estimated ovulation
                        </p>

                        <p className="mt-1 font-semibold text-[#292331]">
                          {formatDate(
                            cycleInfo.ovulation
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl bg-white p-4">
                        <p className="text-[11px] text-gray-400">
                          Best time to try
                        </p>

                        <p className="mt-1 font-semibold text-[#292331]">
                          During the fertile
                          window
                        </p>
                      </div>

                    </div>

                    <p className="mt-4 text-xs leading-5 text-gray-400">
                      Having sex every 1–2 days
                      during the fertile window can
                      help maximize the chance of
                      conception. These calendar dates
                      are estimates.
                    </p>
                  </>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-gray-500">
                    Select your period start date
                    first. Lunara will then show
                    your estimated fertile window.
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

                {cycleInfo ? (
                  <>
                    <p className="mt-3 text-sm leading-6 text-gray-600">
                      Your estimated fertile window
                      is{" "}
                      <strong>
                        {formatDate(
                          cycleInfo.fertileStart
                        )}
                      </strong>{" "}
                      to{" "}
                      <strong>
                        {formatDate(
                          cycleInfo.fertileEnd
                        )}
                      </strong>
                      .
                    </p>

                    <div className="mt-4 rounded-xl bg-white p-4">
                      <p className="text-sm leading-6 text-gray-600">
                        Pregnancy is more likely
                        around the fertile window.
                        Do not rely on predicted
                        “safe days” alone if you
                        want to avoid pregnancy.
                      </p>
                    </div>

                    <p className="mt-3 text-xs leading-5 text-gray-400">
                      Use reliable contraception
                      consistently. Cycle predictions
                      can be inaccurate, especially
                      with irregular cycles.
                    </p>
                  </>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-gray-500">
                    Select your period start date
                    first. Lunara will calculate
                    your estimated fertile window.
                  </p>
                )}

              </div>
            )}

            {/* MOOD */}
            <div>

              <label className="mb-3 block text-sm font-medium text-[#292331]">
                How are you feeling?
              </label>

              <div className="flex flex-wrap gap-2">
                {moodsList.map(
                  (mood) => (
                    <button
                      key={mood}
                      type="button"
                      onClick={() =>
                        setForm(
                          (prev) => ({
                            ...prev,
                            mood:
                              prev.mood ===
                                mood
                                ? ""
                                : mood,
                          })
                        )
                      }
                      className={`rounded-full border px-4 py-2 text-sm transition ${form.mood === mood
                          ? "border-[#e58da4] bg-[#fdf0f3] text-[#d97d96]"
                          : "border-[#eadde1] text-gray-500 hover:border-[#e58da4]"
                        }`}
                    >
                      {mood}
                    </button>
                  )
                )}
              </div>

            </div>

            {/* SYMPTOMS */}
            <div>

              <label className="mb-3 block text-sm font-medium text-[#292331]">
                Symptoms
              </label>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {symptomsList.map(
                  (symptom) => (
                    <button
                      key={symptom}
                      type="button"
                      onClick={() =>
                        toggleSymptom(
                          symptom
                        )
                      }
                      className={`rounded-xl border px-4 py-3 text-left text-sm transition ${symptoms.includes(
                        symptom
                      )
                          ? "border-[#e58da4] bg-[#fdf0f3] text-[#d97d96]"
                          : "border-[#eadde1] text-gray-500 hover:border-[#e58da4]"
                        }`}
                    >
                      {symptom}
                    </button>
                  )
                )}
              </div>

            </div>

            {/* NOTES */}
            <div>

              <label className="mb-2 block text-sm font-medium text-[#292331]">
                Notes
              </label>

              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows="3"
                placeholder="Anything you'd like to remember..."
                className="w-full resize-none rounded-xl border border-[#eadde1] bg-[#fffafb] px-4 py-3 text-sm outline-none focus:border-[#e58da4]"
              />

            </div>

            {message && (
              <p className="rounded-xl bg-[#f0faf3] px-4 py-3 text-sm text-green-600">
                {message}
              </p>
            )}

            {error && (
              <p className="rounded-xl bg-[#fff0f1] px-4 py-3 text-sm text-red-500">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={
                saving ||
                !form.periodStartDate
              }
              className="h-12 w-full rounded-xl bg-[#e58da4] text-sm font-semibold text-white hover:bg-[#d97d96] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : "Save my cycle"}
            </button>

          </form>
        </div>

        {/* HISTORY */}
        <div className="mt-6 rounded-3xl bg-[#292331] p-6 text-white sm:p-7">

          <div className="flex flex-wrap items-end justify-between gap-4">

            <div>
              <p className="text-xs text-white/40">
                Your records
              </p>

              <h2 className="mt-1 text-xl font-semibold">
                Cycle history
              </h2>
            </div>

            {cycles.length > 0 && (
              <button
                type="button"
                onClick={
                  handleClearHistory
                }
                disabled={clearing}
                className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 transition hover:border-red-300/30 hover:text-red-300 disabled:opacity-50"
              >
                {clearing
                  ? "Clearing..."
                  : "Clear history"}
              </button>
            )}

          </div>

          {loading ? (
            <p className="mt-6 text-sm text-white/50">
              Loading your history...
            </p>
          ) : cycles.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-white/50">
                No cycle history yet.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 md:grid-cols-2">

              {cycles.map(
                (cycle) => (
                  <div
                    key={cycle._id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >

                    <div className="flex items-center justify-between gap-3">

                      <div>
                        <p className="font-medium">
                          {formatDate(
                            cycle.periodStartDate
                          )}
                        </p>

                        {cycle.periodEndDate && (
                          <p className="mt-1 text-xs text-white/35">
                            to{" "}
                            {formatDate(
                              cycle.periodEndDate
                            )}
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
                        <p className="text-white/35">
                          Period
                        </p>

                        <p className="mt-1 text-white/65">
                          {cycle.periodLength
                            ? `${cycle.periodLength} days`
                            : "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-white/35">
                          Cycle
                        </p>

                        <p className="mt-1 text-white/65">
                          {cycle.cycleLength
                            ? `${cycle.cycleLength} days`
                            : "Learning"}
                        </p>
                      </div>

                    </div>

                  </div>
                )
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
}