const path = require("path");
const prisma = require("../config/prisma");
const { uploadDir } = require("../middleware/upload.middleware");
const { getUserGroupAccess } = require("../utils/groupAccess");

async function downloadUpload(req, res) {
  try {
    const userId = req.user?.id;
    if (userId == null) {
      return res.status(401).json({
        success: false,
        message: "User could not be authenticated.",
      });
    }

    const requestedName = path.basename(req.params.filename ?? "");
    if (!requestedName || requestedName !== req.params.filename) {
      return res.status(400).json({
        success: false,
        message: "Invalid file path.",
      });
    }

    const fileUrl = `/uploads/${requestedName}`;
    const file = await prisma.file.findFirst({
      where: { fileUrl },
      select: {
        fileName: true,
        fileUrl: true,
        groupId: true,
      },
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: "File not found.",
      });
    }

    const access = await getUserGroupAccess(userId, file.groupId);
    if (!access.user || !access.canAccess) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to download this file.",
      });
    }

    return res.download(path.join(uploadDir, requestedName), file.fileName);
  } catch (error) {
    console.error("Failed to download file:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to download file.",
    });
  }
}

module.exports = {
  downloadUpload,
};
