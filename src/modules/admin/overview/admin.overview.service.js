const { query } = require('../../../config/db');

async function getMotorStats({ period, insurance_type }) {
  const params = [];
  let where = 'WHERE 1=1';

  // Filter by Insurance Type (GENERAL / TAKAFUL)
  if (insurance_type) {
    where += ' AND insurance_type = ?';
    params.push(String(insurance_type).toUpperCase());
  }

  // Filter by Period (MTD / YTD) based on created_at
  if (period === 'MTD') {
    // Month to Date
    where += " AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')";
  } else if (period === 'YTD') {
    // Year to Date
    where += " AND created_at >= DATE_FORMAT(NOW(), '%Y-01-01')";
  }

  const sql = `
    SELECT
      -- (i) Total Paid Proposals: paid AND (not rejected AND not not_applicable)
      COUNT(CASE WHEN payment_status = 'paid' AND review_status NOT IN ('rejected', 'not_applicable') THEN 1 END) AS paid_proposals,
      
      -- (ii) Total Unpaid Proposals: unpaid AND expires_at IS NULL
      COUNT(CASE WHEN payment_status = 'unpaid' AND expires_at IS NULL THEN 1 END) AS unpaid_proposals,
      
      -- (iii) Total Issued Policies: active
      COUNT(CASE WHEN policy_status = 'active' THEN 1 END) AS issued_policies,
      
      -- (iv) Total Expired Policies: expired
      COUNT(CASE WHEN policy_status = 'expired' THEN 1 END) AS expired_policies,
      
      -- (v) Total Rejected Proposals: rejected
      COUNT(CASE WHEN review_status = 'rejected' THEN 1 END) AS rejected_proposals
    FROM motor_proposals
    ${where}
  `;

  const rows = await query(sql, params);
  return rows[0];
}

async function getTravelStats({ period, insurance_type }) {
  const params = [];
  let where = 'WHERE 1=1';

  if (insurance_type) {
    where += ' AND insurance_type = ?';
    params.push(String(insurance_type).toUpperCase());
  }

  if (period === 'MTD') {
    where += " AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')";
  } else if (period === 'YTD') {
    where += " AND created_at >= DATE_FORMAT(NOW(), '%Y-01-01')";
  }

  const subQueries = [
    `SELECT 'DOMESTIC' as travel_type, payment_status, review_status, policy_status, expires_at, created_at, insurance_type FROM travel_domestic_proposals`,
    `SELECT 'HAJJ_UMRAH_ZIARAT' as travel_type, payment_status, review_status, policy_status, expires_at, created_at, insurance_type FROM travel_huj_proposals`,
    `SELECT 'INTERNATIONAL' as travel_type, payment_status, review_status, policy_status, expires_at, created_at, insurance_type FROM travel_international_proposals`,
    `SELECT 'STUDENT_GUARD' as travel_type, payment_status, review_status, policy_status, expires_at, created_at, insurance_type FROM travel_student_proposals`
  ];

  const sql = `
    SELECT
      travel_type,
      COUNT(CASE WHEN payment_status = 'paid' AND review_status NOT IN ('rejected', 'not_applicable') THEN 1 END) AS paid_proposals,
      COUNT(CASE WHEN payment_status = 'unpaid' AND expires_at IS NULL THEN 1 END) AS unpaid_proposals,
      COUNT(CASE WHEN policy_status = 'active' THEN 1 END) AS issued_policies,
      COUNT(CASE WHEN policy_status = 'expired' THEN 1 END) AS expired_policies,
      COUNT(CASE WHEN review_status = 'rejected' THEN 1 END) AS rejected_proposals
    FROM (
      ${subQueries.join(' UNION ALL ')}
    ) t
    ${where}
    GROUP BY travel_type
  `;

  const rows = await query(sql, params);

  const breakdown = {};
  const total = {
    paid_proposals: 0,
    unpaid_proposals: 0,
    issued_policies: 0,
    expired_policies: 0,
    rejected_proposals: 0,
  };

  for (const r of rows) {
    const stats = {
      paid_proposals: Number(r.paid_proposals),
      unpaid_proposals: Number(r.unpaid_proposals),
      issued_policies: Number(r.issued_policies),
      expired_policies: Number(r.expired_policies),
      rejected_proposals: Number(r.rejected_proposals),
    };
    breakdown[r.travel_type] = stats;

    total.paid_proposals += stats.paid_proposals;
    total.unpaid_proposals += stats.unpaid_proposals;
    total.issued_policies += stats.issued_policies;
    total.expired_policies += stats.expired_policies;
    total.rejected_proposals += stats.rejected_proposals;
  }

  return { breakdown, total };
}

