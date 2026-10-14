const User = require("../models/User");
const Cycle = require("../models/Cycle");
const DailyLog = require("../models/DailyLog");
const { buildSummary } = require("../utils/cyclePredictions");
const { isDateKey } = require("../utils/slots");

const DAY = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 731;
const DEFAULT_RANGE_DAYS = 180;

const dayKey = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);
const fromKey = (k) => new Date(`${k}T00:00:00.000Z`);

const topCounts = (items, limit = 8) => {
  const counts = new Map();
  items.forEach((name) => counts.set(name, (counts.get(name) || 0) + 1));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
};

/**
 * Builds the cycle report for one person.
 * includeNotes is false when a doctor looks at it: free-text notes stay private.
 */
const buildReport = async (userId, { from, to, todayKey, includeNotes }) => {
  const fromDate = fromKey(from);
  const toDate = fromKey(to);

  const [user, cycles, recent, logs] = await Promise.all([
    User.findById(userId).select("name age height weight bloodGroup").lean(),
    Cycle.find({ user: userId, periodStartDate: { $gte: fromDate, $lte: toDate } })
      .sort({ periodStartDate: 1 })
      .select("periodStartDate periodEndDate cycleLength periodLength symptoms mood notes")
      .lean(),
    Cycle.find({ user: userId })
      .sort({ periodStartDate: -1 })
      .limit(12)
      .select("periodStartDate periodLength")
      .lean(),
    DailyLog.find({ user: userId, date: { $gte: fromDate, $lte: toDate } })
      .sort({ date: 1 })
      .limit(MAX_RANGE_DAYS)
      .select("date flow pain mood symptoms notes")
      .lean(),
  ]);

  const s = buildSummary([...recent].reverse(), todayKey);

  const pains = logs.map((l) => l.pain).filter((n) => Number.isFinite(n));
  const flowDays = { spotting: 0, light: 0, medium: 0, heavy: 0 };
  logs.forEach((l) => {
    if (flowDays[l.flow] !== undefined) flowDays[l.flow] += 1;
  });

  const periodLengths = cycles
    .map((c) => c.periodLength)
    .filter((n) => Number.isFinite(n));

  return {
    generatedAt: new Date().toISOString(),
    range: { from, to },
    profile: {
      name: user?.name || "",
      age: user?.age ?? null,
      height: user?.height ?? null,
      weight: user?.weight ?? null,
      bloodGroup: user?.bloodGroup || null,
    },
    // only estimates a doctor can use. No goal-specific fertile-window advice here.
    summary: {
      ready: s.ready,
      cyclesTracked: s.cyclesTracked,
      lastPeriodStart: s.lastPeriodStart,
      averageCycleLength: s.averageCycleLength,
      shortestCycle: s.shortestCycle,
      longestCycle: s.longestCycle,
      isIrregular: s.isIrregular,
      nextPeriod: s.nextPeriod,
      daysLate: s.daysLate,
    },
    stats: {
      cyclesInRange: cycles.length,
      averagePeriodLength: periodLengths.length
        ? Math.round(
            (periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length) * 10
          ) / 10
        : null,
      logsInRange: logs.length,
      averagePain: pains.length
        ? Math.round((pains.reduce((a, b) => a + b, 0) / pains.length) * 10) / 10
        : null,
      maxPain: pains.length ? Math.max(...pains) : null,
      flowDays,
      moods: topCounts(logs.map((l) => l.mood).filter(Boolean), 5),
      symptoms: topCounts([
        ...logs.flatMap((l) => l.symptoms || []),
        ...cycles.flatMap((c) => c.symptoms || []),
      ]),
    },
    cycles: cycles.map((c) => ({
      start: dayKey(c.periodStartDate),
      end: dayKey(c.periodEndDate),
      cycleLength: c.cycleLength ?? null,
      periodLength: c.periodLength ?? null,
      mood: c.mood || "",
      symptoms: c.symptoms || [],
      notes: includeNotes ? c.notes || "" : undefined,
    })),
    logs: logs.map((l) => ({
      date: dayKey(l.date),
      flow: l.flow || "",
      pain: l.pain ?? null,
      mood: l.mood || "",
      symptoms: l.symptoms || [],
      notes: includeNotes ? l.notes || "" : undefined,
    })),
  };
};

// "from" and "to" are optional: the default is the last 180 days
const resolveRange = (query = {}) => {
  const today = isDateKey(query.today)
    ? query.today
    : new Date().toISOString().slice(0, 10);

  const to = isDateKey(query.to) ? query.to : today;
  const from = isDateKey(query.from)
    ? query.from
    : new Date(fromKey(to).getTime() - DEFAULT_RANGE_DAYS * DAY)
        .toISOString()
        .slice(0, 10);

  if (from > to) return { error: "The start date must be before the end date" };
  if ((fromKey(to) - fromKey(from)) / DAY > MAX_RANGE_DAYS) {
    return { error: "Please choose a range of two years or less" };
  }

  return { from, to, today };
};

// GET /api/reports?from=YYYY-MM-DD&to=YYYY-MM-DD&today=YYYY-MM-DD
const getMyReport = async (req, res) => {
  try {
    const range = resolveRange(req.query);
    if (range.error) return res.status(400).json({ message: range.error });

    const report = await buildReport(req.user, {
      from: range.from,
      to: range.to,
      todayKey: range.today,
      includeNotes: true,
    });

    res.json({ report });
  } catch (error) {
    console.error("Report error:", error);
    res.status(500).json({ message: "Couldn't build your report. Please try again." });
  }
};

module.exports = { buildReport, resolveRange, getMyReport };