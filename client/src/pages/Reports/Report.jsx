import { useCallback, useEffect, useState } from "react";
import { getReport, localDateKey } from "../../services/api";
import ReportView from "../../components/report/ReportView";
import { cyclesToCsv, logsToCsv } from "../../utils/reportCsv";

const RANGES = [
  { days: 90, label: "Last 3 months" },
  { days: 180, label: "Last 6 months" },
  { days: 365, label: "Last 12 months" },
];

// the date N days before today, as YYYY-MM-DD in the user's time zone
const daysAgoKey = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDateKey(d);
};

export default function Report() {
  const [days, setDays] = useState(180);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (rangeDays) => {
    setLoading(true);
    setError("");
    try {
      const data = await getReport({
        from: daysAgoKey(rangeDays),
        to: localDateKey(),
      });
      setReport(data.report);
    } catch (err) {
      setError(err.message);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(days);
  }, [days, load]);

  return (
    <div className="mx-auto max-w-4xl">
      {/* controls are hidden when printing */}
      <div className="mb-6 print:hidden">
        <p className="text-sm font-medium text-[#df829b]">Share with your doctor</p>
        <h1 className="mt-1 font-serif text-4xl font-semibold text-[#292331]">
          Your cycle report
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
          A summary of your periods and daily logs. Save it as a PDF or open the
          data in a spreadsheet.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <label className="text-sm text-gray-500">
            <span className="sr-only">Report period</span>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="h-11 rounded-xl border border-[#eadde1] bg-white px-3 text-sm text-[#292331] outline-none focus:border-[#e58da4]"
            >
              {RANGES.map((r) => (
                <option key={r.days} value={r.days}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => window.print()}
            disabled={!report}
            className="h-11 rounded-xl bg-[#e58da4] px-5 text-sm font-semibold text-white hover:bg-[#d97d96] disabled:opacity-50"
          >
            Download PDF
          </button>

          <button
            type="button"
            onClick={() => cyclesToCsv(report)}
            disabled={!report}
            className="h-11 rounded-xl border border-[#eadde1] bg-white px-4 text-sm font-medium text-[#292331] hover:border-[#e58da4] disabled:opacity-50"
          >
            Periods (CSV)
          </button>

          <button
            type="button"
            onClick={() => logsToCsv(report)}
            disabled={!report}
            className="h-11 rounded-xl border border-[#eadde1] bg-white px-4 text-sm font-medium text-[#292331] hover:border-[#e58da4] disabled:opacity-50"
          >
            Daily logs (CSV)
          </button>
        </div>

        <p className="mt-3 text-xs text-gray-400">
          “Download PDF” opens your browser’s print window. Choose “Save as PDF”
          as the printer. The file includes your personal notes, so share it
          carefully.
        </p>
      </div>

      {loading && (
        <div role="status" className="rounded-3xl bg-white p-10 text-center text-sm text-gray-500">
          Building your report...
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-[#fff0f1] px-4 py-3 text-sm text-red-500 print:hidden">
          {error}
        </p>
      )}

      {!loading && report && <ReportView report={report} />}
    </div>
  );
}