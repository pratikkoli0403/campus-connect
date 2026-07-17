const fs = require("fs");
const path = require("path");
const prisma = require("../config/prisma");
const { uploadDir } = require("../middleware/upload.middleware");
const { canDeleteFile, canAccessGroup } = require("../utils/permissions");

function parsePositiveInt(raw) {
  if (raw === undefined || raw === null || raw === "") {
    return null;
  }

  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function parseGroupId(rawGroupId) {
  return parsePositiveInt(rawGroupId);
}

async function findMembership(userId, groupId) {
  return prisma.groupMember.findFirst({
    where: {
      userId,
      groupId,
    },
  });
}

function removeUploadedFile(file) {
  if (!file?.path) return;

  fs.unlink(file.path, (error) => {
    if (error) {
      console.error("Failed to remove rejected upload:", error.message);
    }
  });
}

function removeStoredFile(fileUrl) {
  if (!fileUrl || typeof fileUrl !== "string") return;

  const basename = path.basename(fileUrl);
  if (!basename || basename === "." || basename === "..") return;

  const filePath = path.join(uploadDir, basename);
  fs.unlink(filePath, (error) => {
    if (error && error.code !== "ENOENT") {
      console.error("Failed to delete stored file:", error.message);
    }
  });
}

const uploadFile = async (req, res) => {
  try {
    const userId = req.user?.id;
    const groupId = parseGroupId(req.body.groupId);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File is required.",
      });
    }

    if (userId == null) {
      removeUploadedFile(req.file);
      return res.status(401).json({
        success: false,
        message: "User could not be authenticated.",
      });
    }

    if (groupId == null) {
      removeUploadedFile(req.file);
      return res.status(400).json({
        success: false,
        message: "groupId must be a positive integer.",
      });
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      removeUploadedFile(req.file);
      return res.status(404).json({
        success: false,
        message: "Group not found.",
      });
    }

    const membership = await findMembership(userId, groupId);
    if (!canAccessGroup({ role: req.user?.role }, Boolean(membership))) {
      removeUploadedFile(req.file);
      return res.status(403).json({
        success: false,
        message: "You must be a member of this group to upload files.",
      });
    }

    const file = await prisma.file.create({
      data: {
        fileName: req.file.originalname,
        fileUrl: `/uploads/${path.basename(req.file.filename)}`,
        mimeType: req.file.mimetype,
        uploadedBy: userId,
        groupId,
      },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            rollNo: true,
            role: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "File uploaded successfully.",
      data: file,
    });
  } catch (error) {
    removeUploadedFile(req.file);
    return res.status(500).json({
      success: false,
      message: "Failed to upload file.",
      error: error.message,
    });
  }
};

const getGroupFiles = async (req, res) => {
  try {
    const userId = req.user?.id;
    const groupId = parseGroupId(req.params.groupId);

    if (userId == null) {
      return res.status(401).json({
        success: false,
        message: "User could not be authenticated.",
      });
    }

    if (groupId == null) {
      return res.status(400).json({
        success: false,
        message: "groupId must be a positive integer.",
      });
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found.",
      });
    }

    const membership = await findMembership(userId, groupId);
    if (!canAccessGroup({ role: req.user?.role }, Boolean(membership))) {
      return res.status(403).json({
        success: false,
        message: "You must be a member of this group to view files.",
      });
    }

    const files = await prisma.file.findMany({
      where: { groupId },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            rollNo: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Files fetched successfully.",
      data: files,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch files.",
      error: error.message,
    });
  }
};

const deleteFile = async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (userId == null) {
      return res.status(401).json({
        success: false,
        message: "User could not be authenticated.",
      });
    }

    const fileId = parsePositiveInt(req.params.id);

    if (fileId == null) {
      return res.status(400).json({
        success: false,
        message: "File id must be a positive integer.",
      });
    }

    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: "File not found.",
      });
    }

    if (!canDeleteFile({ id: userId, role }, file)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete this file.",
      });
    }

    await prisma.file.delete({
      where: { id: fileId },
    });

    removeStoredFile(file.fileUrl);

    const io = req.app.get("io");
    if (io) {
      io.to(String(file.groupId)).emit("file_deleted", {
        id: file.id,
        groupId: file.groupId,
        fileUrl: file.fileUrl,
      });
    }

    return res.status(200).json({
      success: true,
      message: "File deleted successfully.",
      data: {
        id: file.id,
        groupId: file.groupId,
        fileUrl: file.fileUrl,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete file.",
      error: error.message,
    });
  }
};

module.exports = {
  uploadFile,
  getGroupFiles,
  deleteFile,
};
