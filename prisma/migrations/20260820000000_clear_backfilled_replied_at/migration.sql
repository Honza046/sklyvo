-- Dashboard reply metrics = inbox sync only, not CRM status backfill.
UPDATE "Lead" SET "repliedAt" = NULL WHERE "repliedAt" IS NOT NULL;
