const prisma = require("../config/prisma");
const {
  canCreateAnnouncement,
  canDeleteAnnouncement,
  canAccessGroup,
} = require("../utils/permissions");
const { getUserGroupAccess } = require("../utils/groupAccess");
const { clampString, parsePositiveInt } = require("../utils/requestValidation");

function parseGroupId(rawGroupId) {
  return parsePositiveInt(rawGroupId);
}

const createAnnouncement = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (userId == null) {
      return res.status(401).json({
        success: false,
        message: "User could not be authenticated.",
      });
    }

    const { title, content, groupId: rawGroupId } = req.body;
    const groupId = parseGroupId(rawGroupId);

    if (!groupId) {
      return res.status(400).json({
        success: false,
        message: "groupId must be a positive integer.",
      });
    }

    const cleanTitle = clampString(title, 140);
    const cleanContent = clampString(content, 4000);

    if (!cleanTitle || !cleanContent) {
      return res.status(400).json({
        success: false,
        message: "Title and content are required.",
      });
    }

    const access = await getUserGroupAccess(userId, groupId);
    const { user, group, isGroupMember } = access;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user no longer exists.",
      });
    }

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found.",
      });
    }

    if (!canAccessGroup(user, isGroupMember)) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this group.",
      });
    }

    if (!canCreateAnnouncement(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only faculty or admins can create announcements.",
      });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title: cleanTitle,
        content: cleanContent,
        groupId,
        createdBy: user.id,
      },
      include: {
        creator: {
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
      message: "Announcement created successfully.",
      data: announcement,
    });
  } catch (error) {
    console.error("Failed to create announcement:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to create announcement.",
    });
  }
};

const getGroupAnnouncements = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (userId == null) {
      return res.status(401).json({
        success: false,
        message: "User could not be authenticated.",
      });
    }

    const groupId = parseGroupId(req.params.groupId);

    if (!groupId) {
      return res.status(400).json({
        success: false,
        message: "groupId must be a positive integer.",
      });
    }

    const access = await getUserGroupAccess(userId, groupId);
    const { user, group, isGroupMember } = access;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user no longer exists.",
      });
    }

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found.",
      });
    }

    if (!canAccessGroup(user, isGroupMember)) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this group.",
      });
    }

    const announcements = await prisma.announcement.findMany({
      where: { groupId },
      include: {
        creator: {
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
      message: "Announcements fetched successfully.",
      data: announcements,
    });
  } catch (error) {
    console.error("Failed to fetch announcements:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch announcements.",
    });
  }
};

const deleteAnnouncement = async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (userId == null) {
      return res.status(401).json({
        success: false,
        message: "User could not be authenticated.",
      });
    }

    const announcementId = parsePositiveInt(req.params.id);

    if (announcementId == null) {
      return res.status(400).json({
        success: false,
        message: "Announcement id must be a positive integer.",
      });
    }

    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
    });

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found.",
      });
    }

    const access = await getUserGroupAccess(userId, announcement.groupId);
    if (!access.user || !access.canAccess) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this group.",
      });
    }

    if (!canDeleteAnnouncement({ id: userId, role }, announcement)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete this announcement.",
      });
    }

    await prisma.announcement.delete({
      where: { id: announcementId },
    });

    const io = req.app.get("io");
    if (io) {
      io.to(String(announcement.groupId)).emit("announcement_deleted", {
        id: announcement.id,
        groupId: announcement.groupId,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Announcement deleted successfully.",
      data: {
        id: announcement.id,
        groupId: announcement.groupId,
      },
    });
  } catch (error) {
    console.error("Failed to delete announcement:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to delete announcement.",
    });
  }
};

module.exports = {
  createAnnouncement,
  getGroupAnnouncements,
  deleteAnnouncement,
};
