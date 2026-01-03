const httpError = require('http-errors');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { sha256Hex } = require('../utils/crypto');

function getBearer(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return null;
  return h.slice(7).trim();
}

module.exports = async function requireAdmin(req, res, next) {
  try {
    const token = getBearer(req);
    if (!token) throw httpError(401, 'Missing token');

    let payload;
    try {
      payload = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    } catch (e) {
      throw httpError(401, 'Invalid token');
    }

    const { adminId, sessionId, st } = payload || {};
    if (!adminId || !sessionId || !st) throw httpError(401, 'Invalid token payload');

    const admins = await query(
      `SELECT id, full_name, email, role, status
       FROM admins
       WHERE id = ?
       LIMIT 1`,
      [adminId]
    );

    if (!admins.length) throw httpError(401, 'Admin not found');
    const admin = admins[0];
    if (admin.status !== 'active') throw httpError(403, 'Admin is inactive');

    const sessions = await query(
      `SELECT id, admin_id, token_hash, last_activity_at, expires_at, revoked_at
       FROM admin_sessions
       WHERE id = ? AND admin_id = ?
       LIMIT 1`,
      [sessionId, adminId]
    );

    if (!sessions.length) throw httpError(401, 'Invalid session');
    const s = sessions[0];

    if (s.revoked_at) throw httpError(401, 'Session revoked');

    const tokenHash = sha256Hex(st);
    if (String(s.token_hash) !== String(tokenHash)) {
      throw httpError(401, 'Session token mismatch');
    }

    const exp = new Date(s.expires_at).getTime();
    if (Date.now() > exp) throw httpError(401, 'Session expired');

    req.admin = {
      id: admin.id,
      name: admin.full_name,
      email: admin.email,
      role: admin.role,
    };

    req.adminSession = {
      id: s.id,
      lastActivityAt: s.last_activity_at,
      expiresAt: s.expires_at,
    };

    next();
  } catch (err) {
    next(err);
  }
};
