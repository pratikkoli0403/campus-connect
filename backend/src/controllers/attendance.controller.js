const prisma = require("../config/prisma");
const { canUpdateAttendance, isAdmin } = require("../utils/permissions");

function parseUserId(rawUserId) {
  const userId = Number(rawUserId);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

function parseAttendancePercentage(value) {
  const percentage = Number(value);
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
    return null;
  }

  return Math.round(percentage * 100) / 100;
}

const getMyAttendance = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (userId == null) {
      return res.status(401).json({
        success: false,
        message: "User could not be authenticated.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        rollNo: true,
        role: true,
        attendancePercentage: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Attendance fetched successfully.",
      data: user,
    });
  } catch (error) {
    console.error("Failed to fetch attendance:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch attendance.",
    });
  }
};

const updateAttendance = async (req, res) => {
  try {
    if (!canUpdateAttendance(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: "Only admins or faculty can update attendance.",
      });
    }

    const userId = parseUserId(req.params.userId);
    if (userId == null) {
      return res.status(400).json({
        success: false,
        message: "userId must be a positive integer.",
      });
    }

    const attendancePercentage = parseAttendancePercentage(
      req.body.attendancePercentage
    );
    if (attendancePercentage == null) {
      return res.status(400).json({
        success: false,
        message: "attendancePercentage must be a number between 0 and 100.",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        groups: {
          select: {
            groupId: true,
          },
        },
      },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (existingUser.role !== "STUDENT") {
      return res.status(403).json({
        success: false,
        message: "Attendance can only be updated for student accounts.",
      });
    }

    if (!isAdmin(req.user?.role)) {
      const updaterMembership = await prisma.groupMember.findFirst({
        where: {
          userId: req.user.id,
          groupId: {
            in: existingUser.groups.map((membership) => membership.groupId),
          },
        },
        select: { id: true },
      });

      if (!updaterMembership) {
        return res.status(403).json({
          success: false,
          message: "You can only update attendance for students in your groups.",
        });
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { attendancePercentage },
      select: {
        id: true,
        name: true,
        rollNo: true,
        role: true,
        attendancePercentage: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Attendance updated successfully.",
      data: user,
    });
  } catch (error) {
    console.error("Failed to update attendance:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to update attendance.",
    });
  }
};

module.exports = {
  getMyAttendance,
  updateAttendance,
};
