-- Onboarding tour: nový sloupec; existující účty považujeme za již seznámené
ALTER TABLE "User" ADD COLUMN "onboardingTourCompleted" BOOLEAN NOT NULL DEFAULT false;
UPDATE "User" SET "onboardingTourCompleted" = true;
