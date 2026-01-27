const router = require('express').Router();
const ctrl = require('./admin.support.controller');
const upload = require('./admin.support.upload');
const requireAdmin = require('../../../middleware/requireAdmin.middleware');
const adminSession = require('../../../middleware/adminSession.middleware');
const requirePermission = require('../../../middleware/rbac.middleware');

/* ADMIN */
router.get(
  '/',
  requireAdmin,
  adminSession(),
  requirePermission('SUPPORT:READ'),
  ctrl.getAllTickets
);

router.get(
  '/:ticketId',
  requireAdmin,
  adminSession(),
  requirePermission('SUPPORT:READ'),
  ctrl.getTicketDetail
);

router.post(
  '/:ticketId/reply',
  requireAdmin,
  adminSession(),
  requirePermission('SUPPORT:UPDATE'),
  upload.array('attachments', 5),
  ctrl.adminReply
);

router.patch(
  '/:ticketId/status',
  requireAdmin,
  adminSession(),
  requirePermission('SUPPORT:UPDATE'),
  ctrl.updateStatus
);

module.exports = router;
