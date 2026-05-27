-- AlterEnum
ALTER TYPE "Source" ADD VALUE 'IMPROM';

-- AlterTable
ALTER TABLE "PricingConfig" ADD COLUMN     "impromLastSyncAt" TIMESTAMP(3),
ADD COLUMN     "impromMarkupPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "impromSyncIntervalHours" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN     "legendImpromPersonal" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "legendUsdPrice" TEXT NOT NULL DEFAULT '';
