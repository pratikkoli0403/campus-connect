const prisma = require("../config/prisma");
const { canAccessGroup } = require("./permissions");

async function getUserGroupAccess(userId, groupId) {
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
      select: {
        id: true,
        name: true,
        branch: true,
        year: true,
      },
    }),
    prisma.groupMember.findFirst({
      where: {
        userId,
        groupId,
      },
      select: { id: true },
    }),
  ]);

  const isGroupMember = Boolean(membership);

  return {
    user,
    group,
    isGroupMember,
    canAccess: canAccessGroup(user, isGroupMember),
  };
}

module.exports = {
  getUserGroupAccess,
};
