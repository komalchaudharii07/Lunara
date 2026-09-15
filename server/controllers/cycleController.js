const Cycle = require("../models/Cycle");

// CREATE CYCLE
const createCycle = async (req, res) => {
  try {
    const {
      periodStartDate,
      periodEndDate,
      periodLength,
      symptoms,
      mood,
      notes,
    } = req.body;

    if (!periodStartDate) {
      return res.status(400).json({
        message: "Period start date is required",
      });
    }

    // Find the user's most recent previous cycle
    const previousCycle = await Cycle.findOne({
      user: req.user,
    }).sort({ periodStartDate: -1 });

    let cycleLength;

    if (previousCycle) {
      const previousDate = new Date(
        previousCycle.periodStartDate
      );

      const currentDate = new Date(periodStartDate);

      cycleLength = Math.round(
        (currentDate - previousDate) /
        (1000 * 60 * 60 * 24)
      );

      // Ignore unrealistic values
      if (cycleLength < 15 || cycleLength > 60) {
        cycleLength = undefined;
      }
    }

    const cycle = await Cycle.create({
      user: req.user,
      periodStartDate,
      periodEndDate,
      cycleLength,
      periodLength,
      symptoms,
      mood,
      notes,
    });

    res.status(201).json({
      message: "Cycle saved successfully",
      cycle,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to save cycle",
      error: error.message,
    });
  }
};

// GET USER CYCLES
const getCycles = async (req, res) => {
  try {
    const cycles = await Cycle.find({
      user: req.user,
    }).sort({ periodStartDate: -1 });

    res.json({
      cycles,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch cycles",
      error: error.message,
    });
  }
};

// GET LATEST CYCLE
const getLatestCycle = async (req, res) => {
  try {
    const cycle = await Cycle.findOne({
      user: req.user,
    }).sort({ periodStartDate: -1 });

    res.json({
      cycle,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch latest cycle",
      error: error.message,
    });
  }
};

// CLEAR USER CYCLE HISTORY
const clearCycleHistory = async (req, res) => {
  try {
    await Cycle.deleteMany({
      user: req.user,
    });

    res.json({
      message: "Cycle history cleared successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to clear cycle history",
      error: error.message,
    });
  }
};

module.exports = {
  createCycle,
  getCycles,
  getLatestCycle,
  clearCycleHistory,
};