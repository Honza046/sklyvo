-- Full Auto schedule fields on RadarSettings
ALTER TABLE "RadarSettings" ADD COLUMN IF NOT EXISTS "fullAutoEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RadarSettings" ADD COLUMN IF NOT EXISTS "fullAutoFrequency" TEXT NOT NULL DEFAULT 'twice_weekly';
ALTER TABLE "RadarSettings" ADD COLUMN IF NOT EXISTS "fullAutoRunTime" TEXT NOT NULL DEFAULT '08:00';
ALTER TABLE "RadarSettings" ADD COLUMN IF NOT EXISTS "lastFullAutoRunAt" TIMESTAMP(3);
