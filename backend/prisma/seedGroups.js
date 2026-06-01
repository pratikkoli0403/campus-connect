const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const prisma = new PrismaClient();

const BRANCHES = ["IT", "CS", "ECE", "CIVIL", "MECH", "BIOMED"];
const YEARS = [
  { year: 1, suffix: "FY" },
  { year: 2, suffix: "SY" },
  { year: 3, suffix: "TY" },
  { year: 4, suffix: "BE" },
];

function buildGroupName(branch, suffix) {
  return `${branch}-${suffix}`;
}

async function seedGroups() {
  const summary = {
    created: 0,
    existing: 0,
    updated: 0,
  };

  for (const branch of BRANCHES) {
    for (const { year, suffix } of YEARS) {
      const name = buildGroupName(branch, suffix);

      const existingGroup = await prisma.group.findFirst({
        where: {
          OR: [
            {
              branch: { equals: branch, mode: "insensitive" },
              year,
            },
            {
              name: { equals: name, mode: "insensitive" },
            },
          ],
        },
      });

      if (!existingGroup) {
        await prisma.group.create({
          data: {
            name,
            branch,
            year,
          },
        });
        summary.created += 1;
        continue;
      }

      if (
        existingGroup.name !== name ||
        existingGroup.branch !== branch ||
        existingGroup.year !== year
      ) {
        await prisma.group.update({
          where: { id: existingGroup.id },
          data: {
            name,
            branch,
            year,
          },
        });
        summary.updated += 1;
        continue;
      }

      summary.existing += 1;
    }
  }

  return summary;
}

seedGroups()
  .then((summary) => {
    console.log("CampusConnect group seed completed.");
    console.log(`Created: ${summary.created}`);
    console.log(`Updated: ${summary.updated}`);
    console.log(`Existing: ${summary.existing}`);
  })
  .catch((error) => {
    console.error("CampusConnect group seed failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
