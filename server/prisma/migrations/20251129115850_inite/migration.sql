/*
  Warnings:

  - You are about to drop the column `installationData` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Device` table. All the data in the column will be lost.
  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Made the column `fullName` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MCHS_USER', 'ORG_OPERATOR');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('ONLINE', 'OFFLINE', 'WARNING', 'DANGER');

-- DropForeignKey
ALTER TABLE "Device" DROP CONSTRAINT "Device_organizationId_fkey";

-- AlterTable
ALTER TABLE "Device" DROP COLUMN "installationData",
DROP COLUMN "type",
ADD COLUMN     "addressDetails" TEXT,
ADD COLUMN     "batteryLevel" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "floor" INTEGER,
ADD COLUMN     "gasLevel" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "installedBy" TEXT,
ADD COLUMN     "isGlobalAlert" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "methaneLevel" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "quakeMagnitude" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "serialNumber" TEXT,
ADD COLUMN     "smokeDetected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" "DeviceStatus" NOT NULL DEFAULT 'OFFLINE',
ALTER COLUMN "lat" DROP NOT NULL,
ALTER COLUMN "lng" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "ownerName" TEXT,
ADD COLUMN     "ownerPhone" TEXT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "fullName" SET NOT NULL,
DROP COLUMN "role",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'ORG_OPERATOR';

-- CreateTable
CREATE TABLE "WaterCamera" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "streamUrl" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "aiMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaterCamera_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
