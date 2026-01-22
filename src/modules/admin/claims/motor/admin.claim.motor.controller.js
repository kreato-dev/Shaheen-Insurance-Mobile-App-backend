const {
  adminListMotorClaims,
  adminGetMotorClaimDetail,
  adminReviewMotorClaim,
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

module.exports = { listClaims, claimDetail, reviewClaim };
