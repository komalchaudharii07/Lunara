const DAY = 24 * 60 * 60 * 1000;
const MIN_GAPS = 2; // needs 3 logged periods

const dayKey = (d) => new Date(d).toISOString().slice(0, 10);
const fromKey = (k) => new Date(`${k}T00:00:00.000Z`);
const addDays = (date, n) => new Date(date.getTime() + n * DAY);
const diffDays = (a, b) => Math.round((b - a) / DAY);

const buildSummary = (cycles) => {
  const sorted = [...cycles].sort(
    (a, b) => new Date(a.periodStartDate) - new Date(b.periodStartDate)
  );

  const todayKey = dayKey(new Date());
  const today = fromKey(todayKey);

  const base = {
    cyclesTracked: sorted.length,
    today: todayKey,
    ready: false,
    lastPeriodStart: null,
    currentDay: null,
    averageCycleLength: null,
    shortestCycle: null,
    longestCycle: null,
    isIrregular: false,
    nextPeriod: null,
    daysLate: 0,
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
  base.currentDay = cd > 0 ? cd : null;

  // gaps between consecutive period starts (valid range only)
  const gaps = [];
  for (let i = 1; i < sorted.length; i++) {
    const g = diffDays(
      fromKey(dayKey(sorted[i - 1].periodStartDate)),
      fromKey(dayKey(sorted[i].periodStartDate))
    );
    if (g >= 15 && g <= 60) gaps.push(g);
  }

  if (gaps.length < MIN_GAPS) return base;

  const recent = gaps.slice(-6); // last 6 cycles
  const avg = Math.round(recent.reduce((s, g) => s + g, 0) / recent.length);
  const shortest = Math.min(...recent);
  const longest = Math.max(...recent);

  const nextPeriod = addDays(lastStart, avg);
  const ovulation = addDays(nextPeriod, -14);
  const fertileStart = addDays(ovulation, -5);
  const fertileEnd = addDays(ovulation, 1);

  const irregular = longest - shortest > 7;
  const daysLate = Math.max(diffDays(nextPeriod, today), 0);

  let phase = "Luteal phase";
  if (cd > 0) {
    if (cd <= 5) phase = "Menstrual phase";
    else if (today < fertileStart) phase = "Follicular phase";
    else if (today <= fertileEnd) phase = "Estimated fertile window";
    else phase = "Luteal phase";
    if (daysLate > 0) phase = "Period may be late";
  }

  return {
    ...base,
    ready: true,
    averageCycleLength: avg,
    shortestCycle: shortest,
    longestCycle: longest,
    isIrregular: irregular,
    nextPeriod: dayKey(nextPeriod),
    daysLate,
    // fertile estimates are unreliable for irregular cycles, so hide them
    ovulation: irregular ? null : dayKey(ovulation),
    fertileStart: irregular ? null : dayKey(fertileStart),
    fertileEnd: irregular ? null : dayKey(fertileEnd),
    phase,
  };
};

module.exports = { buildSummary };