import { formatDateTime } from "../../utils/dates";

const dash = (v) => (v === null || v === undefined || v === "" ? "—" : v);

// A printable prescription. Shown to the patient and to the doctor who wrote it.
export default function PrescriptionView({ prescription: p }) {
  const medicines = p.medicines || [];

  return (
    <article className="rounded-3xl bg-white p-6 text-[#292331] shadow-[0_12px_40px_rgba(170,95,120,0.08)] print:rounded-none print:p-0 print:shadow-none sm:p-8">
      <header className="border-b border-[#f1e4e7] pb-5">
        <p className="text-xs font-medium uppercase tracking-wider text-[#d97d96]">
          Lunara prescription
        </p>
        <h2 className="mt-1 font-serif text-3xl font-semibold">{dash(p.doctor?.name)}</h2>
        <p className="mt-1 text-sm text-gray-500">
          {[p.doctor?.specialization, p.doctor?.qualification].filter(Boolean).join(" · ")}
        </p>
        {p.doctor?.registrationNumber && (
          <p className="mt-1 text-xs text-gray-400">
            Reg. no. {p.doctor.registrationNumber}
            {p.doctor.registrationCouncil ? `, ${p.doctor.registrationCouncil}` : ""}
          </p>
        )}
      </header>

      <section className="mt-5 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-gray-400">Patient</p>
          <p className="mt-0.5 font-medium">
            {dash(p.patient?.name)}
            {p.patient?.age ? `, ${p.patient.age} yrs` : ""}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Visit</p>
          <p className="mt-0.5 font-medium">{formatDateTime(p.visitAt)}</p>
        </div>
      </section>

      {p.diagnosis && (
        <section className="mt-6">
          <h3 className="text-lg font-semibold">Diagnosis</h3>
          <p className="mt-1 whitespace-pre-line text-sm text-gray-700">{p.diagnosis}</p>
        </section>
      )}

      <section className="mt-6">
        <h3 className="text-lg font-semibold">Medicines</h3>
        {medicines.length === 0 ? (
          <p className="mt-1 text-sm text-gray-500">No medicines prescribed.</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-120 text-left text-sm">
              <thead>
                <tr className="border-b border-[#eadde1] text-xs text-gray-500">
                  <th className="py-2 pr-3 font-medium">Medicine</th>
                  <th className="py-2 pr-3 font-medium">Dose</th>
                  <th className="py-2 pr-3 font-medium">How often</th>
                  <th className="py-2 font-medium">For how long</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((m, i) => (
                  <tr key={`${m.name}-${i}`} className="break-inside-avoid border-b border-[#f6eef0] align-top">
                    <td className="py-2 pr-3 font-medium">
                      {m.name}
                      {m.notes ? <span className="block text-xs font-normal text-gray-500">{m.notes}</span> : null}
                    </td>
                    <td className="py-2 pr-3">{dash(m.dose)}</td>
                    <td className="py-2 pr-3">{dash(m.frequency)}</td>
                    <td className="py-2">{dash(m.duration)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {p.advice && (
        <section className="mt-6">
          <h3 className="text-lg font-semibold">Advice</h3>
          <p className="mt-1 whitespace-pre-line text-sm text-gray-700">{p.advice}</p>
        </section>
      )}

      {p.followUp && (
        <section className="mt-6">
          <h3 className="text-lg font-semibold">Follow-up</h3>
          <p className="mt-1 text-sm text-gray-700">{p.followUp}</p>
        </section>
      )}

      <footer className="mt-8 border-t border-[#f1e4e7] pt-4 text-xs leading-5 text-gray-500">
        Issued {formatDateTime(p.issuedAt)}
        {p.updatedAt && p.updatedAt !== p.issuedAt ? `, updated ${formatDateTime(p.updatedAt)}` : ""}. Take
        medicines only as your doctor advised. In an emergency, contact your nearest hospital.
      </footer>
    </article>
  );
}