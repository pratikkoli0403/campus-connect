const prisma = require("../config/prisma");

/** @type {Map<number, Set<string>>} */
const onlineUsers = new Map();

function getOnlineUserIds() {
  return [...onlineUsers.keys()].sort((a, b) => a - b);
}

function broadcastOnlineUsers(io) {
  io.emit("onlineUsers", getOnlineUserIds());
}

function addOnlineUser(io, socket, userId) {
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socket.id);
  socket.data.userId = userId;
  broadcastOnlineUsers(io);
}

function removeOnlineUser(io, socket) {
  const userId = socket.data.userId;
  if (userId == null) return;

  const sockets = onlineUsers.get(userId);
  if (sockets) {
    sockets.delete(socket.id);
    if (sockets.size === 0) {
      onlineUsers.delete(userId);
    }
  }
  delete socket.data.userId;
  broadcastOnlineUsers(io);
}

function parseTypingPayload(payload) {
  const { groupId: rawGroupId, userName, userId: rawUserId } = payload ?? {};
  const groupId = Number(rawGroupId);
  const userId =
    rawUserId != null && rawUserId !== ""
      ? Number(rawUserId)
      : null;

  if (!Number.isInteger(groupId) || groupId < 1) {
    return null;
  }

  if (userName == null || typeof userName !== "string" || !userName.trim()) {
    return null;
  }

  return {
    groupId,
    userName: userName.trim(),
    userId:
      userId != null && Number.isInteger(userId) && userId > 0 ? userId : null,
  };
}

function emitToGroupExceptSender(socket, groupId, event, data) {
  const room = String(groupId);
  socket.to(room).emit(event, data);
}

const setupChatSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.emit("onlineUsers", getOnlineUserIds());

    socket.on("registerUser", ({ userId: rawUserId }) => {
      const userId = Number(rawUserId);
      if (!Number.isInteger(userId) || userId < 1) {
        return;
      }

      if (socket.data.userId != null && socket.data.userId !== userId) {
        removeOnlineUser(io, socket);
      }

      addOnlineUser(io, socket, userId);
    });

    socket.on("joinGroup", ({ groupId }) => {
      if (groupId == null || groupId === "") {
        return;
      }

      const room = String(groupId);
      socket.join(room);
      console.log(`Socket ${socket.id} joined group room ${room}`);
    });

    socket.on("sendMessage", async (message) => {
      try {
        const { content, senderId: rawSenderId, groupId: rawGroupId } =
          message ?? {};

        if (
          content == null ||
          typeof content !== "string" ||
          content.trim() === ""
        ) {
          return;
        }

        if (rawSenderId == null || rawSenderId === "") {
          return;
        }

        if (rawGroupId == null || rawGroupId === "") {
          return;
        }

        const senderId = Number(rawSenderId);
        const groupId = Number(rawGroupId);

        if (!Number.isInteger(senderId) || senderId < 1) {
          return;
        }

        if (!Number.isInteger(groupId) || groupId < 1) {
          return;
        }

        const savedMessage = await prisma.message.create({
          data: {
            content: content.trim(),
            senderId,
            groupId,
          },
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
        });

        const room = String(groupId);
        io.to(room).emit("receiveMessage", savedMessage);
      } catch (error) {
        console.error("Failed to send message:", error.message);
      }
    });

    socket.on("typing", (payload) => {
      const data = parseTypingPayload(payload);
      if (!data) return;

      socket.data.typingGroupId = data.groupId;
      socket.data.userName = data.userName;
      if (data.userId != null) {
        socket.data.typingUserId = data.userId;
      }

      emitToGroupExceptSender(socket, data.groupId, "userTyping", data);
    });

    socket.on("stopTyping", (payload) => {
      const data = parseTypingPayload(payload);
      if (!data) return;

      delete socket.data.typingGroupId;
      delete socket.data.userName;
      delete socket.data.typingUserId;

      emitToGroupExceptSender(socket, data.groupId, "userStopTyping", data);
    });

    socket.on("disconnect", () => {
      if (socket.data.typingGroupId != null && socket.data.userName) {
        emitToGroupExceptSender(
          socket,
          socket.data.typingGroupId,
          "userStopTyping",
          {
            groupId: socket.data.typingGroupId,
            userName: socket.data.userName,
            userId: socket.data.typingUserId ?? socket.data.userId ?? null,
          }
        );
      }

      removeOnlineUser(io, socket);
      console.log("Socket disconnected:", socket.id);
    });
  });
};

module.exports = setupChatSocket;
