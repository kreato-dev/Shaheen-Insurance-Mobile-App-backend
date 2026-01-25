// src/modules/admin/refunds/refunds.service.js
const { query, getConnection } = require('../../../config/db');
const { fireUser } = require('../../notifications/notification.service');
const EVENTS = require('../../notifications/notification.events');
const templates = require('../../notifications/notification.templates');


function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

function toInt(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

// builds absolute URL for stored relative paths (same vibe as motor images)
function buildFileUrl(req, filePath) {
  if (!filePath) return null;
  const base =
    process.env.APP_BASE_URL ||
    `${req.protocol}://${req.get('host')}`;
  // stored like: uploads/refunds/xxx.png -> public served at /uploads/...
  return `${base}/${filePath.replace(/^\//, '')}`;
}

const TRAVEL_TABLES = {
  domestic: 'travel_domestic_proposals',
  huj: 'travel_huj_proposals',
  international: 'travel_international_proposals',
  student: 'travel_student_proposals',
};

function getTravelTable(travelSubtype) {
  const key = String(travelSubtype || '').trim().toLowerCase();
  const t = TRAVEL_TABLES[key];
  if (!t) throw httpError(400, 'Invalid travelSubtype. Use: domestic|huj|international|student');
  return t;
}

const ALLOWED_REFUND_STATUS = new Set([
  'not_applicable',
  'refund_initiated',
  'refund_processed',
  'closed',
]);

function normalizeRefundStatus(v) {
  if (v == null || v === '') return null;
  const s = String(v).trim().toLowerCase();
  if (!ALLOWED_REFUND_STATUS.has(s)) {
    throw httpError(400, 'Invalid refund_status. Use: not_applicable|refund_initiated|refund_processed|closed');
  }
  return s;
}

function normalizeAmount(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw httpError(400, 'Invalid refund_amount');
  return n;
}

/**
 * List refunds (unified)
 * - shows only proposals where refund_status != not_applicable OR review_status=rejected AND payment_status=paid
 */
async function listRefunds(qp, req) {
  const page = toInt(qp.page, 1);
  const limit = Math.min(toInt(qp.limit, 20), 100);
  const offset = (page - 1) * limit;

  const status = qp.refund_status ? normalizeRefundStatus(qp.refund_status) : null;
  const type = qp.type ? String(qp.type).trim().toUpperCase() : null; // MOTOR/TRAVEL optional

  // Motor part
  const motorSelect = `
    SELECT
      'MOTOR' AS proposal_type,
      NULL AS travel_subtype,
      p.id AS proposal_id,
      p.user_id,
      p.name AS customer_name,
      p.cnic,
      p.payment_status,
      p.review_status,
      p.refund_status,
      p.refund_amount,
      p.refund_reference,
      p.refund_remarks,
      p.refund_evidence_path,
      p.refund_initiated_at,
      p.refund_processed_at,
      p.closed_at,
      p.updated_at,
      p.created_at
    FROM motor_proposals p
    WHERE (p.refund_status <> 'not_applicable'
      OR (p.review_status='rejected' AND p.payment_status='paid'))
  `;

  // Travel union (4 tables)
  const travelSelect = `
    SELECT 'TRAVEL' AS proposal_type, 'DOMESTIC' AS travel_subtype,
      p.id AS proposal_id, p.user_id,
      CONCAT(COALESCE(p.first_name,''),' ',COALESCE(p.last_name,'')) AS customer_name,
      p.cnic,
      p.payment_status, p.review_status,
      p.refund_status, p.refund_amount, p.refund_reference, p.refund_remarks, p.refund_evidence_path,
      p.refund_initiated_at, p.refund_processed_at, p.closed_at,
      p.updated_at, p.created_at
    FROM travel_domestic_proposals p
    WHERE (p.refund_status <> 'not_applicable' OR (p.review_status='rejected' AND p.payment_status='paid'))

    UNION ALL
    SELECT 'TRAVEL','HAJJ_UMRAH_ZIARAT', p.id, p.user_id,
      CONCAT(COALESCE(p.first_name,''),' ',COALESCE(p.last_name,'')),
      p.cnic,
      p.payment_status, p.review_status,
      p.refund_status, p.refund_amount, p.refund_reference, p.refund_remarks, p.refund_evidence_path,
      p.refund_initiated_at, p.refund_processed_at, p.closed_at,
      p.updated_at, p.created_at
    FROM travel_huj_proposals p
    WHERE (p.refund_status <> 'not_applicable' OR (p.review_status='rejected' AND p.payment_status='paid'))

    UNION ALL
    SELECT 'TRAVEL','INTERNATIONAL', p.id, p.user_id,
      CONCAT(COALESCE(p.first_name,''),' ',COALESCE(p.last_name,'')),
      p.cnic,
      p.payment_status, p.review_status,
      p.refund_status, p.refund_amount, p.refund_reference, p.refund_remarks, p.refund_evidence_path,
      p.refund_initiated_at, p.refund_processed_at, p.closed_at,
      p.updated_at, p.created_at
    FROM travel_international_proposals p
    WHERE (p.refund_status <> 'not_applicable' OR (p.review_status='rejected' AND p.payment_status='paid'))

    UNION ALL
    SELECT 'TRAVEL','STUDENT_GUARD', p.id, p.user_id,
      CONCAT(COALESCE(p.first_name,''),' ',COALESCE(p.last_name,'')),
      p.cnic,
      p.payment_status, p.review_status,
      p.refund_status, p.refund_amount, p.refund_reference, p.refund_remarks, p.refund_evidence_path,
      p.refund_initiated_at, p.refund_processed_at, p.closed_at,
      p.updated_at, p.created_at
    FROM travel_student_proposals p
    WHERE (p.refund_status <> 'not_applicable' OR (p.review_status='rejected' AND p.payment_status='paid'))
  `;

  const unionParts = [];
  if (!type || type === 'MOTOR') unionParts.push(motorSelect);
  if (!type || type === 'TRAVEL') unionParts.push(travelSelect);

  const unionSQL = unionParts.join('\nUNION ALL\n');

  const where = [];
  const params = [];

  if (status) {
    where.push('t.refund_status = ?');
    params.push(status);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const dataSql = `
    SELECT *
    FROM (${unionSQL}) t
    ${whereSql}
    ORDER BY t.updated_at DESC
    LIMIT ? OFFSET ?
  `;
  const items = await query(dataSql, [...params, limit, offset]);

  // add evidence_url
  for (const it of items) {
    it.refund_evidence_url = buildFileUrl(req, it.refund_evidence_path);
  }

  return { page, limit, items };
}

// ---------- Motor refund detail ----------
async function getMotorRefundDetail(proposalId, req) {
  const id = Number(proposalId);
  if (!id || Number.isNaN(id)) throw httpError(400, 'Invalid proposalId');

  const rows = await query(
    `SELECT
      mp.id, mp.user_id, mp.name, mp.cnic,
      mp.payment_status, mp.review_status,
      mp.refund_status, mp.refund_amount, mp.refund_reference, mp.refund_remarks, mp.refund_evidence_path,
      mp.refund_initiated_at, mp.refund_processed_at, mp.closed_at,
      mp.created_at, mp.updated_at,
      u.email, u.full_name
     FROM motor_proposals mp
     JOIN users u ON u.id = mp.user_id
     WHERE mp.id = ? LIMIT 1`,
    [id]
  );

  if (!rows.length) throw httpError(404, 'Motor proposal not found');

  const p = rows[0];
  p.refund_evidence_url = buildFileUrl(req, p.refund_evidence_path);

  return { proposalType: 'MOTOR', proposal: p };
}

// ---------- Travel refund detail ----------
async function getTravelRefundDetail(travelSubtype, proposalId, req) {
  const id = Number(proposalId);
  if (!id || Number.isNaN(id)) throw httpError(400, 'Invalid proposalId');

  const table = getTravelTable(travelSubtype);

  const rows = await query(
    `SELECT
      t.id, t.user_id, t.first_name, t.last_name, t.cnic,
      t.payment_status, t.review_status,
      t.refund_status, t.refund_amount, t.refund_reference, t.refund_remarks, t.refund_evidence_path,
      t.refund_initiated_at, t.refund_processed_at, t.closed_at,
      t.created_at, t.updated_at,
      u.email, u.full_name
     FROM ${table} t
     JOIN users u ON u.id = t.user_id
     WHERE t.id = ? LIMIT 1`,
    [id]
  );

  if (!rows.length) throw httpError(404, 'Travel proposal not found');

  const p = rows[0];
  p.customer_name = `${p.first_name || ''} ${p.last_name || ''}`.trim();
  p.refund_evidence_url = buildFileUrl(req, p.refund_evidence_path);

  return { proposalType: 'TRAVEL', travelSubtype: String(travelSubtype).toLowerCase(), proposal: p };
}

// ---------- Update refund: Motor ----------
async function updateMotorRefund(proposalId, adminId, payload, req) {
  const id = Number(proposalId);
  if (!id || Number.isNaN(id)) throw httpError(400, 'Invalid proposalId');
  if (!adminId) throw httpError(401, 'Admin not found');

  const refund_status = normalizeRefundStatus(payload.refund_status);
  const refund_amount = normalizeAmount(payload.refund_amount);

  const refund_reference = payload.refund_reference ? String(payload.refund_reference).trim() : null;
  const refund_remarks = payload.refund_remarks ? String(payload.refund_remarks).trim() : null;

  const evidence_path = payload.evidence_path || null;

  const conn = await getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(
      `SELECT id, payment_status, review_status, refund_status
       FROM motor_proposals
       WHERE id=? LIMIT 1 FOR UPDATE`,
      [id]
    );
    if (!rows.length) throw httpError(404, 'Motor proposal not found');

    const p = rows[0];

    // Guard: refund only meaningful when rejected + paid (industry rule)
    if (!(p.review_status === 'rejected' && p.payment_status === 'paid')) {
      throw httpError(400, 'Refund is only available for rejected + paid proposals');
    }

    // Apply timestamps based on status transitions
    const now = new Date();
    const setProcessed = refund_status === 'refund_processed';
    const setClosed = refund_status === 'closed';
    const setInitiated = refund_status === 'refund_initiated';

    await conn.execute(
      `
      UPDATE motor_proposals
      SET
        refund_status = COALESCE(?, refund_status),
        refund_amount = COALESCE(?, refund_amount),
        refund_reference = COALESCE(?, refund_reference),
        refund_remarks = COALESCE(?, refund_remarks),
        refund_evidence_path = COALESCE(?, refund_evidence_path),

        refund_initiated_at = CASE
          WHEN ? = 1 THEN COALESCE(refund_initiated_at, NOW())
          ELSE refund_initiated_at
        END,
        refund_processed_at = CASE
          WHEN ? = 1 THEN COALESCE(refund_processed_at, NOW())
          ELSE refund_processed_at
        END,
        closed_at = CASE
          WHEN ? = 1 THEN COALESCE(closed_at, NOW())
          ELSE closed_at
        END,

        admin_last_action_by = ?,
        admin_last_action_at = NOW(),
        updated_at = NOW()
      WHERE id = ?
      `,
      [
        refund_status,
        refund_amount,
        refund_reference,
        refund_remarks,
        evidence_path,
        setInitiated ? 1 : 0,
        setProcessed ? 1 : 0,
        setClosed ? 1 : 0,
        adminId,
        id,
      ]
    );

    await conn.commit();

    const updated = await getMotorRefundDetail(id, req);
    // ✅ notify user on refund update
    try {
      const p = updated.proposal;

      const email = p?.user_id && payload?.refund_status
        ? templates.makeUserRefundStatusUpdatedEmail({
          proposalType: 'MOTOR',
          travelSubtype: null,
          proposalId: p.id,
          refundStatus: payload.refund_status,
          refundAmount: payload.refund_amount ?? p.refund_amount,
          refundReference: payload.refund_reference ?? p.refund_reference,
          refundRemarks: payload.refund_remarks ?? p.refund_remarks,
          refundEvidenceUrl: p.refund_evidence_url,
        })
        : null;

      await fireUser(EVENTS.REFUND_STATUS_UPDATED, {
        user_id: p.user_id,
        entity_type: 'PROPOSAL',
        entity_id: p.id,
        milestone: String(payload.refund_status || '').toUpperCase() || null,
        data: {
          proposal_type: 'MOTOR',
          refund_status: payload.refund_status ?? p.refund_status,
          refund_amount: payload.refund_amount ?? p.refund_amount,
          refund_reference: payload.refund_reference ?? p.refund_reference,
          refund_remarks: payload.refund_remarks ?? p.refund_remarks,
          refund_evidence_url: p.refund_evidence_url,
        },
        email: p?.email ? { to: p.email, ...email } : null, // only if you have email on proposal/user
      });
    } catch (e) {
      console.log('[NOTIF] REFUND_STATUS_UPDATED motor failed:', e?.message || e);
    }

    return { ok: true, ...updated };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ---------- Update refund: Travel ----------
async function updateTravelRefund(travelSubtype, proposalId, adminId, payload, req) {
  const id = Number(proposalId);
  if (!id || Number.isNaN(id)) throw httpError(400, 'Invalid proposalId');
  if (!adminId) throw httpError(401, 'Admin not found');

  const table = getTravelTable(travelSubtype);

  const refund_status = normalizeRefundStatus(payload.refund_status);
  const refund_amount = normalizeAmount(payload.refund_amount);

  const refund_reference = payload.refund_reference ? String(payload.refund_reference).trim() : null;
  const refund_remarks = payload.refund_remarks ? String(payload.refund_remarks).trim() : null;

  const evidence_path = payload.evidence_path || null;

  const conn = await getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(
      `SELECT id, payment_status, review_status, refund_status
       FROM ${table}
       WHERE id=? LIMIT 1 FOR UPDATE`,
      [id]
    );
    if (!rows.length) throw httpError(404, 'Travel proposal not found');

    const p = rows[0];

    if (!(p.review_status === 'rejected' && p.payment_status === 'paid')) {
      throw httpError(400, 'Refund is only available for rejected + paid proposals');
    }

    const setProcessed = refund_status === 'refund_processed';
    const setClosed = refund_status === 'closed';
    const setInitiated = refund_status === 'refund_initiated';

    await conn.execute(
      `
      UPDATE ${table}
      SET
        refund_status = COALESCE(?, refund_status),
        refund_amount = COALESCE(?, refund_amount),
        refund_reference = COALESCE(?, refund_reference),
        refund_remarks = COALESCE(?, refund_remarks),
        refund_evidence_path = COALESCE(?, refund_evidence_path),

        refund_initiated_at = CASE
          WHEN ? = 1 THEN COALESCE(refund_initiated_at, NOW())
          ELSE refund_initiated_at
        END,
        refund_processed_at = CASE
          WHEN ? = 1 THEN COALESCE(refund_processed_at, NOW())
          ELSE refund_processed_at
        END,
        closed_at = CASE
          WHEN ? = 1 THEN COALESCE(closed_at, NOW())
          ELSE closed_at
        END,

        admin_last_action_by = ?,
        admin_last_action_at = NOW(),
        updated_at = NOW()
      WHERE id = ?
      `,
      [
        refund_status,
        refund_amount,
        refund_reference,
        refund_remarks,
        evidence_path,
        setInitiated ? 1 : 0,
        setProcessed ? 1 : 0,
        setClosed ? 1 : 0,
        adminId,
        id,
      ]
    );

    await conn.commit();

    const updated = await getTravelRefundDetail(travelSubtype, id, req);

    // ✅ fire USER notification + EMAIL
    try {
      const u = updated?.proposal; // your getTravelRefundDetail returns { proposalType, travelSubtype, proposal }
      if (u?.user_id) {
        const email =
          u.email
            ? templates.makeUserRefundStatusUpdatedEmail({
              proposalType: 'TRAVEL',
              travelSubtype,
              proposalId: u.id,
              refundStatus: refund_status ?? u.refund_status,
              refundAmount: refund_amount ?? u.refund_amount,
              refundReference: refund_reference ?? u.refund_reference,
              refundRemarks: refund_remarks ?? u.refund_remarks,
              refundEvidenceUrl: u.refund_evidence_url,
            })
            : null;

        await fireUser(EVENTS.REFUND_STATUS_UPDATED, {
          user_id: u.user_id,
          entity_type: 'PROPOSAL',
          entity_id: u.id,
          milestone: String(refund_status || u.refund_status || '').toUpperCase() || null,
          data: {
            proposal_type: 'TRAVEL',
            travel_subtype: String(travelSubtype || '').toUpperCase(),
            proposal_id: u.id,
            refund_status: refund_status ?? u.refund_status,
            refund_amount: refund_amount ?? u.refund_amount,
            refund_reference: refund_reference ?? u.refund_reference,
            refund_remarks: refund_remarks ?? u.refund_remarks,
            refund_evidence_url: u.refund_evidence_url,
          },
          email: email ? { to: u.email, ...email } : null,
        });
      }
    } catch (e) {
      console.log('[NOTIF] REFUND_STATUS_UPDATED travel failed:', e?.message || e);
    }

    return { ok: true, ...updated };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  listRefunds,
  getMotorRefundDetail,
  updateMotorRefund,
  getTravelRefundDetail,
  updateTravelRefund,
};
