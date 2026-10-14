const mongoose = require("mongoose");
const Cycle = require("../models/Cycle");
const { buildSummary } = require("../utils/cyclePredictions");

const DAY = 1000 * 60 * 60 * 24;

const ALLOWED_SYMPTOMS = [
  "Cramps",
  "Headache",
  "Bloating",
  "Back pain",
  "Fatigue",
  "Breast tenderness",
  "Nausea",
  "Acne",
  "Trouble sleeping",
  "Cravings",
];
const ALLOWED_MOODS = ["Happy", "Calm", "Okay", "Low", "Irritated"];

// fields the client is allowed to see (never the user id or __v)
const PUBLIC_FIELDS =
  "periodStartDate periodEndDate cycleLength periodLength symptoms mood notes createdAt";

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Accepts "YYYY-MM-DD" (or an ISO string) and returns a Date at UTC midnight
const parseDate = (value) => {
  if (typeof value !== "string") return null;

  const key = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;

  const date = new Date(`${key}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const daysBetween = (a, b) => Math.round((b - a) / DAY);

// Cycle length is only valid between 15 and 60 days
const validCycleLength = (days) =>
  days >= 15 && days <= 60 ? days : undefined;

// The browser sends its own local date (?today=YYYY-MM-DD) so "today" is right
// for the user's time zone. Only trust it if it is within 2 days of the server.
const parseToday = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }
  const date = parseDate(value);
  if (!date) return undefined;

  const serverToday = parseDate(new Date().toISOString());
  return Math.abs(daysBetween(date, serverToday)) <= 2 ? value : undefined;
};

// checks the dates and returns { error } or { periodLength }
const checkRange = (start, end) => {
  // one day of tolerance for users whose time zone is ahead of the server
  const latestAllowed = Date.now() + DAY;

  if (start.getTime() > latestAllowed) {
    return { error: "Period start date cannot be in the future" };
  }

  if (!end) return { periodLength: undefined };

  if (end < start) {
    return { error: "Period end date must be on or after the start date" };
  }

  if (end.getTime() > latestAllowed) {
    return { error: "Period end date cannot be in the future" };
  }

  const periodLength = daysBetween(start, end) + 1;

  if (periodLength > 15) {
    return { error: "A period cannot be longer than 15 days" };
  }

  return { periodLength };
};

// symptoms / mood / notes. Only the keys that were sent are returned.
// A value of null means "remove it".
const parseExtras = (body) => {
  const values = {};

  if (body.symptoms !== undefined) {
    const { symptoms } = body;
    if (
      !Array.isArray(symptoms) ||
      symptoms.length > ALLOWED_SYMPTOMS.length ||
      !symptoms.every((s) => ALLOWED_SYMPTOMS.includes(s))
    ) {
      return { error: "Invalid symptoms" };
    }
    values.symptoms = [...new Set(symptoms)];
  }

  if (body.mood !== undefined) {
    if (body.mood === "" || body.mood === null) {
      values.mood = null;
    } else if (ALLOWED_MOODS.includes(body.mood)) {
      values.mood = body.mood;
    } else {
      return { error: "Invalid mood" };
    }
  }

  if (body.notes !== undefined) {
    if (body.notes === "" || body.notes === null) {
      values.notes = null;
    } else if (typeof body.notes === "string" && body.notes.trim().length <= 1000) {
      values.notes = body.notes.trim() || null;
    } else {
      return { error: "Notes must be 1000 characters or fewer" };
    }
  }

  return { values };
};

// does [start, end] touch a period that is already logged?
const findOverlap = (userId, start, end, excludeId) => {
  const filter = {
    user: userId,
    $or: [
      // the new start falls inside an existing period
      { periodStartDate: { $lte: start }, periodEndDate: { $gte: start } },
      // an existing period starts inside the new range
      { periodStartDate: { $gt: start, $lte: end || start } },
    ],
  };
  if (excludeId) filter._id = { $ne: excludeId };
  return Cycle.findOne(filter);
};

// Recomputes "gap before" for EVERY cycle from the sorted start dates.
// Called after any create / edit / delete, so lengths can never go stale.
const recalculateLengths = async (userId) => {
  const cycles = await Cycle.find({ user: userId })
    .sort({ periodStartDate: 1 })
    .select("periodStartDate cycleLength")
    .lean();

  const ops = [];

  cycles.forEach((cycle, i) => {
    const length =
      i === 0
        ? undefined
        : validCycleLength(
            daysBetween(cycles[i - 1].periodStartDate, cycle.periodStartDate)
          );

    if (length !== cycle.cycleLength) {
      ops.push({
        updateOne: {
          filter: { _id: cycle._id },
          update:
            length === undefined
              ? { $unset: { cycleLength: 1 } }
              : { $set: { cycleLength: length } },
        },
      });
    }
  });

  if (ops.length) await Cycle.bulkWrite(ops);
};

// CREATE CYCLE
const createCycle = async (req, res) => {
  try {
    const { periodStartDate, periodEndDate } = req.body;

    const start = parseDate(periodStartDate);
    if (!start) {
      return res
        .status(400)
        .json({ message: "Please provide a valid period start date" });
    }

    let end;
    if (periodEndDate) {
      end = parseDate(periodEndDate);
      if (!end) {
        return res
          .status(400)
          .json({ message: "Please provide a valid period end date" });
      }
    }

    const range = checkRange(start, end);
    if (range.error) {
      return res.status(400).json({ message: range.error });
    }

    const extras = parseExtras(req.body);
    if (extras.error) {
      return res.status(400).json({ message: extras.error });
    }

    // block duplicate start dates
    const duplicate = await Cycle.findOne({
      user: req.user,
      periodStartDate: start,
    });

    if (duplicate) {
      return res
        .status(409)
        .json({ message: "A period starting on this date already exists" });
    }

    if (await findOverlap(req.user, start, end)) {
      return res.status(409).json({
        message: "These dates overlap a period you have already logged",
      });
    }

    // used only to warn the user when a gap can't be used for predictions
    const previousCycle = await Cycle.findOne({
      user: req.user,
      periodStartDate: { $lt: start },
    }).sort({ periodStartDate: -1 });

    let warning;
    if (previousCycle) {
      const gap = daysBetween(previousCycle.periodStartDate, start);
      if (validCycleLength(gap) === undefined) {
        warning =
          gap < 15
            ? "This period starts less than 15 days after the previous one, so it isn't used for predictions. Please check the date."
            : "It has been more than 60 days since the previous period, so that gap isn't used for predictions. Did you miss logging one?";
      }
    }

    const cycle = await Cycle.create({
      user: req.user,
      periodStartDate: start,
      periodEndDate: end,
      periodLength: range.periodLength,
      symptoms: extras.values.symptoms || [],
      mood: extras.values.mood || undefined,
      notes: extras.values.notes || undefined,
    });

    // fixes this cycle's gap AND the next one's (for back-dated entries)
    await recalculateLengths(req.user);

    const saved = await Cycle.findById(cycle._id).select(PUBLIC_FIELDS).lean();

    res.status(201).json({
      message: "Cycle saved successfully",
      cycle: saved,
      warning,
    });
  } catch (error) {
    // two requests at the same moment can both pass the checks above
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ message: "A period starting on this date already exists" });
    }
    console.error("Create cycle error:", error);
    res.status(500).json({ message: "Failed to save cycle" });
  }
};

// UPDATE CYCLE (fix a date, add the end date later, change mood/symptoms/notes)
const updateCycle = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid cycle ID" });
    }

    // scoped to the owner, so nobody can edit someone else's record
    const existing = await Cycle.findOne({ _id: id, user: req.user });

    if (!existing) {
      return res.status(404).json({ message: "Cycle not found" });
    }

    const body = req.body;

    let start = existing.periodStartDate;
    if (body.periodStartDate !== undefined) {
      start = parseDate(body.periodStartDate);
      if (!start) {
        return res
          .status(400)
          .json({ message: "Please provide a valid period start date" });
      }
    }

    // null or "" removes the end date (the period is ongoing again)
    let end = existing.periodEndDate;
    if (body.periodEndDate !== undefined) {
      if (body.periodEndDate === null || body.periodEndDate === "") {
        end = undefined;
      } else {
        end = parseDate(body.periodEndDate);
        if (!end) {
          return res
            .status(400)
            .json({ message: "Please provide a valid period end date" });
        }
      }
    }

    const range = checkRange(start, end);
    if (range.error) {
      return res.status(400).json({ message: range.error });
    }

    const extras = parseExtras(body);
    if (extras.error) {
      return res.status(400).json({ message: extras.error });
    }

    if (start.getTime() !== existing.periodStartDate.getTime()) {
      const duplicate = await Cycle.findOne({
        user: req.user,
        periodStartDate: start,
        _id: { $ne: id },
      });

      if (duplicate) {
        return res
          .status(409)
          .json({ message: "A period starting on this date already exists" });
      }
    }

    if (await findOverlap(req.user, start, end, id)) {
      return res.status(409).json({
        message: "These dates overlap a period you have already logged",
      });
    }

    const set = { periodStartDate: start };
    const unset = {};

    if (end) {
      set.periodEndDate = end;
      set.periodLength = range.periodLength;
    } else {
      unset.periodEndDate = 1;
      unset.periodLength = 1;
    }

    for (const [field, value] of Object.entries(extras.values)) {
      if (value === null) unset[field] = 1;
      else set[field] = value;
    }

    const update = { $set: set };
    if (Object.keys(unset).length) update.$unset = unset;

    await Cycle.updateOne({ _id: id, user: req.user }, update);
    await recalculateLengths(req.user);

    const saved = await Cycle.findById(id).select(PUBLIC_FIELDS).lean();

    res.json({ message: "Cycle updated", cycle: saved });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ message: "A period starting on this date already exists" });
    }
    console.error("Update cycle error:", error);
    res.status(500).json({ message: "Failed to update cycle" });
  }
};

// DELETE ONE CYCLE
const deleteCycle = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid cycle ID" });
    }

    const deleted = await Cycle.findOneAndDelete({ _id: id, user: req.user });

    if (!deleted) {
      return res.status(404).json({ message: "Cycle not found" });
    }

    await recalculateLengths(req.user);

    res.json({ message: "Cycle deleted" });
  } catch (error) {
    console.error("Delete cycle error:", error);
    res.status(500).json({ message: "Failed to delete cycle" });
  }
};

// GET USER CYCLES
const getCycles = async (req, res) => {
  try {
    const cycles = await Cycle.find({ user: req.user })
      .sort({ periodStartDate: -1 })
      .limit(120)
      .select(PUBLIC_FIELDS)
      .lean();

    res.json({ cycles });
  } catch (error) {
    console.error("Get cycles error:", error);
    res.status(500).json({ message: "Failed to fetch cycles" });
  }
};

// GET LATEST CYCLE
const getLatestCycle = async (req, res) => {
  try {
    const cycle = await Cycle.findOne({ user: req.user })
      .sort({ periodStartDate: -1 })
      .select(PUBLIC_FIELDS)
      .lean();

    res.json({ cycle });
  } catch (error) {
    console.error("Get latest cycle error:", error);
    res.status(500).json({ message: "Failed to fetch latest cycle" });
  }
};

// CLEAR USER CYCLE HISTORY
const clearCycleHistory = async (req, res) => {
  try {
    await Cycle.deleteMany({ user: req.user });

    res.json({ message: "Cycle history cleared successfully" });
  } catch (error) {
    console.error("Clear cycles error:", error);
    res.status(500).json({ message: "Failed to clear cycle history" });
  }
};

// GET CYCLE SUMMARY (single source of truth for predictions)
const getCycleSummary = async (req, res) => {
  try {
    const cycles = await Cycle.find({ user: req.user })
      .sort({ periodStartDate: 1 })
      .select("periodStartDate periodEndDate periodLength")
      .lean();

    res.json({ summary: buildSummary(cycles, parseToday(req.query.today)) });
  } catch (error) {
    console.error("Cycle summary error:", error);
    res.status(500).json({ message: "Failed to calculate cycle summary" });
  }
};

module.exports = {
  createCycle,
  updateCycle,
  deleteCycle,
  getCycles,
  getLatestCycle,
  clearCycleHistory,
  getCycleSummary,
};