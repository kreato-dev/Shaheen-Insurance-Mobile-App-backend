const router = require('express').Router();
const ctrl = require('./adminUsers.controller');
const requireAdmin = require('../../../middleware/requireAdmin.middleware');
const adminSession = require('../../../middleware/adminSession.middleware');
const requirePermission = require('../../../middleware/rbac.middleware');

// Only SUPER_ADMIN has '*' permission which covers 'ADMINS:MANAGE'.
// Other roles do not have 'ADMINS:MANAGE' in rbac.middleware.js.
const auth = [
  requireAdmin,
  adminSession(),
  requirePermission('ADMINS:MANAGE')
];

router.get('/', auth, ctrl.list);
router.get('/:id', auth, ctrl.get);
router.post('/', auth, ctrl.create);
router.put('/:id', auth, ctrl.update);
router.delete('/:id', auth, ctrl.delete);

module.exports = router;