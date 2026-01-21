const { getConnection } = require('../../../config/db');

function httpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}
function toPolicyScheduleRelativePath(file) {
    // We always want a URL path, not OS file path
    return `uploads/policies/${file.filename}`;
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

async function issuePolicyService({
    adminId,
    proposalType,
    proposalId,
    travelPackageCode,
    policyNo,
    scheduleFile,
}) {
    const type = normalizeProposalType(proposalType);
    const id = Number(proposalId);
    if (!id || Number.isNaN(id)) throw httpError(400, 'proposalId must be a valid number');

    const cleanPolicyNo = String(policyNo || '').trim();
    if (!cleanPolicyNo) throw httpError(400, 'policy_no is required');

    if (!scheduleFile) throw httpError(400, 'policy_schedule file is required');

    const schedulePath = toPolicyScheduleRelativePath(scheduleFile);
    
    const pkgCode =
        type === 'TRAVEL' ? normalizeTravelPackageCode(travelPackageCode) : 'NA';
    if (type === 'TRAVEL' && !pkgCode) throw httpError(400, 'travelPackageCode is required for TRAVEL');

    const conn = await getConnection();

    try {
        await conn.beginTransaction();

        let tableName = null;
        if (type === 'MOTOR') tableName = 'motor_proposals';
        if (type === 'TRAVEL') tableName = TRAVEL_TABLES[pkgCode];

        // Lock proposal row
        const [rows] = await conn.execute(
            `SELECT * FROM ${tableName} WHERE id = ? LIMIT 1 FOR UPDATE`,
            [id]
        );
        if (!rows.length) throw httpError(404, `${type} proposal not found`);

        const proposal = rows[0];

        // Guards
        if (proposal.review_status !== 'approved') {
            throw httpError(400, `${type} proposal must be approved before policy issuance`);
        }
        if (proposal.payment_status !== 'paid') {
            throw httpError(400, `${type} proposal must be paid before policy issuance`);
        }
        if (proposal.policy_status && proposal.policy_status !== 'not_issued') {
            throw httpError(
                409,
                `Policy already issued for this proposal (${proposal.policy_no || 'N/A'})`
            );
        }

        // Dates
        let startDate = null;
        let endDate = null;

        if (type === 'MOTOR') {
            startDate = proposal.insurance_start_date;
            if (!startDate) throw httpError(400, 'insurance_start_date is missing in motor proposal');

            const [endRows] = await conn.execute(
                `SELECT DATE_ADD(?, INTERVAL 1 YEAR) AS endDate`,
                [startDate]
            );
            endDate = endRows?.[0]?.endDate;
            if (!endDate) throw httpError(500, 'Failed to compute policy_expires_at for motor');
        } else {
            // TRAVEL: tenure dates from proposal
            startDate = proposal.start_date;
            endDate = proposal.end_date;

            if (!startDate || !endDate) {
                throw httpError(400, 'start_date/end_date is missing in travel proposal');
            }
        }

        // Optional: policy_no uniqueness within SAME table (recommended)
        const [dup] = await conn.execute(
            `SELECT id FROM ${tableName} WHERE policy_no = ? AND id <> ? LIMIT 1`,
            [cleanPolicyNo, id]
        );
        if (dup.length) {
            throw httpError(409, 'policy_no already exists');
        }

        // Update proposal row with issued policy
        await conn.execute(
            `
      UPDATE ${tableName}
      SET
        policy_status = 'active',
        policy_no = ?,
        policy_issued_at = NOW(),
        policy_expires_at = ?,
        policy_schedule_path = ?,
        updated_at = NOW()
      WHERE id = ?
      `,
            [cleanPolicyNo, endDate, schedulePath, id]
        );

        await conn.commit();

        return {
            proposalType: type,
            proposalId: id,
            travelPackageCode: type === 'TRAVEL' ? pkgCode : 'NA',
            policyNo: cleanPolicyNo,
            policyStatus: 'active',
            policyStartDate: startDate,
            policyExpiresAt: endDate,
            policySchedulePath: schedulePath,
        };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

module.exports = {
    issuePolicyService,
};
