const prisma = require("../config/prisma");

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

module.exports = {
  getGroupMessages,
};
