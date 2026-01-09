const { query, getConnection } = require('../../../config/db');

function httpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

/**
 * Travel package -> proposal table
 */
const TRAVEL_TABLES = {
    DOMESTIC: 'travel_domestic_proposals',
    HAJJ_UMRAH_ZIARAT: 'travel_huj_proposals',
    INTERNATIONAL: 'travel_international_proposals',
    STUDENT_GUARD: 'travel_student_proposals',
};

function normalizeProposalType(input) {
    const s = String(input || '').trim().toUpperCase();
    if (s === 'MOTOR') return 'MOTOR';
    if (s === 'TRAVEL') return 'TRAVEL';
    throw httpError(400, 'proposalType must be MOTOR or TRAVEL');
}

function normalizeTravelPackageCode(input) {
    const s = String(input || '').trim().toUpperCase();
    if (!s) return null;
    if (!TRAVEL_TABLES[s]) {
        throw httpError(
            400,
            `Invalid travelPackageCode. Allowed: ${Object.keys(TRAVEL_TABLES).join(', ')}`
        );
    }
    return s;
}

function buildPolicyNo({ proposalType, year, policyId }) {
    const prefix = proposalType === 'MOTOR' ? 'SIC-MOT' : 'SIC-TRV';
    const seq = String(policyId).padStart(6, '0');
    return `${prefix}-${year}-${seq}`;
}

async function fetchTravelSnapshot(conn, tableName, proposalId) {
    // main row
    const [rows] = await conn.execute(
        `SELECT * FROM ${tableName} WHERE id = ? LIMIT 1`,
        [proposalId]
    );
    if (!rows.length) return null;

    const p = rows[0];

    // destinations (table name depends on package table)
    // mapping by known naming convention:
    // travel_international_proposals -> travel_international_destinations_selected
    const destTable = tableName.replace('_proposals', '_destinations_selected');

    let destinations = [];
    try {
        const [destRows] = await conn.execute(
            `
      SELECT ds.destination_id AS destinationId, d.name, d.region
      FROM ${destTable} ds
      JOIN travel_destinations d ON d.id = ds.destination_id
      WHERE ds.proposal_id = ?
      ORDER BY ds.id ASC
      `,
            [proposalId]
        );
        destinations = destRows || [];
    } catch (_) {
        // if table doesn't exist (should exist), ignore snapshot part
        destinations = [];
    }

    // family members table may not exist for student
    // same convention: travel_international_family_members
    const familyTable = tableName.replace('_proposals', '_family_members');

    let familyMembers = [];
    try {
        const [famRows] = await conn.execute(
            `SELECT * FROM ${familyTable} WHERE proposal_id = ? ORDER BY id ASC`,
            [proposalId]
        );
        familyMembers = famRows || [];
    } catch (_) {
        familyMembers = [];
    }

    return {
        proposal: p,
        destinations,
        familyMembers,
    };
}

