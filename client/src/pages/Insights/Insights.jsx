import { useEffect, useMemo, useState } from "react";
import { getCycles } from "../../services/api";

const formatDate = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const daysBetween = (start, end) => {
  return Math.round(
    (new Date(end) - new Date(start)) /
    (1000 * 60 * 60 * 24)
  );
};

export default function Insights() {
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCycles = async () => {
      try {
        const token =
          localStorage.getItem("token") ||
          sessionStorage.getItem("token");

        if (!token) {
          throw new Error("Please login again.");
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

  const insight = useMemo(() => {
    if (!cycles.length) {
      return null;
    }

    const sorted = [...cycles].sort(
      (a, b) =>
        new Date(a.periodStartDate) -
        new Date(b.periodStartDate)
    );

    const cycleLengths = [];

    for (let i = 1; i < sorted.length; i++) {
      const days = daysBetween(
        sorted[i - 1].periodStartDate,
        sorted[i].periodStartDate
      );

      if (days >= 15 && days <= 60) {
        cycleLengths.push(days);
      }
    }

    const averageCycleLength =
      cycleLengths.length > 0
        ? Math.round(
          cycleLengths.reduce(
            (sum, value) => sum + value,
            0
          ) / cycleLengths.length
        )
        : null;

    const latestCycle =
      sorted[sorted.length - 1];

    const startDate = new Date(
      latestCycle.periodStartDate
    );

    const today = new Date();

    const currentDay =
      daysBetween(startDate, today) + 1;

    let nextPeriod = null;
    let ovulation = null;
    let fertileStart = null;
    let fertileEnd = null;

    if (averageCycleLength) {
      nextPeriod = new Date(startDate);

      nextPeriod.setDate(
        nextPeriod.getDate() + averageCycleLength
      );

      ovulation = new Date(nextPeriod);

      ovulation.setDate(
        ovulation.getDate() - 14
      );

      fertileStart = new Date(ovulation);

      fertileStart.setDate(
        fertileStart.getDate() - 5
      );

      fertileEnd = new Date(ovulation);

      fertileEnd.setDate(
        fertileEnd.getDate() + 1
      );
    }

    let phase = "Tracking";

    if (averageCycleLength && currentDay > 0) {
      if (currentDay <= 5) {
        phase = "Menstrual phase";
      } else if (
        currentDay <
        averageCycleLength - 14
      ) {
        phase = "Follicular phase";
      } else if (
        currentDay <=
        averageCycleLength - 12
      ) {
        phase = "Estimated fertile phase";
      } else {
        phase = "Luteal phase";
      }
    }

    return {
      latestCycle,
      currentDay:
        currentDay > 0 ? currentDay : null,
      averageCycleLength,
      nextPeriod,
      ovulation,
      fertileStart,
      fertileEnd,
      phase,
    };
  }, [cycles]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-gray-500">
          Understanding your cycle...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center">
        <p className="text-sm text-red-500">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#fff5f7] -mx-5 -mt-20 px-5 pt-20 sm:-mx-8 sm:px-8 lg:-mx-10 lg:-mt-8 lg:px-10 lg:pt-8">

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
            Lunara uses your cycle history to give you
            personalized estimates and patterns.
          </p>
        </div>

        {!insight ? (
          <div className="rounded-3xl bg-white p-8 shadow-[0_12px_40px_rgba(170,95,120,0.08)]">
            <div className="mx-auto max-w-lg py-12 text-center">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#fdf0f3] text-2xl text-[#e58da4]">
                ♡
              </div>

              <h2 className="mt-5 text-2xl font-semibold text-[#292331]">
                Your insights are waiting
              </h2>

              <p className="mt-3 text-sm leading-6 text-gray-500">
                Start tracking your periods and Lunara
                will gradually learn your personal cycle
                pattern.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* MAIN SUMMARY */}
            <div className="rounded-3xl bg-[#292331] p-6 text-white shadow-[0_15px_45px_rgba(41,35,49,0.12)] sm:p-8">

              <div className="grid gap-6 md:grid-cols-4">

                <div>
                  <p className="text-xs text-white/45">
                    Current cycle
                  </p>

                  <p className="mt-2 text-2xl font-semibold">
                    {insight.currentDay
                      ? `Day ${insight.currentDay}`
                      : "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-white/45">
                    Average cycle
                  </p>

                  <p className="mt-2 text-2xl font-semibold">
                    {insight.averageCycleLength
                      ? `${insight.averageCycleLength} days`
                      : "Learning"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-white/45">
                    Current phase
                  </p>

                  <p className="mt-2 text-lg font-semibold">
                    {insight.phase}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-white/45">
                    Cycles tracked
                  </p>

                  <p className="mt-2 text-2xl font-semibold">
                    {cycles.length}
                  </p>
                </div>

              </div>
            </div>

            {/* PREDICTIONS */}
            <div className="mt-6 grid gap-5 md:grid-cols-3">

              <div className="rounded-3xl bg-white p-6 shadow-[0_10px_35px_rgba(170,95,120,0.07)]">
                <p className="text-sm text-gray-400">
                  Next period
                </p>

                <p className="mt-3 text-2xl font-semibold text-[#292331]">
                  {insight.nextPeriod
                    ? formatDate(
                      insight.nextPeriod
                    )
                    : "Need more cycles"}
                </p>

                <p className="mt-2 text-xs leading-5 text-gray-400">
                  Estimated from your cycle history.
                </p>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-[0_10px_35px_rgba(170,95,120,0.07)]">
                <p className="text-sm text-gray-400">
                  Estimated ovulation
                </p>

                <p className="mt-3 text-2xl font-semibold text-[#292331]">
                  {insight.ovulation
                    ? formatDate(
                      insight.ovulation
                    )
                    : "Need more cycles"}
                </p>

                <p className="mt-2 text-xs leading-5 text-gray-400">
                  An estimate, not an exact prediction.
                </p>
              </div>

              <div className="rounded-3xl bg-[#292331] p-6 text-white shadow-[0_10px_35px_rgba(41,35,49,0.08)]">
                <p className="text-sm text-white/45">
                  Fertile window
                </p>

                <p className="mt-3 text-xl font-semibold">
                  {insight.fertileStart
                    ? `${formatDate(
                      insight.fertileStart
                    )} — ${formatDate(
                      insight.fertileEnd
                    )}`
                    : "Need more cycles"}
                </p>

                <p className="mt-2 text-xs leading-5 text-white/40">
                  Based on your recorded cycle pattern.
                </p>
              </div>

            </div>

            {/* CYCLE TIMELINE */}
            <div className="mt-6 rounded-3xl bg-white p-6 shadow-[0_10px_35px_rgba(170,95,120,0.07)] sm:p-8">

              <div className="mb-7">
                <p className="text-sm text-gray-400">
                  Your cycle
                </p>

                <h2 className="mt-1 text-xl font-semibold text-[#292331]">
                  Cycle overview
                </h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-4">

                <div className="rounded-2xl bg-[#fff1f4] p-5">
                  <p className="text-xs text-gray-400">
                    Period
                  </p>

                  <p className="mt-2 font-semibold text-[#292331]">
                    {formatDate(
                      insight.latestCycle
                        .periodStartDate
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#fff8e9] p-5">
                  <p className="text-xs text-gray-400">
                    Fertile window
                  </p>

                  <p className="mt-2 font-semibold text-[#292331]">
                    {insight.fertileStart
                      ? formatDate(
                        insight.fertileStart
                      )
                      : "Learning"}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f8f1ff] p-5">
                  <p className="text-xs text-gray-400">
                    Ovulation
                  </p>

                  <p className="mt-2 font-semibold text-[#292331]">
                    {insight.ovulation
                      ? formatDate(
                        insight.ovulation
                      )
                      : "Learning"}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f2f5ff] p-5">
                  <p className="text-xs text-gray-400">
                    Next period
                  </p>

                  <p className="mt-2 font-semibold text-[#292331]">
                    {insight.nextPeriod
                      ? formatDate(
                        insight.nextPeriod
                      )
                      : "Learning"}
                  </p>
                </div>

              </div>

              <p className="mt-6 text-xs leading-5 text-gray-400">
                Cycle and fertility dates shown by Lunara
                are estimates based on your recorded
                history. They can vary from cycle to cycle.
              </p>

            </div>

            {/* HISTORY */}
            <div className="mt-6 rounded-3xl bg-white p-6 shadow-[0_10px_35px_rgba(170,95,120,0.07)] sm:p-8">

              <div className="mb-6">
                <p className="text-sm text-gray-400">
                  Your records
                </p>

                <h2 className="mt-1 text-xl font-semibold text-[#292331]">
                  Cycle history
                </h2>
              </div>

              <div className="space-y-3">

                {[...cycles]
                  .sort(
                    (a, b) =>
                      new Date(b.periodStartDate) -
                      new Date(a.periodStartDate)
                  )
                  .map((cycle) => (
                    <div
                      key={cycle._id}
                      className="flex flex-col gap-3 rounded-2xl border border-[#f0e2e5] p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium text-[#292331]">
                          {formatDate(
                            cycle.periodStartDate
                          )}
                        </p>

                        {cycle.periodEndDate && (
                          <p className="mt-1 text-xs text-gray-400">
                            Ended{" "}
                            {formatDate(
                              cycle.periodEndDate
                            )}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-5 text-xs text-gray-500">

                        <span>
                          Period:{" "}
                          {cycle.periodLength
                            ? `${cycle.periodLength} days`
                            : "—"}
                        </span>

                        <span>
                          Cycle:{" "}
                          {cycle.cycleLength
                            ? `${cycle.cycleLength} days`
                            : "Learning"}
                        </span>

                      </div>
                    </div>
                  ))}

              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}