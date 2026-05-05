-- AlterTable
ALTER TABLE "PricingConfig" ADD COLUMN     "featuredCategoryIds" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "featuredProductIds" JSONB NOT NULL DEFAULT '[]';
