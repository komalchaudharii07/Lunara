import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPrescription } from "../../services/api";
import PrescriptionView from "../../components/prescription/PrescriptionView";

export default function PrescriptionPage() {
  const { id } = useParams();
  const [prescription, setPrescription] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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
        <button
          type="button"
          onClick={() => window.print()}
          disabled={!prescription}
          className="h-11 rounded-xl bg-[#e58da4] px-5 text-sm font-semibold text-white hover:bg-[#d97d96] disabled:opacity-50"
        >
          Print or save as PDF
        </button>
      </div>

      {loading && <p role="status" className="text-sm text-gray-500 print:hidden">Loading...</p>}
      {error && (
        <p role="alert" className="rounded-xl bg-[#fff0f1] px-4 py-3 text-sm text-red-500 print:hidden">
          {error}
        </p>
      )}
      {prescription && <PrescriptionView prescription={prescription} />}
    </div>
  );
}