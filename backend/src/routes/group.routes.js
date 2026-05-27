const express = require("express");
const {
  createGroup,
  getAllGroups,
  getMyGroups,
  joinGroup,
  getGroupMembers,
} = require("../controllers/group.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/", authMiddleware, createGroup);
router.get("/my-groups", authMiddleware, getMyGroups);
router.get("/:groupId/members", authMiddleware, getGroupMembers);
router.get("/", authMiddleware, getAllGroups);
router.post("/join", authMiddleware, joinGroup);

module.exports = router;
