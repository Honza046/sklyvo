ALTER TABLE "RadarSettings" ADD COLUMN IF NOT EXISTS "minCompaniesPerRun" INTEGER NOT NULL DEFAULT 20;
UPDATE "RadarSettings" SET "resultsPerQuery" = GREATEST("resultsPerQuery", 20) WHERE "resultsPerQuery" < 20;
