const prisma = require('../config/db');

async function createAuditLog(req, data) {
    try {
        await prisma.auditLog.create({
            data: {
                userId: req.user?.id || null,
                username: req.user?.username || data.username || null,
                role: req.user?.role || null,
                action: data.action,
                entity: data.entity || null,
                entityId: data.entityId || null,
                metadata: data.metadata || null,
                ip: req.ip
            }
        });
    } catch (e) {
        console.error('[AUDIT_LOG_FAILED]', e);
    }
}

module.exports = { createAuditLog };
