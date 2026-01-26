// src/modules/notifications/notification.controller.js
const repo = require('./notification.repository');

async function listUser(req, res) {
  const unreadOnly = req.query.unreadOnly === 'true';
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);

  const rows = await repo.listUserNotifications(req.user.id, { unreadOnly, page, limit });
  res.json({ data: rows });
}

async function readOneUser(req, res) {
  await repo.markRead('USER', Number(req.params.id), req.user.id);
  res.json({ message: 'OK' });
}

async function readAllUser(req, res) {
  await repo.markReadAll('USER', req.user.id);
  res.json({ message: 'OK' });
}

module.exports = {
  listUser,
  readOneUser,
  readAllUser,
};
