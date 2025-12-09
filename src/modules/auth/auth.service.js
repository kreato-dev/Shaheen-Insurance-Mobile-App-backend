// src/modules/auth/auth.service.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../../config/db');

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
  const { password_hash, ...rest } = user;
  return rest;
}

/**
 * Register new user
 */
async function registerUser({ fullName, email, mobile, password }) {
  if (!fullName || !mobile || !password) {
    throw httpError(400, 'fullName, mobile and password are required');
  }

  // Check if mobile or email already exists
  const existing = await query(
    'SELECT id FROM users WHERE mobile = ? OR (email IS NOT NULL AND email = ?) LIMIT 1',
    [mobile, email || null]
  );

  if (existing.length > 0) {
    throw httpError(409, 'User with this mobile/email already exists');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await query(
    `INSERT INTO users (full_name, email, mobile, password_hash, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'active', NOW(), NOW())`,
    [fullName, email || null, mobile, passwordHash]
  );

  const inserted = await query('SELECT * FROM users WHERE id = ?', [
    result.insertId,
  ]);

  const user = inserted[0];
  const token = generateJwt(user);

  return {
    user: sanitizeUser(user),
    token,
  };
}

/**
 * Login user with mobile + password
 */
async function loginUser({ mobile, password }) {
  if (!mobile || !password) {
    throw httpError(400, 'mobile and password are required');
  }

  const rows = await query(
    'SELECT * FROM users WHERE mobile = ? LIMIT 1',
    [mobile]
  );

  if (rows.length === 0) {
    throw httpError(401, 'Invalid mobile or password');
  }

  const user = rows[0];

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    throw httpError(401, 'Invalid mobile or password');
  }

  const token = generateJwt(user);

  return {
    user: sanitizeUser(user),
    token,
  };
}

/**
 * Generate OTP for forgot password
 */
async function sendForgotPasswordOtp({ mobile }) {
  if (!mobile) {
    throw httpError(400, 'mobile is required');
  }

  const users = await query(
    'SELECT id FROM users WHERE mobile = ? LIMIT 1',
    [mobile]
  );

  if (users.length === 0) {
    throw httpError(404, 'User with this mobile not found');
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit

  await query(
    `INSERT INTO otp_codes (mobile, otp, purpose, expires_at, created_at)
     VALUES (?, ?, 'forgot_password', DATE_ADD(NOW(), INTERVAL 10 MINUTE), NOW())`,
    [mobile, otp]
  );

  // In real life: send via SMS provider.
  // For dev, you can optionally return OTP if not in production.
  const includeOtp = process.env.NODE_ENV !== 'production';

  return {
    message: 'OTP generated successfully',
    ...(includeOtp ? { otp } : {}),
  };
}

/**
 * Verify OTP and reset password
 */
async function verifyForgotPasswordOtp({ mobile, otp, newPassword }) {
  if (!mobile || !otp || !newPassword) {
    throw httpError(400, 'mobile, otp and newPassword are required');
  }

  const otpRows = await query(
    `SELECT * FROM otp_codes
       WHERE mobile = ? AND otp = ? AND purpose = 'forgot_password'
         AND used_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
    [mobile, otp]
  );

  if (otpRows.length === 0) {
    throw httpError(400, 'Invalid OTP');
  }

  const otpRow = otpRows[0];

  const expiryRows = await query('SELECT NOW() AS now');
  const now = expiryRows[0].now;

  if (new Date(now) > new Date(otpRow.expires_at)) {
    throw httpError(400, 'OTP has expired');
  }

  // Update user password
  const passwordHash = await bcrypt.hash(newPassword, 10);

  const userRows = await query(
    'SELECT id FROM users WHERE mobile = ? LIMIT 1',
    [mobile]
  );

  if (userRows.length === 0) {
    throw httpError(404, 'User not found for this mobile');
  }

  const user = userRows[0];

  await query(
    'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
    [passwordHash, user.id]
  );

  // Mark OTP as used
  await query(
    'UPDATE otp_codes SET used_at = NOW() WHERE id = ?',
    [otpRow.id]
  );

  return {
    message: 'Password reset successfully',
  };
}

/**
 * Get profile for logged-in user
 */
async function getUserProfile(userId) {
  const rows = await query(
    `SELECT id, full_name, email, mobile, address, city_id, cnic, cnic_expiry,
            dob, nationality, gender, status, created_at, updated_at
       FROM users
      WHERE id = ?`,
    [userId]
  );

  if (rows.length === 0) {
    throw httpError(404, 'User not found');
  }

  return rows[0];
}

/**
 * Update profile for logged-in user
 */
async function updateUserProfile(userId, data) {
  const {
    fullName,
    email,
    address,
    cityId,
    cnic,
    cnicExpiry,
    dob,
    nationality,
    gender,
  } = data;

  // Simple validation – you can tighten this with FRD rules
  if (!fullName) {
    throw httpError(400, 'fullName is required');
  }

  await query(
    `UPDATE users
        SET full_name = ?,
            email = ?,
            address = ?,
            city_id = ?,
            cnic = ?,
            cnic_expiry = ?,
            dob = ?,
            nationality = ?,
            gender = ?,
            updated_at = NOW()
      WHERE id = ?`,
    [
      fullName,
      email || null,
      address || null,
      cityId || null,
      cnic || null,
      cnicExpiry || null,
      dob || null,
      nationality || null,
      gender || null,
      userId,
    ]
  );

  return getUserProfile(userId);
}

module.exports = {
  registerUser,
  loginUser,
  sendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  getUserProfile,
  updateUserProfile,
};
