// src/modules/admin/notifications/notification.controller.js
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

module.exports = {
  listAdmin,
  readOneAdmin,
  readAllAdmin,
};
