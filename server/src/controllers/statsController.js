const prisma = require('../config/db');
const { ROLES } = require('../constants/enums');

exports.getStats = async (req, res) => {
    try {
        const [
            totalSensors,
            onlineSensors,
            dangerSensors,
            totalUsers,
            admins,
            alerts
        ] = await prisma.$transaction([
            prisma.device.count(),
            prisma.device.count({ where: { status: { not: 'OFFLINE' } } }),
            prisma.device.count({ where: { status: 'DANGER' } }),
            prisma.user.count(),
            prisma.user.count({ where: { role: ROLES.ADMIN } }),
            prisma.incident.findMany({ take: 5, orderBy: { createdAt: 'desc' } })
        ]);

        res.json({
            sensors: { 
                total: totalSensors || 0, 
                online: onlineSensors || 0, 
                offline: (totalSensors || 0) - (onlineSensors || 0), 
                danger: dangerSensors || 0 
            },
            users: { 
                total: totalUsers || 0, 
                admins: admins || 0 
            },
            alerts: alerts.map(a => ({ id: a.id, text: a.description, time: a.createdAt }))
        });

    } catch (e) {
        console.error("❌ ОШИБКА В /api/stats:", e);
        // Отдаем пустые данные, чтобы фронт не падал
        res.status(500).json({
            sensors: { total: 0, online: 0, offline: 0, danger: 0 },
            users: { total: 0, admins: 0 },
            alerts: []
        });
    }
};