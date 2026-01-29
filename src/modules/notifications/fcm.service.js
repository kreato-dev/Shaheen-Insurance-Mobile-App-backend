// src/modules/notifications/fcm.service.js
const admin = require('../../config/firebase');
const { query } = require('../../config/db');

/**
 * Send Push Notification to a specific user (all their active devices)
 */
async function sendPushToUser(userId, title, body, data = {}) {
  try {
    const tokens = await getUserTokens(userId);
    if (!tokens.length) return;

    await sendMulticast(tokens, title, body, data, 'USER');
  } catch (err) {
    console.error(`[FCM] Failed to send to user ${userId}:`, err);
  }
}

/**
 * Send Push Notification to Admins (specific or all)
 */
async function sendPushToAdmins(adminId, title, body, data = {}) {
  try {
    const tokens = await getAdminTokens(adminId);
    if (!tokens.length) return;

    await sendMulticast(tokens, title, body, data, 'ADMIN');
  } catch (err) {
    console.error('[FCM] Failed to send to admins:', err);
  }
}

// --- Helpers ---

async function getUserTokens(userId) {
  const rows = await query(
    'SELECT token FROM user_fcm_tokens WHERE user_id = ?',
    [userId]
  );
  return rows.map((r) => r.token);
}

async function getAdminTokens(adminId) {
  let sql = 'SELECT token FROM admin_fcm_tokens';
  const params = [];
  if (adminId) {
    sql += ' WHERE admin_id = ?';
    params.push(adminId);
  }
  const rows = await query(sql, params);
  return rows.map((r) => r.token);
}

async function sendMulticast(tokens, title, body, data, type) {
  if (!tokens.length) return;

  // Ensure data values are strings (FCM requirement)
  const stringData = {};
  for (const [key, val] of Object.entries(data || {})) {
    stringData[key] = String(val);
  }

  const message = {
    notification: { title, body },
    data: stringData,
    tokens: tokens,
  };

  const response = await admin.messaging().sendEachForMulticast(message);

  // Cleanup invalid tokens
  if (response.failureCount > 0) {
    const failedTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const errCode = resp.error.code;
        if (
          errCode === 'messaging/invalid-registration-token' ||
          errCode === 'messaging/registration-token-not-registered'
        ) {
          failedTokens.push(tokens[idx]);
        }
      }
    });

    if (failedTokens.length > 0) {
      await removeInvalidTokens(failedTokens, type);
    }
  }
}

async function removeInvalidTokens(tokens, type) {
  if (!tokens.length) return;
  const placeholders = tokens.map(() => '?').join(',');
  const table = type === 'ADMIN' ? 'admin_fcm_tokens' : 'user_fcm_tokens';
  await query(
    `DELETE FROM ${table} WHERE token IN (${placeholders})`,
    tokens
  );
}

module.exports = {
  sendPushToUser,
  sendPushToAdmins,
};