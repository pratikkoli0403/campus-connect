const express = require("express");
const multer = require("multer");
const { importStudents } = require("../controllers/admin.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { importUpload } = require("../middleware/importUpload.middleware");
const { canImportStudents } = require("../utils/permissions");

const router = express.Router();

function requireImportAccess(req, res, next) {
  if (canImportStudents(req.user?.role)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Only admins or faculty can import students.",
  });
}

function handleImportUpload(req, res, next) {
  importUpload.single("file")(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "Import file must be 5MB or less.",
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  });
}

router.post(
  "/import-students",
  authMiddleware,
  requireImportAccess,
  handleImportUpload,
  importStudents
);

module.exports = router;
