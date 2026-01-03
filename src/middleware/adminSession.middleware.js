const httpError = require('http-errors');
const { query } = require('../config/db');

module.exports = function adminSessionMiddleware(opts = {}) {
  const inactivityMinutes = Number(
    opts.inactivityMinutes || process.env.ADMIN_INACTIVITY_MINUTES || 30
  );
  const inactivityMs = inactivityMinutes * 60 * 1000;

  return async function adminSession(req, res, next) {
    try {
      if (!req.admin || !req.adminSession?.id) return next();

      const sessionId = req.adminSession.id;

      const rows = await query(
        `SELECT id, admin_id, last_activity_at, revoked_at
         FROM admin_sessions
         WHERE id = ? AND admin_id = ?
         LIMIT 1`,
        [sessionId, req.admin.id]
      );

      if (!rows.length) throw httpError(401, 'Invalid session');
      const s = rows[0];

      if (s.revoked_at) throw httpError(401, 'Session revoked');

      const last = new Date(s.last_activity_at).getTime();
      const now = Date.now();

      if (now - last > inactivityMs) {
        await query(
          `UPDATE admin_sessions SET revoked_at = NOW() WHERE id = ?`,
          [sessionId]
        );
        throw httpError(401, 'Session expired (inactivity)');
      }

      await query(
        `UPDATE admin_sessions SET last_activity_at = NOW() WHERE id = ?`,
        [sessionId]
      );

      next();
    } catch (err) {
      next(err);
    }
  };
};
