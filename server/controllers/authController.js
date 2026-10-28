const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../models/User");
const Doctor = require("../models/Doctor");
const { parseDoctorInput } = require("../utils/doctorInput");
const Cycle = require("../models/Cycle");
const Chat = require("../models/Chat");
const Post = require("../models/Post");
const DailyLog = require("../models/DailyLog");
const Review = require("../models/Review");
const sendEmail = require("../utils/sendEmail");
const Appointment = require("../models/Appointment");
const { issueRefund } = require("../utils/payments");
const { notifyAdminsOfDoctor } = require("../utils/adminAlerts");
const MIN_PASSWORD = 8;
const MAX_PASSWORD_BYTES = 72; // bcrypt ignores everything after 72 BYTES
const BCRYPT_COST = 12;
const CONSENT_VERSION = "2026-10";
const RESET_COOLDOWN_MS = 2 * 60 * 1000;
const RESET_TTL_MS = 15 * 60 * 1000;
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const ACTIVITY_LEVELS = [
  "Sedentary",
  "Lightly Active",
  "Moderately Active",
  "Very Active",
];

// Compared against when the email is unknown, so login takes the same time
// whether or not the account exists.
const DUMMY_HASH = bcrypt.hashSync("lunara-dummy-password", BCRYPT_COST);

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

// tv = token version: raising it on the user signs out every older token
const signToken = (id, tv = 0) =>
  jwt.sign({ id, tv }, process.env.JWT_SECRET, {
    expiresIn: "7d",
    algorithm: "HS256",
  });

const isString = (v) => typeof v === "string";
const isValidEmail = (v) =>
  isString(v) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) && v.length <= 254;

// length in characters AND bytes (emoji / non-Latin letters use several bytes)
const passwordProblem = (password) => {
  if (!isString(password) || password.length < MIN_PASSWORD) {
    return `Password must be at least ${MIN_PASSWORD} characters`;
  }
  if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) {
    return "Password is too long (max 72 bytes; emoji and some symbols count as more than one)";
  }
  return null;
};

const toNumber = (v) => {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") return Number(v);
  return NaN;
};

// only these fields ever leave the server
const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  age: user.age,
  isDoctor: !!user.doctorId,
  isAdmin: !!user.isAdmin,
});

// emails listed in ADMIN_EMAILS (comma separated, in .env) become admins automatically
const promoteIfAdmin = async (user) => {
  const admins = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!user.isAdmin && admins.includes(user.email)) {
    user.isAdmin = true;
    await user.save();
  }
};

const profileUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  age: user.age,
  height: user.height,
  weight: user.weight,
  bloodGroup: user.bloodGroup,
  phone: user.phone,
  location: user.location,
  activityLevel: user.activityLevel,
  aiConsent: !!user.aiConsent,
  isDoctor: !!user.doctorId,
  isAdmin: !!user.isAdmin,
});

