const express = require('express');
const router = express.Router();

const adminPolicyController = require('./admin.policy.controller');
const { uploadPolicyDocs } = require('./admin.policy.upload');

// NOTE: plug your admin auth + RBAC middleware here
// e.g. const { requireAdminAuth, requirePermission } = require('../middlewares/adminAuth');
// router.use(requireAdminAuth);
// router.post('/issue', requirePermission('POLICY_ISSUE'), adminPolicyController.issuePolicy);

router.post('/issue',uploadPolicyDocs, adminPolicyController.issuePolicy);

module.exports = router;
