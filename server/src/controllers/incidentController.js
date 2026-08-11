const prisma = require('../config/db');
const { INCIDENT_STATUSES, ROLES } = require('../constants/enums');
const { createAuditLog } = require('../utils/auditLog');

const includeIncidentRelations = {
    device: {
        select: { id: true, name: true, organizationId: true }
    },
    organization: {
        select: { id: true, name: true }
    }
};

exports.listIncidents = async (req, res) => {
    const { orgId, limit = 50, status, type, deviceId, from, to } = req.query;
    const user = req.user;

    try {
        const where = {};
        if (user.role === 'ORG_OPERATOR' && user.orgId) {
            where.organizationId = user.orgId;
        } else if (orgId) {
            where.organizationId = orgId;
        }
        if (status && status !== 'all') where.status = status;
        if (type) where.type = type;
        if (deviceId) where.deviceId = deviceId;
        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = new Date(from);
            if (to) where.createdAt.lte = new Date(to);
        }

        const incidents = await prisma.incident.findMany({
            where,
            include: includeIncidentRelations,
            orderBy: { createdAt: 'desc' },
            take: Math.min(Number(limit) || 50, 500)
        });
        res.json(incidents);
    } catch (e) {
        res.status(500).json({ error: 'Failed to load incidents' });
    }
};

exports.createIncident = async (req, res) => {
    const user = req.user;
    const { type, description, lat, lng, organizationId, deviceId, metadata } = req.body;
    const parsedLat = Number(lat);
    const parsedLng = Number(lng);

    if (!type || !Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
        return res.status(400).json({ error: 'type, lat and lng are required' });
    }

    try {
        const incident = await prisma.incident.create({
            data: {
                type,
                description: description || '',
                lat: parsedLat,
                lng: parsedLng,
                status: INCIDENT_STATUSES.NEW,
                resolved: false,
                organizationId: user.role === 'ORG_OPERATOR' ? user.orgId : (organizationId || null),
                deviceId: deviceId || null,
                metadata: metadata || null
            },
            include: includeIncidentRelations
        });

        req.io?.emit('alert', {
            message: incident.description || incident.type,
            coords: { lat: incident.lat, lng: incident.lng },
            incident
        });
        req.io?.emit('incident-created', incident);
        await createAuditLog(req, {
            action: 'incident.create',
            entity: 'Incident',
            entityId: incident.id,
            metadata: { type: incident.type, organizationId: incident.organizationId, deviceId: incident.deviceId }
        });

        res.status(201).json(incident);
    } catch (e) {
        res.status(500).json({ error: 'Failed to create incident' });
    }
};

exports.resolveIncident = async (req, res) => {
    const { id } = req.params;
    try {
        const incident = await prisma.incident.update({
            where: { id },
            data: {
                status: INCIDENT_STATUSES.RESOLVED,
                resolved: true,
                resolvedAt: new Date(),
                resolvedBy: req.user?.id || null
            },
            include: includeIncidentRelations
        });
        req.io?.emit('incident-updated', incident);
        await createAuditLog(req, {
            action: 'incident.resolve',
            entity: 'Incident',
            entityId: incident.id,
            metadata: { status: incident.status }
        });
        res.json(incident);
    } catch (e) {
        res.status(500).json({ error: 'Failed to resolve incident' });
    }
};

const allowedTransitions = {
    [INCIDENT_STATUSES.NEW]: [INCIDENT_STATUSES.IN_PROGRESS, INCIDENT_STATUSES.RESOLVED, INCIDENT_STATUSES.FALSE_ALARM],
    [INCIDENT_STATUSES.IN_PROGRESS]: [INCIDENT_STATUSES.RESOLVED, INCIDENT_STATUSES.FALSE_ALARM],
    [INCIDENT_STATUSES.RESOLVED]: [],
    [INCIDENT_STATUSES.FALSE_ALARM]: []
};

exports.updateIncidentStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!Object.values(INCIDENT_STATUSES).includes(status)) {
        return res.status(400).json({ error: 'Invalid incident status' });
    }

    try {
        const current = await prisma.incident.findUnique({ where: { id } });
        if (!current) return res.status(404).json({ error: 'Incident not found' });

        const currentStatus = current.status || (current.resolved ? INCIDENT_STATUSES.RESOLVED : INCIDENT_STATUSES.NEW);
        const isSuperAdmin = req.user?.role === ROLES.SUPER_ADMIN;

        if (currentStatus === INCIDENT_STATUSES.RESOLVED && status !== INCIDENT_STATUSES.RESOLVED && !isSuperAdmin) {
            return res.status(403).json({ error: 'Only SUPER_ADMIN can reopen a resolved incident' });
        }

        if (currentStatus !== status && !isSuperAdmin && !allowedTransitions[currentStatus]?.includes(status)) {
            return res.status(400).json({ error: `Invalid transition ${currentStatus} -> ${status}` });
        }

        const incident = await prisma.incident.update({
            where: { id },
            data: {
                status,
                resolved: status === INCIDENT_STATUSES.RESOLVED,
                resolvedAt: status === INCIDENT_STATUSES.RESOLVED ? new Date() : null,
                resolvedBy: status === INCIDENT_STATUSES.RESOLVED ? (req.user?.id || null) : null
            },
            include: includeIncidentRelations
        });

        req.io?.emit('incident-updated', incident);
        await createAuditLog(req, {
            action: 'incident.status_update',
            entity: 'Incident',
            entityId: incident.id,
            metadata: { from: currentStatus, to: status }
        });

        res.json(incident);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to update incident status' });
    }
};
