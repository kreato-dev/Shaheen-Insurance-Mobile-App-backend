const { getConnection } = require('../../../../config/db');

function httpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

const ALLOWED_ACTIONS = new Set(['approve', 'reject', 'reupload_required']);

async function adminListMotorClaims({ page = 1, limit = 20, status = null, q = null, from = null, to = null }) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 20));
    const offset = (p - 1) * l;

    const where = [];
    const params = [];

    if (status) {
        where.push(`mc.claim_status = ?`);
        params.push(String(status));
    }

    if (from) {
        where.push(`DATE(mc.created_at) >= ?`);
        params.push(String(from));
    }
    if (to) {
        where.push(`DATE(mc.created_at) <= ?`);
        params.push(String(to));
    }

    if (q) {
        // Adjust user columns if needed
        where.push(`(
      mc.fnol_no LIKE ?
      OR mp.policy_no LIKE ?
      OR mp.registration_number LIKE ?
      OR u.mobile LIKE ?
      OR u.email LIKE ?
      OR u.full_name LIKE ?
    )`);
        const like = `%${String(q).trim()}%`;
        params.push(like, like, like, like, like, like);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const conn = await getConnection();
    try {
        const [rows] = await conn.execute(
            `
      SELECT
        mc.id AS claim_id,
        mc.fnol_no,
        mc.claim_status,
        mc.claim_type,
        mc.incident_date,
        mc.created_at,

        mp.id AS proposal_id,
        mp.policy_no,
        mp.registration_number,

        u.id AS user_id,
        u.full_name,
        u.mobile,
        u.email
      FROM motor_claims mc
      JOIN motor_proposals mp ON mp.id = mc.motor_proposal_id
      JOIN users u ON u.id = mc.user_id
      ${whereSql}
      ORDER BY mc.id DESC
      LIMIT ${l} OFFSET ${offset}
      `,
            params
        );

        return { page: p, limit: l, items: rows };
    } finally {
        conn.release();
    }
}

async function adminGetMotorClaimDetail({ claimId }) {
    const id = Number(claimId);
    if (!id || Number.isNaN(id)) throw httpError(400, 'claimId must be a valid number');

    const conn = await getConnection();
    try {
        const [rows] = await conn.execute(
            `
      SELECT
        mc.*,
        mp.policy_no,
        mp.registration_number,
        u.full_name,
        u.mobile,
        u.email
      FROM motor_claims mc
      JOIN motor_proposals mp ON mp.id = mc.motor_proposal_id
      JOIN users u ON u.id = mc.user_id
      WHERE mc.id = ?
      LIMIT 1
      `,
            [id]
        );

        if (!rows.length) throw httpError(404, 'Claim not found');

        const claim = rows[0];

        // proposal_snapshot_json JSON come as string so parsing it as json
        if (typeof claim.proposal_snapshot_json === 'string') {
            try { claim.proposal_snapshot_json = JSON.parse(claim.proposal_snapshot_json); } catch (_) { }
        }

        const [docs] = await conn.execute(
            `SELECT id, doc_type, file_path, created_at FROM motor_claim_documents WHERE claim_id = ? ORDER BY id ASC`,
            [id]
        );

        return { claim, documents: docs };
    } finally {
        conn.release();
    }
}

async function adminReviewMotorClaim({ adminId, claimId, body }) {
    const id = Number(claimId);
    if (!id || Number.isNaN(id)) throw httpError(400, 'claimId must be a valid number');

    const action = String(body.action || '').trim().toLowerCase();
    if (!ALLOWED_ACTIONS.has(action)) throw httpError(400, 'Invalid action');

    const conn = await getConnection();
    try {
        await conn.beginTransaction();

        const [rows] = await conn.execute(
            `SELECT * FROM motor_claims WHERE id = ? LIMIT 1 FOR UPDATE`,
            [id]
        );
        if (!rows.length) throw httpError(404, 'Claim not found');

        const c = rows[0];

        // Allowed transitions similar to proposals
        const allowedFrom = new Set(['pending_review', 'reupload_required', 'submitted']);
        if (!allowedFrom.has(String(c.claim_status))) {
            throw httpError(400, `Claim is not reviewable in status: ${c.claim_status}`);
        }

        if (action === 'approve') {
            await conn.execute(
                `
        UPDATE motor_claims
        SET
          claim_status = 'approved',
          rejection_reason = NULL,
          reupload_notes = NULL,
          required_docs = NULL,
          updated_at = NOW()
        WHERE id = ?
        `,
                [id]
            );
        }

        if (action === 'reject') {
            const reason = String(body.rejection_reason || '').trim();
            if (!reason) throw httpError(400, 'rejection_reason is required');
            await conn.execute(
                `
        UPDATE motor_claims
        SET
          claim_status = 'rejected',
          rejection_reason = ?,
          reupload_notes = NULL,
          required_docs = NULL,
          updated_at = NOW()
        WHERE id = ?
        `,
                [reason, id]
            );
        }

        if (action === 'reupload_required') {
            const notes = String(body.reupload_notes || '').trim();
            const requiredDocs = body.required_docs || null;

            if (!notes) throw httpError(400, 'reupload_notes is required');

            await conn.execute(
                `
        UPDATE motor_claims
        SET
          claim_status = 'reupload_required',
          reupload_notes = ?,
          required_docs = ?,
          rejection_reason = NULL,
          updated_at = NOW()
        WHERE id = ?
        `,
                [notes, requiredDocs ? JSON.stringify(requiredDocs) : null, id]
            );
        }

        await conn.commit();
        return { claimId: id, action };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

module.exports = {
    adminListMotorClaims,
    adminGetMotorClaimDetail,
    adminReviewMotorClaim,
};
