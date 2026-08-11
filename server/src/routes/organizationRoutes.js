const express = require('express');
const router = express.Router();
const { checkRole } = require('../middlewares/authMiddleware');
const { ROLES } = require('../constants/enums');
const { createOrganization, updateOrganization, getAllOrganizations, deleteOrganization } = require('../controllers/organizationController');

router.get('/', checkRole([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MCHS_USER, ROLES.MAP_OPERATOR, ROLES.ORG_OPERATOR]), getAllOrganizations);
router.post('/create', checkRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]), createOrganization);
router.put('/:id', checkRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]), updateOrganization);
router.delete('/:id', checkRole([ROLES.SUPER_ADMIN]), deleteOrganization);

module.exports = router;
