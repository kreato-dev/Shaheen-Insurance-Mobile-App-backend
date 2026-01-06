const { query } = require('../../../config/db');
const { createEmailOtp } = require('../../auth/otp.service');
const { sendOtpEmail } = require('../../../utils/mailer');

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

  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    items,
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
  return { user: rows[0] };
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

  // Optional: audit log later (Phase 4/5)
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

  await sendOtpEmail({
    to: user.email,
    otp,
    purpose: 'forgot_password',
    expiresMinutes,
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

module.exports = {
  listUsers,
  getUserById,
  updateUserStatus,
  initiateUserPasswordReset,
};
