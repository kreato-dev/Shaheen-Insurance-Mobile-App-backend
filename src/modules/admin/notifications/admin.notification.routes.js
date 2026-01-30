// src/modules/admin/notifications/notification.routes.js
const router = require('express').Router();
const c = require('./admin.notification.controller');
const requireAdmin = require('../../../middleware/requireAdmin.middleware');
const adminSession = require('../../../middleware/adminSession.middleware');
const requirePermission = require('../../../middleware/rbac.middleware');



// Admin
router.get(
    '/',
    requireAdmin,
    adminSession(),
    requirePermission('NOTIFICATIONS:READ'),
    c.listAdmin
);

router.patch(
    '/:id/read',
    requireAdmin,
    adminSession(),
    requirePermission('NOTIFICATIONS:READ'),
    c.readOneAdmin
);

router.patch(
    '/read-all',
    requireAdmin,
    adminSession(),
    requirePermission('NOTIFICATIONS:READ'),
    c.readAllAdmin
);

module.exports = router;