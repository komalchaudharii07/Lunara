// A calendar day stored as YYYY-MM-DD (no time zone involved)
export const formatDay = (key) => {
  if (!key) return "—";
  const d = new Date(`${key}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

// Appointments are shown in Indian Standard Time, whatever the device says
const IST = "Asia/Kolkata";

export const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: IST,
  });

export const formatDateTime = (iso) =>
  new Date(iso).toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: IST,
  }) + " IST";