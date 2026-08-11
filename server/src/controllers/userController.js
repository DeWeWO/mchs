const User = require('../models/user');
const bcrypt = require('bcryptjs');
const { createAuditLog } = require('../utils/auditLog');

const sanitizeUser = (user) => {
    if (!user) return user;
    const { password, ...safeUser } = user;
    return safeUser;
};

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.findMany({ include: { organization: true } });
        res.json(users.map(sanitizeUser));
    } catch (e) {
        res.status(500).json({ error: 'Failed to load users' });
    }
};

exports.createUser = async (req, res) => {
    try {
        const { username, password, fullName, role, phone, organizationId } = req.body;
        if (!username || !password || !fullName) {
            return res.status(400).json({ error: 'username, password and fullName are required' });
        }

        const existingUser = await User.findUnique({ where: { username } });
        if (existingUser) return res.status(400).json({ error: 'Username is already taken' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            data: {
                username,
                password: hashedPassword,
                fullName,
                role: role || 'ORG_OPERATOR',
                phone: phone || null,
                organizationId: organizationId || null
            },
            include: { organization: true }
        });

        await createAuditLog(req, {
            action: 'user.create',
            entity: 'User',
            entityId: user.id,
            metadata: { username: user.username, role: user.role, organizationId: user.organizationId }
        });

        res.json(sanitizeUser(user));
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: `Failed to create user: ${e.message}` });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, fullName, role, phone, password, organizationId } = req.body;
        const updateData = { username, fullName, role, phone, organizationId };

        if (password) updateData.password = await bcrypt.hash(password, 10);

        const updated = await User.update({
            where: { id },
            data: updateData,
            include: { organization: true }
        });

        await createAuditLog(req, {
            action: 'user.update',
            entity: 'User',
            entityId: updated.id,
            metadata: { username: updated.username, role: updated.role, organizationId: updated.organizationId }
        });

        res.json(sanitizeUser(updated));
    } catch (e) {
        res.status(500).json({ error: 'Failed to update user' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const existing = await User.findUnique({ where: { id: req.params.id } });
        await User.delete({ where: { id: req.params.id } });
        await createAuditLog(req, {
            action: 'user.delete',
            entity: 'User',
            entityId: req.params.id,
            metadata: existing ? { username: existing.username, role: existing.role } : null
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
};
