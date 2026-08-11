const Organization = require('../models/organization');
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const { ROLES } = require('../constants/enums');
const { createAuditLog } = require('../utils/auditLog');

// 1. СОЗДАНИЕ
exports.createOrganization = async (req, res) => {
    const { name, type, address, lat, lng, ownerName, ownerPhone, userUsername, userPassword, userPhone } = req.body;

    try {
        // Проверка на уникальность логина
        if (userUsername) {
            const existingUser = await prisma.user.findUnique({ where: { username: userUsername } });
            if (existingUser) return res.status(400).json({ error: "Логин уже занят" });
        }

        const result = await prisma.$transaction(async (tx) => {
            // Создаем организацию
            const org = await tx.organization.create({
                data: { 
                    name, type, address, 
                    lat: parseFloat(lat || 0), 
                    lng: parseFloat(lng || 0),
                    ownerName: ownerName || null,
                    ownerPhone: ownerPhone || null
                }
            });

            // Создаем оператора, если указаны данные
            if (userUsername && userPassword) {
                const hash = await bcrypt.hash(userPassword, 10);
                await tx.user.create({
                    data: {
                        fullName: name, // Имя пользователя = Название организации
                        username: userUsername,
                        password: hash,
                        phone: userPhone,
                        role: ROLES.ORG_OPERATOR,
                        organizationId: org.id
                    }
                });
            }
            return org;
        });
        await createAuditLog(req, {
            action: 'organization.create',
            entity: 'Organization',
            entityId: result.id,
            metadata: { name: result.name, type: result.type }
        });
        res.json(result);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Ошибка создания" });
    }
};

// 2. ОБНОВЛЕНИЕ (UPDATE)
exports.updateOrganization = async (req, res) => {
    const { id } = req.params;
    const { name, type, address, lat, lng, ownerName, ownerPhone } = req.body;
    
    try {
        const updated = await prisma.organization.update({
            where: { id },
            data: { 
                name, type, address, 
                lat: parseFloat(lat || 0), 
                lng: parseFloat(lng || 0),
                ownerName: ownerName !== undefined ? ownerName : undefined,
                ownerPhone: ownerPhone !== undefined ? ownerPhone : undefined
            }
        });
        await createAuditLog(req, {
            action: 'organization.update',
            entity: 'Organization',
            entityId: updated.id,
            metadata: { name: updated.name, type: updated.type }
        });
        res.json(updated);
    } catch (e) {
        res.status(500).json({ error: "Ошибка обновления" });
    }
};

// 3. ПОЛУЧИТЬ ВСЕ (С кол-вом устройств)
exports.getAllOrganizations = async (req, res) => {
    try {
        const where = req.user?.role === ROLES.ORG_OPERATOR && req.user?.orgId
            ? { id: req.user.orgId }
            : undefined;
        const orgs = await prisma.organization.findMany({ 
            where,
            include: { users: true, devices: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(orgs);
    } catch (e) { res.status(500).json({ error: "Ошибка загрузки" }); }
};

// 4. УДАЛЕНИЕ
exports.deleteOrganization = async (req, res) => {
    try {
        const existing = await prisma.organization.findUnique({ where: { id: req.params.id } });
        await prisma.organization.delete({ where: { id: req.params.id } });
        await createAuditLog(req, {
            action: 'organization.delete',
            entity: 'Organization',
            entityId: req.params.id,
            metadata: existing ? { name: existing.name, type: existing.type } : null
        });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Ошибка удаления" }); }
};
