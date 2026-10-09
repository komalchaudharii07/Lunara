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
];
const ALLOWED_MOODS = ["Happy", "Calm", "Okay", "Low", "Irritated"];

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

// CREATE CYCLE
const createCycle = async (req, res) => {
  try {
    const { periodStartDate, periodEndDate, symptoms, mood, notes } =
      req.body;

    const start = parseDate(periodStartDate);
    if (!start) {
      return res
        .status(400)
        .json({ message: "Please provide a valid period start date" });
    }

    // allow one day of tolerance for time zones
    if (start.getTime() > Date.now() + DAY) {
      return res
        .status(400)
        .json({ message: "Period start date cannot be in the future" });
    }

    let end;
    let periodLength;

    if (periodEndDate) {
      end = parseDate(periodEndDate);

      if (!end || end < start) {
        return res.status(400).json({
          message: "Period end date must be on or after the start date",
        });
      }

      periodLength = daysBetween(start, end) + 1;

      if (periodLength > 15) {
        return res
          .status(400)
          .json({ message: "A period cannot be longer than 15 days" });
      }
    }

    // symptoms: array of allowed values only
    let cleanSymptoms = [];
    if (symptoms !== undefined) {
      if (
        !Array.isArray(symptoms) ||
        symptoms.length > ALLOWED_SYMPTOMS.length ||
        !symptoms.every((s) => ALLOWED_SYMPTOMS.includes(s))
      ) {
        return res.status(400).json({ message: "Invalid symptoms" });
      }
      cleanSymptoms = [...new Set(symptoms)];
    }

    // mood: empty string means "not set"
    let cleanMood;
    if (mood) {
      if (!ALLOWED_MOODS.includes(mood)) {
        return res.status(400).json({ message: "Invalid mood" });
      }
      cleanMood = mood;
    }

    // notes: optional text, max 1000 characters
    let cleanNotes;
    if (notes !== undefined && notes !== null && notes !== "") {
      if (typeof notes !== "string" || notes.trim().length > 1000) {
        return res
          .status(400)
          .json({ message: "Notes must be 1000 characters or fewer" });
      }
      cleanNotes = notes.trim();
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

    // the cycle BEFORE this date (not just the latest one)
    const previousCycle = await Cycle.findOne({
      user: req.user,
      periodStartDate: { $lt: start },
    }).sort({ periodStartDate: -1 });

    const cycleLength = previousCycle
      ? validCycleLength(daysBetween(previousCycle.periodStartDate, start))
      : undefined;

    const cycle = await Cycle.create({
      user: req.user,
      periodStartDate: start,
      periodEndDate: end,
      cycleLength,
      periodLength,
      symptoms: cleanSymptoms,
      mood: cleanMood,
      notes: cleanNotes,
    });

    // if this was a backdated entry, fix the next cycle's length
    const nextCycle = await Cycle.findOne({
      user: req.user,
      periodStartDate: { $gt: start },
    }).sort({ periodStartDate: 1 });

    if (nextCycle) {
      const nextLength = validCycleLength(
        daysBetween(start, nextCycle.periodStartDate)
      );

      await Cycle.updateOne(
        { _id: nextCycle._id },
        nextLength === undefined
          ? { $unset: { cycleLength: 1 } }
          : { $set: { cycleLength: nextLength } }
      );
    }

    res.status(201).json({
      message: "Cycle saved successfully",
      cycle,
    });
  } catch (error) {
    console.error("Create cycle error:", error);
    res.status(500).json({ message: "Failed to save cycle" });
  }
};

// GET USER CYCLES
const getCycles = async (req, res) => {
  try {
    const cycles = await Cycle.find({ user: req.user })
      .sort({ periodStartDate: -1 })
      .limit(120);

    res.json({ cycles });
  } catch (error) {
    console.error("Get cycles error:", error);
    res.status(500).json({ message: "Failed to fetch cycles" });
  }
};

// GET LATEST CYCLE
const getLatestCycle = async (req, res) => {
  try {
    const cycle = await Cycle.findOne({ user: req.user }).sort({
      periodStartDate: -1,
    });

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
      .select("periodStartDate");

    res.json({ summary: buildSummary(cycles) });
  } catch (error) {
    console.error("Cycle summary error:", error);
    res.status(500).json({ message: "Failed to calculate cycle summary" });
  }
};

module.exports = {
  createCycle,
  getCycles,
  getLatestCycle,
  clearCycleHistory,
  getCycleSummary,
};