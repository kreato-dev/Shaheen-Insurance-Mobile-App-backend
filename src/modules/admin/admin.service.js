// src/modules/admin/admin.service.js
const { query } = require('../../config/db');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * Main dashboard summary:
 * - totalUsers
 * - totalAdmins
 * - totalMotorProposals / paid / pending
 * - totalTravelProposals / paid / pending
 * - totalPayments / sumPaid
 */
async function getDashboardSummary() {
  const usersRows = await query(
    `SELECT
       COUNT(*) AS totalUsers,
       SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) AS totalAdmins
     FROM users`
  );
  const usersSummary = usersRows[0];

  const motorRows = await query(
    `SELECT
       COUNT(*) AS totalMotorProposals,
       SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paidMotorProposals,
       SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) AS pendingMotorProposals
     FROM motor_proposals`
  );
  const motorSummary = motorRows[0];

  const travelRows = await query(
    `SELECT
       COUNT(*) AS totalTravelProposals,
       SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paidTravelProposals,
       SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) AS pendingTravelProposals
     FROM travel_proposals`
  );
  const travelSummary = travelRows[0];

  const paymentsRows = await query(
    `SELECT
       COUNT(*) AS totalPayments,
       SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) AS successfulPayments,
       SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) AS failedPayments,
       COALESCE(SUM(CASE WHEN status = 'SUCCESS' THEN amount ELSE 0 END), 0) AS totalPaidAmount
     FROM payments`
  );
  const paymentSummary = paymentsRows[0];

  return {
    users: {
      total: usersSummary.totalUsers || 0,
      admins: usersSummary.totalAdmins || 0,
    },
    motor: {
      totalProposals: motorSummary.totalMotorProposals || 0,
      paid: motorSummary.paidMotorProposals || 0,
      pending: motorSummary.pendingMotorProposals || 0,
    },
    travel: {
      totalProposals: travelSummary.totalTravelProposals || 0,
      paid: travelSummary.paidTravelProposals || 0,
      pending: travelSummary.pendingTravelProposals || 0,
    },
    payments: {
      totalPayments: paymentsSummaryNumber(paymentSummary.totalPayments),
      successful: paymentsSummaryNumber(paymentSummary.successfulPayments),
      failed: paymentsSummaryNumber(paymentSummary.failedPayments),
      totalPaidAmount: Number(paymentSummary.totalPaidAmount || 0),
    },
  };
}

function paymentsSummaryNumber(n) {
  return n == null ? 0 : Number(n);
}

/**
 * Paginated list of motor proposals with optional status filter.
 */
async function getMotorProposals({ page = 1, limit = 20, status }) {
  page = Number(page) || 1;
  limit = Number(limit) || 20;
  const offset = (page - 1) * limit;

  const params = [];
  let where = 'WHERE 1=1';

  if (status) {
    where += ' AND mp.status = ?';
    params.push(status);
  }

  const countRows = await query(
    `SELECT COUNT(*) AS total
       FROM motor_proposals mp
       ${where}`,
    params
  );
  const total = countRows[0].total || 0;

  const rows = await query(
    `SELECT
       mp.id,
       mp.user_id,
       u.full_name AS customerName,
       mp.product_type,
       mp.registration_number,
       mp.model_year,
       mp.colour,
       mp.sum_insured,
       mp.premium,
       mp.status,
       mp.created_at
     FROM motor_proposals mp
     LEFT JOIN users u ON u.id = mp.user_id
     ${where}
     ORDER BY mp.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    data: rows,
  };
}

/**
 * Paginated list of travel proposals with optional status filter.
 */
async function getTravelProposals({ page = 1, limit = 20, status }) {
  page = Number(page) || 1;
  limit = Number(limit) || 20;
  const offset = (page - 1) * limit;

  const params = [];
  let where = 'WHERE 1=1';

  if (status) {
    where += ' AND tp.status = ?';
    params.push(status);
  }

  const countRows = await query(
    `SELECT COUNT(*) AS total
       FROM travel_proposals tp
       ${where}`,
    params
  );
  const total = countRows[0].total || 0;

  const rows = await query(
    `SELECT
       tp.id,
       tp.user_id,
       u.full_name AS customerName,
       tp.package_type,
       tp.coverage_type,
       tp.start_date,
       tp.end_date,
       tp.tenure_days,
       tp.sum_insured,
       tp.final_premium,
       tp.status,
       tp.created_at
     FROM travel_proposals tp
     LEFT JOIN users u ON u.id = tp.user_id
     ${where}
     ORDER BY tp.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    data: rows,
  };
}

/**
 * Paginated list of payments with optional status and date range filters.
 */
async function getPayments({
  page = 1,
  limit = 20,
  status,
  fromDate,
  toDate,
}) {
  page = Number(page) || 1;
  limit = Number(limit) || 20;
  const offset = (page - 1) * limit;

  const params = [];
  let where = 'WHERE 1=1';

  if (status) {
    where += ' AND p.status = ?';
    params.push(status);
  }

  if (fromDate) {
    where += ' AND DATE(p.created_at) >= ?';
    params.push(fromDate);
  }

  if (toDate) {
    where += ' AND DATE(p.created_at) <= ?';
    params.push(toDate);
  }

  const countRows = await query(
    `SELECT COUNT(*) AS total
       FROM payments p
       ${where}`,
    params
  );
  const total = countRows[0].total || 0;

  const rows = await query(
    `SELECT
       p.id,
       p.user_id,
       u.full_name AS customerName,
       p.application_type,
       p.application_id,
       p.amount,
       p.status,
       p.gateway,
       p.order_id,
       p.gateway_txn_id,
       p.created_at
     FROM payments p
     LEFT JOIN users u ON u.id = p.user_id
     ${where}
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    data: rows,
  };
}

module.exports = {
  getDashboardSummary,
  getMotorProposals,
  getTravelProposals,
  getPayments,
};
