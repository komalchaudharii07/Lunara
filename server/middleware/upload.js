const multer = require("multer");
const { sniff, cleanFilename } = require("../utils/fileTypes");
const { saveBuffer } = require("../utils/fileStore");
const FileAsset = require("../models/FileAsset");

const MB = 1024 * 1024;

// Reads the uploaded file(s) into memory (small limits), never to disk.
// kind: "photo" allows images only, "document" allows PDF and images.
const readUploads = ({ field, maxFiles = 1, maxBytes = 5 * MB }) => {
  const parser = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: maxFiles, fields: 10, parts: maxFiles + 10 },
  });
  const handler = maxFiles === 1 ? parser.single(field) : parser.array(field, maxFiles);

  return (req, res, next) =>
    handler(req, res, (err) => {
      if (!err) return next();
      let message = "Couldn't read the file. Please try again.";
      if (err.code === "LIMIT_FILE_SIZE") message = `Each file must be ${Math.round(maxBytes / MB)} MB or smaller.`;
      else if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") {
        message = `You can upload up to ${maxFiles} file${maxFiles === 1 ? "" : "s"} at a time.`;
      }
      return res.status(400).json({ message });
    });
};

// Checks the real file type, stores it privately and returns FileAsset records.
// allowPdf=false means images only.
const storeUploads = async (files, { kind, owner, doctor, patient, appointment, allowPdf = true }) => {
  const list = Array.isArray(files) ? files : files ? [files] : [];
  if (list.length === 0) throw Object.assign(new Error("Please choose a file."), { status: 400 });

  // check everything first so one bad file doesn't leave others half saved
  const checked = list.map((f) => {
    const type = sniff(f.buffer);
    if (!type || (!allowPdf && type.mime === "application/pdf")) {
      throw Object.assign(
        new Error(allowPdf ? "Only PDF, JPG or PNG files are allowed." : "Only JPG or PNG pictures are allowed."),
        { status: 400 }
      );
    }
    return { f, type };
  });

  const assets = [];
  for (const { f, type } of checked) {
    const filename = cleanFilename(f.originalname, type.ext);
    const gridId = await saveBuffer(f.buffer, { filename, mimeType: type.mime });
    assets.push(
      await FileAsset.create({
        gridId,
        kind,
        filename,
        mimeType: type.mime,
        size: f.size,
        owner,
        doctor,
        patient,
        appointment,
      })
    );
  }
  return assets;
};

module.exports = { readUploads, storeUploads };