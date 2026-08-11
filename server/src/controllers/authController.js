const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createAuditLog } = require('../utils/auditLog');

exports.login = async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findUnique({ where: { username }, include: { organization: true } });
        if (!user || !bcrypt.compareSync(password, user.password)) {
            await createAuditLog(req, {
                action: 'auth.login_failed',
                entity: 'User',
                username,
                metadata: { username }
            });
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const payload = {
            id: user.id,
            role: user.role,
            orgId: user.organizationId,
            username: user.username,
            fullName: user.fullName
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

        req.user = payload;
        await createAuditLog(req, {
            action: 'auth.login_success',
            entity: 'User',
            entityId: user.id,
            metadata: { username: user.username, role: user.role }
        });

        const { password: _password, ...safeUser } = user;
        res.json({ token, user: safeUser });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
