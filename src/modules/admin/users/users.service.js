const { query } = require('../../../config/db');
const { createEmailOtp } = require('../../auth/otp.service');
const { sendEmail } = require('../../../utils/mailer');
const templates = require('../../notifications/notification.templates');
const { logAdminAction } = require('../adminlogs/admin.logs.service');

const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:4000';

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

function toInt(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

async function listUsers(qp) {
  const page = toInt(qp.page, 1);
  const limit = Math.min(toInt(qp.limit, 20), 100);
  const offset = (page - 1) * limit;

  const q = qp.q ? String(qp.q).trim() : '';

  const where = [];
  const params = [];

  if (q) {
    where.push(`(
      u.full_name LIKE ?
      OR u.email LIKE ?
      OR u.mobile LIKE ?
      OR u.cnic LIKE ?
    )`);
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const items = await query(
    `
    SELECT
      u.id,
      u.full_name,
      u.email,
      u.email_verified,
      u.mobile,
      u.cnic,
      u.status,
      u.profile_picture,
      u.created_at,
      u.updated_at
    FROM users u
    ${whereSql}
    ORDER BY u.id DESC
    LIMIT ? OFFSET ?
    `,
    [...params, limit, offset]
  );

  const countRows = await query(
    `SELECT COUNT(*) AS total FROM users u ${whereSql}`,
    params
  );

  const total = Number(countRows?.[0]?.total || 0);

  // Map profile picture to full URL
  const itemsWithUrl = items.map((u) => {
    if (u.profile_picture && !u.profile_picture.startsWith('http')) {
      u.profile_picture = `${APP_BASE_URL}/${u.profile_picture}`;
    }
    return u;
  });

  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    items: itemsWithUrl,
  };
}

async function getUserById(userId) {
  const id = Number(userId);
  if (!id || Number.isNaN(id)) throw httpError(400, 'Invalid user id');

  const rows = await query(
    `
    SELECT
      u.id,
      u.full_name,
      u.email,
      u.email_verified,
      u.email_verified_at,
      u.mobile,
      u.address,
      u.city_id,
      u.cnic,
      u.cnic_expiry,
      u.dob,
      u.nationality,
      u.gender,
      u.profile_picture,
      u.status,
      u.created_at,
      u.updated_at
    FROM users u
    WHERE u.id = ?
    LIMIT 1
    `,
    [id]
  );

  if (!rows.length) throw httpError(404, 'User not found');

  const user = rows[0];
  if (user.profile_picture && !user.profile_picture.startsWith('http')) {
    user.profile_picture = `${APP_BASE_URL}/${user.profile_picture}`;
  }
  return user;
}

async function updateUserStatus(userId, status, adminId) {
  const id = Number(userId);
  if (!id || Number.isNaN(id)) throw httpError(400, 'Invalid user id');

  const s = String(status || '').trim().toLowerCase();
  if (!['active', 'inactive'].includes(s)) {
    throw httpError(400, 'Invalid status. Use active|inactive');
  }

  const exists = await query(`SELECT id FROM users WHERE id=? LIMIT 1`, [id]);
  if (!exists.length) throw httpError(404, 'User not found');

  await query(
    `UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?`,
    [s, id]
  );

  await logAdminAction({
    adminId,
    module: 'USERS',
    action: 'UPDATE_STATUS',
    targetId: id,
    details: { status: s },
  });

  return { ok: true, userId: id, status: s, updatedBy: adminId };
}

async function initiateUserPasswordReset(userId, adminId) {
  const id = Number(userId);
  if (!id || Number.isNaN(id)) throw httpError(400, 'Invalid user id');

  const rows = await query(
    `SELECT id, full_name, email, mobile, status FROM users WHERE id=? LIMIT 1`,
    [id]
  );
  if (!rows.length) throw httpError(404, 'User not found');

  const user = rows[0];
  if (user.status !== 'active') throw httpError(400, 'User is inactive');

  if (!user.email) throw httpError(400, 'User email not found');

  const expiresMinutes = 5;

  const { otp, expiresAt } = await createEmailOtp({
    mobile: user.mobile,
    email: user.email,
    purpose: 'forgot_password',
    expiresMinutes,
  });

  await sendEmail(templates.makeUserPasswordResetLinkEmail({
    to: user.email,
    name: user.full_name,
    otp,
    expiresMinutes,
  }));

  await logAdminAction({
    adminId,
    module: 'USERS',
    action: 'INITIATE_RESET',
    targetId: user.id,
    details: { email: user.email },
  });

  return {
    ok: true,
    message: 'OTP sent to user email',
    userId: user.id,
    email: user.email,
    expiresAt,
    initiatedBy: adminId,
  };
}

const TRAVEL_TABLES = {
  DOMESTIC: 'travel_domestic_proposals',
  HAJJ_UMRAH_ZIARAT: 'travel_huj_proposals',
  INTERNATIONAL: 'travel_international_proposals',
  STUDENT_GUARD: 'travel_student_proposals',
};

/**
 * Unified feed for Motor + Travel proposals of user (all travel package tables)
 */
async function getProposalsFeedService(userId, opts = {}) {
  const id = Number(userId);
  if (!id || Number.isNaN(id)) throw httpError(400, 'Invalid user id');

  const page = Number(opts.page || 1);
  const limit = Math.min(Math.max(Number(opts.limit || 20), 1), 100);
  const offset = (page - 1) * limit;

  const unions = [];
  const params = [];

  // --------------------------
  // MOTOR
  // --------------------------
  {
    let where = `WHERE mp.user_id = ? AND mp.submission_status = 'submitted'`;
    params.push(id);

    unions.push(`
      SELECT
        'MOTOR' AS type,
        NULL AS packageCode,
        mp.id AS proposalId,
        mp.submission_status AS submission_status,

        mp.review_status AS review_status,
        mp.payment_status AS payment_status,
        mp.paid_at AS paid_at,

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
    let where = `WHERE tp.user_id = ? AND tp.submission_status = 'submitted'`;
    params.push(id);

    unions.push(`
    SELECT
      'TRAVEL' AS type,
      '${pkgCode}' AS packageCode,
      tp.id AS proposalId,
      tp.submission_status AS submission_status,

      tp.review_status AS review_status,
      tp.payment_status AS payment_status,
      tp.paid_at AS paid_at,

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

      review_status: r.review_status,
      payment_status: r.payment_status,
      paid_at: r.paid_at,

      title: r.title,
      subtitle: r.subtitle,
      premium: r.premium,
      createdAt: r.createdAt,
    })),
  };
}


module.exports = {
  listUsers,
  getUserById,
  updateUserStatus,
  initiateUserPasswordReset,
  getProposalsFeedService,
};
