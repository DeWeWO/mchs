const prisma = require('../config/db');
const { DEVICE_STATUSES } = require('../constants/enums');

const CHECK_INTERVAL_MS = Number(process.env.DEVICE_OFFLINE_CHECK_INTERVAL_MS) || 60 * 1000;
const OFFLINE_AFTER_MS = Number(process.env.DEVICE_OFFLINE_AFTER_MS) || 5 * 60 * 1000;

const startOfflineDeviceService = (io) => {
    setInterval(async () => {
        const cutoff = new Date(Date.now() - OFFLINE_AFTER_MS);

        try {
            const staleDevices = await prisma.device.findMany({
                where: {
                    status: { not: DEVICE_STATUSES.OFFLINE },
                    lastSeen: { lt: cutoff }
                }
            });

            if (staleDevices.length === 0) return;

            await prisma.device.updateMany({
                where: {
                    id: { in: staleDevices.map((device) => device.id) }
                },
                data: { status: DEVICE_STATUSES.OFFLINE }
            });

            staleDevices.forEach((device) => {
                io?.emit('device-update', {
                    ...device,
                    status: DEVICE_STATUSES.OFFLINE,
                    updatedAt: new Date()
                });
            });
        } catch (error) {
            console.error('[OFFLINE_CHECK] Failed:', error.message);
        }
    }, CHECK_INTERVAL_MS);
};

module.exports = startOfflineDeviceService;
