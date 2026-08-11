const prisma = require('../config/db');
const { DEVICE_STATUSES, DEVICE_TYPES, ROLES } = require('../constants/enums');
const { createAuditLog } = require('../utils/auditLog');

const getAllDevices = async (req, res) => {
    try {
        const devices = await prisma.device.findMany({
            include: { organization: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(devices);
    } catch (e) {
        res.status(500).json({ error: 'Failed to load devices' });
    }
};

const createDevice = async (req, res) => {
    const { name, token, organizationId, lat, lng, floor, addressDetails, type } = req.body;
    const parsedLat = Number(lat ?? 0);
    const parsedLng = Number(lng ?? 0);

    if (!name || !Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
        return res.status(400).json({ error: 'name, lat and lng are required' });
    }

    const finalToken = token || `ESP32-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    try {
        const device = await prisma.device.create({
            data: {
                name,
                token: finalToken,
                organizationId: organizationId || null,
                lat: parsedLat,
                lng: parsedLng,
                floor: Number.parseInt(floor || 1, 10),
                addressDetails,
                type: type || DEVICE_TYPES.MULTI,
                installedBy: req.user?.username || 'system'
            }
        });
        await createAuditLog(req, {
            action: 'device.create',
            entity: 'Device',
            entityId: device.id,
            metadata: { name: device.name, organizationId: device.organizationId, type: device.type }
        });
        res.json(device);
    } catch (e) {
        res.status(500).json({ error: 'Failed to create device. Check token uniqueness.' });
    }
};

const updateDevice = async (req, res) => {
    const { id } = req.params;
    const { name, lat, lng, floor, addressDetails, organizationId, type } = req.body;
    const user = req.user;
    const parsedLat = Number(lat ?? 0);
    const parsedLng = Number(lng ?? 0);

    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
        return res.status(400).json({ error: 'lat and lng must be valid numbers' });
    }

    try {
        if (user.role === 'ORG_OPERATOR') {
            const device = await prisma.device.findUnique({
                where: { id },
                select: { organizationId: true }
            });

            if (!device) return res.status(404).json({ error: 'Device not found' });
            if (device.organizationId !== user.orgId) {
                return res.status(403).json({ error: 'No access to this device' });
            }

            const updated = await prisma.device.update({
                where: { id },
                data: {
                    name,
                    lat: parsedLat,
                    lng: parsedLng,
                    floor: Number.parseInt(floor || 1, 10) || null,
                    addressDetails: addressDetails || null
                }
            });
            await createAuditLog(req, {
                action: 'device.update',
                entity: 'Device',
                entityId: updated.id,
                metadata: { organizationId: updated.organizationId, type: updated.type }
            });
            return res.json(updated);
        }

        const updated = await prisma.device.update({
            where: { id },
            data: {
                name,
                lat: parsedLat,
                lng: parsedLng,
                floor: Number.parseInt(floor || 1, 10) || null,
                addressDetails: addressDetails || null,
                organizationId: organizationId || null,
                type: type || DEVICE_TYPES.MULTI
            }
        });
        await createAuditLog(req, {
            action: 'device.update',
            entity: 'Device',
            entityId: updated.id,
            metadata: { organizationId: updated.organizationId, type: updated.type }
        });
        res.json(updated);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to update device' });
    }
};

const deleteDevice = async (req, res) => {
    try {
        const existing = await prisma.device.findUnique({ where: { id: req.params.id } });
        await prisma.device.delete({ where: { id: req.params.id } });
        await createAuditLog(req, {
            action: 'device.delete',
            entity: 'Device',
            entityId: req.params.id,
            metadata: existing ? { name: existing.name, organizationId: existing.organizationId } : null
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to delete device' });
    }
};

const getMyDevices = async (req, res) => {
    if (!req.user.orgId) return res.status(400).json({ error: 'Organization is missing' });

    try {
        const devices = await prisma.device.findMany({
            where: { organizationId: req.user.orgId },
            include: { organization: true }
        });
        res.json(devices);
    } catch (e) {
        res.status(500).json({ error: 'Failed to load devices' });
    }
};

const checkDeviceById = async (req, res) => {
    try {
        const { id } = req.params;
        const device = await prisma.device.findUnique({
            where: { id },
            include: { organization: true }
        });

        if (!device) return res.status(404).json({ error: 'Device not found' });

        const lastSeenTime = device.lastSeen ? new Date(device.lastSeen).getTime() : 0;
        const isConnected = (Date.now() - lastSeenTime) < 5 * 60 * 1000;

        res.json({
            ...device,
            isConnected,
            lastSeenTime: device.lastSeen
        });
    } catch (e) {
        res.status(500).json({ error: 'Failed to check device' });
    }
};

const getDeviceReadings = async (req, res) => {
    const { id } = req.params;
    const { range = '1h' } = req.query;
    const rangeMs = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000
    }[range] || 60 * 60 * 1000;

    try {
        const device = await prisma.device.findUnique({
            where: { id },
            select: { id: true, organizationId: true, type: true }
        });

        if (!device) return res.status(404).json({ error: 'Device not found' });

        if (req.user.role === ROLES.ORG_OPERATOR && device.organizationId !== req.user.orgId) {
            return res.status(403).json({ error: 'No access to this device readings' });
        }

        if (req.user.role === ROLES.HAZARD_OPERATOR && device.type !== DEVICE_TYPES.WATER_CAMERA) {
            return res.status(403).json({ error: 'No access to this device readings' });
        }

        const readings = await prisma.deviceReading.findMany({
            where: {
                deviceId: id,
                createdAt: { gte: new Date(Date.now() - rangeMs) }
            },
            orderBy: { createdAt: 'asc' },
            take: 2000
        });

        res.json(readings);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to load device readings' });
    }
};

const processIotData = async ({ token, gas, smoke, quake, methane, battery, temp, raw }, io) => {
    if (!token) return null;

    const device = await prisma.device.findUnique({ where: { token } });
    if (!device) return null;

    const gasLevel = Number(gas) || 0;
    const quakeMagnitude = Number(quake) || 0;
    const methaneLevel = Number(methane) || 0;
    const batteryLevel = Number.parseInt(battery ?? 100, 10);
    const temperature = Number(temp);

    let newStatus = DEVICE_STATUSES.ONLINE;
    if (smoke || gasLevel > 30 || quakeMagnitude > 4.0) newStatus = DEVICE_STATUSES.DANGER;
    else if (gasLevel > 10) newStatus = DEVICE_STATUSES.WARNING;

    const updated = await prisma.device.update({
        where: { id: device.id },
        data: {
            gasLevel,
            smokeDetected: Boolean(smoke),
            quakeMagnitude,
            methaneLevel,
            batteryLevel: Number.isFinite(batteryLevel) ? batteryLevel : 100,
            status: newStatus,
            lastSeen: new Date()
        }
    });

    await prisma.deviceReading.create({
        data: {
            deviceId: updated.id,
            gasLevel: updated.gasLevel,
            methaneLevel: updated.methaneLevel,
            quakeMagnitude: updated.quakeMagnitude,
            smokeDetected: updated.smokeDetected,
            batteryLevel: updated.batteryLevel,
            temperature: Number.isFinite(temperature) ? temperature : null,
            raw: raw || null
        }
    });

    io?.emit('device-update', updated);
    io?.emit('sensor-update', {
        id: updated.id,
        deviceId: updated.id,
        token: updated.token,
        name: updated.name,
        lat: updated.lat,
        lng: updated.lng,
        temp,
        alarm: newStatus === DEVICE_STATUSES.DANGER,
        fire: Boolean(smoke),
        quake: quakeMagnitude > 4,
        gas_levels: { gas: gasLevel, methane: methaneLevel },
        status: updated.status,
        timestamp: updated.lastSeen
    });

    const enteredDanger = newStatus === DEVICE_STATUSES.DANGER && device.status !== DEVICE_STATUSES.DANGER;

    if (enteredDanger) {
        const incident = await prisma.incident.create({
            data: {
                type: 'device_alert',
                description: `ALERT from ${device.name}`,
                lat: Number(updated.lat) || 0,
                lng: Number(updated.lng) || 0,
                status: 'NEW',
                resolved: false,
                organizationId: updated.organizationId,
                deviceId: updated.id,
                metadata: {
                    gasLevel: updated.gasLevel,
                    smokeDetected: updated.smokeDetected,
                    quakeMagnitude: updated.quakeMagnitude,
                    methaneLevel: updated.methaneLevel,
                    temp: temp ?? null
                }
            },
            include: {
                device: {
                    select: { id: true, name: true, organizationId: true }
                },
                organization: {
                    select: { id: true, name: true }
                }
            }
        });

        io?.emit('alert', {
            message: `ALERT: ${device.name}`,
            coords: { lat: device.lat, lng: device.lng },
            incident
        });
        io?.emit('incident-created', incident);
        await prisma.auditLog.create({
            data: {
                action: 'incident.create',
                entity: 'Incident',
                entityId: incident.id,
                metadata: { source: 'iot', deviceId: updated.id, deviceName: updated.name }
            }
        });
        io?.emit('sensor-alarm', {
            id: updated.id,
            type: updated.smokeDetected ? 'FIRE' : quakeMagnitude > 4 ? 'EARTHQUAKE' : 'GAS',
            message: `ALERT: ${device.name}`,
            level: 'critical'
        });
    }

    const sirenOn = newStatus === DEVICE_STATUSES.DANGER || device.isGlobalAlert;
    return { command: sirenOn ? 'ALARM_ON' : 'ALARM_OFF', device: updated };
};

const handleIotData = async (req, res) => {
    try {
        const { token, gas, smoke, quake, methane, battery, temp } = req.body;
        const result = await processIotData({ token, gas, smoke, quake, methane, battery, temp, raw: req.body }, req.io);

        if (!result) return res.status(404).json({ command: 'RESET' });
        res.json({ command: result.command });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to process IoT data' });
    }
};

module.exports = {
    createDevice,
    getAllDevices,
    deleteDevice,
    updateDevice,
    getMyDevices,
    checkDeviceById,
    getDeviceReadings,
    handleIotData,
    processIotData
};
