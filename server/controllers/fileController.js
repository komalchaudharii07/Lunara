const mongoose = require("mongoose");
const FileAsset = require("../models/FileAsset");
const Doctor = require("../models/Doctor");
const User = require("../models/User");
const { canReadFile } = require("../utils/filePolicy");
const { openStream } = require("../utils/fileStore");

// GET /api/files/:id[?download=1]
// The only way to get a stored file. It checks the person first and never sends a public link.
const getFile = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid file" });
    }

    const asset = await FileAsset.findById(req.params.id).lean();
    if (!asset) return res.status(404).json({ message: "File not found" });

    const user = await User.findById(req.user).select("isAdmin doctorId").lean();
    if (!user) return res.status(401).json({ message: "Please log in again" });

    let assetDoctorApproved = false;
    if (asset.kind === "doctor_photo" && asset.doctor) {
      const doctor = await Doctor.findById(asset.doctor).select("verificationStatus").lean();
      assetDoctorApproved = doctor?.verificationStatus === "approved";
    }

    const allowed = canReadFile(asset, {
      userId: req.user,
      isAdmin: user.isAdmin,
      doctorId: user.doctorId,
      assetDoctorApproved,
    });

    // 404 (not 403) so nobody can discover which file ids exist
    if (!allowed) return res.status(404).json({ message: "File not found" });

    const download = req.query.download === "1";
    const safeName = encodeURIComponent(asset.filename);

    res.set({
      "Content-Type": asset.mimeType,
      "Content-Length": String(asset.size),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${safeName}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cross-Origin-Resource-Policy": "same-site",
    });

    const stream = openStream(asset.gridId);
    stream.on("error", (err) => {
      console.error("File stream error:", err.message);
      if (!res.headersSent) res.status(404).json({ message: "File not found" });
      else res.destroy();
    });
    stream.pipe(res);
  } catch (error) {
    console.error("Get file error:", error);
    if (!res.headersSent) res.status(500).json({ message: "Couldn't load the file" });
  }
};

module.exports = { getFile };