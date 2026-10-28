// Decides what a file really is by reading its first bytes,
// so a renamed .exe or .html can't pass as a PDF or an image.
const sniff = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 8) return null;

  if (buffer.slice(0, 5).toString("latin1") === "%PDF-") {
    return { mime: "application/pdf", ext: "pdf" };
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) {
    return { mime: "image/png", ext: "png" };
  }
  return null;
};

// the name people see: no folders, no odd characters, never empty
const cleanFilename = (name, fallbackExt) => {
  const base = String(name || "")
    .replace(/^.*[\\/]/, "")
    .replace(/[^\w.\- ]+/g, "_")
    .replace(/\.{2,}/g, ".")
    .trim()
    .slice(0, 100);
  const withExt = base && /\.\w{2,4}$/.test(base) ? base : `${base || "file"}.${fallbackExt}`;
  return withExt.replace(/^\.+/, "file.");
};

module.exports = { sniff, cleanFilename };