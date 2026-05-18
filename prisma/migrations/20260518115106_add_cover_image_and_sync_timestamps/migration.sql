-- AlterTable
ALTER TABLE "PricingConfig" ADD COLUMN     "zecatLastDetailSyncAt" TIMESTAMP(3),
ADD COLUMN     "zecatLastFastSyncAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "coverImageId" INTEGER;
