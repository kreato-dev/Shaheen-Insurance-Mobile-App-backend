const express = require('express');
const router = express.Router();

const controller = require('./claim.motor.controller');
const { uploadClaimEvidence } = require('./claim.motor.upload');

// plug your user auth middleware here:
// router.use(requireUserAuth);

router.get('/motor/entry', controller.claimEntryPrefill);

// multipart claim submit (form + files)
router.post('/motor/', uploadClaimEvidence, controller.submitMotorClaim);

router.get('/motor/', controller.myMotorClaims);
router.get('/motor/:claimId', controller.myMotorClaimDetail);

router.post('/motor/:claimId/reupload', uploadClaimEvidence, controller.reuploadMotorClaim);

module.exports = router;
