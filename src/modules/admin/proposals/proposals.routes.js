const router = require('express').Router();
const controller = require('./proposals.controller');

const requireAdmin = require('../../../middleware/requireAdmin.middleware');
const adminSession = require('../../../middleware/adminSession.middleware');
const requirePermission = require('../../../middleware/rbac.middleware');

// Phase 1 — Unified Proposals Inbox
router.get(
  '/',
  requireAdmin,
  adminSession(),
  requirePermission('PROPOSALS:READ'),
  controller.listUnifiedProposals
);

// Motor detail
router.get(
  '/motor/:proposalId',
  requireAdmin,
  adminSession(),
  requirePermission('PROPOSALS:READ'),
  controller.getMotorProposalDetail
);

// Travel detail
router.get(
  '/travel/:travelSubtype/:proposalId',
  requireAdmin,
  adminSession(),
  requirePermission('PROPOSALS:READ'),
  controller.getTravelProposalDetail
);

// ✅ Phase 2: Review actions (Motor)
router.patch(
  '/motor/:proposalId/review',
  requireAdmin,
  adminSession(),
  requirePermission('PROPOSALS:REVIEW'),
  controller.reviewMotorProposal
);

// ✅ Phase 2: Review actions (Travel)
router.patch(
  '/travel/:travelSubtype/:proposalId/review',
  requireAdmin,
  adminSession(),
  requirePermission('PROPOSALS:REVIEW'),
  controller.reviewTravelProposal
);

module.exports = router;
