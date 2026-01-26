const express = require('express');
const router = express.Router();

const requireAdmin = require('../../../middleware/requireAdmin.middleware');
const adminSession = require('../../../middleware/adminSession.middleware');
const requirePermission = require('../../../middleware/rbac.middleware');
const adminPolicyController = require('./admin.policy.controller');
const { uploadPolicySchedule } = require('./admin.policy.upload');

// NOTE: add requireAdminAuth + RBAC here
router.post(
    '/issue',
    requireAdmin,
    adminSession(),
    // Assuming 'POLICIES:ISSUE' is the correct permission. Adjust if needed.
    requirePermission('POLICIES:ISSUE'),
    uploadPolicySchedule,
    adminPolicyController.issuePolicy
);

module.exports = router;
