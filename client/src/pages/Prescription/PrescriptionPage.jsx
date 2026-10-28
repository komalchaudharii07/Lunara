import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { downloadPrescriptionPdf, getPrescription } from "../../services/api";
import { formatDateTime } from "../../utils/dates";
import PrescriptionView from "../../components/prescription/PrescriptionView";

export default function PrescriptionPage() {
  const { id } = useParams();
  const [prescription, setPrescription] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPrescription(id)
      .then((data) => {
        if (!cancelled) setPrescription(data.prescription);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to="/appointments" className="text-sm text-[#d97d96]">
          ← Appointments
        </Link>
        <div className="flex gap-3">
          <button
            type="button"
            disabled={!prescription || pdfBusy}
            onClick={async () => {
              setPdfBusy(true);
              setError("");
              try {
                await downloadPrescriptionPdf(id);
              } catch (err) {
                setError(err.message);
              } finally {
                setPdfBusy(false);
              }
            }}
            className="h-11 rounded-xl bg-[#e58da4] px-5 text-sm font-semibold text-white hover:bg-[#d97d96] disabled:opacity-50"
          >
            {pdfBusy ? "Preparing..." : "Download PDF"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!prescription}
            className="h-11 rounded-xl border border-[#eadde1] bg-white px-5 text-sm font-medium text-[#292331] hover:border-[#e58da4] disabled:opacity-50"
          >
            Print
          </button>
        </div>
      </div>

      {loading && <p role="status" className="text-sm text-gray-500 print:hidden">Loading...</p>}
      {error && (
        <p role="alert" className="rounded-xl bg-[#fff0f1] px-4 py-3 text-sm text-red-500 print:hidden">
          {error}
        </p>
      )}
      {prescription && <PrescriptionView prescription={prescription} />}

      {prescription?.revisions?.length > 0 && (
        <details className="mt-6 rounded-2xl bg-white p-5 text-sm print:hidden">
          <summary className="cursor-pointer font-medium text-[#292331]">
            Earlier versions ({prescription.revisions.length}) — only you can see these
          </summary>
          <div className="mt-4 space-y-4">
            {[...prescription.revisions].reverse().map((r, i) => (
              <div key={i} className="rounded-xl bg-[#fdf7f8] p-3 text-xs text-gray-600">
                <p className="font-medium text-[#292331]">{formatDateTime(r.at)}</p>
                {r.diagnosis && <p className="mt-1">Diagnosis: {r.diagnosis}</p>}
                {(r.medicines || []).length > 0 && (
                  <p className="mt-1">
                    Medicines: {r.medicines.map((m) => [m.name, m.dose, m.frequency, m.duration].filter(Boolean).join(" ")).join("; ")}
                  </p>
                )}
                {r.advice && <p className="mt-1">Advice: {r.advice}</p>}
                {r.followUp && <p className="mt-1">Follow-up: {r.followUp}</p>}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}