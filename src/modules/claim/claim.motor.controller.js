const {
  getMotorClaimEntryPrefill,
  submitMotorClaimService,
  listMyMotorClaims,
  getMyMotorClaimDetail,
} = require('./claim.motor.service');

async function claimEntryPrefill(req, res, next) {
  try {
    const userId = req.user?.id; // adjust if your auth uses req.userId
    const { proposalId } = req.query;

    const data = await getMotorClaimEntryPrefill({ userId, proposalId });
    return res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function submitMotorClaim(req, res, next) {
  try {
    const userId = req.user?.id;

    const result = await submitMotorClaimService({
      userId,
      body: req.body,
      files: req.files,
    });

    return res.status(201).json({
      message: 'Claim submitted successfully',
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

async function myMotorClaims(req, res, next) {
  try {
    const userId = req.user?.id;
    const { page, limit, status } = req.query;

    const data = await listMyMotorClaims({ userId, page, limit, status });
    return res.json(data);
  } catch (err) {
    next(err);
  }
}

async function myMotorClaimDetail(req, res, next) {
  try {
    const userId = req.user?.id;
    const { claimId } = req.params;

    const data = await getMyMotorClaimDetail({ userId, claimId });
    return res.json({ data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  claimEntryPrefill,
  submitMotorClaim,
  myMotorClaims,
  myMotorClaimDetail,
};
