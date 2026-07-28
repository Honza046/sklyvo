/**
 * One-off: všichni autoři = Jan Sedlář, 3 autopůjčovny = Filip Retzl.
 * Run: node --env-file=.env scripts/backfill-crm-authors.mjs
 */
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const FILIP_COMPANIES = [
  "Autopůjčovna Praha s.r.o",
  "Autopůjčovna Praha",
];

async function main() {
  const rentals = await prisma.lead.findMany({
    where: {
      companyName: { contains: "Autopůjčovna", mode: "insensitive" },
    },
    select: { id: true, companyName: true, author: true },
    orderBy: { createdAt: "desc" },
  });
  console.log("Autopůjčovny found:", rentals.length, rentals.map((r) => r.companyName));

  // Prefer exact/known names; otherwise take up to 3 most recent Autopůjčovna*
  const filipIds = new Set();
  for (const name of FILIP_COMPANIES) {
    const hit = rentals.find(
      (r) => r.companyName.toLowerCase() === name.toLowerCase(),
    );
    if (hit) filipIds.add(hit.id);
  }
  if (filipIds.size < 3) {
    for (const r of rentals) {
      if (filipIds.size >= 3) break;
      filipIds.add(r.id);
    }
  }

  const jan = await prisma.lead.updateMany({
    data: { author: "Jan Sedlář" },
  });
  console.log("Set all authors to Jan Sedlář:", jan.count);

  let filip = 0;
  for (const id of filipIds) {
    await prisma.lead.update({
      where: { id },
      data: { author: "Filip Retzl" },
    });
    filip += 1;
  }
  const filipRows = await prisma.lead.findMany({
    where: { id: { in: [...filipIds] } },
    select: { companyName: true, author: true },
  });
  console.log("Set Filip on", filip, "leads:", filipRows);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
