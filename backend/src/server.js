const http = require("http");
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");
require("dotenv").config();

const pool = require("./config/db");
const authRoutes = require("./routes/auth.routes");
const groupRoutes = require("./routes/group.routes");
const messageRoutes = require("./routes/message.routes");
const authMiddleware = require("./middleware/auth.middleware");
const setupChatSocket = require("./sockets/chat.socket");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("new backend active");
});

app.use("/api/auth", authRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/messages", messageRoutes);

app.get("/api/protected", authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: "Protected route accessed",
    user: req.user,
  });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

setupChatSocket(io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});