// REGISTER
const register = async (req, res) => {
  try {
    const { name, email, password, age, acceptedTerms, accountType, doctor } = req.body;
    const isDoctorSignup = accountType === "doctor";

    if (!isString(name) || !name.trim() || name.trim().length > 100) {
      return res.status(400).json({ message: "Please enter a valid name" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Please enter a valid email" });
    }

    const pwProblem = passwordProblem(password);
    if (pwProblem) {
      return res.status(400).json({ message: pwProblem });
    }

    // doctors don't enter an age; everyone else must
    let ageNumber;
    if (!isDoctorSignup) {
      ageNumber = toNumber(age);
      if (!Number.isInteger(ageNumber) || ageNumber < 10 || ageNumber > 100) {
        return res
          .status(400)
          .json({ message: "Age must be a whole number between 10 and 100" });
      }
    }

    let doctorDetails;
    if (isDoctorSignup) {
      const parsed = parseDoctorInput(
        { ...(doctor && typeof doctor === "object" ? doctor : {}), name: name.trim() },
        { requireAll: true, withLicence: true }
      );
      if (parsed.error) return res.status(400).json({ message: parsed.error });
      doctorDetails = parsed.value;
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

    const hashedPassword = await bcrypt.hash(password, BCRYPT_COST);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      ...(ageNumber !== undefined ? { age: ageNumber } : {}),
      consentAcceptedAt: new Date(),
      consentVersion: CONSENT_VERSION,
    });

    if (isDoctorSignup) {
      try {
        // starts as "pending": not public and not bookable until an admin approves it
        const doctorProfile = await Doctor.create({
          ...doctorDetails,
          user: user._id,
          verificationStatus: "pending",
          available: false,
        });
        user.doctorId = doctorProfile._id;
        await user.save();
               notifyAdminsOfDoctor(doctorProfile, user, "new");
      } catch (err) {
        await User.deleteOne({ _id: user._id }); // don't leave a half-made account
        throw err;
      }
    }

    await promoteIfAdmin(user);

    res.status(201).json({
      message: isDoctorSignup
        ? "Registration successful. An admin will verify your details before you appear to patients."
        : "Registration successful",
      token: signToken(user._id, 0),
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

    // password has select:false in the model, so it must be asked for
    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    // always run bcrypt so response time doesn't reveal if the email exists
    const isMatch = await bcrypt.compare(
      password,
      user ? user.password : DUMMY_HASH
    );

    if (!user || !isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    await promoteIfAdmin(user);

    res.json({
      message: "Login successful",
      token: signToken(user._id, user.tokenVersion ?? 0),
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
    const user = await User.findById(req.user);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user: profileUser(user) });
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

      const value = toNumber(body[field]);
      const valid =
        field === "age" ? Number.isInteger(value) : Number.isFinite(value);

      if (!valid || value < min || value > max) {
        return res.status(400).json({
          message:
            field === "age"
              ? `age must be a whole number between ${min} and ${max}`
              : `${field} must be between ${min} and ${max}`,
        });
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
        if (field === "phone" && !/^[+\d][\d\s()-]{5,19}$/.test(body[field].trim())) {
          return res.status(400).json({ message: "Invalid phone number" });
        }
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
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Profile updated successfully",
      user: profileUser(user),
    });
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

    const pwProblem = passwordProblem(newPassword);
    if (pwProblem) {
      return res.status(400).json({ message: pwProblem });
    }

    if (newPassword === currentPassword) {
      return res.status(400).json({
        message: "New password must be different from the current one",
      });
    }

    const user = await User.findById(req.user).select("+password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      // 400, not 401: a typo must not log the user out
      return res
        .status(400)
        .json({ message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, BCRYPT_COST);
    // small offset so the token issued below is never older than this stamp
    user.passwordChangedAt = new Date(Date.now() - 1000);
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();

    // old tokens are now invalid, so hand back a fresh one
    res.json({
      message: "Password changed successfully",
      token: signToken(user._id, user.tokenVersion),
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

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+resetPasswordExpires");

    // cooldown: a token created in the last 2 minutes means we already emailed
    const recentlySent =
      user?.resetPasswordExpires &&
      user.resetPasswordExpires.getTime() - Date.now() >
        RESET_TTL_MS - RESET_COOLDOWN_MS;

    if (user && !recentlySent) {
      const token = crypto.randomBytes(32).toString("hex");

      user.resetPasswordToken = hashToken(token);
      user.resetPasswordExpires = new Date(Date.now() + RESET_TTL_MS);
      await user.save({ validateBeforeSave: false });

      const clientUrl = process.env.CLIENT_URL.split(",")[0].trim();
      const link = `${clientUrl}/reset-password/${token}`;

      // NOT awaited: otherwise existing accounts respond slower than unknown ones
      sendEmail({
        to: user.email,
        subject: "Reset your Lunara password",
        text: `Reset your password using this link (valid for 15 minutes): ${link}\n\nIf you didn't request this, you can ignore this email.`,
        html: `<p>Hi,</p>
<p>Click the button below to reset your Lunara password. This link is valid for 15 minutes.</p>
<p><a href="${link}" style="background:#e58da4;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;display:inline-block">Reset password</a></p>
<p>If you didn't request this, you can safely ignore this email.</p>`,
      }).catch(async (mailError) => {
        // don't keep a token the user never received
        console.error("Reset email failed:", mailError.message);
        try {
          await User.updateOne(
            { _id: user._id },
            { $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 } }
          );
        } catch (cleanupError) {
          console.error("Reset token cleanup failed:", cleanupError.message);
        }
      });
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

    const pwProblem = passwordProblem(password);
    if (pwProblem) {
      return res.status(400).json({ message: pwProblem });
    }

    const user = await User.findOne({
      resetPasswordToken: hashToken(String(token)),
      resetPasswordExpires: { $gt: new Date() },
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!user) {
      return res
        .status(400)
        .json({ message: "This reset link is invalid or has expired" });
    }

    user.password = await bcrypt.hash(password, BCRYPT_COST);
    user.passwordChangedAt = new Date();
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
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

    const user = await User.findById(req.user).select("+password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Password is incorrect" });
    }

    // upcoming appointments are cancelled and refunded, so a doctor is never
    // left with a booking for an account that no longer exists
    const upcoming = await Appointment.find({
      user: user._id,
      status: { $in: ["booked", "pending_payment"] },
    });
    for (const appt of upcoming) {
      appt.status = "cancelled";
      appt.cancelledBy = "user";
      appt.cancelledAt = new Date();
      await appt.save();
      if (appt.paymentStatus === "paid") await issueRefund(appt._id);
    }
    // past records stay (payments), but stop sharing the report and drop health text
    await Appointment.updateMany(
      { user: user._id },
      { $set: { shareReport: false, reason: "" } }
    );

    await Promise.all([
      Cycle.deleteMany({ user: user._id }),
      DailyLog.deleteMany({ user: user._id }),
      Chat.deleteMany({ user: user._id }),
      Review.deleteMany({ user: user._id }),
      Post.deleteMany({ user: user._id }),
      Post.updateMany({ likes: user._id }, { $pull: { likes: user._id } }),
      Post.updateMany(
        { "reports.user": user._id },
        { $pull: { reports: { user: user._id } } }
      ),
    ]);

    await User.deleteOne({ _id: user._id });

    res.json({ message: "Your account and data have been deleted" });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({
      message:
        "Failed to delete account. Some data may remain; please try again.",
    });
  }
};

// TURN LUNARA AI ON / OFF (nothing is sent to Gemini until the user agrees)
const setAiConsent = async (req, res) => {
  try {
    const { consent } = req.body;

    if (typeof consent !== "boolean") {
      return res.status(400).json({ message: "consent must be true or false" });
    }

    const user = await User.findByIdAndUpdate(
      req.user,
      consent
        ? { $set: { aiConsent: true, aiConsentAt: new Date() } }
        : { $set: { aiConsent: false }, $unset: { aiConsentAt: 1 } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: consent ? "Lunara AI is on" : "Lunara AI is off",
      aiConsent: !!user.aiConsent,
    });
  } catch (error) {
    console.error("AI consent error:", error);
    res.status(500).json({ message: "Failed to update the setting" });
  }
};

// LOG OUT EVERY OTHER DEVICE (this device gets a fresh token)
const logoutOtherDevices = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user,
      { $inc: { tokenVersion: 1 } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Logged out of all other devices",
      token: signToken(user._id, user.tokenVersion),
    });
  } catch (error) {
    console.error("Logout all error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

// EXPORT ALL MY DATA (JSON)
const exportData = async (req, res) => {
  try {
    const [user, cycles, dailyLogs, chats, posts] = await Promise.all([
      User.findById(req.user),
      Cycle.find({ user: req.user }).sort({ periodStartDate: 1 }).lean(),
      DailyLog.find({ user: req.user }).sort({ date: 1 }).lean(),
      Chat.find({ user: req.user }).sort({ createdAt: 1 }).lean(),
      Post.find({ user: req.user }).sort({ createdAt: 1 }).lean(),
    ]);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const strip = ({ __v, user: _u, ...rest }) => rest;

    res.json({
      exportedAt: new Date().toISOString(),
      profile: profileUser(user),
      cycles: cycles.map(strip),
      dailyLogs: dailyLogs.map(strip),
      chats: chats.map(strip),
      posts: posts.map(({ likes, reports, ...p }) => strip(p)),
    });
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ message: "Failed to export your data" });
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
  setAiConsent,
  logoutOtherDevices,
  exportData,
};