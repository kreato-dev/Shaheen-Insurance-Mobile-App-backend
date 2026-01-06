// src/modules/proposals/proposals.service.js
const { query } = require('../../config/db');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

const TRAVEL_TABLES = {
  DOMESTIC: 'travel_domestic_proposals',
  HAJJ_UMRAH_ZIARAT: 'travel_huj_proposals',
  INTERNATIONAL: 'travel_international_proposals',
  STUDENT_GUARD: 'travel_student_proposals',
};

/**
 * Unified feed for Motor + Travel proposals (all travel package tables)
 */
async function getMyProposalsFeedService(userId, opts = {}) {
  if (!userId) throw httpError(401, 'User is required');

  const page = Number(opts.page || 1);
  const limit = Math.min(Math.max(Number(opts.limit || 20), 1), 100);
  const offset = (page - 1) * limit;
  const statusFilter = opts.status ? String(opts.status) : null;

  const unions = [];
  const params = [];

  // --------------------------
  // MOTOR
  // --------------------------
  {
    let where = `WHERE mp.user_id = ?`;
    params.push(userId);

    if (statusFilter) {
      where += ` AND mp.submission_status = ?`;
      params.push(statusFilter);
    }

    unions.push(`
      SELECT
        'MOTOR' AS type,
        NULL AS packageCode,
        mp.id AS proposalId,
        mp.submission_status AS submission_status,
        CONCAT(vm.name, ' ', vsm.name, ' ', mp.model_year) AS title,
        mp.registration_number AS subtitle,
        mp.premium AS premium,
        mp.created_at AS createdAt
      FROM motor_proposals mp
      LEFT JOIN vehicle_makes vm ON vm.id = mp.make_id
      LEFT JOIN vehicle_submakes vsm ON vsm.id = mp.submake_id
      ${where}
    `);
  }

  // --------------------------
  // TRAVEL (4 tables)
  // --------------------------
for (const [pkgCode, tableName] of Object.entries(TRAVEL_TABLES)) {
  let where = `WHERE tp.user_id = ?`;
  params.push(userId);

  if (statusFilter) {
    where += ` AND tp.submission_status = ?`;
    params.push(statusFilter);
  }

  unions.push(`
    SELECT
      'TRAVEL' AS type,
      '${pkgCode}' AS packageCode,
      tp.id AS proposalId,
      tp.submission_status AS submission_status,

      -- plan info comes from travel_plans
      CONCAT('${pkgCode}', ' • ', pl.name) AS title,

      CONCAT(tp.tenure_days, ' days • ', tp.first_name, ' ', tp.last_name) AS subtitle,

      tp.final_premium AS premium,
      tp.created_at AS createdAt

    FROM ${tableName} tp
    INNER JOIN travel_plans pl ON pl.id = tp.plan_id
    ${where}
  `);
}


  const unionSql = unions.join(' UNION ALL ');

  // Total count
  const countRows = await query(
    `SELECT COUNT(*) AS total FROM (${unionSql}) AS x`,
    params
  );
  const total = Number(countRows?.[0]?.total || 0);

  // Items
  const rows = await query(
    `SELECT * FROM (${unionSql}) AS x
     ORDER BY x.createdAt DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    page,
    limit,
    total,
    items: rows.map((r) => ({
      type: r.type,                 // MOTOR | TRAVEL
      packageCode: r.packageCode,   // null for MOTOR, else travel pkg code
      proposalId: r.proposalId,
      submission_status: r.submission_status,
      title: r.title,
      subtitle: r.subtitle,
      premium: r.premium,
      createdAt: r.createdAt,
    })),
  };
}

module.exports = {
  getMyProposalsFeedService,
};
