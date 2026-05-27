const express = require("express");
const { getGroupMessages } = require("../controllers/message.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/:groupId", authMiddleware, getGroupMessages);

module.exports = router;
