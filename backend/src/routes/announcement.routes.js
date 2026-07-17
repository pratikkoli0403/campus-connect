const express = require("express");
const {
  createAnnouncement,
  getGroupAnnouncements,
  deleteAnnouncement,
} = require("../controllers/announcement.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/", authMiddleware, createAnnouncement);
router.get("/:groupId", authMiddleware, getGroupAnnouncements);
router.delete("/:id", authMiddleware, deleteAnnouncement);

module.exports = router;
