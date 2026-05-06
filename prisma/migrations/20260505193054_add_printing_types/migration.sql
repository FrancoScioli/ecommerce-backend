-- CreateTable
CREATE TABLE "PrintingType" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "setupPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minUnits" INTEGER NOT NULL DEFAULT 1,
    "baseTime" INTEGER NOT NULL DEFAULT 0,
    "occupation" INTEGER NOT NULL DEFAULT 0,
    "dayFactor" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "PrintingType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrintingType_productId_externalId_key" ON "PrintingType"("productId", "externalId");

-- AddForeignKey
ALTER TABLE "PrintingType" ADD CONSTRAINT "PrintingType_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
