const { esc, notify } = require("./appointmentEmails");

// emails in ADMIN_EMAILS (.env, comma separated) get a heads-up when a doctor needs review
const adminEmails = () =>
  (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

// reason: "new" (just registered) or "documents" (uploaded documents)
// Never throws: a mail problem must not break signup or uploads.
function notifyAdminsOfDoctor(doctor, account, reason = "new") {
  try {
    const to = adminEmails();
    if (to.length === 0) return;

    const base = (process.env.CLIENT_URL || "").split(",")[0].trim().replace(/\/$/, "");
    const link = base ? `${base}/admin/doctors` : "";

    const title =
      reason === "documents"
        ? "Doctor uploaded documents for verification"
        : "New doctor application on Lunara";

    const rows = [
      ["Name", doctor.name],
      ["Email", account?.email],
      ["Phone", doctor.phone],
      ["Specialization", doctor.specialization],
      ["Qualification", doctor.qualification],
      ["Experience", doctor.experience != null ? `${doctor.experience} years` : ""],
      ["Registration no.", doctor.registrationNumber],
      ["Council", doctor.registrationCouncil],
      ["Clinic", [doctor.clinicName, doctor.clinicAddress].filter(Boolean).join(", ")],
      ["Documents uploaded", String(doctor.documents?.length || 0)],
    ].filter(([, v]) => v);

    const text =
      `${title}\n\n` +
      rows.map(([k, v]) => `${k}: ${v}`).join("\n") +
      (link ? `\n\nReview it here: ${link}` : "\n\nOpen Doctor Approvals in Lunara to review it.");

    const html =
      `<p><strong>${esc(title)}</strong></p><table cellpadding="4">` +
      rows.map(([k, v]) => `<tr><td><strong>${esc(k)}</strong></td><td>${esc(String(v))}</td></tr>`).join("") +
      `</table>` +
      (link ? `<p><a href="${esc(link)}">Open Doctor Approvals</a></p>` : "<p>Open Doctor Approvals in Lunara to review it.</p>");

    for (const addr of to) {
      Promise.resolve(notify({ to: addr, subject: title, text, html })).catch(() => {});
    }
  } catch (err) {
    console.error("Admin alert failed:", err.message);
  }
}

module.exports = { notifyAdminsOfDoctor };