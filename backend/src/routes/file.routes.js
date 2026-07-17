const express = require("express");
const multer = require("multer");
const {
  uploadFile,
  getGroupFiles,
  deleteFile,
} = require("../controllers/file.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { upload } = require("../middleware/upload.middleware");

const router = express.Router();

function handleUpload(req, res, next) {
  upload.single("file")(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File size must be 10MB or less.",
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  });
}

router.post("/upload", authMiddleware, handleUpload, uploadFile);
router.get("/:groupId", authMiddleware, getGroupFiles);
router.delete("/:id", authMiddleware, deleteFile);

module.exports = router;
