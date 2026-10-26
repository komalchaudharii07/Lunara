import { useCallback, useEffect, useState } from "react";
import { getDoctorsForReview, reviewDoctor } from "../../services/api";

const TABS = [
  ["pending", "Waiting"],
  ["approved", "Approved"],
  ["rejected", "Rejected"],
];

function Row({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-[#292331]">{value || "—"}</p>
    </div>
  );
}

export default function AdminDoctors() {
  const [status, setStatus] = useState("pending");
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [notes, setNotes] = useState({});

  const load = useCallback(async (which) => {
    setLoading(true);
    setError("");
    try {
      const data = await getDoctorsForReview(which);
      setDoctors(data.doctors || []);
    } catch (err) {
      setError(err.message);
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(status);
  }, [status, load]);

  const decide = async (doctor, decision) => {
    if (decision === "reject" && !(notes[doctor._id] || "").trim()) {
      setError("Please type a short reason before rejecting.");
      return;
    }
    setBusyId(doctor._id);
    setError("");
    try {
      await reviewDoctor(doctor._id, decision, notes[doctor._id] || "");
      await load(status);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-sm font-medium text-[#df829b]">Admin</p>
      <h1 className="mt-1 font-serif text-4xl font-semibold text-[#292331]">Doctor approvals</h1>
      <p className="mt-2 text-sm text-gray-500">
        Check each doctor&apos;s registration number with their medical council before approving.
      </p>

      <div className="mt-5 flex w-fit rounded-2xl bg-white p-1.5 shadow-[0_8px_30px_rgba(170,95,120,0.06)]">
        {TABS.map(([id, text]) => (
          <button key={id} type="button" onClick={() => setStatus(id)}
            className={`rounded-xl px-5 py-2.5 text-sm font-medium transition ${
              status === id ? "bg-[#e58da4] text-white" : "text-gray-500 hover:text-[#d77f97]"
            }`}>
            {text}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl bg-[#fff0f1] px-4 py-3 text-sm text-red-500">{error}</p>}
      {loading && <p role="status" className="mt-6 text-sm text-gray-500">Loading...</p>}
      {!loading && doctors.length === 0 && !error && (
        <p className="mt-6 rounded-3xl bg-white p-8 text-center text-sm text-gray-500">Nobody here right now.</p>
      )}

      <div className="mt-6 space-y-5">
        {doctors.map((d) => (
          <article key={d._id} className="rounded-3xl bg-white p-6 shadow-[0_12px_40px_rgba(170,95,120,0.08)]">
            <h2 className="font-semibold text-[#292331]">{d.name}</h2>
            <p className="text-sm text-[#d77f97]">{d.specialization}</p>

            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-[#f2e8eb] pt-4 sm:grid-cols-3">
              <Row label="Email" value={d.user?.email} />
              <Row label="Qualification" value={d.qualification} />
              <Row label="Experience" value={`${d.experience} years`} />
              <Row label="Fee" value={`₹${Number(d.consultationFee).toLocaleString("en-IN")}`} />
              <Row label="Medical council" value={d.registrationCouncil} />
              <Row label="Registration no." value={d.registrationNumber} />
            </div>

            {d.bio && <p className="mt-4 text-sm text-gray-600">{d.bio}</p>}
            {d.verificationNote && (
              <p className="mt-3 text-xs text-red-500">Reason given: {d.verificationNote}</p>
            )}

            <div className="mt-5 space-y-3">
              <input
                value={notes[d._id] || ""}
                onChange={(e) => setNotes((n) => ({ ...n, [d._id]: e.target.value }))}
                maxLength={300}
                placeholder="Reason (needed only when rejecting)"
                className="h-10 w-full rounded-lg border border-[#eadde1] px-3 text-sm outline-none focus:border-[#e58da4]"
              />
              <div className="flex gap-3">
                {status !== "approved" && (
                  <button type="button" disabled={busyId === d._id} onClick={() => decide(d, "approve")}
                    className="h-10 rounded-xl bg-[#e58da4] px-5 text-sm font-semibold text-white hover:bg-[#d97d96] disabled:opacity-60">
                    Approve
                  </button>
                )}
                {status !== "rejected" && (
                  <button type="button" disabled={busyId === d._id} onClick={() => decide(d, "reject")}
                    className="h-10 rounded-xl border border-[#eadde1] px-5 text-sm font-medium text-[#292331] hover:border-red-300 disabled:opacity-60">
                    {status === "approved" ? "Remove approval" : "Reject"}
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}