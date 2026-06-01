const multer = require("multer");
const path = require("path");

const allowedExtensions = new Set([".csv", ".xlsx"]);
const allowedMimeTypes = new Set([
  "text/csv",
  "text/plain",
  "application/csv",
  "application/octet-stream",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function importFileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensions.has(ext) || !allowedMimeTypes.has(file.mimetype)) {
    return cb(new Error("Only CSV and XLSX files are allowed."));
  }

  return cb(null, true);
}

const importUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: importFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = {
  importUpload,
};
