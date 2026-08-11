const express = require('express');
const router = express.Router();
const { checkRole } = require('../middlewares/authMiddleware');
const { ROLES } = require('../constants/enums');
const prisma = require('../config/db');
const { createAuditLog } = require('../utils/auditLog');

router.get('/dashboard', checkRole([ROLES.MCHS_USER]), async (req, res) => {
    const devices = await prisma.device.findMany({ include: { organization: true } });
    const cameras = await prisma.waterCamera.findMany();
    res.json({ devices, cameras });
});

// Получить статус глобальной тревоги
router.get('/global-alert/status', checkRole([ROLES.MCHS_USER, ROLES.SUPER_ADMIN, ROLES.ORG_OPERATOR, ROLES.ADMIN]), async (req, res) => {
    try {
        // Проверяем хотя бы одно устройство - если у него isGlobalAlert = true, значит тревога активна
        const deviceWithAlert = await prisma.device.findFirst({
            where: { isGlobalAlert: true }
        });
        const isActive = deviceWithAlert !== null;
        res.json({ active: isActive });
    } catch (e) {
        res.status(500).json({ error: "Ошибка проверки статуса" });
    }
});

router.post('/global-alert', checkRole([ROLES.MCHS_USER, ROLES.SUPER_ADMIN]), async (req, res) => {
    const { active } = req.body;
    await prisma.device.updateMany({ data: { isGlobalAlert: active } });
    req.io.emit('global-alert', { active });
    await createAuditLog(req, {
        action: active ? 'global_alert.on' : 'global_alert.off',
        entity: 'Device',
        metadata: { active: Boolean(active) }
    });
    res.json({ success: true, active });
});

module.exports = router;
