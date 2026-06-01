const bcrypt = require("bcrypt");
const prisma = require("../config/prisma");
const jwt = require("jsonwebtoken");
const {
  findMatchingGroup,
  normalizeBranch,
  normalizeYear,
} = require("../utils/groupMatching");

const registerUser = async (req, res) => {
  try {
    const { name, rollNo, password, role, branch, year } = req.body;

    if (!name || !rollNo || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Name, rollNo, password, and role are required.",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { rollNo },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists with this roll number.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const normalizedBranch = normalizeBranch(branch);
    const normalizedYear = normalizeYear(year);

    if (role === "STUDENT" && (!normalizedBranch || normalizedYear == null)) {
      return res.status(400).json({
        success: false,
        message: "Branch and year are required for student registration.",
      });
    }

    const matchingGroup = await findMatchingGroup(
      prisma,
      normalizedBranch,
      normalizedYear
    );

    const userSelect = {
      id: true,
      name: true,
      rollNo: true,
      role: true,
      branch: true,
      year: true,
      attendancePercentage: true,
      createdAt: true,
    };

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name,
          rollNo,
          password: hashedPassword,
          role,
          branch: normalizedBranch,
          year: normalizedYear,
        },
        select: userSelect,
      });

      if (matchingGroup) {
        await tx.groupMember.create({
          data: {
            userId: createdUser.id,
            groupId: matchingGroup.id,
          },
        });
      }

      return createdUser;
    });

    return res.status(201).json({
      success: true,
      message: matchingGroup
        ? "User registered successfully and added to your class group."
        : "User registered successfully.",
      data: user,
      ...(matchingGroup && {
        group: {
          id: matchingGroup.id,
          name: matchingGroup.name,
          branch: matchingGroup.branch,
          year: matchingGroup.year,
        },
      }),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to register user.",
      error: error.message,
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { rollNo, password } = req.body;

    if (!rollNo || !password) {
      return res.status(400).json({
        success: false,
        message: "Roll number and password are required.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { rollNo },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid roll number or password.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid roll number or password.",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        rollNo: user.rollNo,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );
    
    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      data: {
        id: user.id,
        name: user.name,
        rollNo: user.rollNo,
        role: user.role,
        attendancePercentage: user.attendancePercentage,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to login user.",
      error: error.message,
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
};
