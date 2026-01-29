const { query } = require('../../config/db');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * Save FCM Token for Admin Push Notifications
 */
async function saveAdminFcmToken({ adminId, token, deviceId, platform }) {
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
}

async function removeAdminFcmToken({ adminId, token }) {
  if (!adminId || !token) throw httpError(400, 'adminId and token are required');
  await query('DELETE FROM admin_fcm_tokens WHERE admin_id = ? AND token = ?', [adminId, token]);
  return { message: 'Admin FCM token removed successfully' };
}

module.exports = {
  saveAdminFcmToken,
  removeAdminFcmToken,
};