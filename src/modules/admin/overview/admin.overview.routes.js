const router = require('express').Router();
const ctrl = require('./admin.overview.controller');
const requireAdmin = require('../../../middleware/requireAdmin.middleware');
const adminSession = require('../../../middleware/adminSession.middleware');
const requirePermission = require('../../../middleware/rbac.middleware');

// GET /api/admin/overview/motor-stats
// Requires OVERVIEW:READ permission
router.get('/motor-stats', requireAdmin, adminSession(), requirePermission('OVERVIEW:READ_MOTOR'), ctrl.getMotorStats);

// GET /api/admin/overview/travel-stats
// Requires OVERVIEW:READ permission
router.get('/travel-stats', requireAdmin, adminSession(), requirePermission('OVERVIEW:READ_TRAVEL'), ctrl.getTravelStats);

// GET /api/admin/overview/revenue
// Requires OVERVIEW:READ permission
router.get('/revenue', requireAdmin, adminSession(), requirePermission('OVERVIEW:READ_MOTOR', 'OVERVIEW:READ_TRAVEL'), ctrl.getTotalRevenue);

// GET /api/admin/overview/revenue-chart
// Requires OVERVIEW:READ permission
router.get('/revenue-chart', requireAdmin, adminSession(), requirePermission('OVERVIEW:READ_MOTOR', 'OVERVIEW:READ_TRAVEL'), ctrl.getRevenueChartData);

// GET /api/admin/overview/user-stats
// Requires OVERVIEW:READ permission
router.get('/user-stats', requireAdmin, adminSession(), requirePermission('OVERVIEW:READ_MOTOR', 'OVERVIEW:READ_TRAVEL'), ctrl.getUserStats);

module.exports = router;
