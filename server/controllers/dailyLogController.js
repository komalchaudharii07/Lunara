const DailyLog = require("../models/DailyLog");

const DAY = 1000 * 60 * 60 * 24;

const FLOWS = ["none", "spotting", "light", "medium", "heavy"];
const MOODS = ["Happy", "Calm", "Okay", "Low", "Irritated"];
const SYMPTOMS = [
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

const PUBLIC_FIELDS = "date flow pain mood symptoms notes";

// "YYYY-MM-DD" -> Date at UTC midnight (or null if it isn't a real date)
const parseKey = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  // rejects things like 2026-02-31 that JS silently rolls over
  return date.toISOString().slice(0, 10) === value ? date : null;
};

const isEmpty = (v) => v === undefined || v === null || v === "";

// SAVE (create or replace) the log for one day
const saveLog = async (req, res) => {
  try {
    const date = parseKey(req.params.date);
    if (!date) {
      return res.status(400).json({ message: "Invalid date" });
    }

    // one day of tolerance for time zones ahead of the server
    if (date.getTime() > Date.now() + DAY) {
      return res
        .status(400)
        .json({ message: "You can't log a day in the future" });
    }

    const { flow, pain, mood, symptoms, notes } = req.body;
    const set = {};
    const unset = {};

    if (isEmpty(flow)) unset.flow = 1;
    else if (FLOWS.includes(flow)) set.flow = flow;
    else return res.status(400).json({ message: "Invalid flow" });

    if (isEmpty(pain)) {
      unset.pain = 1;
    } else {
      const value = typeof pain === "number" ? pain : Number(pain);
      if (!Number.isInteger(value) || value < 0 || value > 10) {
        return res
          .status(400)
          .json({ message: "Pain must be a whole number from 0 to 10" });
      }
      set.pain = value;
    }

    if (isEmpty(mood)) unset.mood = 1;
    else if (MOODS.includes(mood)) set.mood = mood;
    else return res.status(400).json({ message: "Invalid mood" });

    if (symptoms === undefined || symptoms === null) {
      set.symptoms = [];
    } else if (
      Array.isArray(symptoms) &&
      symptoms.length <= SYMPTOMS.length &&
      symptoms.every((s) => SYMPTOMS.includes(s))
    ) {
      set.symptoms = [...new Set(symptoms)];
    } else {
      return res.status(400).json({ message: "Invalid symptoms" });
    }

    if (isEmpty(notes)) {
      unset.notes = 1;
    } else if (typeof notes === "string" && notes.trim().length <= 1000) {
      if (notes.trim()) set.notes = notes.trim();
      else unset.notes = 1;
    } else {
      return res
        .status(400)
        .json({ message: "Notes must be 1000 characters or fewer" });
    }

    const hasContent =
      set.flow || set.pain !== undefined || set.mood || set.notes ||
      set.symptoms.length > 0;

    if (!hasContent) {
      return res
        .status(400)
        .json({ message: "Add at least one detail before saving" });
    }

    const update = { $set: set };
    if (Object.keys(unset).length) update.$unset = unset;

    const log = await DailyLog.findOneAndUpdate(
      { user: req.user, date },
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
      .select(PUBLIC_FIELDS)
      .lean();

    res.json({ message: "Saved", log });
  } catch (error) {
    console.error("Save daily log error:", error);
    res.status(500).json({ message: "Failed to save your log" });
  }
};

// LIST logs (default: the last 60 days)
const getLogs = async (req, res) => {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const to = parseKey(req.query.to) || new Date(today.getTime() + DAY);
    const from =
      parseKey(req.query.from) || new Date(today.getTime() - 60 * DAY);

    const logs = await DailyLog.find({
      user: req.user,
      date: { $gte: from, $lte: to },
    })
      .sort({ date: -1 })
      .limit(400)
      .select(PUBLIC_FIELDS)
      .lean();

    res.json({ logs });
  } catch (error) {
    console.error("Get daily logs error:", error);
    res.status(500).json({ message: "Failed to load your logs" });
  }
};

// DELETE one day
const deleteLog = async (req, res) => {
  try {
    const date = parseKey(req.params.date);
    if (!date) {
      return res.status(400).json({ message: "Invalid date" });
    }

    const result = await DailyLog.deleteOne({ user: req.user, date });

    if (!result.deletedCount) {
      return res.status(404).json({ message: "No log for that day" });
    }

    res.json({ message: "Log deleted" });
  } catch (error) {
    console.error("Delete daily log error:", error);
    res.status(500).json({ message: "Failed to delete the log" });
  }
};

// DELETE every daily log of the user
const clearLogs = async (req, res) => {
  try {
    await DailyLog.deleteMany({ user: req.user });
    res.json({ message: "Daily logs cleared" });
  } catch (error) {
    console.error("Clear daily logs error:", error);
    res.status(500).json({ message: "Failed to clear daily logs" });
  }
};

module.exports = { saveLog, getLogs, deleteLog, clearLogs };