const path = require("path");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const { uploadDir } = require("../middleware/upload.middleware");
const { getUserGroupAccess } = require("../utils/groupAccess");

function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const [scheme, token] = authHeader.split(" ");
    if (scheme === "Bearer" && token) return token;
  }

  return typeof req.query.token === "string" ? req.query.token : null;
}

async function downloadUpload(req, res) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is missing.",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token.",
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

    const access = await getUserGroupAccess(decoded.id, file.groupId);
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
