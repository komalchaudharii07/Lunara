import { formatDay } from "../../utils/dates";

const dash = (v) => (v === null || v === undefined || v === "" ? "—" : v);

function Stat({ label, value }) {
  return (
    <div className="break-inside-avoid rounded-xl border border-[#eadde1] p-3">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-[#292331]">{dash(value)}</p>
    </div>
  );
}

// One report. Used on the Report page and when a doctor opens a shared report.
// "shared" = a doctor is looking (notes are never included then).
export default function ReportView({ report, shared = false }) {
  const {
    profile = {},
    summary = {},
    stats = {},
    cycles = [],
    logs = [],
    range = {},
  } = report;
  const flow = stats.flowDays || { spotting: 0, light: 0, medium: 0, heavy: 0 };
  const symptoms = stats.symptoms || [];
  const moods = stats.moods || [];

  return (
    <article className="rounded-3xl bg-white p-6 text-[#292331] shadow-[0_12px_40px_rgba(170,95,120,0.08)] print:rounded-none print:p-0 print:shadow-none sm:p-8">
      <header className="border-b border-[#f1e4e7] pb-5">
        <p className="text-xs font-medium uppercase tracking-wider text-[#d97d96]">
          Lunara cycle report
        </p>
        <h2 className="mt-1 font-serif text-3xl font-semibold">
          {profile.name || "Cycle report"}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {formatDay(range.from)} to {formatDay(range.to)} · Generated{" "}
          {formatDay(report.generatedAt?.slice(0, 10))}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Age" value={profile.age} />
          <Stat label="Height" value={profile.height ? `${profile.height} cm` : null} />
          <Stat label="Weight" value={profile.weight ? `${profile.weight} kg` : null} />
          <Stat label="Blood group" value={profile.bloodGroup} />
        </div>
      </header>

      {/* CYCLE PATTERN */}
      <section className="mt-6">
        <h3 className="text-lg font-semibold">Cycle pattern</h3>

        {summary.ready ? (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Average cycle" value={`${summary.averageCycleLength} days`} />
            <Stat
              label="Shortest to longest"
              value={`${summary.shortestCycle} to ${summary.longestCycle} days`}
            />
            <Stat label="Avg period length" value={stats.averagePeriodLength ? `${stats.averagePeriodLength} days` : null} />
            <Stat label="Pattern" value={summary.isIrregular ? "Irregular (varies by over 7 days)" : "Regular"} />
            <Stat label="Last period started" value={formatDay(summary.lastPeriodStart)} />
            <Stat label="Next period (estimate)" value={formatDay(summary.nextPeriod)} />
            <Stat label="Periods logged" value={summary.cyclesTracked} />
            <Stat label="Days later than estimate" value={summary.daysLate > 0 ? summary.daysLate : "0"} />
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-500">
            Not enough logged periods yet for an average (at least 3 are needed).
            {summary.lastPeriodStart
              ? ` Last period started ${formatDay(summary.lastPeriodStart)}.`
              : ""}
          </p>
        )}
      </section>

      {/* DAILY LOG SUMMARY */}
      <section className="mt-6">
        <h3 className="text-lg font-semibold">Daily log summary</h3>

        {stats.logsInRange === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No daily logs in this period.</p>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Days logged" value={stats.logsInRange} />
              <Stat label="Average pain" value={stats.averagePain != null ? `${stats.averagePain} / 10` : null} />
              <Stat label="Highest pain" value={stats.maxPain != null ? `${stats.maxPain} / 10` : null} />
              <Stat
                label="Flow days"
                value={`${flow.spotting + flow.light + flow.medium + flow.heavy} (heavy: ${flow.heavy})`}
              />
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium">Most common symptoms</p>
                <p className="mt-1 text-sm text-gray-600">
                  {symptoms.length
                    ? symptoms.map((s) => `${s.name} (${s.count})`).join(", ")
                    : "None recorded"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Moods</p>
                <p className="mt-1 text-sm text-gray-600">
                  {moods.length
                    ? moods.map((m) => `${m.name} (${m.count})`).join(", ")
                    : "None recorded"}
                </p>
              </div>
            </div>
          </>
        )}
      </section>

      {/* PERIODS */}
      <section className="mt-6">
        <h3 className="text-lg font-semibold">Periods</h3>

        {cycles.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No periods logged in this range.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#eadde1] text-xs text-gray-500">
                  <th className="py-2 pr-3 font-medium">Started</th>
                  <th className="py-2 pr-3 font-medium">Ended</th>
                  <th className="py-2 pr-3 font-medium">Gap before</th>
                  <th className="py-2 pr-3 font-medium">Length</th>
                  <th className="py-2 font-medium">Symptoms</th>
                </tr>
              </thead>
              <tbody>
                {cycles.map((c, i) => (
                  <tr key={`${c.start}-${i}`} className="break-inside-avoid border-b border-[#f6eef0] align-top">
                    <td className="py-2 pr-3">{formatDay(c.start)}</td>
                    <td className="py-2 pr-3">{formatDay(c.end)}</td>
                    <td className="py-2 pr-3">{c.cycleLength ? `${c.cycleLength} d` : "—"}</td>
                    <td className="py-2 pr-3">{c.periodLength ? `${c.periodLength} d` : "—"}</td>
                    <td className="py-2 text-gray-600">
                      {[c.mood, ...(c.symptoms || [])].filter(Boolean).join(", ") || "—"}
                      {!shared && c.notes ? <span className="block text-xs text-gray-400">{c.notes}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* DAILY LOGS */}
      <section className="mt-6">
        <h3 className="text-lg font-semibold">Daily logs</h3>

        {logs.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No daily logs in this range.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#eadde1] text-xs text-gray-500">
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 pr-3 font-medium">Flow</th>
                  <th className="py-2 pr-3 font-medium">Pain</th>
                  <th className="py-2 pr-3 font-medium">Mood</th>
                  <th className="py-2 font-medium">Symptoms</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l, i) => (
                  <tr key={`${l.date}-${i}`} className="break-inside-avoid border-b border-[#f6eef0] align-top">
                    <td className="py-2 pr-3 whitespace-nowrap">{formatDay(l.date)}</td>
                    <td className="py-2 pr-3 capitalize">{dash(l.flow)}</td>
                    <td className="py-2 pr-3">{l.pain != null ? `${l.pain}/10` : "—"}</td>
                    <td className="py-2 pr-3">{dash(l.mood)}</td>
                    <td className="py-2 text-gray-600">
                      {l.symptoms?.length ? l.symptoms.join(", ") : "—"}
                      {!shared && l.notes ? <span className="block text-xs text-gray-400">{l.notes}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className="mt-8 border-t border-[#f1e4e7] pt-4 text-xs leading-5 text-gray-500">
        This report is made from information the person recorded in Lunara. Dates
        and averages are estimates, not a diagnosis.
        {shared ? " Personal notes, email and phone are not included." : ""}
      </footer>
    </article>
  );
}