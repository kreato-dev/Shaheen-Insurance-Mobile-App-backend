const { query, getConnection } = require('../../../config/db');
const { buildMotorSelect } = require('./motorQueries');
const { buildTravelSelect } = require('./travelQueries');

//Phase 1
const ALLOWED_TYPES = new Set(['MOTOR', 'TRAVEL']);
const ALLOWED_REVIEW = new Set(['not_applicable', 'pending_review', 'reupload_required', 'approved', 'rejected']);
const ALLOWED_PAYMENT = new Set(['unpaid', 'paid']);
const ALLOWED_SUBMISSION = new Set(['draft', 'submitted']);

function toInt(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function isISODateOnly(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function normalizeTravelSubtype(input) {
  if (!input) return null;
  const v = String(input).trim().toUpperCase();
  if (v === 'HAJJ') return 'HAJJ_UMRAH_ZIARAT';
  if (v === 'STUDENT') return 'STUDENT_GUARD';
  return v;
}

function buildWhereAndParams(filters) {
  const where = [];
  const params = [];

  if (filters.type) {
    where.push('t.proposal_type = ?');
    params.push(filters.type);
  }

  if (filters.travel_subtype) {
    where.push('t.travel_subtype = ?');
    params.push(filters.travel_subtype);
  }

  if (filters.review_status) {
    where.push('t.review_status = ?');
    params.push(filters.review_status);
  }

  if (filters.payment_status) {
    where.push('t.payment_status = ?');
    params.push(filters.payment_status);
  }

  if (filters.submission_status) {
    where.push('t.submission_status = ?');
    params.push(filters.submission_status);
  }

  if (filters.from) {
    where.push('t.created_at >= ?');
    params.push(filters.from + ' 00:00:00');
  }
  if (filters.to) {
    where.push('t.created_at <= ?');
    params.push(filters.to + ' 23:59:59');
  }

  if (filters.q) {
    const q = String(filters.q).trim();
    if (q) {
      const maybeId = Number(q);
      if (Number.isFinite(maybeId) && String(Math.floor(maybeId)) === q) {
        where.push('t.proposal_id = ?');
        params.push(maybeId);
      } else {
        where.push(`(
          t.customer_name LIKE ?
          OR t.mobile LIKE ?
          OR t.email LIKE ?
          OR t.cnic LIKE ?
          OR t.registration_number LIKE ?
        )`);
        const like = `%${q}%`;
        params.push(like, like, like, like, like);
      }
    }
  }

  return {
    whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '',
    params,
  };
}

async function getUnifiedProposals(qp) {
  // ✅ includeTotal must be computed BEFORE queries
  const includeTotal = String(qp.includeTotal ?? 'true').toLowerCase() === 'true';

  const page = toInt(qp.page, 1);
  const limit = Math.min(toInt(qp.limit, 20), 100);
  const offset = (page - 1) * limit;

  const typeRaw = qp.type ? String(qp.type).trim().toUpperCase() : null;
  const type = typeRaw && ALLOWED_TYPES.has(typeRaw) ? typeRaw : null;

  const review_status =
    qp.review_status && ALLOWED_REVIEW.has(String(qp.review_status)) ? String(qp.review_status) : null;

  const payment_status =
    qp.payment_status && ALLOWED_PAYMENT.has(String(qp.payment_status)) ? String(qp.payment_status) : null;

  const submission_status =
    qp.submission_status && ALLOWED_SUBMISSION.has(String(qp.submission_status))
      ? String(qp.submission_status)
      : null;

  const travelSubtypeNorm = normalizeTravelSubtype(qp.travel_subtype);
  const travel_subtype = travelSubtypeNorm || null;

  const from = isISODateOnly(qp.from) ? qp.from : null;
  const to = isISODateOnly(qp.to) ? qp.to : null;

  const q = qp.q ? String(qp.q) : null;

  // If travel subtype is set, it implies TRAVEL
  const effectiveType = travel_subtype && !type ? 'TRAVEL' : type;
  const effectiveTravelSubtype = effectiveType === 'MOTOR' ? null : travel_subtype;

  const motorSQL = buildMotorSelect();
  const travelSQL = buildTravelSelect();

  const unionParts = [];
  if (!effectiveType || effectiveType === 'MOTOR') unionParts.push(motorSQL);
  if (!effectiveType || effectiveType === 'TRAVEL') unionParts.push(travelSQL);

  const unionSQL = unionParts.join('\nUNION ALL\n');

  const { whereSql, params } = buildWhereAndParams({
    type: effectiveType,
    travel_subtype: effectiveTravelSubtype,
    review_status,
    payment_status,
    submission_status,
    from,
    to,
    q,
  });

  // ✅ Fetch items first (fast path)
  const dataSql = `
    SELECT *
    FROM (${unionSQL}) t
    ${whereSql}
    ORDER BY t.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const tData0 = Date.now();
  const items = await query(dataSql, [...params, limit, offset]);
  console.log('[ADMIN][PROPOSALS] data query ms:', Date.now() - tData0);

  // ✅ Count is optional (and often the slow part)
  let total = null;
  let totalPages = null;

  if (includeTotal) {
    const countSql = `
      SELECT COUNT(*) AS total
      FROM (${unionSQL}) t
      ${whereSql}
    `;
    const tCount0 = Date.now();
    const countRows = await query(countSql, params);
    console.log('[ADMIN][PROPOSALS] count query ms:', Date.now() - tCount0);

    total = Number(countRows?.[0]?.total || 0);
    totalPages = Math.ceil(total / limit);
  }

  return {
    page,
    limit,
    total,
    totalPages,
    items,
    includeTotal,
  };

}

// Phase 2
const TRAVEL_TABLES = {
  domestic: {
    proposal: 'travel_domestic_proposals',
    destinations: 'travel_domestic_destinations_selected',
    family: 'travel_domestic_family_members',
    travelType: 'DOMESTIC',
  },
  huj: {
    proposal: 'travel_huj_proposals',
    destinations: 'travel_huj_destinations_selected',
    family: 'travel_huj_family_members',
    travelType: 'HAJJ_UMRAH_ZIARAT',
  },
  international: {
    proposal: 'travel_international_proposals',
    destinations: 'travel_international_destinations_selected',
    family: 'travel_international_family_members',
    travelType: 'INTERNATIONAL',
  },
  student: {
    proposal: 'travel_student_proposals',
    destinations: 'travel_student_destinations_selected',
    family: null, // student has no family table
    travelType: 'STUDENT_GUARD',
  },
};


function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

function getTravelTable(travelSubtype) {
  const t = assertTravelSubtype(travelSubtype); // uses lowercase normalization
  return t.proposal; // <-- return only proposal table name string
}





function assertTravelSubtype(travelSubtype) {
  const key = String(travelSubtype || '').trim().toLowerCase();
  const map = TRAVEL_TABLES[key];
  if (!map) throw httpError(400, 'Invalid travelSubtype. Use: domestic|huj|international|student');
  return map;
}

function assertReviewAction(action) {
  const a = String(action || '').toLowerCase();
  if (!['approve', 'reject', 'reupload_required'].includes(a)) {
    const err = new Error('Invalid action');
    err.statusCode = 400;
    throw err;
  }
  return a;
}

// ------------------------
// Motor detail
// ------------------------
async function getMotorProposalDetail(proposalId) {
  if (!proposalId) {
    const err = new Error('Invalid proposalId');
    err.statusCode = 400;
    throw err;
  }

  const rows = await query(
    `
    SELECT
      p.*,
      u.email AS user_email,
      u.mobile AS user_mobile
    FROM motor_proposals p
    LEFT JOIN users u ON u.id = p.user_id
    WHERE p.id = ?
    LIMIT 1
    `,
    [proposalId]
  );

  if (!rows.length) {
    const err = new Error('Motor proposal not found');
    err.statusCode = 404;
    throw err;
  }

  const proposal = rows[0];
  
  // reupload_required_docs JSON come as string so parsing it as json
  if (typeof proposal.reupload_required_docs === 'string') {
    try { proposal.reupload_required_docs = JSON.parse(proposal.reupload_required_docs); } catch (_) { }
  }

  const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:4000';

  const rawDocuments = await query(
    `SELECT id, doc_type, side, file_path, created_at
   FROM motor_documents
   WHERE proposal_id = ?
   ORDER BY created_at ASC`,
    [proposalId]
  );

  const documents = rawDocuments.map(doc => ({
    ...doc,
    file_url: `${APP_BASE_URL}/${doc.file_path}`,
  }));

  const rawKYCdocuments = await query(
    `SELECT id, doc_type, side, file_path, created_at, updated_at
    FROM kyc_documents
    WHERE proposal_id = ? AND proposal_type = 'MOTOR' 
    ORDER BY created_at ASC`,
    [proposalId]
  );

  const KYCdocuments = rawKYCdocuments.map(doc => ({
    ...doc,
    file_url: `${APP_BASE_URL}/${doc.file_path}`,
  }));

  const rawVehicleImages = await query(
    `SELECT id, image_type, file_path, created_at
    FROM motor_vehicle_images
    WHERE proposal_id = ?
    ORDER BY created_at ASC`,
    [proposalId]
  );

  const vehicleImages = rawVehicleImages.map(img => ({
    ...img,
    image_url: `${APP_BASE_URL}/${img.file_path}`,
  }));


  return {
    proposal,
    documents,
    KYCdocuments,
    vehicleImages,
  };
}

// ------------------------
// Travel detail
// ------------------------
async function getTravelProposalDetail(travelSubtype, proposalId) {
  const id = Number(proposalId);
  if (!id || Number.isNaN(id)) {
    throw httpError(400, 'Invalid proposalId');
  }

  const t = assertTravelSubtype(travelSubtype);

  const proposalRows = await query(
    `SELECT * FROM ${t.proposal} WHERE id = ? LIMIT 1`,
    [id]
  );

  if (!proposalRows.length) throw httpError(404, 'Travel proposal not found');

  const proposal = proposalRows[0];

  // reupload_required_docs JSON come as string so parsing it as json
  if (typeof proposal.reupload_required_docs === 'string') {
    try { proposal.reupload_required_docs = JSON.parse(proposal.reupload_required_docs); } catch (_) { }
  }

  const destinations = await query(
    `SELECT d.id, d.name, d.region
     FROM ${t.destinations} td
     JOIN travel_destinations d ON d.id = td.destination_id
     WHERE td.proposal_id = ?
     ORDER BY d.name ASC`,
    [id]
  );

  let familyMembers = [];
  if (t.family) {
    familyMembers = await query(
      `SELECT *
       FROM ${t.family}
       WHERE proposal_id = ?
       ORDER BY created_at ASC`,
      [id]
    );
  }

  const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:4000';

  const rawDocuments = await query(
    `SELECT id, doc_type, side, file_path, created_at
   FROM travel_documents
   WHERE proposal_id = ?
   ORDER BY created_at ASC`,
    [id]
  );

  const documents = rawDocuments.map(doc => ({
    ...doc,
    file_url: `${APP_BASE_URL}/${doc.file_path}`,
  }));

  const rawKYCdocuments = await query(
    `SELECT id, package_code, doc_type, side, file_path, created_at, updated_at
    FROM kyc_documents
    WHERE proposal_id = ? AND proposal_type = 'TRAVEL' AND package_code = ? 
    ORDER BY created_at ASC`,
    [proposalId, t.travelType]
  );

  const KYCdocuments = rawKYCdocuments.map(doc => ({
    ...doc,
    file_url: `${APP_BASE_URL}/${doc.file_path}`,
  }));

  return {
    travelSubtype: String(travelSubtype).toLowerCase(),
    travelType: t.travelType,
    proposal,
    destinations,
    familyMembers,
    documents,
    KYCdocuments,
  };
}


// ------------------------
// Motor review action
// ------------------------
async function reviewMotorProposal(
  proposalId,
  adminId,
  { action, rejectionReason, reuploadNotes, requiredDocs }
) {
  if (!proposalId) throw httpError(400, 'Invalid proposalId');
  if (!adminId) throw httpError(401, 'Admin not found in request');

  const normalizedAction = String(action || '').toLowerCase();
  if (!['approve', 'reject', 'reupload_required'].includes(normalizedAction)) {
    throw httpError(400, 'Invalid action');
  }

  const conn = await getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(
      `SELECT id, submission_status, payment_status, review_status
       FROM motor_proposals
       WHERE id = ?
       LIMIT 1`,
      [proposalId]
    );

    if (!rows.length) throw httpError(404, 'Motor proposal not found');

    const p = rows[0];

    if (p.submission_status !== 'submitted') {
      throw httpError(400, 'Proposal is not submitted');
    }

    if (p.payment_status !== 'paid') {
      throw httpError(400, 'Cannot review unpaid proposal');
    }

    if (!['pending_review', 'reupload_required'].includes(p.review_status)) {
      throw httpError(400, `Cannot review proposal in status: ${p.review_status}`);
    }

    let newReviewStatus = 'pending_review';
    if (normalizedAction === 'approve') newReviewStatus = 'approved';
    if (normalizedAction === 'reupload_required') newReviewStatus = 'reupload_required';
    if (normalizedAction === 'reject') newReviewStatus = 'rejected';

    const setRefundInitiated = normalizedAction === 'reject';

    await conn.execute(
      `
      UPDATE motor_proposals
      SET
        review_status = ?,
        rejection_reason = ?,
        reupload_notes = ?,
        reupload_required_docs = ?,
        admin_last_action_by = ?,
        admin_last_action_at = NOW(),
        refund_status = CASE
          WHEN ? = 1 THEN 'refund_initiated'
          ELSE refund_status
        END,
        refund_initiated_at = CASE
          WHEN ? = 1 THEN COALESCE(refund_initiated_at, NOW())
          ELSE refund_initiated_at
        END,
        updated_at = NOW()
      WHERE id = ?
      `,
      [
        newReviewStatus,

        // rejection_reason only on reject
        normalizedAction === 'reject' ? rejectionReason : null,

        // reupload_notes only on reupload_required
        normalizedAction === 'reupload_required' ? reuploadNotes : null,

        // required_docs stored as JSON only on reupload_required
        normalizedAction === 'reupload_required' ? JSON.stringify(requiredDocs) : null,

        adminId,
        setRefundInitiated ? 1 : 0,
        setRefundInitiated ? 1 : 0,
        proposalId,
      ]
    );

    await conn.commit();

    return {
      ok: true,
      proposalType: 'MOTOR',
      proposalId,
      review_status: newReviewStatus,
      refund_status: setRefundInitiated ? 'refund_initiated' : undefined,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ------------------------
// Travel review action
// ------------------------
async function reviewTravelProposal(
  travelSubtype,
  proposalId,
  adminId,
  { action, rejectionReason, reuploadNotes, requiredDocs }
) {
  const table = getTravelTable(travelSubtype); // now returns string
  if (!proposalId) throw httpError(400, 'Invalid proposalId');
  if (!adminId) throw httpError(401, 'Admin not found in request');

  const normalizedAction = String(action || '').toLowerCase();
  if (!['approve', 'reject', 'reupload_required'].includes(normalizedAction)) {
    throw httpError(400, 'Invalid action');
  }

  const conn = await getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(
      `SELECT id, submission_status, payment_status, review_status
       FROM ${table}
       WHERE id = ?
       LIMIT 1`,
      [proposalId]
    );

    if (!rows.length) throw httpError(404, 'Travel proposal not found');

    const p = rows[0];

    if (p.submission_status !== 'submitted') {
      throw httpError(400, 'Proposal is not submitted');
    }

    if (p.payment_status !== 'paid') {
      throw httpError(400, 'Cannot review unpaid proposal');
    }

    if (!['pending_review', 'reupload_required'].includes(p.review_status)) {
      throw httpError(400, `Cannot review proposal in status: ${p.review_status}`);
    }

    let newReviewStatus = 'pending_review';
    if (normalizedAction === 'approve') newReviewStatus = 'approved';
    if (normalizedAction === 'reupload_required') newReviewStatus = 'reupload_required';
    if (normalizedAction === 'reject') newReviewStatus = 'rejected';

    const setRefundInitiated = normalizedAction === 'reject';

    await conn.execute(
      `
      UPDATE ${table}
      SET
        review_status = ?,
        rejection_reason = ?,
        reupload_notes = ?,
        reupload_required_docs = ?,
        admin_last_action_by = ?,
        admin_last_action_at = NOW(),
        refund_status = CASE
          WHEN ? = 1 THEN 'refund_initiated'
          ELSE refund_status
        END,
        refund_initiated_at = CASE
          WHEN ? = 1 THEN COALESCE(refund_initiated_at, NOW())
          ELSE refund_initiated_at
        END,
        updated_at = NOW()
      WHERE id = ?
      `,
      [
        newReviewStatus,
        normalizedAction === 'reject' ? rejectionReason : null,
        normalizedAction === 'reupload_required' ? reuploadNotes : null,
        normalizedAction === 'reupload_required' ? JSON.stringify(requiredDocs || []) : null,
        adminId,
        setRefundInitiated ? 1 : 0,
        setRefundInitiated ? 1 : 0,
        proposalId,
      ]
    );

    await conn.commit();

    return {
      ok: true,
      proposalType: 'TRAVEL',
      travelSubtype: String(travelSubtype).toLowerCase(),
      proposalId,
      review_status: newReviewStatus,
      refund_status: setRefundInitiated ? 'refund_initiated' : undefined,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { getUnifiedProposals, getMotorProposalDetail, getTravelProposalDetail, reviewMotorProposal, reviewTravelProposal };