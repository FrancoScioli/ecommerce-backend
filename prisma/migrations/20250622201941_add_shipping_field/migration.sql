/*
  Warnings:

  - You are about to drop the column `address` on the `Sale` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('TRANSFER', 'MERCADO_PAGO');

-- CreateEnum
CREATE TYPE "ShippingMethod" AS ENUM ('PICKUP', 'DELIVERY');

-- AlterTable
ALTER TABLE "Sale" DROP COLUMN "address",
ADD COLUMN     "shippingAddress" TEXT;
