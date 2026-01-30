const express = require('express');
const router = express.Router();

const { uploadRenewalDoc } = require('./admin.policy.renewal.upload');
const { sendMotorRenewal } = require('./admin.policy.renewal.controller');

// Plug your auth + RBAC here:
const requireAdmin = require('../../../middleware/requireAdmin.middleware');
const adminSession = require('../../../middleware/adminSession.middleware');
const requirePermission = require('../../../middleware/rbac.middleware');

router.post(
  '/motor/:proposalId/renewal',
  requireAdmin,
  adminSession(),
  requirePermission('POLICIES:RENEWAL_SEND_MOTOR'),
  uploadRenewalDoc,
  sendMotorRenewal
);

module.exports = router;
