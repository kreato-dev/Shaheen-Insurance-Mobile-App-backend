const { query } = require('../../config/db');
const { deleteFileIfExists } = require('../../utils/fileCleanup');

const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:4000';

/**
 * Get profile for logged-in user
 */
async function getUserProfile(userId) {
  const rows = await query(
    `SELECT id, full_name, email, email_verified, email_verified_at, mobile, address, city_id, cnic, cnic_expiry,
            dob, nationality, gender, profile_picture, status, created_at, updated_at
       FROM users
      WHERE id = ?`,
    [userId]
  );

  if (rows.length === 0) {
    throw httpError(404, 'User not found');
  }

  const user = rows[0];
  if (user.profile_picture && !user.profile_picture.startsWith('http')) {
    user.profile_picture = `${APP_BASE_URL}/${user.profile_picture}`;
  }
  return user;
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

/**
 * Update profile picture path
 */
async function updateProfilePicture(userId, filePath) {
  // Get old profile picture
  const rows = await query('SELECT profile_picture FROM users WHERE id = ?', [userId]);
  const oldPath = rows[0]?.profile_picture;

  await query(
    `UPDATE users SET profile_picture = ?, updated_at = NOW() WHERE id = ?`,
    [filePath, userId]
  );

  if (oldPath && oldPath !== filePath) {
    await deleteFileIfExists(oldPath).catch(() => {});
  }

  return getUserProfile(userId);
}

module.exports = {
  getUserProfile,
  updateUserProfile,
  updateProfilePicture,
};
