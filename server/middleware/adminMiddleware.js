const User = require("../models/User");

// use AFTER protect. Only users with isAdmin: true (set by hand in the database).
const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user).select("isAdmin").lean();

    if (!user?.isAdmin) {
      return res.status(403).json({ message: "Not allowed" });
    }

    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

module.exports = requireAdmin;