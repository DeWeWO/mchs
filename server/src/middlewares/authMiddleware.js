const jwt = require('jsonwebtoken');
const { ROLES } = require('../constants/enums');

const checkRole = (allowedRoles) => (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: "Нет токена" });

        const token = authHeader.split(' ')[1];
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) return res.status(403).json({ error: "Токен невалиден" });
            
            // SUPER_ADMIN может всё
            if (user.role === ROLES.SUPER_ADMIN || allowedRoles.includes(user.role)) {
                req.user = user;
                next();
            } else {
                return res.status(403).json({ error: "Нет доступа" });
            }
        });
    } catch (e) {
        return res.status(500).json({ error: "Ошибка сервера" });
    }
};

module.exports = { checkRole };