async function issuePolicyService({ adminId, proposalType, proposalId, travelPackageCode, uploadedDocs }) {
    const type = normalizeProposalType(proposalType);
    const id = Number(proposalId);

    if (!id || Number.isNaN(id)) throw httpError(400, 'proposalId must be a valid number');

    const pkgCode = type === 'TRAVEL' ? normalizeTravelPackageCode(travelPackageCode) : 'NA';
    if (type === 'TRAVEL' && !pkgCode) throw httpError(400, 'travelPackageCode is required for TRAVEL');

    const conn = await getConnection();

    try {
        await conn.beginTransaction();

        // Prevent double issuance at DB level (unique key) + also check early for better message
        const [existing] = await conn.execute(
            `SELECT id, policy_no FROM policies
       WHERE proposal_type = ? AND travel_package_code = ? AND proposal_id = ?
       LIMIT 1`,
            [type, pkgCode || 'NA', id]
        );
        if (existing.length) {
            throw httpError(409, `Policy already issued (${existing[0].policy_no})`);
        }

        // Load proposal with lock
        let proposalRow = null;
        let startDate = null;
        let endDate = null;
        let premium = null;
        let sumInsured = null;
        let snapshot = null;

        if (type === 'MOTOR') {
            const [rows] = await conn.execute(
                `SELECT * FROM motor_proposals WHERE id = ? LIMIT 1 FOR UPDATE`,
                [id]
            );
            if (!rows.length) throw httpError(404, 'Motor proposal not found');

            proposalRow = rows[0];

            // validations
            if (proposalRow.review_status !== 'approved') {
                throw httpError(400, 'Motor proposal must be approved before policy issuance');
            }
            if (proposalRow.payment_status !== 'paid') {
                throw httpError(400, 'Motor proposal must be paid before policy issuance');
            }
            if (proposalRow.policy_status && proposalRow.policy_status !== 'not_issued') {
                // if you use null/active etc
                if (proposalRow.policy_status === 'active') {
                    throw httpError(409, 'Motor policy is already active for this proposal');
                }
            }

            // Motor policy duration: 1 year fixed from today
            const [d] = await conn.execute(`SELECT CURDATE() AS today`);
            startDate = d[0].today;

            const [e] = await conn.execute(`SELECT DATE_ADD(CURDATE(), INTERVAL 1 YEAR) AS endDate`);
            endDate = e[0].endDate;

            premium = proposalRow.premium ?? null;
            sumInsured = proposalRow.sum_insured ?? null;

            snapshot = {
                proposal: proposalRow,
            };
        }

        if (type === 'TRAVEL') {
            const tableName = TRAVEL_TABLES[pkgCode];
            if (!tableName) throw httpError(400, 'Invalid travel package table mapping');

            const [rows] = await conn.execute(
                `SELECT * FROM ${tableName} WHERE id = ? LIMIT 1 FOR UPDATE`,
                [id]
            );
            if (!rows.length) throw httpError(404, 'Travel proposal not found');

            proposalRow = rows[0];

            // validations
            if (proposalRow.review_status !== 'approved') {
                throw httpError(400, 'Travel proposal must be approved before policy issuance');
            }
            if (proposalRow.payment_status !== 'paid') {
                throw httpError(400, 'Travel proposal must be paid before policy issuance');
            }
            if (proposalRow.policy_status && proposalRow.policy_status !== 'not_issued') {
                if (proposalRow.policy_status === 'active') {
                    throw httpError(409, 'Travel policy is already active for this proposal');
                }
            }

            // Travel policy dates = trip dates
            startDate = proposalRow.start_date;
            endDate = proposalRow.end_date;

            if (!startDate || !endDate) {
                throw httpError(500, 'Travel proposal is missing start_date/end_date');
            }

            premium = proposalRow.final_premium ?? proposalRow.base_premium ?? null;
            sumInsured = null; // travel may not have sum insured in your DB currently

            snapshot = await fetchTravelSnapshot(conn, tableName, id);
        }

        const policyPdfPath = uploadedDocs?.policyPdfPath || null;
        const schedulePdfPath = uploadedDocs?.schedulePdfPath || null;

        if (!policyPdfPath || !schedulePdfPath) {
            throw httpError(400, 'Both PDFs are required: policy_pdf and schedule_pdf');
        }

        // Create policy row with TEMP policy_no first
        const [ins] = await conn.execute(
            `
                INSERT INTO policies
                (proposal_type, proposal_id, travel_package_code, policy_no, policy_status,
                issued_at, start_date, end_date, currency, sum_insured, premium,
                policy_pdf_path, schedule_pdf_path,
                issued_by_admin_id, snapshot_json,
                created_at, updated_at)
                VALUES (?, ?, ?, 'TEMP', 'active',
                        NOW(), ?, ?, 'PKR', ?, ?,
                        ?, ?,
                        ?, ?, NOW(), NOW())
                `,
            [
                type,
                id,
                pkgCode || 'NA',
                startDate,
                endDate,
                sumInsured,
                premium,
                policyPdfPath,
                schedulePdfPath,
                adminId,
                snapshot ? JSON.stringify(snapshot) : null,
            ]
        );


        const policyId = ins.insertId;
        const year = new Date().getFullYear();
        const policyNo = buildPolicyNo({ proposalType: type, year, policyId });

        await conn.execute(`UPDATE policies SET policy_no = ? WHERE id = ?`, [policyNo, policyId]);

        // Update proposal row fields for fast app reads
        if (type === 'MOTOR') {
            await conn.execute(
                `
        UPDATE motor_proposals
        SET
          policy_status = 'active',
          policy_no = ?,
          policy_issued_at = NOW(),
          policy_expires_at = ?,
          updated_at = NOW()
        WHERE id = ?
        `,
                [policyNo, endDate, id]
            );
        } else {
            const tableName = TRAVEL_TABLES[pkgCode];
            await conn.execute(
                `
        UPDATE ${tableName}
        SET
          policy_status = 'active',
          policy_no = ?,
          policy_issued_at = NOW(),
          policy_expires_at = ?,
          updated_at = NOW()
        WHERE id = ?
        `,
                [policyNo, endDate, id]
            );
        }

        await conn.commit();

        return {
            policyId,
            policyNo,
            proposalType: type,
            proposalId: id,
            travelPackageCode: pkgCode || 'NA',
            startDate,
            endDate,
        };
    } catch (err) {
        await conn.rollback();

        // If unique key hits, return friendly message
        if (String(err?.code || '').toUpperCase() === 'ER_DUP_ENTRY') {
            throw httpError(409, 'Policy already issued for this proposal');
        }

        throw err;
    } finally {
        conn.release();
    }
}

module.exports = {
    issuePolicyService,
};
