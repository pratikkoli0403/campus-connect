const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDir = path.join(__dirname, "..", "..", "uploads");

fs.mkdirSync(uploadDir, { recursive: true });

const allowedExtensions = new Set([".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx"]);
const allowedMimeTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80);
    const safeBaseName = baseName || "file";

    cb(null, `${Date.now()}-${safeBaseName}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensions.has(ext) || !allowedMimeTypes.has(file.mimetype)) {
    return cb(
      new Error("Only pdf, png, jpg, jpeg, doc, and docx files are allowed.")
    );
  }

  return cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

module.exports = {
  upload,
  uploadDir,
};
