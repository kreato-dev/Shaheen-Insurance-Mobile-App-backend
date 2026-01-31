const { query } = require('../../../config/db');

/**
 * Log an admin action
 * @param {Object} params
 * @param {number} params.adminId - ID of the admin performing the action
 * @param {string} params.module - 'MOTOR', 'TRAVEL', 'AUTH', 'USERS', etc.
 * @param {string} params.action - 'UPDATE_STATUS', 'LOGIN', 'ISSUE_POLICY'
 * @param {number} [params.targetId] - ID of the entity being affected (Proposal ID, User ID)
 * @param {Object} [params.details] - JSON object with extra info (e.g. { oldStatus: 'pending', newStatus: 'approved' })
 * @param {string} [params.ip] - IP address (optional)
 */
async function logAdminAction({ adminId, module, action, targetId = null, details = null, ip = null }) {
  try {
    await query(
      `INSERT INTO admin_activity_logs (admin_id, module, action, target_id, details, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        adminId,
        String(module).toUpperCase(),
        String(action).toUpperCase(),
        targetId,
        details ? JSON.stringify(details) : null,
        ip
      ]
    );
  } catch (err) {
    // We don't want to fail the main transaction if logging fails
    console.error('[AdminLog] Failed to log action:', err.message);
  }
}

/**
 * Get paginated logs for the Admin Panel
 */
async function getAdminLogs(qp) {
  const page = Number(qp.page) || 1;
  const limit = Number(qp.limit) || 20;
  const offset = (page - 1) * limit;

  const conditions = [];
  const params = [];

  if (qp.adminId) {
    conditions.push('l.admin_id = ?');
    params.push(qp.adminId);
  }

  if (qp.module) {
    conditions.push('l.module = ?');
    params.push(qp.module);
  }

  if (qp.action) {
    conditions.push('l.action LIKE ?');
    params.push(`%${qp.action}%`);
  }

  // Date Range Filter
  if (qp.startDate) {
    conditions.push('DATE(l.created_at) >= ?');
    params.push(qp.startDate);
  }
  if (qp.endDate) {
    conditions.push('DATE(l.created_at) <= ?');
    params.push(qp.endDate);
  }

  const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const rows = await query(
    `SELECT 
        l.id, 
        l.admin_id, 
        a.full_name as admin_name, 
        a.email as admin_email,
        l.module, 
        l.action, 
        l.target_id, 
        l.details, 
        l.ip_address, 
        l.created_at
     FROM admin_activity_logs l
     LEFT JOIN admins a ON a.id = l.admin_id
     ${whereSql}
     ORDER BY l.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const countResult = await query(
    `SELECT COUNT(*) as total FROM admin_activity_logs l ${whereSql}`,
    params
  );

  return {
    items: rows.map(r => {
      let parsedDetails = r.details;
      if (typeof r.details === 'string') {
        try { parsedDetails = JSON.parse(r.details); } catch (_) { }
      }
      return { ...r, details: parsedDetails };
    }),
    total: countResult[0]?.total || 0,
    page,
    limit
  };
}

module.exports = {
  logAdminAction,
  getAdminLogs
};