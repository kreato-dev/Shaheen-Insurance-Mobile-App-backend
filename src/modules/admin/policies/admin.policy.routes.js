const express = require('express');
const router = express.Router();

const requireAdmin = require('../../../middleware/requireAdmin.middleware');
const adminSession = require('../../../middleware/adminSession.middleware');
const requirePermission = require('../../../middleware/rbac.middleware');
const adminPolicyController = require('./admin.policy.controller');
const { uploadPolicySchedule } = require('./admin.policy.upload');

router.post(
    '/issue/motor',
    requireAdmin,
    adminSession(),
    requirePermission('POLICIES:ISSUE_MOTOR'),
    uploadPolicySchedule,
    adminPolicyController.issuePolicyMotor
);

router.post(
    '/issue/travel',
    requireAdmin,
    adminSession(),
    requirePermission('POLICIES:ISSUE_TRAVEL'),
    uploadPolicySchedule,
    adminPolicyController.issuePolicyTravel
);

module.exports = router;
