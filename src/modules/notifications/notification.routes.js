// src/modules/notifications/notification.routes.js
const router = require('express').Router();
const c = require('./notification.controller');
const { authMiddleware } = require('../../middleware/auth');
const requireAdmin = require('../../middleware/requireAdmin.middleware');

// ⚠️ plug your actual middlewares:
// const { authMiddleware } = require('../auth/auth.middleware');
// const { requireAdmin } = require('../admin/admin.middleware');


// User
router.get('/api/notifications', authMiddleware, c.listUser);
router.patch('/api/notifications/:id/read', authMiddleware, c.readOneUser);
router.patch('/api/notifications/read-all', authMiddleware, c.readAllUser);

// Admin
router.get('/api/admin/notifications', requireAdmin, c.listAdmin);
router.patch('/api/admin/notifications/:id/read', requireAdmin, c.readOneAdmin);
router.patch('/api/admin/notifications/read-all', requireAdmin, c.readAllAdmin);

module.exports = router;