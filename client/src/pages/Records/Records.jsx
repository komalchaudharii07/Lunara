import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  downloadFile,
  downloadPrescriptionPdf,
  getMyAppointments,
  getMyReports,
  openFile,
} from "../../services/api";
import { formatDateTime } from "../../utils/dates";

const sizeText = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

export default function Records() {
  const [reports, setReports] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([getMyReports(), getMyAppointments()])
      .then(([r, a]) => {
        if (cancelled) return;
        setReports(r.reports || []);
        setPrescriptions(
          (a.appointments || [])
            .filter((x) => x.prescription?.issuedAt)
            .sort((x, y) => new Date(y.startsAt) - new Date(x.startsAt))
        );
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
  }, []);

  const run = (promise) => promise.catch((err) => setError(err.message));

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-sm font-medium text-[#df829b]">Your health records</p>
      <h1 className="mt-1 font-serif text-4xl font-semibold text-[#292331]">My records</h1>
      <p className="mt-2 text-sm text-gray-500">
        Reports and prescriptions from your doctors. Only you and the doctor who wrote them can open these.
      </p>

      {error && <p role="alert" className="mt-4 rounded-xl bg-[#fff0f1] px-4 py-3 text-sm text-red-500">{error}</p>}
      {loading && <p role="status" className="mt-6 text-sm text-gray-500">Loading...</p>}

      {!loading && (
        <>
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-[#292331]">Prescriptions</h2>
            {prescriptions.length === 0 ? (
              <p className="mt-3 rounded-3xl bg-white p-8 text-center text-sm text-gray-500">
                No prescriptions yet. After a consultation, your doctor can add one here.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {prescriptions.map((a) => (
                  <div key={a._id} className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white p-5 shadow-[0_12px_40px_rgba(170,95,120,0.08)]">
                    <div>
                      <p className="font-semibold text-[#292331]">{a.doctor?.name}</p>
                      <p className="text-xs text-gray-500">{formatDateTime(a.startsAt)}</p>
                    </div>
                    <div className="flex gap-3 text-sm">
                      <Link to={`/appointments/${a._id}/prescription`} className="font-medium text-[#d97d96]">View</Link>
                      <button type="button" onClick={() => run(downloadPrescriptionPdf(a._id))} className="text-gray-600">
                        Download PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-[#292331]">Medical reports</h2>
            {reports.length === 0 ? (
              <p className="mt-3 rounded-3xl bg-white p-8 text-center text-sm text-gray-500">
                No reports yet. Reports your doctor adds will show up here.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {reports.map((r) => (
                  <div key={r._id} className="rounded-3xl bg-white p-5 shadow-[0_12px_40px_rgba(170,95,120,0.08)]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#292331]">{r.title}</p>
                        <p className="text-xs text-gray-500">
                          {r.doctor?.name}
                          {r.appointment?.startsAt ? ` · visit on ${formatDateTime(r.appointment.startsAt)}` : ""}
                        </p>
                        {r.file && (
                          <p className="mt-1 text-xs text-gray-400">{r.file.filename} · {sizeText(r.file.size)}</p>
                        )}
                      </div>
                      {r.file && (
                        <div className="flex gap-3 text-sm">
                          <button type="button" onClick={() => run(openFile(r.file._id))} className="font-medium text-[#d97d96]">View</button>
                          <button type="button" onClick={() => run(downloadFile(r.file._id, r.file.filename))} className="text-gray-600">Download</button>
                        </div>
                      )}
                    </div>
                    {r.notes && <p className="mt-3 text-sm text-gray-600">“{r.notes}”</p>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}