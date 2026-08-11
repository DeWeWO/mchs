const express = require('express');
const router = express.Router();
const { getStats } = require('../controllers/statsController');
const { checkRole } = require('../middlewares/authMiddleware');
const { ROLES } = require('../constants/enums');

// GET /api/stats
// Сюда можно добавить checkRole, если нужно скрыть статистику от посторонних
router.get('/', checkRole([ROLES.SUPER_ADMIN, ROLES.MCHS_USER, ROLES.ADMIN]), getStats);

module.exports = router;
