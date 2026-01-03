const { query } = require('../../../config/db');
const { buildMotorSelect } = require('./motorQueries');
const { buildTravelSelect } = require('./travelQueries');

// temporary
// const { queryWithTimeout } = require('../../../config/db');


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

// temporary
//   const t0 = Date.now();
//   const rows = await query('SELECT id FROM motor_proposals LIMIT 1');
//   console.log('[DEBUG] simple motor query ms:', Date.now() - t0);
//   return { ok: true, rows };
}

module.exports = { getUnifiedProposals };
