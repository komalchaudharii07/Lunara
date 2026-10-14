// Appointment time helpers. Everything is calculated in Indian Standard Time
// (UTC+05:30, no daylight saving). Times are stored in the database as UTC.

const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_LEAD_MS = 60 * 60 * 1000; // can't book a slot starting within the next hour

const SLOT_MINUTES = [15, 20, 30, 45, 60];

// a real calendar date written as YYYY-MM-DD
const isDateKey = (key) =>
  typeof key === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(key) &&
  new Date(`${key}T00:00:00.000Z`).toISOString().slice(0, 10) === key;

const toMinutes = (hhmm) => {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(hhmm));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

// the calendar date in India at this moment
const istDateKey = (date) =>
  new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);

// the instant when this Indian calendar day starts
const istStartOfDay = (key) =>
  new Date(Date.parse(`${key}T00:00:00.000Z`) - IST_OFFSET_MS);

/**
 * schedule: { slotMinutes, weekly: [{day 0-6 (0 = Sunday), start, end}], daysOff: [YYYY-MM-DD], maxAdvanceDays }
 * Returns every bookable slot (before taking existing bookings away) for one Indian date.
 */
const slotsForDate = (schedule, key, now = new Date()) => {
  if (!schedule || !isDateKey(key)) return [];
  if ((schedule.daysOff || []).includes(key)) return [];

  if (key < istDateKey(now)) return [];
  const lastKey = istDateKey(
    new Date(now.getTime() + (schedule.maxAdvanceDays || 30) * DAY_MS)
  );
  if (key > lastKey) return [];

  const weekday = new Date(`${key}T00:00:00.000Z`).getUTCDay();
  const step = schedule.slotMinutes || 30;
  const dayStart = istStartOfDay(key).getTime();
  const seen = new Set();
  const slots = [];

  for (const window of schedule.weekly || []) {
    if (window.day !== weekday) continue;

    const from = toMinutes(window.start);
    const to = toMinutes(window.end);
    if (from === null || to === null || to <= from) continue;

    for (let m = from; m + step <= to; m += step) {
      const startsAt = new Date(dayStart + m * 60 * 1000);
      if (startsAt.getTime() < now.getTime() + MIN_LEAD_MS) continue;
      if (seen.has(startsAt.getTime())) continue;
      seen.add(startsAt.getTime());
      slots.push({
        startsAt,
        endsAt: new Date(startsAt.getTime() + step * 60 * 1000),
      });
    }
  }

  return slots.sort((a, b) => a.startsAt - b.startsAt);
};

// Checks a schedule sent by a doctor. Returns { value } or { error }.
const validateSchedule = (body = {}) => {
  const slotMinutes = Number(body.slotMinutes ?? 30);
  if (!SLOT_MINUTES.includes(slotMinutes)) {
    return { error: `Slot length must be one of ${SLOT_MINUTES.join(", ")} minutes` };
  }

  const maxAdvanceDays = Number(body.maxAdvanceDays ?? 30);
  if (!Number.isInteger(maxAdvanceDays) || maxAdvanceDays < 1 || maxAdvanceDays > 60) {
    return { error: "Booking window must be between 1 and 60 days" };
  }

  if (!Array.isArray(body.weekly) || body.weekly.length > 28) {
    return { error: "Weekly hours must be a list of at most 28 time windows" };
  }

  const weekly = [];
  for (const w of body.weekly) {
    const day = Number(w?.day);
    const from = toMinutes(w?.start);
    const to = toMinutes(w?.end);

    if (!Number.isInteger(day) || day < 0 || day > 6) {
      return { error: "Each time window needs a valid day of the week" };
    }
    if (from === null || to === null) {
      return { error: "Times must look like 09:30" };
    }
    if (to - from < slotMinutes) {
      return { error: "Each time window must fit at least one slot" };
    }

    weekly.push({ day, start: w.start, end: w.end, _from: from, _to: to });
  }

  // no two windows on the same day may overlap
  weekly.sort((a, b) => a.day - b.day || a._from - b._from);
  for (let i = 1; i < weekly.length; i++) {
    if (weekly[i].day === weekly[i - 1].day && weekly[i]._from < weekly[i - 1]._to) {
      return { error: "Time windows on the same day can't overlap" };
    }
  }

  const rawOff = body.daysOff ?? [];
  if (!Array.isArray(rawOff) || rawOff.length > 60 || !rawOff.every(isDateKey)) {
    return { error: "Days off must be a list of dates (YYYY-MM-DD), at most 60" };
  }

  return {
    value: {
      slotMinutes,
      maxAdvanceDays,
      weekly: weekly.map(({ day, start, end }) => ({ day, start, end })),
      daysOff: [...new Set(rawOff)].sort(),
    },
  };
};

module.exports = {
  IST_OFFSET_MS,
  SLOT_MINUTES,
  isDateKey,
  istDateKey,
  slotsForDate,
  validateSchedule,
};