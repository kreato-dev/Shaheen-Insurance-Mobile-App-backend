const { getConnection } = require('../../config/db');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// Same style as your motor.service.js
function toClaimUploadsRelativePath(file) {
  // We always want a URL path, not OS file path
  return `uploads/claims/motor/${file.filename}`;
}

const REQUIRED_DOCS = [
  'vehicle_front',
  'vehicle_back',
  'vehicle_left',
  'vehicle_right',
  'vehicle_damaged',
];

const ALLOWED_CLAIM_TYPES = new Set([
  'accident',
  'theft',
  'third_party',
  'total_loss',
  'fire',
  'natural_calamity',
  'other',
]);

function buildFnolNo({ year, claimId }) {
  const seq = String(claimId).padStart(6, '0');
  return `FNOL-MOT-${year}-${seq}`;
}

function parseBool01(v) {
  if (v === true || v === 1 || v === '1' || v === 'true') return 1;
  return 0;
}

async function getMotorClaimEntryPrefill({ userId, proposalId }) {
  const id = Number(proposalId);
  if (!id || Number.isNaN(id)) throw httpError(400, 'proposalId must be a valid number');

  const conn = await getConnection();
  try {
    // NOTE: adjust column names if your motor_proposals differs
    const [rows] = await conn.execute(
      `
      SELECT
        mp.id AS proposal_id,
        mp.user_id,
        mp.policy_no,
        mp.insurance_start_date,
        mp.policy_expires_at,
        mp.name AS insured_name,
       -- mp.mobile AS contact_number,
       -- mp.email AS email_address,
        mp.registration_number,
        mp.engine_number,
        mp.chassis_number,
        mp.make_id,
        mp.submake_id,
        mp.variant_id,
        mp.model_year
      FROM motor_proposals mp
      WHERE mp.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!rows.length) throw httpError(404, 'Motor proposal not found');

    const p = rows[0];
    if (Number(p.user_id) !== Number(userId)) throw httpError(403, 'Forbidden');

    if (!p.policy_no) throw httpError(400, 'Policy is not issued for this proposal');
    // optional eligibility: active only
    // if (String(p.policy_status) !== 'active') throw httpError(400, 'Policy is not active');

    return {
      proposalId: p.proposal_id,
      policyNo: p.policy_no,
      insuredName: p.insured_name,
      contactNumber: p.contact_number,
      emailAddress: p.email_address,
      vehicleRegistrationNumber: p.registration_number,
      engineNumber: p.engine_number,
      chassisNumber: p.chassis_number,
      makeId: p.make_id,
      submakeId: p.submake_id,
      variantId: p.variant_id,
      modelYear: p.model_year,
      coverageStartDate: p.insurance_start_date,
      coverageEndDate: p.policy_expires_at,
    };
  } finally {
    conn.release();
  }
}

async function submitMotorClaimService({ userId, body, files }) {
  const motorProposalId = Number(body.motor_proposal_id);
  if (!motorProposalId || Number.isNaN(motorProposalId)) {
    throw httpError(400, 'motor_proposal_id is required');
  }

  const claimType = String(body.claim_type || '').trim().toLowerCase();
  if (!ALLOWED_CLAIM_TYPES.has(claimType)) {
    throw httpError(400, 'Invalid claim_type');
  }

  const claimTypeOtherDesc =
    claimType === 'other' ? String(body.claim_type_other_desc || '').trim() : null;
  if (claimType === 'other' && !claimTypeOtherDesc) {
    throw httpError(400, 'claim_type_other_desc is required when claim_type is other');
  }

  const incidentDate = String(body.incident_date || '').trim();
  if (!incidentDate) throw httpError(400, 'incident_date is required');

  const incidentTime = body.incident_time ? String(body.incident_time).trim() : null;

  const cityId = body.city_id ? Number(body.city_id) : null;
  const locationText = body.location_text ? String(body.location_text).trim() : null;

  const latitude = body.latitude ? Number(body.latitude) : null;
  const longitude = body.longitude ? Number(body.longitude) : null;

  const vehicleDrivable = parseBool01(body.vehicle_drivable);
  const policeReportLodged = parseBool01(body.police_report_lodged);

  const claimDescription = String(body.claim_description || '').trim();
  if (!claimDescription) throw httpError(400, 'claim_description is required');

  // Mandatory evidence check
  for (const k of REQUIRED_DOCS) {
    if (!files?.[k]?.[0]) throw httpError(400, `Missing mandatory upload: ${k}`);
  }

  const conn = await getConnection();
  try {
    await conn.beginTransaction();

    // Lock motor proposal
    const [pRows] = await conn.execute(
      `SELECT * FROM motor_proposals WHERE id = ? LIMIT 1 FOR UPDATE`,
      [motorProposalId]
    );
    if (!pRows.length) throw httpError(404, 'Motor proposal not found');

    const p = pRows[0];
    if (Number(p.user_id) !== Number(userId)) throw httpError(403, 'Forbidden');

    if (!p.policy_no || String(p.policy_status || 'not_issued') === 'not_issued') {
      throw httpError(400, 'Policy is not issued for this proposal');
    }

    // Optional but recommended: incident date must be within coverage dates
    if (p.insurance_start_date && p.policy_expires_at) {
      const [coverageCheck] = await conn.execute(
        `SELECT (? BETWEEN ? AND ?) AS ok`,
        [incidentDate, p.insurance_start_date, p.policy_expires_at]
      );
      if (!coverageCheck?.[0]?.ok) {
        throw httpError(400, 'incident_date must be within policy coverage dates');
      }
    }

    // Snapshot minimal proposal info (keeps claim stable even if proposal changes later)
    const snapshot = {
      policy_no: p.policy_no,
      insured_name: p.name ?? null,
      mobile: p.mobile ?? null,
      email: p.email ?? null,
      registration_number: p.registration_number ?? null,
      engine_number: p.engine_number ?? null,
      chassis_number: p.chassis_number ?? null,
      make_id: p.make_id ?? null,
      submake_id: p.submake_id ?? null,
      variant_id: p.variant_id ?? null,
      model_year: p.model_year ?? null,
      coverage_start: p.insurance_start_date ?? null,
      coverage_end: p.policy_expires_at ?? null,
    };

    // Create claim row (pending_review so it appears instantly in admin inbox)
    const [ins] = await conn.execute(
      `
      INSERT INTO motor_claims
      (user_id, motor_proposal_id, fnol_no, claim_status,
       claim_type, claim_type_other_desc,
       incident_date, incident_time,
       city_id, location_text, latitude, longitude,
       vehicle_drivable, police_report_lodged,
       claim_description,
       proposal_snapshot_json,
       created_at, updated_at)
      VALUES
      (?, ?, NULL, 'pending_review',
       ?, ?,
       ?, ?,
       ?, ?, ?, ?,
       ?, ?,
       ?,
       ?,
       NOW(), NOW())
      `,
      [
        userId,
        motorProposalId,
        claimType,
        claimTypeOtherDesc,
        incidentDate,
        incidentTime,
        cityId,
        locationText,
        Number.isFinite(latitude) ? latitude : null,
        Number.isFinite(longitude) ? longitude : null,
        vehicleDrivable,
        policeReportLodged,
        claimDescription,
        JSON.stringify(snapshot),
      ]
    );

    const claimId = ins.insertId;

    // FNOL generation (based on claim id)
    const year = new Date().getFullYear();
    const fnolNo = buildFnolNo({ year, claimId });
    await conn.execute(`UPDATE motor_claims SET fnol_no = ? WHERE id = ?`, [fnolNo, claimId]);

    // Insert docs
    const docInserts = [];

    for (const k of REQUIRED_DOCS) {
      const f = files[k][0];
      docInserts.push([claimId, k, toClaimUploadsRelativePath(f)]);
    }

    // Optional police report
    if (files?.police_report?.[0]) {
      docInserts.push([claimId, 'police_report', toClaimUploadsRelativePath(files.police_report[0])]);
    }

    for (const row of docInserts) {
      await conn.execute(
        `INSERT INTO motor_claim_documents (claim_id, doc_type, file_path, created_at) VALUES (?, ?, ?, NOW())`,
        row
      );
    }

    await conn.commit();

    return {
      claimId,
      fnolNo,
      claimStatus: 'pending_review',
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function listMyMotorClaims({ userId, page = 1, limit = 20, status = null }) {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(100, Math.max(1, Number(limit) || 20));
  const offset = (p - 1) * l;

  const conn = await getConnection();
  try {
    const params = [userId];
    let where = `WHERE mc.user_id = ?`;

    if (status) {
      params.push(String(status));
      where += ` AND mc.claim_status = ?`;
    }

    const [rows] = await conn.execute(
      `
      SELECT
        mc.id AS claim_id,
        mc.fnol_no,
        mc.claim_status,
        mc.claim_type,
        mc.incident_date,
        mc.created_at,
        mp.policy_no,
        mp.registration_number
      FROM motor_claims mc
      JOIN motor_proposals mp ON mp.id = mc.motor_proposal_id
      ${where}
      ORDER BY mc.id DESC
      LIMIT ${l} OFFSET ${offset}
      `,
      params
    );

    return {
      page: p,
      limit: l,
      items: rows,
    };
  } finally {
    conn.release();
  }
}

async function getMyMotorClaimDetail({ userId, claimId }) {
  const id = Number(claimId);
  if (!id || Number.isNaN(id)) throw httpError(400, 'claimId must be a valid number');

  const conn = await getConnection();
  try {
    const [rows] = await conn.execute(
      `
      SELECT
        mc.*,
        mp.policy_no,
        mp.registration_number
      FROM motor_claims mc
      JOIN motor_proposals mp ON mp.id = mc.motor_proposal_id
      WHERE mc.id = ? AND mc.user_id = ?
      LIMIT 1
      `,
      [id, userId]
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

    return {
      claim,
      documents: docs,
    };
  } finally {
    conn.release();
  }
}

module.exports = {
  getMotorClaimEntryPrefill,
  submitMotorClaimService,
  listMyMotorClaims,
  getMyMotorClaimDetail,
};
