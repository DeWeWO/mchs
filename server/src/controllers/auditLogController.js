const prisma = require('../config/db');

const listAuditLogs = async (req, res) => {
    try {
        const { action, userId, from, to, limit = 100 } = req.query;
        const where = {};

        if (action) where.action = action;
        if (userId) where.userId = userId;
        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = new Date(from);
            if (to) where.createdAt.lte = new Date(to);
        }

        const logs = await prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: Math.min(Number(limit) || 100, 500)
        });

        res.json(logs);
    } catch (e) {
        res.status(500).json({ error: 'Failed to load audit logs' });
    }
};

module.exports = { listAuditLogs };
