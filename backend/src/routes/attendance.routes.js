const express = require("express");
const {
  getMyAttendance,
  updateAttendance,
} = require("../controllers/attendance.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/me", authMiddleware, getMyAttendance);
router.patch("/:userId", authMiddleware, updateAttendance);

module.exports = router;
