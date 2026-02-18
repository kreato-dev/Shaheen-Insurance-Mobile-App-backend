const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const controller = require('./admin.claim.motor.controller');

const requireAdmin = require('../../../../middleware/requireAdmin.middleware');
const adminSession = require('../../../../middleware/adminSession.middleware');
const requirePermission = require('../../../../middleware/rbac.middleware');

const projectRoot = path.join(__dirname, '..', '..', '..', '..', '..');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // uploads/claims/motor
    cb(null, path.join(projectRoot, 'uploads', 'claims', 'motor'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `admin-evidence-${uniqueName}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const allowed = ['.jpg', '.jpeg', '.png', '.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowed.includes(ext)) {
    return cb(httpError(400, 'Only JPG, PNG, PDF allowed'), false);
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.get('/', requireAdmin, adminSession(), requirePermission('CLAIMS:READ_MOTOR'), controller.listClaims);
router.get('/:claimId', requireAdmin, adminSession(), requirePermission('CLAIMS:READ_MOTOR'), controller.claimDetail);
router.patch('/:claimId/review', requireAdmin, adminSession(), requirePermission('CLAIMS:REVIEW_MOTOR'), controller.reviewClaim);
router.post('/:claimId/assign-surveyor', requireAdmin, adminSession(), requirePermission('CLAIMS:REVIEW_MOTOR'), controller.assignSurveyorController);
router.post('/:claimId/payment-evidence', requireAdmin, adminSession(), requirePermission('CLAIMS:REVIEW_MOTOR'), upload.single('evidence'), controller.uploadEvidence);

module.exports = router;
