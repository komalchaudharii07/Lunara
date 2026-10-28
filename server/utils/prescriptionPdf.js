// Draws a prescription as a PDF (pdfkit). Returns a stream you can pipe to the response.
const PDFDocument = require("pdfkit");

const IST = "Asia/Kolkata";
const when = (d) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: IST,
      }) + " IST"
    : "";

function buildPrescriptionPdf(p) {
  const doc = new PDFDocument({ size: "A4", margin: 50, info: { Title: "Lunara prescription" } });
  const pink = "#d97d96";
  const dark = "#292331";
  const grey = "#6b6b76";

  doc.fillColor(pink).fontSize(10).text("LUNARA PRESCRIPTION", { characterSpacing: 1 });
  doc.moveDown(0.3).fillColor(dark).fontSize(20).text(p.doctor?.name || "Doctor");
  doc.fillColor(grey).fontSize(10).text(
    [p.doctor?.specialization, p.doctor?.qualification].filter(Boolean).join("  |  ")
  );
  if (p.doctor?.registrationNumber) {
    doc.text(
      `Reg. no. ${p.doctor.registrationNumber}${p.doctor.registrationCouncil ? `, ${p.doctor.registrationCouncil}` : ""}`
    );
  }

  doc.moveDown(0.8);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#eadde1").stroke();
  doc.moveDown(0.8);

  doc.fillColor(grey).fontSize(9).text("Patient");
  doc.fillColor(dark).fontSize(12).text(`${p.patient?.name || ""}${p.patient?.age ? `, ${p.patient.age} yrs` : ""}`);
  doc.moveDown(0.4);
  doc.fillColor(grey).fontSize(9).text("Visit");
  doc.fillColor(dark).fontSize(12).text(when(p.visitAt));

  const section = (title, body) => {
    if (!body) return;
    doc.moveDown(1);
    doc.fillColor(dark).fontSize(13).text(title);
    doc.moveDown(0.2).fillColor("#3a3a44").fontSize(11).text(body, { lineGap: 2 });
  };

  section("Diagnosis", p.diagnosis);

  doc.moveDown(1);
  doc.fillColor(dark).fontSize(13).text("Medicines");
  doc.moveDown(0.3);
  if (!p.medicines || p.medicines.length === 0) {
    doc.fillColor(grey).fontSize(11).text("No medicines prescribed.");
  } else {
    p.medicines.forEach((m, i) => {
      const detail = [m.dose, m.frequency, m.duration].filter(Boolean).join("  |  ");
      doc.fillColor(dark).fontSize(11).text(`${i + 1}. ${m.name}`, { continued: false });
      if (detail) doc.fillColor(grey).fontSize(10).text(`    ${detail}`);
      if (m.notes) doc.fillColor(grey).fontSize(10).text(`    ${m.notes}`);
      doc.moveDown(0.3);
    });
  }

  section("Advice", p.advice);
  section("Follow-up", p.followUp);

  doc.moveDown(1.5);
  doc.fillColor(grey).fontSize(8).text(
    `Issued ${when(p.issuedAt)}${p.updatedAt && String(p.updatedAt) !== String(p.issuedAt) ? `, updated ${when(p.updatedAt)}` : ""}. ` +
      "Take medicines only as your doctor advised. In an emergency, contact your nearest hospital.",
    { lineGap: 2 }
  );

  doc.end();
  return doc;
}

module.exports = { buildPrescriptionPdf };