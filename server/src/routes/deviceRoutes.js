const express = require('express');
const router = express.Router();
const { checkRole } = require('../middlewares/authMiddleware');
const { ROLES } = require('../constants/enums');
const { createDevice, updateDevice, getAllDevices, deleteDevice, getMyDevices, checkDeviceById, getDeviceReadings, handleIotData } = require('../controllers/deviceController');

router.post('/iot/data', handleIotData);

router.get('/', checkRole([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MCHS_USER, ROLES.MAP_OPERATOR]), getAllDevices);
router.post('/', checkRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]), createDevice);
router.put('/:id', checkRole([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.ORG_OPERATOR]), updateDevice);
router.delete('/:id', checkRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]), deleteDevice);
router.get('/check/:id', checkRole([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ORG_OPERATOR]), checkDeviceById);

router.get('/my-devices', checkRole([ROLES.ORG_OPERATOR, ROLES.ADMIN]), getMyDevices);
router.get('/:id/readings', checkRole([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MCHS_USER, ROLES.ORG_OPERATOR, ROLES.MAP_OPERATOR, ROLES.HAZARD_OPERATOR]), getDeviceReadings);

module.exports = router;
