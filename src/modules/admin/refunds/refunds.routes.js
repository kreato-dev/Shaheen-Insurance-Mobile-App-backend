const express = require('express');
const router = express.Router();

const requireAdmin  = require('../../../middleware/requireAdmin.middleware');
const requirePermission = require('../../../middleware/rbac.middleware');

const refundsController = require('./refunds.controller');
const { uploadRefundEvidence } = require('./refunds.upload');

// List inbox
router.get(
  '/',
  requireAdmin,
  requirePermission('REFUNDS:MANAGE'),
  refundsController.listRefunds
);

// Detail
router.get(
  '/motor/:proposalId',
  requireAdmin,
  requirePermission('REFUNDS:MANAGE'),
  refundsController.getMotorRefundDetail
);

router.get(
  '/travel/:travelSubtype/:proposalId',
  requireAdmin,
  requirePermission('REFUNDS:MANAGE'),
  refundsController.getTravelRefundDetail
);

// Update refund fields
router.patch(
  '/motor/:proposalId',
  requireAdmin,
  requirePermission('REFUNDS:MANAGE'),
  refundsController.updateMotorRefund
);

router.patch(
  '/travel/:travelSubtype/:proposalId',
  requireAdmin,
  requirePermission('REFUNDS:MANAGE'),
  refundsController.updateTravelRefund
);

// Evidence upload 
router.post(
  '/motor/:proposalId/evidence',
  requireAdmin,
  requirePermission('REFUNDS:MANAGE'),
  uploadRefundEvidence.single('evidence'),
  refundsController.uploadMotorRefundEvidence
);

router.post(
  '/travel/:travelSubtype/:proposalId/evidence',
  requireAdmin,
  requirePermission('REFUNDS:MANAGE'),
  uploadRefundEvidence.single('evidence'),
  refundsController.uploadTravelRefundEvidence
);

module.exports = router;
