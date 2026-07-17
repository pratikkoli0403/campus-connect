const express = require("express");
const {
  getGroupMessages,
  deleteMessage,
} = require("../controllers/message.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/:groupId", authMiddleware, getGroupMessages);
router.delete("/:id", authMiddleware, deleteMessage);

module.exports = router;
