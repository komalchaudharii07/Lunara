// Saves and reads private files in MongoDB GridFS (no extra service to run).
const mongoose = require("mongoose");

const bucket = () =>
  new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: "private_files" });

// returns the GridFS id
const saveBuffer = (buffer, { filename, mimeType }) =>
  new Promise((resolve, reject) => {
    const stream = bucket().openUploadStream(filename, { metadata: { mimeType } });
    stream.on("error", reject);
    stream.on("finish", () => resolve(stream.id));
    stream.end(buffer);
  });

const openStream = (gridId) => bucket().openDownloadStream(gridId);

const removeFile = async (gridId) => {
  try {
    await bucket().delete(gridId);
  } catch (error) {
    // already gone is fine
    if (!/FileNotFound/i.test(error.message)) console.error("GridFS delete error:", error.message);
  }
};

module.exports = { saveBuffer, openStream, removeFile };