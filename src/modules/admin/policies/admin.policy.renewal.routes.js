const express = require('express');
const router = express.Router();

const { uploadRenewalDoc } = require('./admin.policy.renewal.upload');
const { sendMotorRenewal } = require('./admin.policy.renewal.controller');

// Plug your auth + RBAC here:
// const requireAdminAuth = require('../auth/adminAuth.middleware');
// const requirePermission = require('../../../middleware/rbac.middleware');

router.post(
  '/motor/:proposalId/renewal',
  // requireAdminAuth,
  // requirePermission('POLICIES:RENEWAL_SEND'),
  uploadRenewalDoc,
  sendMotorRenewal
);

module.exports = router;
