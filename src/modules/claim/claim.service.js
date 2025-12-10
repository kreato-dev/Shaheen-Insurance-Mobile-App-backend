// src/modules/claim/claim.service.js
const { query } = require('../../config/db');
const { fetchClaimsFromCoreMock } = require('../../integrations/coreMock');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function getUserCnic(userId) {
  const rows = await query(
    'SELECT id, cnic FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  if (rows.length === 0) {
    throw httpError(404, 'User not found');
  }
  const user = rows[0];
  if (!user.cnic) {
    throw httpError(400, 'User CNIC is required for claim lookup');
  }
  return user.cnic;
}

/**
 * Get claims for user:
 * - Check claims_cache
 * - If empty, call mock core and seed cache
 */
async function getClaimsForUser(userId) {
  const cnic = await getUserCnic(userId);

  const cached = await query(
    'SELECT * FROM claims_cache WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );

  if (cached.length > 0) {
    return cached.map((row) => ({
      id: row.id,
      claimNo: row.claim_no,
      status: row.status,
      incidentDate: row.incident_date,
      lastSyncedAt: row.last_synced_at,
    }));
  }

  const fromCore = await fetchClaimsFromCoreMock({ cnic });

  for (const c of fromCore) {
    await query(
      `INSERT INTO claims_cache
       (user_id, claim_no, status, incident_date, last_synced_at, created_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         status = VALUES(status),
         incident_date = VALUES(incident_date),
         last_synced_at = NOW(),
         created_at = created_at`,
      [userId, c.claimNo, c.status, c.incidentDate]
    );
  }

  const fresh = await query(
    'SELECT * FROM claims_cache WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );

  return fresh.map((row) => ({
    id: row.id,
    claimNo: row.claim_no,
    status: row.status,
    incidentDate: row.incident_date,
    lastSyncedAt: row.last_synced_at,
  }));
}

module.exports = {
  getClaimsForUser,
};
