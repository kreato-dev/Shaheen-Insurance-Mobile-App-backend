// src/modules/auth/auth.service.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../../config/db');
const { sendOtpEmail } = require('../../utils/mailer');
const { createEmailOtp, verifyEmailOtp, validateEmailOtp } = require('./otp.service');

const { fireUser } = require('../notifications/notification.service');
const E = require('../notifications/notification.events');
const templates = require('../notifications/notification.templates');


const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Small helper to create HTTP-friendly errors
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function generateJwt(user) {
  const payload = {
    id: user.id,
    mobile: user.mobile,
    email: user.email,
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  return token;
}

function sanitizeUser(user) {
  if (!user) return null;
  const { password_hash, failed_login_attempts, lock_until, is_locked_status, ...rest } = user;
  return rest;
}

/**
 * Register new user
 * - Keep mobile for login
 * - Send OTP to email for verification
 * - Save user with email_verified=0
 */
async function registerUser({ fullName, email, mobile, password }) {
  if (!fullName || !mobile || !password || !email) {
    throw httpError(400, 'All fields are required');
  }

  // 1. Check if user already exists in MAIN table
  const existingUsers = await query(
    `SELECT id FROM users WHERE mobile = ? OR email = ? LIMIT 1`,
    [mobile, email]
  );
  if (existingUsers.length > 0) {
    throw httpError(409, 'User with this mobile or email already exists');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // 2. Insert or Update into TEMP table
  // If user tries to register again before verifying, we update their details
  await query(
    `INSERT INTO temp_users (full_name, email, mobile, password_hash, created_at)
     VALUES (?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       full_name = VALUES(full_name),
       mobile = VALUES(mobile),
       password_hash = VALUES(password_hash),
       created_at = NOW()`,
    [fullName, email, mobile, passwordHash]
  );

  // Generate OTP for email verification and send it
  // OTP is stored in DB (otp_codes), mailer sends email via SMTP
  const { otp } = await createEmailOtp({
    mobile,
    email,
    purpose: 'email_verify',
    expiresMinutes: 2,
  });

  await sendOtpEmail({
    to: email,
    otp,
    purpose: 'email_verify',
    expiresMinutes: 2,
  });

  // We don't auto-login here because email is not verified yet.
  // Frontend should call /verify-email-otp then login.
  return {
    message: 'Registered successfully. OTP sent to email for verification.',
    email,
  };
}

/**
 * Verify email OTP
 * - verifies OTP from DB
 * - updates users.email_verified = 1
 */
async function verifyEmailOtpService({ email, otp }) {
  if (!email || !otp) throw httpError(400, 'email and otp are required');

  // Verify OTP from DB
  await verifyEmailOtp({ email, otp, purpose: 'email_verify' });

  // 1. Retrieve from temp_users
  const tempRows = await query(`SELECT * FROM temp_users WHERE email = ? LIMIT 1`, [email]);

  if (tempRows.length === 0) {
    // Edge case: User might be already verified if they clicked twice, check main table
    const existing = await query(`SELECT id FROM users WHERE email = ? LIMIT 1`, [email]);
    if (existing.length > 0) return { message: 'Email already verified' };

    throw httpError(400, 'Registration session expired or invalid. Please register again.');
  }

  const tempUser = tempRows[0];

  // 2. Move to users table
  const insertRes = await query(
    `INSERT INTO users (full_name, email, mobile, password_hash, status, email_verified, email_verified_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'active', 1, NOW(), NOW(), NOW())`,
    [tempUser.full_name, tempUser.email, tempUser.mobile, tempUser.password_hash]
  );

  const newUserId = insertRes.insertId;

  // 3. Delete from temp_users
  await query(`DELETE FROM temp_users WHERE email = ?`, [email]);

  // ✅ Fetch user object for notification
  const u = { id: newUserId, full_name: tempUser.full_name, email: tempUser.email };

  // ✅ Fire welcome email only once (send-log prevents duplicates)
  if (u?.id && u?.email) {
    try {
      const welcomeEmail = templates.makeWelcomeEmail({
        to: u.email,
        fullName: u.full_name,
      });

      fireUser(E.USER_WELCOME_EMAIL, {
        user_id: u.id,
        entity_type: 'USER',
        entity_id: u.id,
        milestone: 'WELCOME', // 👈 important (dedupe key)
        data: { full_name: u.full_name, email: u.email },
        email: welcomeEmail, // already contains {to, subject, text, html}
      });
    } catch (e) {
      console.log('[NOTIF] USER_WELCOME_EMAIL failed:', e?.message || e);
    }
  }

  return { message: 'Email verified successfully' };
}

/**
 * Re-send email OTP if user requested
 */

async function resendEmailOtpService({ email, purpose }) {
  if (!email) throw httpError(400, 'email is required');

  const allowed = new Set(['email_verify', 'forgot_password']);
  const p = (purpose || 'email_verify').toLowerCase();
  if (!allowed.has(p)) throw httpError(400, 'purpose must be email_verify or forgot_password');

  let mobile = null;

  if (p === 'email_verify') {
    // Check temp_users first
    const temp = await query('SELECT mobile FROM temp_users WHERE email = ? LIMIT 1', [email]);
    if (temp.length > 0) {
      mobile = temp[0].mobile;
    } else {
      // Check if already verified in main table
      const u = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
      if (u.length > 0) return { message: 'Email is already verified.' };
      throw httpError(404, 'Registration not found. Please register again.');
    }
  } else {
    // Forgot password: check main users table
    const u = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (!u.length) return { message: 'OTP resent successfully' }; // Silent fail for security and to prevent email enumeration
  }

  // const expiresMinutes = p === 'forgot_password' ? 10 : 5;

  // Create OTP in DB (same logic as other flows)
  const { otp } = await createEmailOtp({ email, purpose: p, expiresMinutes: 2 });

  // Send it via SMTP (provider swappable)
  await sendOtpEmail({ to: email, otp, purpose: p, expiresMinutes: 2 });

  return { message: 'OTP resent successfully' };
}


/**
 * Login user with mobile + password
 * Block login if email not verified
 */
async function loginUser({ mobile, password }) {
  if (!mobile || !password) {
    throw httpError(400, 'mobile and password are required');
  }

  /*
  * select user and calculate & lock_until > NOW()) AS is_locked_status(1 or 0)
  */
  const rows = await query(
    'SELECT *, (lock_until > NOW()) as is_locked_status FROM users WHERE mobile = ? LIMIT 1',
    [mobile]
  );

  if (rows.length === 0) {
    throw httpError(401, 'Invalid mobile or password');
  }

  const user = rows[0];

  // Check if account is locked
  if (user.is_locked_status == 1) {
    throw httpError(429, 'Account is temporarily locked due to multiple failed login attempts. Please try again later.');
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    
    // Increment failed attempts
    let currentAttempts = user.failed_login_attempts || 0;

    // If account was previously locked but time expired (is_locked_status=0), reset counter
    if (user.lock_until && user.is_locked_status == 0) {
      currentAttempts = 0;
    }

    const newAttempts = currentAttempts + 1;

    if (newAttempts >= 5) {
      // Lock for 15 minutes
      await query(
        'UPDATE users SET failed_login_attempts = ?, lock_until = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id = ?',
        [newAttempts, user.id]
      );
      throw httpError(429, 'Too many failed attempts. Account locked for 15 minutes.');
    } else {
      await query(
        'UPDATE users SET failed_login_attempts = ?, lock_until = NULL WHERE id = ?',
        [newAttempts, user.id]
      );
      const remaining = 5 - newAttempts;
      throw httpError(401, `Invalid mobile or password. ${remaining} attempts remaining.`);
    }
  }

  // force email verification before login:
  if (user.email_verified === 0) {
    throw httpError(403, 'Email is not verified. Please verify OTP first.');
  }

  // Reset failed attempts on successful login
  if (user.failed_login_attempts > 0 || user.lock_until) {
    await query('UPDATE users SET failed_login_attempts = 0, lock_until = NULL WHERE id = ?', [user.id]);
  }

  const token = generateJwt(user);

  return {
    user: sanitizeUser(user),
    token,
  };
}

/**
 * Forgot password OTP (EMAIL ONLY)
 * - user enters email
 * - we create otp purpose='forgot_password'
 * - send email
 *
 * Security note:
 * we return a generic message even if email not found
 */
async function sendForgotPasswordOtp({ email }) {
  if (!email) {
    throw httpError(400, 'email is required');
  }

  const users = await query(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [email]
  );

  // Do not reveal if user exists or not (security)
  if (users.length === 0) {
    return { message: 'If an account exists, OTP has been sent to email.' };
  }

  const { otp } = await createEmailOtp({
    email,
    purpose: 'forgot_password',
    expiresMinutes: 2,
  });

  await sendOtpEmail({
    to: email,
    otp,
    purpose: 'forgot_password',
    expiresMinutes: 2,
  });

  return { message: 'If an account exists, OTP has been sent to email.' };
}

/**
 * Step 1: Verify OTP only (does not consume it)
 */
async function verifyForgotPasswordOtp({ email, otp }) {
  if (!email || !otp) {
    throw httpError(400, 'email and otp are required');
  }

  await validateEmailOtp({ email, otp, purpose: 'forgot_password' });

  return { message: 'OTP verified successfully' };
}

/**
 * Step 2: Consume OTP and reset password
 */
async function resetPasswordWithOtp({ email, otp, newPassword }) {
  if (!email || !otp || !newPassword) {
    throw httpError(400, 'email, otp and New Password are required');
  }

  // Verify OTP from DB and mark used
  await verifyEmailOtp({ email, otp, purpose: 'forgot_password' });

  // Update user password
  const passwordHash = await bcrypt.hash(newPassword, 10);

  const userRows = await query(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [email]
  );

  if (userRows.length === 0) {
    // Keep same message pattern or throw — your call
    throw httpError(404, 'User not found for this email');
  }

  const user = userRows[0];

  await query(
    'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
    [passwordHash, user.id]
  );

  return {
    message: 'Password reset successfully',
  };
}

/**
 * Save FCM Token for Push Notifications
 */
async function saveFcmToken({ userId, token, deviceId, platform }) {
  if (!userId || !token) {
    throw httpError(400, 'userId and token are required');
  }

  await query(
    `INSERT INTO user_fcm_tokens (user_id, token, device_id, platform, created_at, updated_at)
     VALUES (?, ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE
       token = VALUES(token),
       device_id = VALUES(device_id),
       platform = VALUES(platform),
       updated_at = NOW()`,
    [userId, token, deviceId || null, platform || null]
  );

  return { message: 'FCM token saved successfully' };
}

async function removeFcmToken({ userId, token }) {
  if (!userId || !token) throw httpError(400, 'userId and token are required');
  await query('DELETE FROM user_fcm_tokens WHERE user_id = ? AND token = ?', [userId, token]);
  return { message: 'FCM token removed successfully' };
}

module.exports = {
  registerUser,
  verifyEmailOtpService,
  resendEmailOtpService,
  loginUser,
  sendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetPasswordWithOtp,
  saveFcmToken,
  removeFcmToken,
};
