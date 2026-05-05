-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "lockImage" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lockName" BOOLEAN NOT NULL DEFAULT false;
