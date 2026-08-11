const express = require('express');
const router = express.Router();
const prisma = require('../config/db');
const { checkRole } = require('../middlewares/authMiddleware');
const { ROLES } = require('../constants/enums');
const { createAuditLog } = require('../utils/auditLog');

const allowedRoles = [ROLES.SUPER_ADMIN, ROLES.MCHS_USER, ROLES.HAZARD_OPERATOR];

// GET /api/water-camera - Получить текущую камеру
router.get('/', checkRole(allowedRoles), async (req, res) => {
    try {
        const camera = await prisma.waterCamera.findFirst();
        res.json(camera || { message: 'Camera not configured' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch camera settings' });
    }
});

// POST /api/water-camera - Создать или обновить камеру (задать координаты)
router.post('/', checkRole(allowedRoles), async (req, res) => {
    try {
        const { lat, lng, name, streamUrl } = req.body;
        const parsedLat = Number(lat);
        const parsedLng = Number(lng);

        if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
            return res.status(400).json({ error: 'lat and lng must be valid numbers' });
        }

        // Проверяем, есть ли уже камера
        const existingCamera = await prisma.waterCamera.findFirst();

        let camera;
        if (existingCamera) {
            // Обновляем существующую
            camera = await prisma.waterCamera.update({
                where: { id: existingCamera.id },
                data: {
                    lat: parsedLat,
                    lng: parsedLng,
                    name: name || existingCamera.name,
                    streamUrl: streamUrl || existingCamera.streamUrl || '',
                    status: 'ACTIVE'
                }
            });
        } else {
            // Создаем новую
            camera = await prisma.waterCamera.create({
                data: {
                    lat: parsedLat,
                    lng: parsedLng,
                    name: name || 'Water AI Camera',
                    streamUrl: streamUrl || '',
                    status: 'ACTIVE'
                }
            });
        }

        await createAuditLog(req, {
            action: 'water_camera.update',
            entity: 'WaterCamera',
            entityId: camera.id,
            metadata: { lat: camera.lat, lng: camera.lng, name: camera.name }
        });

        res.json(camera);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to save camera settings' });
    }
});

module.exports = router;
