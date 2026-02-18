const {
  adminListMotorClaims,
  adminGetMotorClaimDetail,
  adminReviewMotorClaim,
  assignSurveyor,
  uploadPaymentEvidenceService,
} = require('./admin.claim.motor.service');

async function listClaims(req, res, next) {
  try {
    const { page, limit, status, q, from, to } = req.query;
    const data = await adminListMotorClaims({ page, limit, status, q, from, to });
    return res.json(data);
  } catch (err) {
    next(err);
  }
}

async function claimDetail(req, res, next) {
  try {
    const { claimId } = req.params;
    const data = await adminGetMotorClaimDetail({ claimId });
    return res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function reviewClaim(req, res, next) {
  try {
    const adminId = req.admin?.id || null;
    const { claimId } = req.params;

    const result = await adminReviewMotorClaim({ adminId, claimId, body: req.body });

    return res.json({
      message: 'Claim review action applied',
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

async function assignSurveyorController(req, res, next) {
  try {
    const adminId = req.admin?.id || null;
    const { claimId } = req.params;
    const result = await assignSurveyor({ adminId, claimId, body: req.body });
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

async function uploadEvidence(req, res, next) {
  try {
    const adminId = req.admin?.id || null;
    const { claimId } = req.params;
    const file = req.file;

    const result = await uploadPaymentEvidenceService({ adminId, claimId, file });
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { listClaims, claimDetail, reviewClaim, assignSurveyorController, uploadEvidence };
