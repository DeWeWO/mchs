const express = require('express');
const router = express.Router();
const { checkRole } = require('../middlewares/authMiddleware');
const { ROLES } = require('../constants/enums');
const { listIncidents, createIncident, resolveIncident, updateIncidentStatus } = require('../controllers/incidentController');

router.get('/', checkRole([ROLES.SUPER_ADMIN, ROLES.MCHS_USER, ROLES.ADMIN, ROLES.MAP_OPERATOR, ROLES.ORG_OPERATOR]), listIncidents);
router.post('/', checkRole([ROLES.SUPER_ADMIN, ROLES.MCHS_USER, ROLES.ADMIN, ROLES.MAP_OPERATOR, ROLES.ORG_OPERATOR]), createIncident);
router.patch('/:id/resolve', checkRole([ROLES.SUPER_ADMIN, ROLES.MCHS_USER]), resolveIncident);
router.patch('/:id/status', checkRole([ROLES.SUPER_ADMIN, ROLES.MCHS_USER, ROLES.ADMIN, ROLES.ORG_OPERATOR]), updateIncidentStatus);

module.exports = router;
