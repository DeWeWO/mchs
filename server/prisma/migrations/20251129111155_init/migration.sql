/*
  Warnings:

  - The primary key for the `Device` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `batteryLevel` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `isOnline` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `lastSeen` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `serialNumber` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Device` table. All the data in the column will be lost.
  - The primary key for the `Organization` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the `Incident` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SensorReading` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WaterLog` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `updatedAt` to the `Device` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Organization` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `role` on the `User` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "Device" DROP CONSTRAINT "Device_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "SensorReading" DROP CONSTRAINT "SensorReading_deviceId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "WaterLog" DROP CONSTRAINT "WaterLog_deviceId_fkey";

-- DropIndex
DROP INDEX "Device_serialNumber_key";

-- AlterTable
ALTER TABLE "Device" DROP CONSTRAINT "Device_pkey",
DROP COLUMN "batteryLevel",
DROP COLUMN "isOnline",
DROP COLUMN "lastSeen",
DROP COLUMN "serialNumber",
DROP COLUMN "status",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "organizationId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Device_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Device_id_seq";

-- AlterTable
ALTER TABLE "Organization" DROP CONSTRAINT "Organization_pkey",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "address" DROP NOT NULL,
ADD CONSTRAINT "Organization_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Organization_id_seq";

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
DROP COLUMN "role",
ADD COLUMN     "role" TEXT NOT NULL,
ALTER COLUMN "organizationId" SET DATA TYPE TEXT,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "User_id_seq";

-- DropTable
DROP TABLE "Incident";

-- DropTable
DROP TABLE "SensorReading";

-- DropTable
DROP TABLE "WaterLog";

-- DropEnum
DROP TYPE "Role";

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
