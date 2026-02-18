const { getConnection } = require('../../../../config/db');
const { fireUser } = require('../../../notifications/notification.service');
const E = require('../../../notifications/notification.events');
const templates = require('../../../notifications/notification.templates');
const { logAdminAction } = require('../../adminlogs/admin.logs.service');

function httpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

const ALLOWED_ACTIONS = new Set(['paid', 'reject', 'reupload_required']);

function toClaimUploadsRelativePath(file) {
    return `uploads/claims/motor/${file.filename}`;
}

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

        const [rawDocs] = await conn.execute(
            `SELECT id, doc_type, file_path, created_at FROM motor_claim_documents WHERE claim_id = ? ORDER BY id ASC`,
            [id]
        );

        const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:4000';

        const docs = rawDocs.map(doc => ({
            ...doc,
            file_url: `${APP_BASE_URL}/${doc.file_path}`,
        }));

        if (claim.payment_evidence_path) {
            claim.payment_evidence_url = `${APP_BASE_URL}/${claim.payment_evidence_path}`;
        }
        if (claim.voice_note_path) {
            claim.voice_note_url = `${APP_BASE_URL}/${claim.voice_note_path}`;
        }

        const [surveyorRows] = await conn.execute(
            `SELECT * FROM motor_claim_survey_details WHERE claim_id = ?`,
            [id]
        );

        return { claim, documents: docs, surveyor: surveyorRows[0] || null };
    } finally {
        conn.release();
    }
}

