// src/modules/admin/admin.controller.js
const {
  getDashboardSummary,
  getMotorProposals,
  getTravelProposals,
  getPayments,
} = require('./admin.service');

async function getSummary(req, res, next) {
  try {
    const summary = await getDashboardSummary();
    return res.json({ data: summary });
  } catch (err) {
    next(err);
  }
}

async function listMotorProposals(req, res, next) {
  try {
    const { page, limit, status } = req.query;
    const result = await getMotorProposals({ page, limit, status });
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

async function listTravelProposals(req, res, next) {
  try {
    const { page, limit, status } = req.query;
    const result = await getTravelProposals({ page, limit, status });
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

async function listPayments(req, res, next) {
  try {
    const { page, limit, status, fromDate, toDate } = req.query;
    const result = await getPayments({
      page,
      limit,
      status,
      fromDate,
      toDate,
    });
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSummary,
  listMotorProposals,
  listTravelProposals,
  listPayments,
};
