const express = require('express');
const router = express.Router();

const controller = require('./admin.claim.motor.controller');

// Plug your admin auth + RBAC here:
// router.use(requireAdminAuth);
// router.get('/', requirePermission('CLAIMS:READ'), controller.listClaims);
// router.get('/:claimId', requirePermission('CLAIMS:READ'), controller.claimDetail);
// router.patch('/:claimId/review', requirePermission('CLAIMS:REVIEW'), controller.reviewClaim);

router.get('/', controller.listClaims);
router.get('/:claimId', controller.claimDetail);
router.patch('/:claimId/review', controller.reviewClaim);

module.exports = router;
