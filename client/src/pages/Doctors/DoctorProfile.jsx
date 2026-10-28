import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getDoctor } from "../../services/api";
import SecureImage from "../../components/common/SecureImage";
import { formatDateTime } from "../../utils/dates";

function Fact({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-[#292331]">{value || "—"}</p>
    </div>
  );
}

export default function DoctorProfile() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError("");
    getDoctor(id)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl">
        <p role="alert" className="rounded-xl bg-[#fff0f1] px-4 py-3 text-sm text-red-500">{error}</p>
        <Link to="/doctors" className="mt-4 inline-block text-sm text-[#d97d96]">← Back to doctors</Link>
      </div>
    );
  }
  if (!data) return <p role="status" className="text-sm text-gray-500">Loading...</p>;

  const { doctor, nextSlot } = data;
  const hasPin = typeof doctor.lat === "number" && typeof doctor.lng === "number";

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/doctors" className="text-sm text-[#d97d96]">← Back to doctors</Link>

      <div className="mt-4 rounded-3xl bg-white p-6 shadow-[0_12px_40px_rgba(170,95,120,0.08)] sm:p-8">
        <div className="flex items-center gap-5">
          <SecureImage fileId={doctor.photo} name={doctor.name} size={88} />
          <div>
            <h1 className="font-serif text-3xl font-semibold text-[#292331]">{doctor.name}</h1>
            <p className="mt-1 text-sm text-[#d77f97]">{doctor.specialization}</p>
            <span className="mt-2 inline-block rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-600">
              Verified by Lunara
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[#f2e8eb] pt-5 sm:grid-cols-3">
          <Fact label="Qualification" value={doctor.qualification} />
          <Fact label="Experience" value={doctor.experience != null ? `${doctor.experience} years` : null} />
          <Fact
            label="Consultation fee"
            value={doctor.consultationFee != null ? `₹${Number(doctor.consultationFee).toLocaleString("en-IN")}` : null}
          />
        </div>

        {doctor.bio && (
          <div className="mt-5">
            <p className="text-xs text-gray-400">About</p>
            <p className="mt-1 whitespace-pre-line text-sm leading-6 text-gray-700">{doctor.bio}</p>
          </div>
        )}

        {(doctor.clinicName || doctor.clinicAddress) && (
          <div className="mt-5">
            <p className="text-xs text-gray-400">Clinic</p>
            {doctor.clinicName && <p className="mt-1 text-sm font-medium text-[#292331]">{doctor.clinicName}</p>}
            {doctor.clinicAddress && <p className="mt-1 text-sm text-gray-600">📍 {doctor.clinicAddress}</p>}
            {hasPin && (
              <a
                href={`https://www.openstreetmap.org/?mlat=${doctor.lat}&mlon=${doctor.lng}#map=16/${doctor.lat}/${doctor.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-xs font-medium text-[#d97d96]"
              >
                See on map →
              </a>
            )}
          </div>
        )}

        <div className="mt-6 rounded-2xl bg-[#fdf7f8] p-4">
          {nextSlot ? (
            <p className="text-sm text-gray-700">
              Next available: <strong>{formatDateTime(nextSlot.startsAt)}</strong>
            </p>
          ) : (
            <p className="text-sm text-gray-500">No free times in the next 3 weeks. Check again soon.</p>
          )}
        </div>

        <Link
          to={`/doctors/${doctor._id}/book`}
          className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-[#e58da4] text-sm font-semibold text-white hover:bg-[#d97d96]"
        >
          Book appointment
        </Link>
      </div>
    </div>
  );
}