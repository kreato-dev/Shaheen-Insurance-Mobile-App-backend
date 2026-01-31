const express = require('express');
const router = express.Router();
const logsController = require('./admin.logs.controller');

const requireAdmin = require('../../../middleware/requireAdmin.middleware');
const adminSession = require('../../../middleware/adminSession.middleware');
const requirePermission = require('../../../middleware/rbac.middleware');

// GET /api/admin/logs
// Requires 'LOGS:VIEW' permission (ensure this exists in your RBAC config or remove the middleware if not needed yet)
router.get('/', requireAdmin, adminSession(), requirePermission('LOGS:VIEW'), logsController.getLogs);

module.exports = router;