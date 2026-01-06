// src/modules/admin/refunds/refunds.controller.js
const refundsService = require('./refunds.service');

async function listRefunds(req, res, next) {
  try {
    const result = await refundsService.listRefunds(req.query, req);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getMotorRefundDetail(req, res, next) {
  try {
    const proposalId = Number(req.params.proposalId);
    const result = await refundsService.getMotorRefundDetail(proposalId, req);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

async function updateMotorRefund(req, res, next) {
  try {
    const proposalId = Number(req.params.proposalId);

    const payload = {
      refund_status: req.body.refund_status,
      refund_amount: req.body.refund_amount,
      refund_reference: req.body.refund_reference,
      refund_remarks: req.body.refund_remarks,
      evidence_path: req.file ? `uploads/refunds/${req.file.filename}` : null,
    };

    const result = await refundsService.updateMotorRefund(
      proposalId,
      req.admin.id,
      payload,
      req
    );

    return res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getTravelRefundDetail(req, res, next) {
  try {
    const travelSubtype = req.params.travelSubtype;
    const proposalId = Number(req.params.proposalId);

    const result = await refundsService.getTravelRefundDetail(
      travelSubtype,
      proposalId,
      req
    );
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

async function updateTravelRefund(req, res, next) {
  try {
    const travelSubtype = req.params.travelSubtype;
    const proposalId = Number(req.params.proposalId);

    const payload = {
      refund_status: req.body.refund_status,
      refund_amount: req.body.refund_amount,
      refund_reference: req.body.refund_reference,
      refund_remarks: req.body.refund_remarks,
      evidence_path: req.file ? `uploads/refunds/${req.file.filename}` : null,
    };

    const result = await refundsService.updateTravelRefund(
      travelSubtype,
      proposalId,
      req.admin.id,
      payload,
      req
    );

    return res.json(result);
  } catch (err) {
    next(err);
  }
}

async function uploadMotorRefundEvidence(req, res, next) {
  try {
    const proposalId = Number(req.params.proposalId);

    const payload = {
      evidence_path: req.file ? `uploads/refunds/${req.file.filename}` : null,
    };

    const result = await refundsService.updateMotorRefund(
      proposalId,
      req.admin.id,
      payload,
      req
    );

    return res.json(result);
  } catch (err) {
    next(err);
  }
}

async function uploadTravelRefundEvidence(req, res, next) {
  try {
    const travelSubtype = req.params.travelSubtype;
    const proposalId = Number(req.params.proposalId);

    const payload = {
      evidence_path: req.file ? `uploads/refunds/${req.file.filename}` : null,
    };

    const result = await refundsService.updateTravelRefund(
      travelSubtype,
      proposalId,
      req.admin.id,
      payload,
      req
    );

    return res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listRefunds,
  getMotorRefundDetail,
  updateMotorRefund,
  getTravelRefundDetail,
  updateTravelRefund,
  uploadMotorRefundEvidence,
  uploadTravelRefundEvidence
};