async function assignSurveyor({ adminId, claimId, body }) {
    const id = Number(claimId);
    if (!id || Number.isNaN(id)) throw httpError(400, 'claimId must be a valid number');

    const { surveyorName, surveyorCompany, surveyorContact } = body;
    if (!surveyorName || !surveyorCompany || !surveyorContact) {
        throw httpError(400, 'surveyorName, surveyorCompany, and surveyorContact are required');
    }

    const conn = await getConnection();
    try {
        await conn.beginTransaction();

        const [rows] = await conn.execute(
            `SELECT id, claim_status, fnol_no, user_id FROM motor_claims WHERE id = ? FOR UPDATE`,
            [id]
        );
        if (!rows.length) throw httpError(404, 'Claim not found');
        const claim = rows[0];

        // Allowed transition: pending_review -> assigned_to_surveyor
        // Also allow updating surveyor details if already assigned
        if (!['pending_review', 'assigned_to_surveyor'].includes(claim.claim_status)) {
            throw httpError(400, `Cannot assign surveyor when status is ${claim.claim_status}`);
        }

        // Upsert surveyor details
        await conn.execute(
            `INSERT INTO motor_claim_survey_details
       (claim_id, surveyor_name, surveyor_company, surveyor_contact_number, assigned_by, assigned_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         surveyor_name = VALUES(surveyor_name),
         surveyor_company = VALUES(surveyor_company),
         surveyor_contact_number = VALUES(surveyor_contact_number),
         assigned_by = VALUES(assigned_by),
         assigned_at = NOW(),
         updated_at = NOW()`,
            [id, surveyorName, surveyorCompany, surveyorContact, adminId]
        );

        // Update claim status
        await conn.execute(
            `UPDATE motor_claims SET claim_status = 'assigned_to_surveyor', updated_at = NOW() WHERE id = ?`,
            [id]
        );

        await conn.commit();

        await logAdminAction({
            adminId,
            module: 'MOTOR',
            action: 'CLAIM_ASSIGN_SURVEYOR',
            targetId: id,
            details: { surveyorName, surveyorCompany }
        });

        // Notify User
        const [uRows] = await conn.execute(`SELECT email, full_name FROM users WHERE id = ?`, [claim.user_id]);
        const user = uRows[0];

        if (user) {
            fireUser(E.CLAIM_ASSIGNED_TO_SURVEYOR, {
                user_id: claim.user_id,
                entity_type: 'claim',
                entity_id: id,
                data: { fnol_no: claim.fnol_no, claim_status: 'assigned_to_surveyor' },
                email: user.email ? templates.makeClaimDecisionEmail({
                    to: user.email,
                    fullName: user.full_name,
                    fnolNo: claim.fnol_no,
                    status: 'assigned_to_surveyor'
                }) : null
            });
        }

        return { message: 'Surveyor assigned successfully' };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

async function uploadPaymentEvidenceService({ adminId, claimId, file }) {
    const id = Number(claimId);
    if (!id || Number.isNaN(id)) throw httpError(400, 'claimId must be a valid number');
    if (!file) throw httpError(400, 'File is required');

    const filePath = toClaimUploadsRelativePath(file);

    const conn = await getConnection();
    try {
        await conn.execute(
            `UPDATE motor_claims SET payment_evidence_path = ?, updated_at = NOW() WHERE id = ?`,
            [filePath, id]
        );

        // Log action? Optional.
        return { message: 'Evidence uploaded successfully', filePath };
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
        const allowedFrom = new Set(['pending_review', 'reupload_required', 'submitted', 'assigned_to_surveyor']);
        if (!allowedFrom.has(String(c.claim_status))) {
            throw httpError(400, `Claim is not reviewable in status: ${c.claim_status}`);
        }

        if (action === 'paid') {
            const paymentRef = body.paymentReference || null;
            await conn.execute(
                `
        UPDATE motor_claims
        SET
          claim_status = 'paid',
          payment_reference = ?,
          rejection_reason = NULL,
          reupload_notes = NULL,
          required_docs = NULL,
          updated_at = NOW()
        WHERE id = ?
        `,
                [paymentRef, id]
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

        const [infoRows] = await conn.execute(
            `
            SELECT
                mc.fnol_no,
                mc.user_id,
                mc.reupload_notes,
                mc.required_docs,
                mc.rejection_reason,
                mc.payment_evidence_path,
                u.email,
                u.full_name
            FROM motor_claims mc
            JOIN users u ON u.id = mc.user_id
            WHERE mc.id = ?
            LIMIT 1
            `,
            [id]
        );
        const info = infoRows?.[0] || {};

        await conn.commit();

        await logAdminAction({
            adminId,
            module: 'MOTOR',
            action: `CLAIM_${action.toUpperCase()}`,
            targetId: id,
            details: {
                fnol: info.fnol_no,
                action,
                rejectionReason: body.rejection_reason,
                reuploadNotes: body.reupload_notes,
                paymentReference: body.paymentReference
            }
        });

        // Parse required_docs if string
        let requiredDocsParsed = null;
        if (typeof info.required_docs === 'string') {
            try { requiredDocsParsed = JSON.parse(info.required_docs); } catch (_) { }
        } else {
            requiredDocsParsed = info.required_docs;
        }

        const eventKey =
            action === 'paid' ? E.CLAIM_PAID :
                action === 'reject' ? E.CLAIM_REJECTED :
                    E.CLAIM_REUPLOAD_REQUIRED;

        const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:4000';
        const paymentEvidenceUrl = info.payment_evidence_path ? `${APP_BASE_URL}/${info.payment_evidence_path}` : null;

        fireUser(eventKey, {
            user_id: info.user_id,
            entity_type: 'claim',
            entity_id: id,
            data: {
                fnol_no: info.fnol_no,
                rejection_reason: info.rejection_reason,
                reupload_notes: info.reupload_notes,
                required_docs: requiredDocsParsed,
                payment_reference: body.paymentReference,
                payment_evidence_url: paymentEvidenceUrl,
            },
            email: info.email
                ? templates.makeClaimDecisionEmail({
                    to: info.email,
                    fullName: info.full_name,
                    fnolNo: info.fnol_no,
                    status:
                        action === 'paid' ? 'paid' :
                            action === 'reject' ? 'rejected' :
                                'reupload_required',
                    rejectionReason: info.rejection_reason,
                    reuploadNotes: info.reupload_notes,
                    requiredDocs: requiredDocsParsed,
                    paymentReference: body.paymentReference,
                    paymentEvidenceUrl: paymentEvidenceUrl,
                })
                : null,
        });

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
    assignSurveyor,
    uploadPaymentEvidenceService,
};
