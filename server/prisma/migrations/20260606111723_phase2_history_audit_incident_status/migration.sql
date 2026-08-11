-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED', 'FALSE_ALARM');

-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "resolvedBy" TEXT,
ADD COLUMN     "status" "IncidentStatus" NOT NULL DEFAULT 'NEW';

-- CreateTable
CREATE TABLE "DeviceReading" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "gasLevel" DOUBLE PRECISION,
    "methaneLevel" DOUBLE PRECISION,
    "quakeMagnitude" DOUBLE PRECISION,
    "smokeDetected" BOOLEAN,
    "batteryLevel" INTEGER,
    "temperature" DOUBLE PRECISION,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "username" TEXT,
    "role" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeviceReading_deviceId_idx" ON "DeviceReading"("deviceId");

-- CreateIndex
CREATE INDEX "DeviceReading_createdAt_idx" ON "DeviceReading"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "DeviceReading" ADD CONSTRAINT "DeviceReading_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
