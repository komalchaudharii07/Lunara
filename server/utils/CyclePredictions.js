const DAY = 24 * 60 * 60 * 1000;
const MIN_GAPS = 2; // needs 3 logged periods
const STALE_AFTER_DAYS = 90; // beyond this, "Day N" is meaningless

const dayKey = (d) => new Date(d).toISOString().slice(0, 10);
const fromKey = (k) => new Date(`${k}T00:00:00.000Z`);
const addDays = (date, n) => new Date(date.getTime() + n * DAY);
const diffDays = (a, b) => Math.round((b - a) / DAY);

const mean = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;

const median = (arr) => {
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/**
 * cycles   : [{ periodStartDate, periodLength? }] (any order)
 * todayKey : "YYYY-MM-DD" in the USER's time zone (defaults to the server's UTC date)
 */
const buildSummary = (cycles, todayKey = dayKey(new Date())) => {
  const sorted = [...cycles].sort(
    (a, b) => new Date(a.periodStartDate) - new Date(b.periodStartDate)
  );

  const today = fromKey(todayKey);

  const base = {
    cyclesTracked: sorted.length,
    cyclesUsed: 0,
    today: todayKey,
    ready: false,
    lastPeriodStart: null,
    currentDay: null,
    staleData: false,
    averageCycleLength: null,
    shortestCycle: null,
    longestCycle: null,
    isIrregular: false,
    nextPeriod: null,
    nextPeriodEarliest: null,
    nextPeriodLatest: null,
    daysLate: 0,
    menstrualDays: null,
    ovulation: null,
    fertileStart: null,
    fertileEnd: null,
    phase: null,
  };

  if (!sorted.length) return base;

  const last = sorted[sorted.length - 1];
  const lastStart = fromKey(dayKey(last.periodStartDate));
  base.lastPeriodStart = dayKey(lastStart);

  const cd = diffDays(lastStart, today) + 1;
  base.staleData = cd > STALE_AFTER_DAYS;
  base.currentDay = cd > 0 && cd <= STALE_AFTER_DAYS ? cd : null;

  // gaps between consecutive period starts (valid range only)
  let gaps = [];
  for (let i = 1; i < sorted.length; i++) {
    const g = diffDays(
      fromKey(dayKey(sorted[i - 1].periodStartDate)),
      fromKey(dayKey(sorted[i].periodStartDate))
    );
    if (g >= 15 && g <= 60) gaps.push(g);
  }

  // A skipped log shows up as a gap of roughly double the normal length.
  // Drop gaps far above the typical one so they don't drag the average up.
  if (gaps.length >= 3) {
    const typical = median(gaps);
    gaps = gaps.filter((g) => g <= typical * 1.75);
  }

  if (gaps.length < MIN_GAPS) return base;

  const recent = gaps.slice(-6); // last 6 cycles
  const avg = Math.round(mean(recent));
  const shortest = Math.min(...recent);
  const longest = Math.max(...recent);

  // typical period length (defaults to 5 days when none were recorded)
  const lengths = sorted
    .slice(-6)
    .map((c) => c.periodLength)
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 15);
  const menstrualDays = lengths.length ? Math.round(mean(lengths)) : 5;

  const nextPeriod = addDays(lastStart, avg);
  const ovulation = addDays(nextPeriod, -14);
  const fertileStart = addDays(ovulation, -5);
  const fertileEnd = addDays(ovulation, 1);

  const irregular = longest - shortest > 7;
  const daysLate = Math.max(diffDays(nextPeriod, today), 0);

  let phase = null;
  if (base.currentDay) {
    if (daysLate > 0) {
      phase = "Period may be late";
    } else if (base.currentDay <= menstrualDays) {
      phase = "Menstrual phase";
    } else if (!irregular) {
      // with irregular cycles the later phases can't be estimated honestly
      if (today < fertileStart) phase = "Follicular phase";
      else if (today <= fertileEnd) phase = "Estimated fertile window";
      else phase = "Luteal phase";
    }
  }

  return {
    ...base,
    ready: true,
    cyclesUsed: recent.length,
    averageCycleLength: avg,
    shortestCycle: shortest,
    longestCycle: longest,
    isIrregular: irregular,
    nextPeriod: dayKey(nextPeriod),
    nextPeriodEarliest: dayKey(addDays(lastStart, shortest)),
    nextPeriodLatest: dayKey(addDays(lastStart, longest)),
    daysLate,
    menstrualDays,
    // fertile estimates are unreliable for irregular cycles, so hide them
    ovulation: irregular ? null : dayKey(ovulation),
    fertileStart: irregular ? null : dayKey(fertileStart),
    fertileEnd: irregular ? null : dayKey(fertileEnd),
    phase,
  };
};

module.exports = { buildSummary };