/*
  Warnings:

  - You are about to drop the column `addressDetails` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `batteryLevel` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `floor` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `installedBy` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `lastSeen` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `serialNumber` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `ownerName` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `ownerPhone` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `aiMessage` on the `WaterCamera` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Incident` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `WaterCamera` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_organizationId_fkey";

-- AlterTable
ALTER TABLE "Device" DROP COLUMN "addressDetails",
DROP COLUMN "batteryLevel",
DROP COLUMN "floor",
DROP COLUMN "installedBy",
DROP COLUMN "lastSeen",
DROP COLUMN "serialNumber";

-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Organization" DROP COLUMN "ownerName",
DROP COLUMN "ownerPhone";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "fullName" DROP NOT NULL,
ALTER COLUMN "role" DROP DEFAULT;

-- AlterTable
ALTER TABLE "WaterCamera" DROP COLUMN "aiMessage",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
