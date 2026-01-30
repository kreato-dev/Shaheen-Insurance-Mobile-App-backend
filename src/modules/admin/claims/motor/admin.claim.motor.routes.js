const express = require('express');
const router = express.Router();

const controller = require('./admin.claim.motor.controller');

const requireAdmin = require('../../../../middleware/requireAdmin.middleware');
const adminSession = require('../../../../middleware/adminSession.middleware');
const requirePermission = require('../../../../middleware/rbac.middleware');

router.get('/', requireAdmin, adminSession(), requirePermission('CLAIMS:READ_MOTOR'), controller.listClaims);
router.get('/:claimId', requireAdmin, adminSession(), requirePermission('CLAIMS:READ_MOTOR'), controller.claimDetail);
router.patch('/:claimId/review', requireAdmin, adminSession(), requirePermission('CLAIMS:REVIEW_MOTOR'), controller.reviewClaim);

module.exports = router;
