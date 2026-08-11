-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "deviceId" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "organizationId" TEXT;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
