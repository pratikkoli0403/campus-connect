const fs = require("fs");
const path = require("path");
const prisma = require("../config/prisma");

function parseGroupId(rawGroupId) {
  const groupId = Number(rawGroupId);
  return Number.isInteger(groupId) && groupId > 0 ? groupId : null;
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
    if (!membership) {
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
    if (!membership) {
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

module.exports = {
  uploadFile,
  getGroupFiles,
};
