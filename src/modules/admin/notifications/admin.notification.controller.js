// src/modules/admin/notifications/notification.controller.js
const { query } = require('../../../config/db');
const { fireUser } = require('../../notifications/notification.service');
const E = require('../../notifications/notification.events');
const templates = require('../../notifications/notification.templates');
const repo = require('./admin.notification.repository');

async function listAdmin(req, res) {
  const unreadOnly = req.query.unreadOnly === 'true';
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);

  const rows = await repo.listAdminNotifications(req.admin.id, { unreadOnly, page, limit });
  res.json({ data: rows });
}

async function readOneAdmin(req, res) {
  await repo.markRead('ADMIN', Number(req.params.id), req.admin.id);
  res.json({ message: 'OK' });
}

async function readAllAdmin(req, res) {
  await repo.markReadAll('ADMIN', req.admin.id);
  res.json({ message: 'OK' });
}

async function sendCustomNotification(req, res) {
  const { userId, title, message, data, sendToAll } = req.body;

  if (!title || !message) {
    return res.status(400).json({ message: 'Title and message are required' });
  }

  const payloadData = {
    custom_title: title,
    custom_message: message,
    ...(data || {}),
  };

  if (sendToAll === true) {
    // Fetch all active users
    const users = await query('SELECT id, email, full_name FROM users WHERE status = ?', ['active']);

    let count = 0;
    for (const u of users) {
      const emailObj = u.email ? templates.makeAdminCustomMessageEmail({
        to: u.email,
        fullName: u.full_name,
        title,
        message,
      }) : null;

      await fireUser(E.ADMIN_CUSTOM_MESSAGE, {
        user_id: u.id,
        entity_type: 'admin_notification',
        entity_id: 0,
        data: payloadData,
        email: emailObj,
      });
      count++;
    }
    return res.json({ message: `Notification sent to ${count} users` });
  } else if (userId) {
    const users = await query('SELECT id, email, full_name FROM users WHERE id = ?', [userId]);
    if (!users.length) return res.status(404).json({ message: 'User not found' });
    const u = users[0];

    const emailObj = u.email ? templates.makeAdminCustomMessageEmail({
      to: u.email,
      fullName: u.full_name,
      title,
      message,
    }) : null;

    await fireUser(E.ADMIN_CUSTOM_MESSAGE, {
      user_id: userId,
      entity_type: 'admin_notification',
      entity_id: 0,
      data: payloadData,
      email: emailObj,
    });
    return res.json({ message: 'Notification sent to user' });
  } else {
    return res.status(400).json({ message: 'Provide userId or sendToAll: true' });
  }
}

module.exports = {
  listAdmin,
  readOneAdmin,
  readAllAdmin,
  sendCustomNotification,
};
