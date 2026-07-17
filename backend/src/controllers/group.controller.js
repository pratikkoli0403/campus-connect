const prisma = require("../config/prisma");
const { normalizeBranch, normalizeYear } = require("../utils/groupMatching");
const { canViewMemberAttendance } = require("../utils/permissions");

const createGroup = async (req, res) => {
  try {
    const { name, branch, year } = req.body;

    const normalizedBranch = normalizeBranch(branch);
    const normalizedYear = normalizeYear(year);

    if (!name || !normalizedBranch || normalizedYear == null) {
      return res.status(400).json({
        success: false,
        message: "Name, branch, and year are required.",
      });
    }

    const group = await prisma.group.create({
      data: {
        name: typeof name === "string" ? name.trim() : name,
        branch: normalizedBranch,
        year: normalizedYear,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Group created successfully.",
      data: group,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create group.",
      error: error.message,
    });
  }
};

const getAllGroups = async (req, res) => {
  try {
    const groups = await prisma.group.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Groups fetched successfully.",
      data: groups,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch groups.",
      error: error.message,
    });
  }
};

const getMyGroups = async (req, res) => {
  try {
    const userId = req.user.id;

    const groups = await prisma.group.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Your groups fetched successfully.",
      data: groups,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch your groups.",
      error: error.message,
    });
  }
};

const joinGroup = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (userId == null) {
      return res.status(401).json({
        success: false,
        message: "User could not be authenticated.",
      });
    }

    const { groupId: rawGroupId } = req.body;

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

    const existingMembership = await prisma.groupMember.findFirst({
      where: {
        userId,
        groupId,
      },
    });

    if (existingMembership) {
      return res.status(409).json({
        success: false,
        message: "You are already a member of this group.",
      });
    }

    const membership = await prisma.groupMember.create({
      data: {
        userId,
        groupId,
      },
      include: {
        group: true,
        user: {
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
      message: "Joined group successfully.",
      data: membership,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to join group.",
      error: error.message,
    });
  }
};

const getGroupMembers = async (req, res) => {
  try {
    const groupId = Number(req.params.groupId);
    const canViewAttendance = canViewMemberAttendance(req.user?.role);

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

    const memberships = await prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            rollNo: true,
            role: true,
            ...(canViewAttendance && { attendancePercentage: true }),
          },
        },
      },
      orderBy: {
        user: { name: "asc" },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Group members fetched successfully.",
      data: memberships.map((m) => m.user),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch group members.",
      error: error.message,
    });
  }
};

module.exports = {
  createGroup,
  getAllGroups,
  getMyGroups,
  joinGroup,
  getGroupMembers,
};
