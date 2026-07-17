const fs = require("fs");
const path = require("path");
const prisma = require("../config/prisma");
const { uploadDir } = require("../middleware/upload.middleware");
const {
  FACULTY_ROLES,
  canDeleteMessage,
} = require("../utils/permissions");

function parsePositiveInt(raw) {
  if (raw === undefined || raw === null || raw === "") {
    return null;
  }

  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function removeAttachedFile(fileUrl) {
  if (!fileUrl || typeof fileUrl !== "string") return;

  const basename = path.basename(fileUrl);
  if (!basename || basename === "." || basename === "..") return;

  const filePath = path.join(uploadDir, basename);
  fs.unlink(filePath, (error) => {
    if (error && error.code !== "ENOENT") {
      console.error("Failed to delete message attachment:", error.message);
    }
  });
}

const getGroupMessages = async (req, res) => {
  try {
    const { groupId: rawGroupId } = req.params;

    if (rawGroupId === undefined || rawGroupId === null || rawGroupId === "") {
      return res.status(400).json({
        success: false,
        message: "groupId is required.",
      });
    }

    const groupId = Number(rawGroupId);

    if (!Number.isInteger(groupId) || groupId < 1) {
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

    const messages = await prisma.message.findMany({
      where: { groupId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            rollNo: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Messages fetched successfully.",
      data: messages,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch messages.",
      error: error.message,
    });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (userId == null) {
      return res.status(401).json({
        success: false,
        message: "User could not be authenticated.",
      });
    }

    const messageId = parsePositiveInt(req.params.id);

    if (messageId == null) {
      return res.status(400).json({
        success: false,
        message: "Message id must be a positive integer.",
      });
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found.",
      });
    }

    let isGroupMember = false;

    if (FACULTY_ROLES.has(role)) {
      const membership = await prisma.groupMember.findFirst({
        where: {
          userId,
          groupId: message.groupId,
        },
        select: { id: true },
      });
      isGroupMember = Boolean(membership);
    }

    if (!canDeleteMessage({ id: userId, role }, message, isGroupMember)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete this message.",
      });
    }

    await prisma.message.delete({
      where: { id: messageId },
    });

    if (message.fileUrl) {
      removeAttachedFile(message.fileUrl);

      try {
        await prisma.file.deleteMany({
          where: {
            fileUrl: message.fileUrl,
            groupId: message.groupId,
          },
        });
      } catch (fileError) {
        console.error(
          "Failed to remove file record for deleted message:",
          fileError.message
        );
      }
    }

    const io = req.app.get("io");
    if (io) {
      io.to(String(message.groupId)).emit("message_deleted", {
        id: message.id,
        groupId: message.groupId,
        fileUrl: message.fileUrl ?? null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Message deleted successfully.",
      data: {
        id: message.id,
        groupId: message.groupId,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete message.",
      error: error.message,
    });
  }
};

module.exports = {
  getGroupMessages,
  deleteMessage,
};
