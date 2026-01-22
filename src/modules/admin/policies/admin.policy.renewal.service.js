const { getConnection } = require('../../../config/db');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// Same code style as your motor.service.js helper
function toRenewalRelativePath(file) {
  // We always want a URL path, not OS file path
  return `uploads/renewals/${file.filename}`;
}

async function sendMotorRenewalDocService({ adminId, proposalId, renewalFile, renewalNotes }) {
  const id = Number(proposalId);
  if (!id || Number.isNaN(id)) throw httpError(400, 'proposalId must be a valid number');
  if (!renewalFile) throw httpError(400, 'renewal_document file is required');

  const renewalPath = toRenewalRelativePath(renewalFile);
  const notes = renewalNotes ? String(renewalNotes).trim() : null;

  const conn = await getConnection();
  try {
    await conn.beginTransaction();

    // Lock proposal row
    const [rows] = await conn.execute(
      `SELECT * FROM motor_proposals WHERE id = ? LIMIT 1 FOR UPDATE`,
      [id]
    );
    if (!rows.length) throw httpError(404, 'Motor proposal not found');

    const p = rows[0];

    // must be issued
    if (!p.policy_no || !p.policy_status || String(p.policy_status) === 'not_issued') {
      throw httpError(400, 'Policy is not issued for this proposal');
    }

    // must be expired (DB check is the source of truth)
    const [check] = await conn.execute(
      `SELECT (policy_status = 'expired' OR policy_expires_at < CURDATE()) AS isExpired
       FROM motor_proposals
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    const isExpired = !!check?.[0]?.isExpired;
    if (!isExpired) {
      throw httpError(400, 'Renewal can only be sent after the policy expires');
    }

    // Save renewal doc
    await conn.execute(
      `
      UPDATE motor_proposals
      SET
        renewal_document_path = ?,
        renewal_sent_at = NOW(),
        renewal_sent_by_admin_id = ?,
        renewal_notes = ?,
        updated_at = NOW()
      WHERE id = ?
      `,
      [renewalPath, adminId, notes, id]
    );

    await conn.commit();

    return {
      proposalType: 'MOTOR',
      proposalId: id,
      renewalDocumentPath: renewalPath,
      renewalNotes: notes,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  sendMotorRenewalDocService,
};
