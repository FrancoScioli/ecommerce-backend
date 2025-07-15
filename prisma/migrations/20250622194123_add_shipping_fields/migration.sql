/*
  Warnings:

  - Added the required column `deliveryMethod` to the `Sale` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "address" TEXT,
ADD COLUMN     "deliveryMethod" TEXT NOT NULL,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "shippingCost" DOUBLE PRECISION;
