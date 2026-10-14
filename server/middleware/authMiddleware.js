const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_ERRORS = ["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"];

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });

    if (typeof decoded.id !== "string") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const user = await User.findById(decoded.id).select(
      "_id passwordChangedAt tokenVersion"
    );

    // account was deleted
    if (!user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // password changed after this token was issued
    if (
      user.passwordChangedAt &&
      decoded.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)
    ) {
      return res
        .status(401)
        .json({ message: "Session expired. Please log in again." });
    }

    // "log out of all devices" or a password change bumped the version.
    // Tokens issued before tokenVersion existed have no "tv" and count as 0.
    if ((decoded.tv ?? 0) !== (user.tokenVersion ?? 0)) {
      return res
        .status(401)
        .json({ message: "Session expired. Please log in again." });
    }

    req.user = user._id.toString();
    next();
  } catch (error) {
    // 401 ONLY for token problems. A database error must not log everyone out
    // (the frontend clears the token on any 401).
    if (JWT_ERRORS.includes(error.name) || error.name === "CastError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    console.error("Auth middleware error:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
};

module.exports = protect;