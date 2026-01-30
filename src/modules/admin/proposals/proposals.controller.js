const service = require('./proposals.service');
const { validateReviewActionBody } = require('./proposals.validators');

// phase 1
async function listUnifiedProposals(req, res, next) {
  try {
    // RBAC: Enforce type filter for domain-specific admins
    if (req.admin?.role === 'MOTOR_ADMIN') {
      req.query.type = 'MOTOR';
    } else if (req.admin?.role === 'TRAVEL_ADMIN') {
      req.query.type = 'TRAVEL';
    }

    const result = await service.getUnifiedProposals(req.query);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

// phase 2
async function getMotorProposalDetail(req, res, next) {
  try {
    const proposalId = Number(req.params.proposalId);
    const result = await service.getMotorProposalDetail(proposalId);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

async function getTravelProposalDetail(req, res, next) {
  try {
    const proposalId = Number(req.params.proposalId);
    const travelSubtype = String(req.params.travelSubtype || '').toLowerCase();
    const result = await service.getTravelProposalDetail(travelSubtype, proposalId);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

async function reviewMotorProposal(req, res, next) {
  try {
    const proposalId = Number(req.params.proposalId);
    const adminId = req.admin?.id;

    const { action, rejectionReason, reuploadNotes, requiredDocs } = validateReviewActionBody(req.body);

    const result = await service.reviewMotorProposal(proposalId, adminId, {
      action,
      rejectionReason,
      reuploadNotes,
      requiredDocs,
    });

    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

async function reviewTravelProposal(req, res, next) {
  try {
    const proposalId = Number(req.params.proposalId);
    const travelSubtype = String(req.params.travelSubtype || '').toLowerCase();
    const adminId = req.admin?.id;

    const { action, rejectionReason, reuploadNotes, requiredDocs } = validateReviewActionBody(req.body);

    const result = await service.reviewTravelProposal(travelSubtype, proposalId, adminId, {
      action,
      rejectionReason,
      reuploadNotes,
      requiredDocs,
    });

    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listUnifiedProposals,
  getMotorProposalDetail,
  getTravelProposalDetail,
  reviewMotorProposal,
  reviewTravelProposal,
};
