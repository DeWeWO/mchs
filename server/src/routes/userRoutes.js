const express = require('express');
const router = express.Router();
const { checkRole } = require('../middlewares/authMiddleware');
const { ROLES } = require('../constants/enums');
const { getAllUsers, createUser, updateUser, deleteUser } = require('../controllers/userController');

router.get('/', checkRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]), getAllUsers);
router.post('/create', checkRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]), createUser);
router.put('/:id', checkRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]), updateUser);
router.delete('/:id', checkRole([ROLES.SUPER_ADMIN]), deleteUser);

module.exports = router;