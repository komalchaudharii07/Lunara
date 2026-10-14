import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getCycles, getCycleSummary } from "../../services/api";

// "YYYY-MM-DD" (or an ISO string) -> a LOCAL date, so no day is ever shifted
const keyToDate = (value) => {
  if (!value) return null;
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
};

const formatDate = (value, withYear = true) => {
  const date = keyToDate(value);
  if (!date) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  });
};

export default function Insights() {
  const [cycles, setCycles] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      setLoading(true);

      // one failing call must not hide the other
      const [cycleResult, summaryResult] = await Promise.allSettled([
        getCycles(),
        getCycleSummary(),
      ]);

      if (ignore) return;

      const problems = [];

      if (cycleResult.status === "fulfilled") {
        setCycles(cycleResult.value.cycles || []);
      } else {
        problems.push(cycleResult.reason.message);
      }

      if (summaryResult.status === "fulfilled") {
        setSummary(summaryResult.value.summary);
      } else {
        problems.push(summaryResult.reason.message);
      }

      setErrors(problems);
      setLoading(false);
    };

    load();

    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  // newest first (the server already sorts, this keeps it safe)
  const history = useMemo(
    () =>
      [...cycles].sort(
        (a, b) => new Date(b.periodStartDate) - new Date(a.periodStartDate)
      ),
    [cycles]
  );

  // gentle flags worth mentioning to a doctor (never a diagnosis)
  const flags = useMemo(() => {
    if (!summary?.ready) return [];

    const list = [];
    if (summary.isIrregular) {
      list.push(
        "Your cycle length has varied by more than a week recently."
      );
    }
    if (summary.shortestCycle < 21) {
      list.push("Some of your recent cycles were shorter than 21 days.");
    }
    if (summary.longestCycle > 35) {
      list.push("Some of your recent cycles were longer than 35 days.");
    }
    if (summary.daysLate >= 14) {
      list.push(`Your period is about ${summary.daysLate} days later than estimated.`);
    }
    return list;
  }, [summary]);

  if (loading) {
    return (
      <div
        role="status"
        className="flex min-h-[60vh] items-center justify-center"
      >
        <p className="text-sm text-gray-500">Understanding your cycle...</p>
      </div>
    );
  }

  const ready = !!summary?.ready;

  return (
    <div className="mx-auto max-w-6xl">
      {/* HEADER */}
      <div className="mb-8">
        <p className="text-sm font-medium text-[#df829b]">
          Understand your body
        </p>

        <h1 className="mt-1 font-serif text-4xl font-semibold text-[#292331]">
          Your Insights
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
          Lunara averages your recent logged cycles to give you estimates.
          They are guides, not guarantees.
        </p>
      </div>

      {errors.length > 0 && (
        <div
          role="alert"
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#fff0f1] px-5 py-4"
        >
          <p className="text-sm text-red-500">{errors[0]}</p>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-white"
          >
            Try again
          </button>
        </div>
      )}

      {cycles.length === 0 && errors.length === 0 ? (
        <div className="rounded-3xl bg-white p-8 shadow-[0_12px_40px_rgba(170,95,120,0.08)]">
          <div className="mx-auto max-w-lg py-12 text-center">
            <div
              aria-hidden="true"
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#fdf0f3] text-2xl text-[#e58da4]"
            >
              ♡
            </div>

            <h2 className="mt-5 text-2xl font-semibold text-[#292331]">
              Your insights are waiting
            </h2>

            <p className="mt-3 text-sm leading-6 text-gray-500">
              Log your periods in the tracker. After 3 periods, Lunara can
              estimate your next one.
            </p>

            <Link
              to="/tracker"
              className="mt-6 inline-block rounded-xl bg-[#e58da4] px-5 py-3 text-sm font-semibold text-white"
            >
              Track your period
            </Link>
          </div>
        </div>
      ) : (
        summary && (
          <>
            {/* MAIN SUMMARY */}
            <div className="rounded-3xl bg-[#292331] p-6 text-white shadow-[0_15px_45px_rgba(41,35,49,0.12)] sm:p-8">
              <div className="grid gap-6 md:grid-cols-4">
                <div>
                  <p className="text-xs text-white/45">Current cycle</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {summary.staleData
                      ? "No recent log"
                      : summary.currentDay
                      ? `Day ${summary.currentDay}`
                      : "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-white/45">Average cycle</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {ready ? `${summary.averageCycleLength} days` : "Learning"}
                  </p>
                  {ready && (
                    <p className="mt-1 text-[11px] text-white/40">
                      Range {summary.shortestCycle}–{summary.longestCycle} days
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-xs text-white/45">Current phase</p>
                  <p className="mt-2 text-lg font-semibold">
                    {summary.phase || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-white/45">Periods tracked</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {summary.cyclesTracked}
                  </p>
                </div>
              </div>
            </div>

            {summary.staleData && (
              <p className="mt-4 rounded-2xl bg-white px-5 py-4 text-sm text-gray-600">
                Your last logged period was a while ago. Log your latest
                period in the{" "}
                <Link to="/tracker" className="font-medium text-[#d97d96]">
                  tracker
                </Link>{" "}
                to get current estimates.
              </p>
            )}

            {!ready ? (
              <div className="mt-6 rounded-3xl bg-white p-6 shadow-[0_10px_35px_rgba(170,95,120,0.07)] sm:p-8">
                <h2 className="text-lg font-semibold text-[#292331]">
                  Building your predictions
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  {summary.cyclesTracked} of 3 periods logged. Lunara needs at
                  least 3 periods (with normal gaps of 15–60 days between
                  them) before it estimates anything. It won&apos;t guess
                  before then.
                </p>
              </div>
            ) : (
              <>
                {/* PREDICTIONS */}
                <div className="mt-6 grid gap-5 md:grid-cols-3">
                  <div className="rounded-3xl bg-white p-6 shadow-[0_10px_35px_rgba(170,95,120,0.07)]">
                    <p className="text-sm text-gray-400">Next period</p>
                    <p className="mt-3 text-2xl font-semibold text-[#292331]">
                      {formatDate(summary.nextPeriod)}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-gray-400">
                      {summary.nextPeriodEarliest !== summary.nextPeriodLatest
                        ? `Likely between ${formatDate(summary.nextPeriodEarliest, false)} and ${formatDate(summary.nextPeriodLatest, false)}. `
                        : ""}
                      Based on your last {summary.cyclesUsed} cycle
                      {summary.cyclesUsed === 1 ? "" : "s"}.
                      {summary.daysLate > 0
                        ? ` Currently ${summary.daysLate} day${summary.daysLate > 1 ? "s" : ""} past this date.`
                        : ""}
                    </p>
                  </div>

                  <div className="rounded-3xl bg-white p-6 shadow-[0_10px_35px_rgba(170,95,120,0.07)]">
                    <p className="text-sm text-gray-400">Estimated ovulation</p>
                    <p className="mt-3 text-2xl font-semibold text-[#292331]">
                      {summary.ovulation
                        ? formatDate(summary.ovulation)
                        : "Not estimated"}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-gray-400">
                      {summary.ovulation
                        ? "Assumes a 14-day second half of your cycle. An estimate, not an exact date."
                        : "Your cycles vary too much for a reliable estimate."}
                    </p>
                  </div>

                  <div className="rounded-3xl bg-[#292331] p-6 text-white shadow-[0_10px_35px_rgba(41,35,49,0.08)]">
                    <p className="text-sm text-white/45">Fertile window</p>
                    <p className="mt-3 text-xl font-semibold">
                      {summary.fertileStart
                        ? `${formatDate(summary.fertileStart, false)} — ${formatDate(summary.fertileEnd, false)}`
                        : "Not estimated"}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-white/60">
                      Estimates only. This is not a method of contraception.
                    </p>
                  </div>
                </div>

                {/* HEALTH FLAGS */}
                {flags.length > 0 && (
                  <div className="mt-6 rounded-3xl border border-[#f0d9df] bg-[#fff7f8] p-6">
                    <h2 className="font-semibold text-[#292331]">
                      Worth mentioning to a doctor
                    </h2>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600">
                      {flags.map((flag) => (
                        <li key={flag}>{flag}</li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs leading-5 text-gray-500">
                      This is not a diagnosis. Variation is common, but a
                      doctor can check if something needs attention.{" "}
                      <Link to="/doctors" className="font-medium text-[#d97d96]">
                        Find care
                      </Link>
                    </p>
                  </div>
                )}
              </>
            )}

            {/* HISTORY */}
            <div className="mt-6 rounded-3xl bg-white p-6 shadow-[0_10px_35px_rgba(170,95,120,0.07)] sm:p-8">
              <div className="mb-6">
                <p className="text-sm text-gray-400">Your records</p>
                <h2 className="mt-1 text-xl font-semibold text-[#292331]">
                  Cycle history
                </h2>
              </div>

              <div className="space-y-3">
                {history.map((cycle) => (
                  <div
                    key={cycle._id}
                    className="flex flex-col gap-3 rounded-2xl border border-[#f0e2e5] p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-[#292331]">
                        {formatDate(cycle.periodStartDate)}
                      </p>

                      {cycle.periodEndDate && (
                        <p className="mt-1 text-xs text-gray-400">
                          Ended {formatDate(cycle.periodEndDate)}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-5 text-xs text-gray-500">
                      <span>
                        Period:{" "}
                        {cycle.periodLength ? `${cycle.periodLength} days` : "—"}
                      </span>

                      <span>
                        Gap before:{" "}
                        {cycle.cycleLength ? `${cycle.cycleLength} days` : "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="mt-6 text-xs leading-5 text-gray-400">
              Cycle and fertility dates shown by Lunara are estimates based on
              what you have logged. They can vary from cycle to cycle and are
              not medical advice.
            </p>
          </>
        )
      )}
    </div>
  );
}