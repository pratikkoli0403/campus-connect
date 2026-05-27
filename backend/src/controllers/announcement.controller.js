const prisma = require("../config/prisma");

const ANNOUNCEMENT_AUTHOR_ROLES = new Set(["ADMIN", "FACULTY", "TEACHER"]);

function canCreateAnnouncement(role) {
  return ANNOUNCEMENT_AUTHOR_ROLES.has(role);
}

function parseGroupId(rawGroupId) {
  if (rawGroupId === undefined || rawGroupId === null || rawGroupId === "") {
    return null;
  }

  const groupId = Number(rawGroupId);
  return Number.isInteger(groupId) && groupId > 0 ? groupId : null;
}

async function getUserAccess(userId, groupId) {
  const [user, group, membership] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        rollNo: true,
        role: true,
      },
    }),
    prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true },
    }),
    prisma.groupMember.findFirst({
      where: {
        userId,
        groupId,
      },
      select: { id: true },
    }),
  ]);

  return {
    user,
    group,
    isGroupMember: Boolean(membership),
  };
}

function canAccessGroup(user, isGroupMember) {
  return user?.role === "ADMIN" || isGroupMember;
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

    const cleanTitle = typeof title === "string" ? title.trim() : "";
    const cleanContent = typeof content === "string" ? content.trim() : "";

    if (!cleanTitle || !cleanContent) {
      return res.status(400).json({
        success: false,
        message: "Title and content are required.",
      });
    }

    const { user, group, isGroupMember } = await getUserAccess(userId, groupId);

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
    return res.status(500).json({
      success: false,
      message: "Failed to create announcement.",
      error: error.message,
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

    const { user, group, isGroupMember } = await getUserAccess(userId, groupId);

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
    return res.status(500).json({
      success: false,
      message: "Failed to fetch announcements.",
      error: error.message,
    });
  }
};

module.exports = {
  createAnnouncement,
  getGroupAnnouncements,
};
