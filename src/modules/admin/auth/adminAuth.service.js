const httpError = require('http-errors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../../../config/db');
const { randomToken, sha256Hex } = require('../../../utils/crypto');
const { logAdminAction } = require('../adminlogs/admin.logs.service');
const { createEmailOtp, verifyEmailOtp } = require('../../auth/otp.service');
const { sendOtpEmail } = require('../../../utils/mailer');

const ADMIN_SESSION_DAYS = 7;

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

exports.login = async ({ email, password }, req) => {
  if (!email || !password) throw httpError(400, 'Email and password are required');

  const rows = await query(
    `SELECT id, full_name, email, password_hash, role, status
     FROM admins
     WHERE email = ?
     LIMIT 1`,
    [email]
  );

  if (!rows.length) throw httpError(401, 'Invalid credentials');

  const admin = rows[0];
  if (admin.status !== 'active') throw httpError(403, 'Admin is inactive');

  const ok = await bcrypt.compare(password, admin.password_hash);
  if (!ok) throw httpError(401, 'Invalid credentials');

  const sessionToken = randomToken(32);
  const tokenHash = sha256Hex(sessionToken);

  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    null;

  const userAgent = req.headers['user-agent'] || null;
  const expiresAt = addDays(new Date(), ADMIN_SESSION_DAYS);

  const insert = await query(
    `INSERT INTO admin_sessions (admin_id, token_hash, ip, user_agent, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [admin.id, tokenHash, ip, userAgent, expiresAt]
  );

  await query(`UPDATE admins SET last_login_at = NOW() WHERE id = ?`, [admin.id]);

  await logAdminAction({
    adminId: admin.id,
    module: 'AUTH',
    action: 'LOGIN',
    targetId: admin.id,
    details: { email: admin.email, role: admin.role },
    ip,
  });

  const accessToken = jwt.sign(
    { adminId: admin.id, sessionId: insert.insertId, st: sessionToken },
    process.env.ADMIN_JWT_SECRET,
    { expiresIn: process.env.ADMIN_JWT_EXPIRES_IN }
  );

  return {
    accessToken,
    admin: {
      id: admin.id,
      name: admin.full_name,
      email: admin.email,
      role: admin.role,
    },
  };
};

exports.logout = async (sessionId) => {
  const rows = await query(`SELECT admin_id FROM admin_sessions WHERE id = ?`, [sessionId]);

  await query(
    `UPDATE admin_sessions
     SET revoked_at = NOW()
     WHERE id = ? AND revoked_at IS NULL`,
    [sessionId]
  );

  if (rows.length > 0) {
    await logAdminAction({
      adminId: rows[0].admin_id,
      module: 'AUTH',
      action: 'LOGOUT',
      targetId: rows[0].admin_id,
      details: { sessionId },
    });
  }
};

exports.changePassword = async (adminId, { oldPassword, newPassword }) => {
  if (!oldPassword || !newPassword) throw httpError(400, 'Old and new password are required');
  if (String(newPassword).length < 8) throw httpError(400, 'Password must be at least 8 characters');

  const rows = await query(`SELECT id, password_hash FROM admins WHERE id = ? LIMIT 1`, [adminId]);
  if (!rows.length) throw httpError(404, 'Admin not found');

  const ok = await bcrypt.compare(oldPassword, rows[0].password_hash);
  if (!ok) throw httpError(401, 'Old password is incorrect');

  const hash = await bcrypt.hash(newPassword, 10);

  await query(`UPDATE admins SET password_hash = ? WHERE id = ?`, [hash, adminId]);

  // kick out all sessions after password change (recommended)
  await query(
    `UPDATE admin_sessions SET revoked_at = NOW()
     WHERE admin_id = ? AND revoked_at IS NULL`,
    [adminId]
  );

  await logAdminAction({
    adminId,
    module: 'AUTH',
    action: 'CHANGE_PASSWORD',
    targetId: adminId,
    details: { success: true },
  });
};

exports.saveAdminFcmToken = async ({ adminId, token, deviceId, platform }) => {
  if (!adminId || !token) {
    throw httpError(400, 'adminId and token are required');
  }

  await query(
    `INSERT INTO admin_fcm_tokens (admin_id, token, device_id, platform, created_at, updated_at)
     VALUES (?, ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE
       token = VALUES(token),
       device_id = VALUES(device_id),
       platform = VALUES(platform),
       updated_at = NOW()`,
    [adminId, token, deviceId || null, platform || null]
  );

  return { message: 'Admin FCM token saved successfully' };
};

exports.removeAdminFcmToken = async ({ adminId, token }) => {
  if (!adminId || !token) throw httpError(400, 'adminId and token are required');
  await query('DELETE FROM admin_fcm_tokens WHERE admin_id = ? AND token = ?', [adminId, token]);
  return { message: 'Admin FCM token removed successfully' };
};

exports.sendForgotPasswordOtp = async ({ email }) => {
  if (!email) throw httpError(400, 'Email is required');

  const rows = await query(`SELECT id, full_name, email, status FROM admins WHERE email = ? LIMIT 1`, [email]);
  if (!rows.length) throw httpError(404, 'Admin not found');
  const admin = rows[0];

  if (admin.status !== 'active') throw httpError(403, 'Admin account is inactive');

  const expiresMinutes = 10;
  const { otp, expiresAt } = await createEmailOtp({
    mobile: null,
    email: admin.email,
    purpose: 'admin_forgot_password',
    expiresMinutes,
  });

  await sendOtpEmail({
    to: admin.email,
    otp,
    purpose: 'admin_forgot_password',
    expiresMinutes,
  });

  await logAdminAction({
    adminId: admin.id,
    module: 'AUTH',
    action: 'FORGOT_PASSWORD_INIT',
    targetId: admin.id,
    details: { email: admin.email },
  });

  return { message: 'OTP sent to email', expiresAt };
};

exports.resetPasswordWithOtp = async ({ email, otp, newPassword }) => {
  if (!email || !otp || !newPassword) throw httpError(400, 'Email, OTP, and new password are required');
  if (String(newPassword).length < 8) throw httpError(400, 'Password must be at least 8 characters');

  await verifyEmailOtp({ email, otp, purpose: 'admin_forgot_password' });

  const rows = await query(`SELECT id FROM admins WHERE email = ? LIMIT 1`, [email]);
  if (!rows.length) throw httpError(404, 'Admin not found');
  const admin = rows[0];

  const hash = await bcrypt.hash(newPassword, 10);
  await query(`UPDATE admins SET password_hash = ? WHERE id = ?`, [hash, admin.id]);
  
  // Revoke all sessions
  await query(`UPDATE admin_sessions SET revoked_at = NOW() WHERE admin_id = ? AND revoked_at IS NULL`, [admin.id]);

  await logAdminAction({
    adminId: admin.id,
    module: 'AUTH',
    action: 'FORGOT_PASSWORD_RESET',
    targetId: admin.id,
    details: { success: true },
  });

  return { message: 'Password reset successfully' };
};