async function getTotalRevenue({ period, insurance_type }) {
  const params = [];
  let where = "WHERE payment_status = 'paid' AND review_status NOT IN ('rejected', 'not_applicable') AND refund_status = 'not_applicable'";

  if (insurance_type) {
    where += ' AND insurance_type = ?';
    params.push(String(insurance_type).toUpperCase());
  }

  if (period === 'MTD') {
    where += " AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')";
  } else if (period === 'YTD') {
    where += " AND created_at >= DATE_FORMAT(NOW(), '%Y-01-01')";
  }

  // Replicate params for 5 subqueries (1 Motor + 4 Travel)
  const allParams = [...params, ...params, ...params, ...params, ...params];

  const sql = `
    SELECT
      (SELECT COALESCE(SUM(premium), 0) FROM motor_proposals ${where}) AS motor,
      (SELECT COALESCE(SUM(final_premium), 0) FROM travel_domestic_proposals ${where}) AS travel_dom,
      (SELECT COALESCE(SUM(final_premium), 0) FROM travel_huj_proposals ${where}) AS travel_huj,
      (SELECT COALESCE(SUM(final_premium), 0) FROM travel_international_proposals ${where}) AS travel_int,
      (SELECT COALESCE(SUM(final_premium), 0) FROM travel_student_proposals ${where}) AS travel_std
  `;

  const rows = await query(sql, allParams);
  const r = rows[0];

  const motor = Number(r.motor || 0);
  const travel = Number(r.travel_dom || 0) + Number(r.travel_huj || 0) + Number(r.travel_int || 0) + Number(r.travel_std || 0);

  return { totalRevenue: motor + travel, breakdown: { motor, travel } };
}

async function getRevenueChartData({ insurance_type }) {
  const params = [];
  // Filter: Paid, Valid, Last 1 Year
  let where = "WHERE payment_status = 'paid' AND review_status NOT IN ('rejected', 'not_applicable') AND refund_status = 'not_applicable' AND created_at >= (NOW() - INTERVAL 1 YEAR)";

  if (insurance_type) {
    where += ' AND insurance_type = ?';
    params.push(String(insurance_type).toUpperCase());
  }

  // Replicate params for 5 subqueries
  const allParams = [...params, ...params, ...params, ...params, ...params];

  const subQueries = [
    `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as day, premium as amount FROM motor_proposals ${where}`,
    `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as day, final_premium as amount FROM travel_domestic_proposals ${where}`,
    `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as day, final_premium as amount FROM travel_huj_proposals ${where}`,
    `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as day, final_premium as amount FROM travel_international_proposals ${where}`,
    `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as day, final_premium as amount FROM travel_student_proposals ${where}`
  ];

  const sql = `
    SELECT day, SUM(amount) as daily_revenue
    FROM (
      ${subQueries.join(' UNION ALL ')}
    ) t
    GROUP BY day
    ORDER BY day ASC
  `;

  const rows = await query(sql, allParams);

  return rows.map(r => ({
    date: r.day,
    revenue: Number(r.daily_revenue || 0)
  }));
}

async function getUserStats({ period, from, to }) {
  const params = [];
  let whereNew = '';

  if (from && to) {
    whereNew += ' AND DATE(created_at) BETWEEN ? AND ?';
    params.push(from, to);
  } else if (period === 'MTD') {
    whereNew += " AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')";
  } else if (period === 'YTD') {
    whereNew += " AND created_at >= DATE_FORMAT(NOW(), '%Y-01-01')";
  }

  const sql = `
    SELECT
      (SELECT COUNT(*) FROM users WHERE status = 'active') as active_users,
      (SELECT COUNT(*) FROM users WHERE 1=1 ${whereNew}) as new_registrations
  `;

  const rows = await query(sql, params);
  return rows[0];
}
module.exports = { getMotorStats, getTravelStats, getTotalRevenue, getRevenueChartData, getUserStats };
