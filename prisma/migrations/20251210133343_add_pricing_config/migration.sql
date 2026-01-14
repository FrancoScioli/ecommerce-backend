-- CreateTable
CREATE TABLE "PricingConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "providerMarkupPercent" DECIMAL(65,30) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingConfig_pkey" PRIMARY KEY ("id")
);
