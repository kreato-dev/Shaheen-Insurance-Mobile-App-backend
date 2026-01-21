const express = require('express');
const router = express.Router();

const adminPolicyController = require('./admin.policy.controller');
const { uploadPolicySchedule } = require('./admin.policy.upload');

// NOTE: add requireAdminAuth + RBAC here
router.post('/issue', uploadPolicySchedule, adminPolicyController.issuePolicy);

module.exports = router;
