const bcrypt = require("bcrypt");
const crypto = require("crypto");
const path = require("path");
const XLSX = require("xlsx");
const { Prisma } = require("@prisma/client");
const prisma = require("../config/prisma");
const {
  buildGroupName,
  normalizeBranch,
  normalizeYear,
} = require("../utils/groupMatching");

const REQUIRED_FIELDS = ["name", "rollNo", "branch", "year"];
const USER_SELECT = {
  id: true,
  name: true,
  rollNo: true,
  role: true,
  branch: true,
  year: true,
};

function normalizeHeader(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function generateTemporaryPassword() {
  return `CC-${crypto.randomBytes(4).toString("hex")}`;
}

function parseRowsFromWorkbook(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  const workbook = XLSX.read(file.buffer, {
    type: "buffer",
    raw: false,
    cellDates: false,
  });

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) {
    throw new Error("The uploaded file does not contain a worksheet.");
  }

  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
  });

  if (rows.length === 0) {
    throw new Error(`${ext.toUpperCase().slice(1)} file is empty.`);
  }

  const headers = rows[0].map(normalizeHeader);
  const indexes = Object.fromEntries(
    REQUIRED_FIELDS.map((field) => [field, headers.indexOf(normalizeHeader(field))])
  );
  const missingFields = REQUIRED_FIELDS.filter((field) => indexes[field] === -1);

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(", ")}.`);
  }

  return rows.slice(1).map((row, index) => ({
    rowNumber: index + 2,
    name: String(row[indexes.name] ?? "").trim(),
    rollNo: String(row[indexes.rollNo] ?? "").trim(),
    branch: String(row[indexes.branch] ?? "").trim(),
    year: row[indexes.year],
  }));
}

async function buildGroupLookup() {
  const groups = await prisma.group.findMany({
    select: {
      id: true,
      name: true,
      branch: true,
      year: true,
    },
  });

  const lookup = new Map();
  for (const group of groups) {
    const normalizedBranch = normalizeBranch(group.branch);
    const normalizedYear = normalizeYear(group.year);
    const groupName = buildGroupName(normalizedBranch, normalizedYear);

    if (normalizedBranch && normalizedYear != null) {
      lookup.set(`${normalizedBranch}:${normalizedYear}`, group);
    }
    if (groupName) {
      lookup.set(groupName, group);
    }
    lookup.set(group.name.toUpperCase(), group);
  }

  return lookup;
}

function findGroupForStudent(groupLookup, branch, year) {
  const groupName = buildGroupName(branch, year);
  return (
    groupLookup.get(`${branch}:${year}`) ??
    (groupName ? groupLookup.get(groupName) : null) ??
    null
  );
}

async function importStudentsFromFile(file) {
  if (!file) {
    const error = new Error("Import file is required.");
    error.statusCode = 400;
    throw error;
  }

  let rows;
  try {
    rows = parseRowsFromWorkbook(file);
  } catch (error) {
    error.statusCode = 400;
    throw error;
  }
  const groupLookup = await buildGroupLookup();
  const seenRollNos = new Set();
  const summary = {
    importedCount: 0,
    skippedCount: 0,
    errors: [],
    importedStudents: [],
    credentials: [],
  };

  for (const row of rows) {
    const normalizedBranch = normalizeBranch(row.branch);
    const normalizedYear = normalizeYear(row.year);
    const rollNoKey = row.rollNo.toLowerCase();

    if (!row.name || !row.rollNo || !normalizedBranch || normalizedYear == null) {
      summary.skippedCount += 1;
      summary.errors.push({
        row: row.rowNumber,
        rollNo: row.rollNo || null,
        message: "name, rollNo, branch, and valid year are required.",
      });
      continue;
    }

    if (seenRollNos.has(rollNoKey)) {
      summary.skippedCount += 1;
      summary.errors.push({
        row: row.rowNumber,
        rollNo: row.rollNo,
        message: "Duplicate roll number in uploaded file.",
      });
      continue;
    }
    seenRollNos.add(rollNoKey);

    const existingUser = await prisma.user.findUnique({
      where: { rollNo: row.rollNo },
      select: { id: true },
    });

    if (existingUser) {
      summary.skippedCount += 1;
      continue;
    }

    const matchingGroup = findGroupForStudent(
      groupLookup,
      normalizedBranch,
      normalizedYear
    );
    const temporaryPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    try {
      const createdUser = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: row.name,
            rollNo: row.rollNo,
            password: hashedPassword,
            role: "STUDENT",
            branch: normalizedBranch,
            year: normalizedYear,
          },
          select: USER_SELECT,
        });

        if (matchingGroup) {
          await tx.groupMember.create({
            data: {
              userId: user.id,
              groupId: matchingGroup.id,
            },
          });
        }

        return user;
      });

      summary.importedCount += 1;
      summary.importedStudents.push({
        ...createdUser,
        group: matchingGroup
          ? {
              id: matchingGroup.id,
              name: matchingGroup.name,
              branch: matchingGroup.branch,
              year: matchingGroup.year,
            }
          : null,
      });
      summary.credentials.push({
        name: createdUser.name,
        rollNo: createdUser.rollNo,
        temporaryPassword,
        group: matchingGroup
          ? {
              id: matchingGroup.id,
              name: matchingGroup.name,
              branch: matchingGroup.branch,
              year: matchingGroup.year,
            }
          : null,
      });

      if (!matchingGroup) {
        summary.errors.push({
          row: row.rowNumber,
          rollNo: row.rollNo,
          message: "Student imported, but no matching group was found.",
        });
      }
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        summary.skippedCount += 1;
        continue;
      }

      summary.skippedCount += 1;
      summary.errors.push({
        row: row.rowNumber,
        rollNo: row.rollNo,
        message: error.message,
      });
    }
  }

  return summary;
}

module.exports = {
  importStudentsFromFile,
};
