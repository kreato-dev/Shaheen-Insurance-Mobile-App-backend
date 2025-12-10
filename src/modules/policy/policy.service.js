// src/modules/policy/policy.service.js
const { query } = require('../../config/db');
const { fetchPoliciesFromCoreMock } = require('../../integrations/coreMock');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * Get CNIC for a logged-in user
 */
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
    throw httpError(400, 'User CNIC is required for policy lookup');
  }
  return user.cnic;
}

/**
 * Get policies for user:
 * - Check policies_cache
 * - If empty, call mock core and seed cache
 */
async function getPoliciesForUser(userId) {
  const cnic = await getUserCnic(userId);

  const cached = await query(
    'SELECT * FROM policies_cache WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );

  if (cached.length > 0) {
    return cached.map((row) => ({
      id: row.id,
      policyNo: row.policy_no,
      product: row.product,
      expiryDate: row.expiry_date,
      status: row.status,
      pdfUrl: row.pdf_url,
      lastSyncedAt: row.last_synced_at,
    }));
  }

  // Call mock core
  const fromCore = await fetchPoliciesFromCoreMock({ cnic });

  // Seed cache
  for (const p of fromCore) {
    await query(
      `INSERT INTO policies_cache
       (user_id, policy_no, product, expiry_date, status, pdf_url, last_synced_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         product = VALUES(product),
         expiry_date = VALUES(expiry_date),
         status = VALUES(status),
         pdf_url = VALUES(pdf_url),
         last_synced_at = NOW(),
         created_at = created_at`,
      [
        userId,
        p.policyNo,
        p.product,
        p.expiryDate,
        p.status,
        p.pdfUrl,
      ]
    );
  }

  const fresh = await query(
    'SELECT * FROM policies_cache WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );

  return fresh.map((row) => ({
    id: row.id,
    policyNo: row.policy_no,
    product: row.product,
    expiryDate: row.expiry_date,
    status: row.status,
    pdfUrl: row.pdf_url,
    lastSyncedAt: row.last_synced_at,
  }));
}

/**
 * Get a single policy by its DB id (for this user)
 */
async function getPolicyByIdForUser(userId, policyId) {
  const rows = await query(
    `SELECT *
       FROM policies_cache
      WHERE id = ? AND user_id = ?
      LIMIT 1`,
    [policyId, userId]
  );

  if (rows.length === 0) {
    throw httpError(404, 'Policy not found for this user');
  }

  const p = rows[0];

  // You can extend this with vehicleInfo / coverageDetails later
  return {
    id: p.id,
    policyNo: p.policy_no,
    product: p.product,
    expiryDate: p.expiry_date,
    status: p.status,
    pdfUrl: p.pdf_url,
    lastSyncedAt: p.last_synced_at,
    coverageDetails: null,
    vehicleInfo: null,
  };
}

module.exports = {
  getPoliciesForUser,
  getPolicyByIdForUser,
};
