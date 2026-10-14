-- CreateEnum
CREATE TYPE "AuthenticityAssessment" AS ENUM ('LIKELY_GENUINE', 'NEEDS_REVIEW', 'POTENTIALLY_FAKE', 'UNABLE_TO_VERIFY');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "OrganizerDecisionStatus" AS ENUM ('PENDING', 'REVIEWED', 'APPROVED', 'INFO_REQUESTED', 'REJECTED');

-- CreateTable
CREATE TABLE "VendorVerification" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "assessment" "AuthenticityAssessment" NOT NULL DEFAULT 'UNABLE_TO_VERIFY',
    "score" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "reasons" TEXT[],
    "missingEvidence" TEXT[],
    "suspiciousIndicators" TEXT[],
    "checks" JSONB NOT NULL DEFAULT '[]',
    "extractedData" JSONB,
    "isStale" BOOLEAN NOT NULL DEFAULT false,
    "lastCheckedAt" TIMESTAMP(3),
    "lastCompletedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "decisionStatus" "OrganizerDecisionStatus" NOT NULL DEFAULT 'PENDING',
    "decisionReason" TEXT,
    "decisionAt" TIMESTAMP(3),
    "decidedByOrganizerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorVerificationAction" (
    "id" TEXT NOT NULL,
    "verificationId" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorVerificationAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorDocument" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT,
    "externalUrl" TEXT,
    "registrationNumber" TEXT,
    "issuingAuthority" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VendorVerification_vendorId_key" ON "VendorVerification"("vendorId");

-- AddForeignKey
ALTER TABLE "VendorVerification" ADD CONSTRAINT "VendorVerification_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorVerificationAction" ADD CONSTRAINT "VendorVerificationAction_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "VendorVerification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDocument" ADD CONSTRAINT "VendorDocument_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable Review: add missing columns and unique constraint
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "organizerId" TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "bookingId" TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);

-- Set updatedAt default for existing rows
UPDATE "Review" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
ALTER TABLE "Review" ALTER COLUMN "updatedAt" SET NOT NULL;

-- CreateIndex for bookingId unique
CREATE UNIQUE INDEX IF NOT EXISTS "Review_bookingId_key" ON "Review"("bookingId");

-- AddForeignKey for Review -> OrganizerProfile
ALTER TABLE "Review" ADD CONSTRAINT "Review_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "OrganizerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey for Review -> Booking
ALTER TABLE "Review" ADD CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: Add isActive to User (from deactivation migration, ensure idempotent)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: Add vendorId to Shortlist (if missing)
ALTER TABLE "Shortlist" ADD COLUMN IF NOT EXISTS "vendorId" TEXT;
