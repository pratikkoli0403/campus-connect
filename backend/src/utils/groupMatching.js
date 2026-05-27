const YEAR_SUFFIXES = {
  1: "FY",
  2: "SY",
  3: "TY",
  4: "BE",
};

const YEAR_BY_SUFFIX = {
  FY: 1,
  SY: 2,
  TY: 3,
  BE: 4,
};

function normalizeBranch(branch) {
  if (typeof branch !== "string") {
    return null;
  }
  const trimmed = branch.trim();
  return trimmed === "" ? null : trimmed.toUpperCase();
}

function normalizeYear(year) {
  if (year === undefined || year === null || year === "") {
    return null;
  }

  if (typeof year === "string") {
    const trimmed = year.trim();
    const suffixYear = YEAR_BY_SUFFIX[trimmed.toUpperCase()];
    if (suffixYear != null) {
      return suffixYear;
    }
    const parsed = Number(trimmed);
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= 4
      ? parsed
      : null;
  }

  const parsed = Number(year);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 4
    ? parsed
    : null;
}

function buildGroupName(branch, year) {
  const normalizedBranch = normalizeBranch(branch);
  const normalizedYear = normalizeYear(year);
  const suffix = YEAR_SUFFIXES[normalizedYear];
  if (!normalizedBranch || !suffix) {
    return null;
  }
  return `${normalizedBranch}-${suffix}`;
}

async function findMatchingGroup(prisma, branch, year) {
  const normalizedBranch = normalizeBranch(branch);
  const normalizedYear = normalizeYear(year);

  if (!normalizedBranch || normalizedYear == null) {
    return null;
  }

  const byBranchYear = await prisma.group.findFirst({
    where: {
      branch: { equals: normalizedBranch, mode: "insensitive" },
      year: normalizedYear,
    },
  });

  if (byBranchYear) {
    return byBranchYear;
  }

  const groupName = buildGroupName(normalizedBranch, normalizedYear);
  if (!groupName) {
    return null;
  }

  return prisma.group.findFirst({
    where: {
      name: { equals: groupName, mode: "insensitive" },
    },
  });
}

module.exports = {
  buildGroupName,
  findMatchingGroup,
  normalizeBranch,
  normalizeYear,
};
