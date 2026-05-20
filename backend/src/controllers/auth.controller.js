const bcrypt = require("bcrypt");
const prisma = require("../config/prisma");

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

    const user = await prisma.user.create({
      data: {
        name,
        rollNo,
        password: hashedPassword,
        role,
        branch,
        year,
      },
      select: {
        id: true,
        name: true,
        rollNo: true,
        role: true,
        branch: true,
        year: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully.",
      data: user,
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

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        id: user.id,
        name: user.name,
        rollNo: user.rollNo,
        role: user.role,
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