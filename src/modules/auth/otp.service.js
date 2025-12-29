/*
* otp.service.js = OTP creation/validation + DB operations (reusable for register + forgot)
*/
// src/modules/auth/otp.service.js
const { query } = require('../../config/db');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * Generate numeric OTP (default 6 digits).
 */
function generateOtp(length = 6) {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
}

/**
 * Create OTP and store in DB (email-based).
 * - purpose: 'forgot_password' | 'email_verify'
 * - expiresMinutes: default 5
 *
 * Note: we store OTP in DB (as you requested). Later you can hash it if needed.
 */
async function createEmailOtp({mobile, email, purpose, expiresMinutes = 2 }) {
  if (!email) throw httpError(400, 'email is required');
  if (!purpose) throw httpError(400, 'purpose is required');

  const otp = generateOtp(6);

  // expire after N minutes
  const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);
  const expiresAtSql = expiresAt.toISOString().slice(0, 19).replace('T', ' ');

  // Optional: invalidate previous unused OTPs for same email+purpose
  await query(
    `UPDATE otp_codes
       SET used_at = NOW()
     WHERE email = ? AND purpose = ? AND used_at IS NULL`,
    [email, purpose]
  );

  await query(
    `INSERT INTO otp_codes (mobile, email, otp, purpose, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [mobile, email, otp, purpose, expiresAtSql]
  );

  return { otp, expiresAt };
}

/**
 * Verify OTP:
 * - checks latest unused otp for email+purpose
 * - ensures not expired
 * - marks used_at
 */
async function verifyEmailOtp({ email, otp, purpose }) {
  if (!email) throw httpError(400, 'email is required');
  if (!otp) throw httpError(400, 'otp is required');
  if (!purpose) throw httpError(400, 'purpose is required');

  const rows = await query(
    `SELECT id, otp, expires_at, used_at
       FROM otp_codes
      WHERE email = ? AND purpose = ?
      ORDER BY id DESC
      LIMIT 1`,
    [email, purpose]
  );

  if (rows.length === 0) throw httpError(400, 'OTP not found');

  const record = rows[0];

  if (record.used_at) throw httpError(400, 'OTP already used');

  const now = new Date();
  const expiresAt = new Date(record.expires_at);
  if (expiresAt <= now) throw httpError(400, 'OTP expired');

  if (String(record.otp) !== String(otp)) throw httpError(400, 'Invalid OTP');

  // Mark used
  await query(`UPDATE otp_codes SET used_at = NOW() WHERE id = ?`, [record.id]);

  return true;
}

module.exports = {
  createEmailOtp,
  verifyEmailOtp,
};
