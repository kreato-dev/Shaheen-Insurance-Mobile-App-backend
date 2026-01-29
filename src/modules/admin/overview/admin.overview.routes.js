const router = require('express').Router();
const ctrl = require('./admin.overview.controller');
const requireAdmin = require('../../../middleware/requireAdmin.middleware');
const adminSession = require('../../../middleware/adminSession.middleware');
const requirePermission = require('../../../middleware/rbac.middleware');

// GET /api/admin/overview/motor-stats
// Requires PROPOSALS:READ permission (available to all admins)
router.get('/motor-stats', requireAdmin, adminSession(), requirePermission('PROPOSALS:READ'), ctrl.getMotorStats);

// GET /api/admin/overview/travel-stats
// Requires PROPOSALS:READ permission
router.get('/travel-stats', requireAdmin, adminSession(), requirePermission('PROPOSALS:READ'), ctrl.getTravelStats);

// GET /api/admin/overview/revenue
// Requires PROPOSALS:READ permission
router.get('/revenue', requireAdmin, adminSession(), requirePermission('PROPOSALS:READ'), ctrl.getTotalRevenue);

// GET /api/admin/overview/revenue-chart
// Requires PROPOSALS:READ permission
router.get('/revenue-chart', requireAdmin, adminSession(), requirePermission('PROPOSALS:READ'), ctrl.getRevenueChartData);

// GET /api/admin/overview/user-stats
// Requires USERS:READ permission
router.get('/user-stats', requireAdmin, adminSession(), requirePermission('USERS:READ'), ctrl.getUserStats);

module.exports = router;
