// src/modules/notifications/notification.repository.js
const { query } = require('../../config/db');

async function insertNotification({ audience, user_id = null, admin_id = null, event_key, title, message, data }) {
  const res = await query(
    `INSERT INTO notifications (audience, user_id, admin_id, event_key, title, message, data)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [audience, user_id, admin_id, event_key, title, message, data ? JSON.stringify(data) : null]
  );
  return res.insertId;
}

async function listUserNotifications(userId, { unreadOnly = false, page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;
  const whereUnread = unreadOnly ? `AND is_read = 0` : '';
  const rows = await query(
    `SELECT id, event_key, title, message, data, is_read, created_at
     FROM notifications
     WHERE audience='USER' AND user_id=? ${whereUnread}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, Number(limit), Number(offset)]
  );
  return rows;
}

async function listAdminNotifications(adminId, { unreadOnly = false, page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;
  const whereUnread = unreadOnly ? `AND is_read = 0` : '';
  const rows = await query(
    `SELECT id, event_key, title, message, data, is_read, created_at
     FROM notifications
     WHERE audience='ADMIN' AND (admin_id=? OR admin_id IS NULL) ${whereUnread}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [adminId, Number(limit), Number(offset)]
  );
  return rows;
}

async function markRead(audience, id, ownerId) {
  if (audience === 'USER') {
    await query(`UPDATE notifications SET is_read=1 WHERE id=? AND audience='USER' AND user_id=?`, [id, ownerId]);
  } else {
    await query(`UPDATE notifications SET is_read=1 WHERE id=? AND audience='ADMIN' AND (admin_id=? OR admin_id IS NULL)`, [id, ownerId]);
  }
}

async function markReadAll(audience, ownerId) {
  if (audience === 'USER') {
    await query(`UPDATE notifications SET is_read=1 WHERE audience='USER' AND user_id=? AND is_read=0`, [ownerId]);
  } else {
    await query(`UPDATE notifications SET is_read=1 WHERE audience='ADMIN' AND (admin_id=? OR admin_id IS NULL) AND is_read=0`, [ownerId]);
  }
}

// --- Send logs for dedupe ---
async function hasSendLog({ audience, event_key, entity_type, entity_id, milestone = null, channel = 'EMAIL' }) {
  const rows = await query(
    `SELECT id FROM notification_send_logs
     WHERE audience=? AND event_key=? AND entity_type=? AND entity_id=? AND channel=?
       AND ((milestone IS NULL AND ? IS NULL) OR milestone = ?)
     LIMIT 1`,
    [audience, event_key, entity_type, entity_id, channel, milestone, milestone]
  );
  return rows.length > 0;
}

async function insertSendLog({ notification_id = null, audience, channel = 'EMAIL', event_key, entity_type, entity_id, milestone = null, status = 'SENT', error_text = null }) {
  await query(
    `INSERT INTO notification_send_logs (notification_id, audience, channel, event_key, entity_type, entity_id, milestone, status, error_text)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [notification_id, audience, channel, event_key, entity_type, entity_id, milestone, status, error_text]
  );
}

module.exports = {
  insertNotification,
  listUserNotifications,
  listAdminNotifications,
  markRead,
  markReadAll,
  hasSendLog,
  insertSendLog,
};
