const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../models/User");
const Cycle = require("../models/Cycle");
const Chat = require("../models/Chat");
const Post = require("../models/Post");
const Review = require("../models/Review");
const sendEmail = require("../utils/sendEmail");

const MIN_PASSWORD = 8;
const CONSENT_VERSION = "2026-10";
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const ACTIVITY_LEVELS = [
  "Sedentary",
  "Lightly Active",
  "Moderately Active",
  "Very Active",
];

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
    algorithm: "HS256",
  });

const isString = (v) => typeof v === "string";
const isValidEmail = (v) =>
  isString(v) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254;

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  age: user.age,
});

// REGISTER
const register = async (req, res) => {
  try {
    const { name, email, password, age, acceptedTerms } = req.body;

    if (!isString(name) || !name.trim() || name.trim().length > 100) {
      return res.status(400).json({ message: "Please enter a valid name" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Please enter a valid email" });
    }

    if (!isString(password) || password.length < MIN_PASSWORD) {
      return res.status(400).json({
        message: `Password must be at least ${MIN_PASSWORD} characters`,
      });
    }

    if (password.length > 72) {
      // bcrypt ignores everything after 72 bytes
      return res
        .status(400)
        .json({ message: "Password must be 72 characters or fewer" });
    }

    const ageNumber = Number(age);
    if (!Number.isInteger(ageNumber) || ageNumber < 10 || ageNumber > 100) {
      return res
        .status(400)
        .json({ message: "Age must be a number between 10 and 100" });
    }

    if (acceptedTerms !== true) {
      return res.status(400).json({
        message: "Please accept the Terms and Privacy Policy to continue",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      age: ageNumber,
      consentAcceptedAt: new Date(),
      consentVersion: CONSENT_VERSION,
    });

    res.status(201).json({
      message: "Registration successful",
      token: signToken(user._id),
      user: publicUser(user),
    });
  } catch (error) {
    // two requests at the same moment can both pass findOne
    if (error.code === 11000) {
      return res.status(409).json({ message: "User already exists" });
    }
    console.error("Register error:", error);
    res.status(500).json({ message: "Registration failed" });
  }
};

// LOGIN
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // strings only: blocks NoSQL injection like { "$ne": null }
    if (!isString(email) || !isString(password)) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.json({
      message: "Login successful",
      token: signToken(user._id),
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
};

// GET CURRENT USER
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    console.error("GetMe error:", error);
    res.status(500).json({ message: "Failed to get user" });
  }
};

// UPDATE PROFILE
const updateProfile = async (req, res) => {
  try {
    const body = req.body || {};
    const set = {};
    const unset = {};

    // name (required if sent)
    if (body.name !== undefined) {
      if (
        !isString(body.name) ||
        !body.name.trim() ||
        body.name.trim().length > 100
      ) {
        return res.status(400).json({ message: "Please enter a valid name" });
      }
      set.name = body.name.trim();
    }

    // numeric fields: null or "" removes the value
    const numeric = {
      age: [10, 100],
      height: [50, 250],
      weight: [10, 300],
    };

    for (const [field, [min, max]] of Object.entries(numeric)) {
      if (body[field] === undefined) continue;

      if (body[field] === null || body[field] === "") {
        if (field === "age") {
          return res.status(400).json({ message: "Age is required" });
        }
        unset[field] = 1;
        continue;
      }

      const value = Number(body[field]);
      if (!Number.isFinite(value) || value < min || value > max) {
        return res
          .status(400)
          .json({ message: `${field} must be between ${min} and ${max}` });
      }
      set[field] = value;
    }

    // enum fields
    const enums = {
      bloodGroup: BLOOD_GROUPS,
      activityLevel: ACTIVITY_LEVELS,
    };

    for (const [field, allowed] of Object.entries(enums)) {
      if (body[field] === undefined) continue;

      if (body[field] === null || body[field] === "") {
        unset[field] = 1;
      } else if (allowed.includes(body[field])) {
        set[field] = body[field];
      } else {
        return res.status(400).json({ message: `Invalid ${field}` });
      }
    }

    // text fields
    const text = { phone: 20, location: 100 };

    for (const [field, max] of Object.entries(text)) {
      if (body[field] === undefined) continue;

      if (body[field] === null || body[field] === "") {
        unset[field] = 1;
      } else if (isString(body[field]) && body[field].trim().length <= max) {
        set[field] = body[field].trim();
      } else {
        return res.status(400).json({ message: `Invalid ${field}` });
      }
    }

    const update = {};
    if (Object.keys(set).length) update.$set = set;
    if (Object.keys(unset).length) update.$unset = unset;

    if (!Object.keys(update).length) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    const user = await User.findByIdAndUpdate(req.user, update, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Profile updated successfully", user });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Profile update failed" });
  }
};

// CHANGE PASSWORD
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!isString(currentPassword) || !isString(newPassword)) {
      return res.status(400).json({
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < MIN_PASSWORD || newPassword.length > 72) {
      return res.status(400).json({
        message: `New password must be ${MIN_PASSWORD} to 72 characters`,
      });
    }

    if (newPassword === currentPassword) {
      return res.status(400).json({
        message: "New password must be different from the current one",
      });
    }

    const user = await User.findById(req.user);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordChangedAt = new Date();
    await user.save();

    // old tokens are now invalid, so hand back a fresh one
    res.json({
      message: "Password changed successfully",
      token: signToken(user._id),
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Failed to change password" });
  }
};

// FORGOT PASSWORD
const forgotPassword = async (req, res) => {
  // same answer whether or not the account exists (prevents email probing)
  const genericMessage =
    "If an account exists for this email, a reset link has been sent.";

  try {
    const { email } = req.body;

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Please enter a valid email" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (user) {
      const token = crypto.randomBytes(32).toString("hex");

      user.resetPasswordToken = hashToken(token);
      user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
      await user.save({ validateBeforeSave: false });

      const clientUrl = process.env.CLIENT_URL.split(",")[0].trim();
      const link = `${clientUrl}/reset-password/${token}`;

      try {
        await sendEmail({
          to: user.email,
          subject: "Reset your Lunara password",
          text: `Reset your password using this link (valid for 15 minutes): ${link}\n\nIf you didn't request this, you can ignore this email.`,
          html: `<p>Hi,</p>
<p>Click the button below to reset your Lunara password. This link is valid for 15 minutes.</p>
<p><a href="${link}" style="background:#e58da4;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;display:inline-block">Reset password</a></p>
<p>If you didn't request this, you can safely ignore this email.</p>`,
        });
      } catch (mailError) {
        // don't keep a token the user never received
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save({ validateBeforeSave: false });
        console.error("Reset email failed:", mailError.message);
      }
    }

    res.json({ message: genericMessage });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

// RESET PASSWORD
const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const { token } = req.params;

    if (
      !isString(password) ||
      password.length < MIN_PASSWORD ||
      password.length > 72
    ) {
      return res.status(400).json({
        message: `Password must be ${MIN_PASSWORD} to 72 characters`,
      });
    }

    const user = await User.findOne({
      resetPasswordToken: hashToken(String(token)),
      resetPasswordExpires: { $gt: Date.now() },
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!user) {
      return res
        .status(400)
        .json({ message: "This reset link is invalid or has expired" });
    }

    user.password = await bcrypt.hash(password, 10);
    user.passwordChangedAt = new Date();
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successful. You can now log in." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

// DELETE ACCOUNT (and all related data)
const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;

    if (!isString(password)) {
      return res.status(400).json({ message: "Password is required" });
    }

    const user = await User.findById(req.user);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Password is incorrect" });
    }

    await Promise.all([
      Cycle.deleteMany({ user: user._id }),
      Chat.deleteMany({ user: user._id }),
      Review.deleteMany({ user: user._id }),
      Post.deleteMany({ user: user._id }),
      Post.updateMany({ likes: user._id }, { $pull: { likes: user._id } }),
    ]);

    await User.deleteOne({ _id: user._id });

    res.json({ message: "Your account and data have been deleted" });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({ message: "Failed to delete account" });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  deleteAccount,
};