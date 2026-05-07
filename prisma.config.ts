import "dotenv/config";

// Prisma 5 setup without `prisma/config` helper.
const prismaConfig = {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
};

export default prismaConfig;
