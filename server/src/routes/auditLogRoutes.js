const express = require('express');
const router = express.Router();
const { checkRole } = require('../middlewares/authMiddleware');
const { ROLES } = require('../constants/enums');
const { listAuditLogs } = require('../controllers/auditLogController');

router.get('/', checkRole([ROLES.SUPER_ADMIN]), listAuditLogs);

module.exports = router;
