// Turns report rows into a CSV file the browser downloads.

const cell = (value) => {
  let s = Array.isArray(value) ? value.join("; ") : value ?? "";
  s = String(s);

  // text starting with = + - @ would run as a formula when opened in Excel
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;

  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function downloadCsv(filename, headers, rows) {
  const lines = [headers, ...rows].map((row) => row.map(cell).join(","));
  // the BOM makes Excel read the file as UTF-8
  const blob = new Blob([`﻿${lines.join("\r\n")}`], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const cyclesToCsv = (report) =>
  downloadCsv(
    `lunara-cycles-${report.range.from}-to-${report.range.to}.csv`,
    ["Period start", "Period end", "Cycle gap (days)", "Period length (days)", "Mood", "Symptoms", "Notes"],
    report.cycles.map((c) => [
      c.start, c.end, c.cycleLength, c.periodLength, c.mood, c.symptoms, c.notes,
    ])
  );

export const logsToCsv = (report) =>
  downloadCsv(
    `lunara-daily-logs-${report.range.from}-to-${report.range.to}.csv`,
    ["Date", "Flow", "Pain (0-10)", "Mood", "Symptoms", "Notes"],
    report.logs.map((l) => [l.date, l.flow, l.pain, l.mood, l.symptoms, l.notes])
  );