// src/modules/travel/travel.service.js
const { query, getConnection } = require('../../config/db');
const { deleteFileIfExists } = require('../../utils/fileCleanup');
const { fireAdmin } = require('../notifications/notification.service');
const E = require('../notifications/notification.events');
const templates = require('../notifications/notification.templates');


/**
 * Small helper to throw HTTP-like errors from service layer
 * Your global error middleware should read err.status
 */
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * mappings for reupload/replace travel documents
**/
const TRAVEL_FIELD_MAP = {
  cnic_front: { docType: 'CNIC', side: 'front' },
  cnic_back: { docType: 'CNIC', side: 'back' },
  passport_image: { docType: 'PASSPORT', side: 'single' },
  ticket_image: { docType: 'TICKET', side: 'single' },

  employment_proof: { docType: 'EMPLOYMENT_PROOF', side: 'single' },
  source_of_income_proof: { docType: 'SOURCE_OF_INCOME_PROOF', side: 'single' },
};

/**
 * KYC document types that are stored in the kyc_documents table
 * (as opposed to travel_documents)
 */
const KYC_DOC_TYPES = new Set(['EMPLOYMENT_PROOF', 'SOURCE_OF_INCOME_PROOF']);


/**
 * Map packageCode -> table names
 */
const PACKAGE_TABLES = {
  DOMESTIC: {
    proposals: 'travel_domestic_proposals',
    destinations: 'travel_domestic_destinations_selected',
    family: 'travel_domestic_family_members',
  },
  HAJJ_UMRAH_ZIARAT: {
    proposals: 'travel_huj_proposals',
    destinations: 'travel_huj_destinations_selected',
    family: 'travel_huj_family_members',
  },
  INTERNATIONAL: {
    proposals: 'travel_international_proposals',
    destinations: 'travel_international_destinations_selected',
    family: 'travel_international_family_members',
  },
  STUDENT_GUARD: {
    proposals: 'travel_student_proposals',
    destinations: 'travel_student_destinations_selected',
  },
};

// Domestic: fixed destination id (seeded in travel_destinations table)
const DOMESTIC_ANYWHERE_DEST_ID = Number(process.env.DOMESTIC_ANYWHERE_DEST_ID || 195);

/* =========================
   Upload helpers (NEW)
   ========================= */

function toUploadsRelativePathTravel(file) {
  return `uploads/travel/${file.filename}`;
}

async function assertTravelProposalOwnership(conn, packageCode, proposalId, userId) {
  const tables = PACKAGE_TABLES[packageCode];
  if (!tables) throw httpError(400, 'Invalid package');

  const [rows] = await conn.execute(
    `SELECT id FROM ${tables.proposals} WHERE id = ? AND user_id = ? LIMIT 1`,
    [proposalId, userId]
  );

  if (!rows.length) {
    throw httpError(404, 'Travel proposal not found for this user');
  }
}

async function upsertTravelDocument(conn, { packageCode, proposalId, docType, side, filePath }) {
  await conn.execute(
    `INSERT INTO travel_documents (package_code, proposal_id, doc_type, side, file_path, created_at)
     VALUES (?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE file_path = VALUES(file_path)`,
    [packageCode, proposalId, docType, side, filePath]
  );
}

/**
 * replace old travel document and return old file_path (so we can delete it from storage)
 * Needs UNIQUE KEY on travel_documents(package_code, proposal_id, doc_type, side)
 */
async function replaceTravelDocument(conn, { packageCode, proposalId, docType, side, newFilePath }) {
  const [rows] = await conn.execute(
    `SELECT file_path
     FROM travel_documents
     WHERE package_code=? AND proposal_id=? AND doc_type=? AND side=?
     LIMIT 1`,
    [packageCode, proposalId, docType, side]
  );

  const oldPath = rows.length ? rows[0].file_path : null;

  await conn.execute(
    `INSERT INTO travel_documents (package_code, proposal_id, doc_type, side, file_path, created_at)
     VALUES (?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE file_path=VALUES(file_path), created_at=NOW()`,
    [packageCode, proposalId, docType, side, newFilePath]
  );

  return oldPath;
}

/**
 * Replace KYC document (stored in kyc_documents table)
 * Returns old file path so we can delete it after commit
 *
 * Expected table columns (recommended):
 *  - proposal_type (ENUM or VARCHAR) e.g. 'TRAVEL'
 *  - package_code (ENUM) e.g. 'DOMESTIC'
 *  - proposal_id (INT)
 *  - doc_type (ENUM) e.g. 'EMPLOYMENT_PROOF'
 *  - side (ENUM) e.g. 'single'
 *  - file_path (TEXT/VARCHAR)
 *  - created_at, updated_at
 *
 * Recommended unique key:
 * UNIQUE(proposal_type, proposal_id, doc_type)
 */
async function replaceTravelKycDocument(
  conn,
  {
    proposalId,
    packageCode,   // DOMESTIC | HAJJ_UMRAH_ZIARAT | INTERNATIONAL | STUDENT_GUARD
    docType,       // e.g. EMPLOYMENT_PROOF
    side,          // front | back | single
    newFilePath,
    sourceOfIncomeText = null
  }
) {
  if (!packageCode) {
    throw new Error('packageCode is required for travel KYC document');
  }

  const [rows] = await conn.execute(
    `SELECT file_path
     FROM kyc_documents
     WHERE proposal_type = 'TRAVEL'
       AND package_code = ?
       AND proposal_id = ?
       AND doc_type = ?
       AND side = ?
     LIMIT 1`,
    [packageCode, proposalId, docType, side]
  );

  const oldPath = rows.length ? rows[0].file_path : null;

  await conn.execute(
    `INSERT INTO kyc_documents (
        proposal_type,
        package_code,
        proposal_id,
        doc_type,
        side,
        file_path,
        source_of_income,
        created_at,
        updated_at
     )
     VALUES (
        'TRAVEL',
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        NOW(),
        NOW()
     )
     ON DUPLICATE KEY UPDATE
       file_path = VALUES(file_path),
       source_of_income = VALUES(source_of_income),
       updated_at = NOW()`,
    [packageCode, proposalId, docType, side, newFilePath, sourceOfIncomeText]
  );

  return oldPath;
}

/**
 * Calculate age from DOB.
 * Returns null if dob is invalid.
 */
function calculateAge(dobStr) {
  const dob = new Date(dobStr);
  if (Number.isNaN(dob.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

/**
 * Calculates tenure days from startDate & endDate.
 * We treat endDate as after startDate. (endDate must be > startDate)
 * Logic: Difference in milliseconds divided by (1000 * 60 * 60 * 24), rounded up.
 */
function calculateTenureDays(startDateStr, endDateStr) {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw httpError(400, 'Invalid startDate or endDate');
  }
  if (end <= start) throw httpError(400, 'endDate must be after startDate');

  const diffMs = end.getTime() - start.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Normalize frontend packageType string to DB enum code.
 * This makes your API tolerant to "Worldwide", "International", etc.
*/
function normalizePackageCode(packageType) {
  const s = String(packageType || '').toLowerCase().trim();

  if (s.includes('domestic')) return 'DOMESTIC';

  // includes both "ziarat" and "ziyarat"
  if (s.includes('hajj') || s.includes('hujj') || s.includes('umrah') || s.includes('ziarat') || s.includes('ziyarat')) {
    return 'HAJJ_UMRAH_ZIARAT';
  }

  // Worldwide / International
  if (s.includes('international') || s.includes('world') || s.includes('schengen')) {
    return 'INTERNATIONAL';
  }

  if (s.includes('student')) return 'STUDENT_GUARD';

  throw httpError(400, 'Invalid packageType');
}

/**
 * Normalize coverageType to DB enum code.
 * - For Student Guard: With/Without tuition
 * - For others: individual/family
 */
function normalizeCoverageCode(packageCode, coverageType) {
  const s = String(coverageType || '').toLowerCase().trim();

  if (packageCode === 'STUDENT_GUARD') {
    if (s === 'without' || s === 'without_tuition' || s === 'without tuition fee') return 'WITHOUT_TUITION';
    if (s === 'with' || s === 'with_tuition' || s === 'with tuition fee') return 'WITH_TUITION';
    throw httpError(400, 'Invalid coverageType for Student Guard');
  }

  if (s === 'individual') return 'INDIVIDUAL';
  if (s === 'family') return 'FAMILY';

  throw httpError(400, 'Invalid coverageType');
}

/**
 * Normalize plan name -> plan code
 */
function normalizePlanCode(plan) {
  const s = String(plan || '').toLowerCase().trim();
  // if (s === 'basic') return 'BASIC';
  if (s === 'silver') return 'SILVER';
  if (s === 'gold') return 'GOLD';
  if (s === 'platinum') return 'PLATINUM';
  if (s === 'diamond') return 'DIAMOND';
  throw httpError(400, 'Invalid productPlan');
}

/**
 * Validate destination IDs exist (FK safety)
 */
async function validateDestinations(destinationIds) {
  if (!Array.isArray(destinationIds) || destinationIds.length === 0) {
    throw httpError(400, 'tripDetails.destinationIds (non-empty array) is required');
  }

  const uniqueIds = [...new Set(destinationIds.map(Number))].filter(Boolean);
  if (uniqueIds.length === 0) {
    throw httpError(400, 'tripDetails.destinationIds must contain valid IDs');
  }

  const placeholders = uniqueIds.map(() => '?').join(', ');
  const rows = await query(
    `SELECT id FROM travel_destinations WHERE id IN (${placeholders})`,
    uniqueIds
  );

  if (rows.length !== uniqueIds.length) {
    throw httpError(400, 'One or more destinationIds are invalid');
  }
}

/**
 * Find Plan + correct pricing slab by tenureDays and isMultiTrip
 *
 * How it works:
 * 1) Get package_id by packageCode
 * 2) Get coverage_id for that package
 * 3) Get plan_id for (package, coverage, planCode)
 * 4) Get pricing slab where tenureDays is inside min_days/max_days and matches is_multi_trip
 * This ensures we find the exact price row from the brochure logic stored in DB.
 */
async function getPlanAndSlab({ packageCode, coverageCode, planCode, tenureDays, isMultiTrip }) {
  const pkg = await query(`SELECT id FROM travel_packages WHERE code = ? LIMIT 1`, [packageCode]);
  if (!pkg.length) throw httpError(500, 'Package not seeded in DB');
  const packageId = pkg[0].id;

  const cov = await query(
    `SELECT id FROM travel_coverages WHERE package_id = ? AND code = ? LIMIT 1`,
    [packageId, coverageCode]
  );
  if (!cov.length) throw httpError(400, 'Invalid coverage for this package');
  const coverageId = cov[0].id;

  const plan = await query(
    `SELECT id FROM travel_plans WHERE package_id = ? AND coverage_id = ? AND code = ? LIMIT 1`,
    [packageId, coverageId, planCode]
  );
  if (!plan.length) throw httpError(400, 'Invalid productPlan for package/coverage');
  const planId = plan[0].id;

  const slabRows = await query(
    `SELECT id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium
     FROM travel_plan_pricing_slabs
     WHERE plan_id = ?
       AND ? BETWEEN min_days AND max_days
       AND is_multi_trip = ?
     ORDER BY min_days ASC
     LIMIT 1`,
    [planId, tenureDays, isMultiTrip ? 1 : 0]
  );

  if (!slabRows.length) {
    throw httpError(400, 'No pricing slab found for selected plan and tenureDays');
  }

  return { packageId, coverageId, planId, slab: slabRows[0] };
}

/**
 * Apply package rules:
 * - max age limits (Domestic 60, HUJ 69, International 80, Student 65)
 * - International loadings (66-70 => +100%, 71-75 => +150%, 76-80 => +200%)
 * - International multi-trip restriction: read from DB (if any)
 * Returns loadingPercent (e.g. 50 for 50% increase) and maxTripDaysApplied.
 */
async function applyRulesAndLoading({ packageId, packageCode, age, isMultiTrip }) {
  const ruleRows = await query(
    `SELECT max_age FROM travel_package_rules WHERE package_id = ? LIMIT 1`,
    [packageId]
  );

  if (ruleRows.length && ruleRows[0].max_age !== null && age !== null) {
    const maxAge = Number(ruleRows[0].max_age);
    if (age > maxAge) {
      throw httpError(400, `Maximum age limit exceeded for this package (max ${maxAge})`);
    }
  }

  let loadingPercent = 0;
  let maxTripDaysApplied = null;

  // Only international package has age-based loadings
  if (packageCode === 'INTERNATIONAL' && age !== null) {
    const band = await query(
      `SELECT loading_percent, max_trip_days
       FROM travel_age_loadings
       WHERE package_id = ?
         AND ? BETWEEN min_age AND max_age
       LIMIT 1`,
      [packageId, age]
    );

    if (band.length) {
      loadingPercent = Number(band[0].loading_percent || 0);

      // Only meaningful if policy is multi-trip
      if (isMultiTrip) {
        maxTripDaysApplied = band[0].max_trip_days ? Number(band[0].max_trip_days) : null;
      }
    }
  }

  return { loadingPercent, maxTripDaysApplied };
}

/**
 * POST /api/travel/quote-premium
 *
 * Quote response is purely derived from DB slabs + rules (no hardcoding in code).
 * - tenureDays can be provided, otherwise derived from startDate/endDate.
 */
async function quoteTravelPremiumService(data) {
  const {
    packageType,
    coverageType,
    productPlan,
    startDate,
    endDate,
    tenureDays: tenureDaysInput,
    dob,
    isMultiTrip: isMultiTripInput = false,
    familyMembersCount = 0,
  } = data;

  if (!packageType || !coverageType || !productPlan) {
    throw httpError(400, 'packageType, coverageType, and productPlan are required');
  }

  let tenureDays = tenureDaysInput;

  // 1. If tenureDays not provided, we calculate it from dates
  // If tenureDays not provided, we calculate it
  if (!tenureDays) {
    if (!startDate || !endDate) {
      throw httpError(400, 'Either tenureDays or (startDate & endDate) are required');
    }
    tenureDays = calculateTenureDays(startDate, endDate);
  }

  if (tenureDays <= 0) throw httpError(400, 'tenureDays must be positive');

  // Auto-enable multi-trip if tenure > 184 days
  const isMultiTrip = tenureDays > 184 ? true : !!isMultiTripInput;

  const age = dob ? calculateAge(dob) : null;

  const packageCode = normalizePackageCode(packageType);
  const coverageCode = normalizeCoverageCode(packageCode, coverageType);
  const planCode = normalizePlanCode(productPlan);

  // 2. Fetch the correct pricing slab from DB based on duration
  const { packageId, planId, slab } = await getPlanAndSlab({
    packageCode,
    coverageCode,
    planCode,
    tenureDays,
    isMultiTrip: !!isMultiTrip,
  });

  // 3. Check age limits and calculate extra loading % (e.g. for seniors)
  const { loadingPercent, maxTripDaysApplied } = await applyRulesAndLoading({
    packageId,
    packageCode,
    age,
    isMultiTrip: !!isMultiTrip,
  });

  // 4. Base premium comes directly from the slab row
  let basePremium = Number(slab.premium);

  // Domestic Family: Premium = Slab Premium * (Applicant + Family Members)
  if (packageCode === 'DOMESTIC' && coverageCode === 'FAMILY') {
    const count = 1 + Math.max(0, Number(familyMembersCount) || 0);
    basePremium = basePremium * count;
  }

  // 5. Final premium = Base + (Base * Loading%)
  const finalPremium = Number((basePremium * (1 + loadingPercent / 100)).toFixed(2));

  return {
    packageCode,
    coverageCode,
    planCode,
    planId,
    tenureDays,
    age,
    slab: {
      label: slab.slab_label,
      minDays: slab.min_days,
      maxDays: slab.max_days,
      isMultiTrip: slab.is_multi_trip === 1,
      maxTripDays: slab.max_trip_days,
    },
    basePremium,
    loadingPercent,
    finalPremium,
    maxTripDaysApplied,
  };
}

/* -----------------------------
   Submit validations
------------------------------ */
function validateApplicantInfo(applicantInfo) {
  const required = ['firstName', 'lastName', 'address', 'cityId', 'cnic', 'mobile', 'email', 'dob', 'occupation'];
  for (const field of required) {
    if (!applicantInfo?.[field]) throw httpError(400, `applicantInfo.${field} is required`);
  }

  const dob = new Date(applicantInfo.dob);
  if (Number.isNaN(dob.getTime())) throw httpError(400, 'applicantInfo.dob is invalid date');
  if (dob >= new Date()) throw httpError(400, 'Date of birth must be in the past');
}

function validateBeneficiary(beneficiary) {
  const required = [
    'beneficiaryName', 'beneficiaryAddress', 'beneficiaryCnic', 'beneficiaryCnicIssueDate', 'beneficiaryRelation'
  ];
  for (const field of required) {
    if (!beneficiary?.[field]) throw httpError(400, `beneficiary.${field} is required`);
  }

  const issueDate = new Date(beneficiary.beneficiaryCnicIssueDate);
  if (Number.isNaN(issueDate.getTime())) {
    throw httpError(400, 'beneficiary.beneficiaryCnicIssueDate is invalid date');
  }
}

function validateFamilyMembersIfNeeded(coverageCode, familyMembers) {
  if (coverageCode !== 'FAMILY') return;

  if (!Array.isArray(familyMembers) || familyMembers.length === 0) {
    throw httpError(400, 'familyMembers is required for family coverage');
  }

  for (const [i, m] of familyMembers.entries()) {
    const required = ['memberType', 'firstName', 'lastName', 'dob'];
    for (const field of required) {
      if (!m?.[field]) throw httpError(400, `familyMembers[${i}].${field} is required`);
    }
    const d = new Date(m.dob);
    if (Number.isNaN(d.getTime())) throw httpError(400, `familyMembers[${i}].dob is invalid date`);
  }
}

/**
 * Decide proposal table by packageCode.
 * This matches your requirement: proposals stored separately per package.
*/
function resolveProposalTable(packageCode) {
  if (packageCode === 'DOMESTIC') return 'travel_domestic_proposals';
  if (packageCode === 'HAJJ_UMRAH_ZIARAT') return 'travel_huj_proposals';
  if (packageCode === 'INTERNATIONAL') return 'travel_international_proposals';
  if (packageCode === 'STUDENT_GUARD') return 'travel_student_proposals';
  throw httpError(400, 'Invalid packageType');
}

function resolveDestTable(packageCode) {
  if (packageCode === 'DOMESTIC') return 'travel_domestic_destinations_selected';
  if (packageCode === 'HAJJ_UMRAH_ZIARAT') return 'travel_huj_destinations_selected';
  if (packageCode === 'INTERNATIONAL') return 'travel_international_destinations_selected';
  if (packageCode === 'STUDENT_GUARD') return 'travel_student_destinations_selected';
  throw httpError(400, 'Invalid packageType');
}

function resolveFamilyTable(packageCode) {
  if (packageCode === 'DOMESTIC') return 'travel_domestic_family_members';
  if (packageCode === 'HAJJ_UMRAH_ZIARAT') return 'travel_huj_family_members';
  if (packageCode === 'INTERNATIONAL') return 'travel_international_family_members';
  return null; // Student has no family table by default
}

/**
 * POST /api/travel/submit-proposal
*
* Steps:
* 1) Validate payload
* 2) Calculate tenureDays
* 3) Quote using DB slabs + rules
* 4) Insert proposal into correct table
* 5) Insert destinations
* 6) Insert family members (if coverage is FAMILY)
*/
async function submitProposalService(userId, tripDetails, applicantInfo, beneficiary, parentInfo, familyMembers) {
  if (!userId) throw httpError(401, 'User is required');
  if (!tripDetails) throw httpError(400, 'tripDetails is required');

  const {
    packageType,
    coverageType,
    productPlan,
    insuranceType,
    purposeOfVisit,
    accommodation,
    travelMode,
    startDate,
    endDate,
    destinationIds,
    isMultiTrip = false,
    universityName,
  } = tripDetails;

  if (!packageType || !coverageType || !productPlan) {
    throw httpError(400, 'tripDetails.packageType, tripDetails.coverageType, tripDetails.productPlan are required');
  }

  validateApplicantInfo(applicantInfo);
  validateBeneficiary(beneficiary);

  const packageCode = normalizePackageCode(packageType);
  const coverageCode = normalizeCoverageCode(packageCode, coverageType);

  validateFamilyMembersIfNeeded(coverageCode, familyMembers);

  // 1. Destination Logic: Domestic is fixed to "Anywhere in Pakistan", others require selection
  // ✅ Destination rules:
  // - DOMESTIC: auto-set "Anywhere in Pakistan (Except Home City)" , no destinationIds required
  // - Other packages: destinationIds required + validated
  let effectiveDestinationIds = destinationIds;

  if (packageCode === 'DOMESTIC') {
    if (!DOMESTIC_ANYWHERE_DEST_ID) {
      throw httpError(500, 'DOMESTIC_ANYWHERE_DEST_ID is not configured');
    }
    if (Array.isArray(destinationIds) && destinationIds.length > 0) {
      throw httpError(400, 'Domestic package does not require destinationIds');
    }
    effectiveDestinationIds = [DOMESTIC_ANYWHERE_DEST_ID];
  }
  else {
    await validateDestinations(destinationIds);
  }

  const tenureDays = calculateTenureDays(startDate, endDate);

  // 2. Re-Quote: We calculate premium again here to prevent frontend tampering
  // Quote from DB (this ensures submit always uses DB pricing)
  const quote = await quoteTravelPremiumService({
    packageType,
    coverageType,
    productPlan,
    startDate,
    endDate,
    tenureDays,
    dob: applicantInfo.dob,
    isMultiTrip,
    familyMembersCount: Array.isArray(familyMembers) ? familyMembers.length : 0,
  });

  // 3. Override End Date: The policy duration is strictly determined by the purchased slab's max days.
  // Override endDate and tenureDays based on slab max days
  const finalTenureDays = quote.slab.maxDays;
  const sDateObj = new Date(startDate);
  sDateObj.setDate(sDateObj.getDate() + finalTenureDays);
  const finalEndDate = sDateObj.toISOString().split('T')[0];

  // 4. Dynamic Table Resolution: Decide which tables to insert into based on package type
  const proposalTable = resolveProposalTable(packageCode);
  const destTable = resolveDestTable(packageCode);
  const familyTable = resolveFamilyTable(packageCode);

  const conn = await getConnection();

  try {
    await conn.beginTransaction();

    let insertSql;
    let insertParams;

    // 5. Build Insert Query based on Package (Columns vary slightly)
    // International has extra fields for age loading + multi-trip
    if (packageCode === 'INTERNATIONAL') {
      insertSql = `
        INSERT INTO ${proposalTable}
        (user_id, plan_id, insurance_type,
        purpose_of_visit, accommodation,
        start_date, end_date, tenure_days,
         is_multi_trip, max_trip_days_applied, age_loading_percent,
         first_name, last_name, 
         
         address, city_id, latitude, longitude,
         
         cnic, passport_number, mobile, email, dob,

         occupation, occupation_updated_at,

         beneficiary_name, beneficiary_address, beneficiary_cnic, beneficiary_cnic_issue_date, beneficiary_relation,
         base_premium, final_premium,

        submission_status,
        payment_status,
        review_status,
        refund_status,
        submitted_at,
        expires_at,
        created_at, updated_at)
        VALUES (?, ?, ?,
                ?, ?,
                ?, ?, ?,
                ?, ?, ?,
                ?, ?, 
                
                ?, ?, ?, ?, 
                
                ?, ?, ?, ?, ?,

                ?, NOW(),

                ?, ?, ?, ?, ?,
                ?, ?,
                'submitted',
                'unpaid',
                'not_applicable',
                'not_applicable',
                NOW(),
                DATE_ADD(NOW(), INTERVAL 7 DAY),
                NOW(), NOW())
      `;
      insertParams = [
        userId,
        quote.planId,
        insuranceType,
        purposeOfVisit,
        accommodation,
        startDate,
        finalEndDate,
        finalTenureDays,
        quote.slab.isMultiTrip ? 1 : 0,
        quote.maxTripDaysApplied,
        quote.loadingPercent,

        applicantInfo.firstName,
        applicantInfo.lastName,

        applicantInfo.address,
        applicantInfo.cityId,
        applicantInfo.latitude,
        applicantInfo.longitude,

        applicantInfo.cnic,
        applicantInfo.passportNumber || null,
        applicantInfo.mobile,
        applicantInfo.email,
        applicantInfo.dob,

        applicantInfo.occupation,

        beneficiary.beneficiaryName,
        beneficiary.beneficiaryAddress,
        beneficiary.beneficiaryCnic,
        beneficiary.beneficiaryCnicIssueDate,
        beneficiary.beneficiaryRelation,

        quote.basePremium,
        quote.finalPremium,
      ];
    } else if (packageCode === 'STUDENT_GUARD') {
      // Student has optional parent info + university name
      insertSql = `
        INSERT INTO ${proposalTable}
        (user_id, plan_id, insurance_type,
         purpose_of_visit, accommodation,
         start_date, end_date, tenure_days,
         university_name,
         parent_name, parent_address, parent_cnic, parent_cnic_issue_date, parent_relation,
         first_name, last_name,
         
         address, city_id, latitude, longitude,
         
         cnic, passport_number, mobile, email, dob,

         occupation, occupation_updated_at,

         beneficiary_name, beneficiary_address, beneficiary_cnic, beneficiary_cnic_issue_date, beneficiary_relation,
         base_premium, final_premium,

        submission_status,
        payment_status,
        review_status,
        refund_status,
        submitted_at,
        expires_at,

        created_at, updated_at)
        VALUES (?, ?, ?,
                'STUDY', ?,
                ?, ?, ?,
                ?,
                ?, ?, ?, ?, ?,
                ?, ?,
                
                ?, ?, ?, ?,
                
                ?, ?, ?, ?, ?,

                ?, NOW(),

                ?, ?, ?, ?, ?,
                ?, ?,

                'submitted',
                'unpaid',
                'not_applicable',
                'not_applicable',
                NOW(),
                DATE_ADD(NOW(), INTERVAL 7 DAY),

                NOW(), NOW())
      `;
      insertParams = [
        userId,
        quote.planId,
        insuranceType,
        accommodation,
        startDate,
        finalEndDate,
        finalTenureDays,

        universityName || applicantInfo.universityName || null,

        parentInfo?.parentName || null,
        parentInfo?.parentAddress || null,
        parentInfo?.parentCnic || null,
        parentInfo?.parentCnicIssueDate || null,
        parentInfo?.parentRelation || null,

        applicantInfo.firstName,
        applicantInfo.lastName,

        applicantInfo.address,
        applicantInfo.cityId,
        applicantInfo.latitude,
        applicantInfo.longitude,

        applicantInfo.cnic,
        applicantInfo.passportNumber || null,
        applicantInfo.mobile,
        applicantInfo.email,
        applicantInfo.dob,
        applicantInfo.occupation,

        beneficiary.beneficiaryName,
        beneficiary.beneficiaryAddress,
        beneficiary.beneficiaryCnic,
        beneficiary.beneficiaryCnicIssueDate,
        beneficiary.beneficiaryRelation,

        quote.basePremium,
        quote.finalPremium,
      ];
    } else if (packageCode === 'HAJJ_UMRAH_ZIARAT') {
      // HUJJ (common structure as domestic but no travel_mode)
      insertSql = `
        INSERT INTO ${proposalTable}
        (user_id, plan_id, insurance_type,

         purpose_of_visit,

         accommodation,
         start_date, end_date, tenure_days,
         first_name, last_name, 
         
         address, city_id, latitude, longitude,
         
         cnic, passport_number, mobile, email, dob,

         occupation, occupation_updated_at,

         beneficiary_name, beneficiary_address, beneficiary_cnic, beneficiary_cnic_issue_date, beneficiary_relation,
         base_premium, final_premium,

        submission_status,
        payment_status,
        review_status,
        refund_status,
        submitted_at,
        expires_at,

        created_at, updated_at)
        VALUES (?, ?, ?,

                'RELIGIOUS',

                ?,
                ?, ?, ?,
                ?, ?, 
                
                ?, ?, ?, ?,
                
                ?, ?, ?, ?, ?,

                ?,NOW(),

                ?, ?, ?, ?, ?,
                ?, ?,

                'submitted',
                'unpaid',
                'not_applicable',
                'not_applicable',
                NOW(),
                DATE_ADD(NOW(), INTERVAL 7 DAY),

                NOW(), NOW())
      `;
      insertParams = [
        userId,
        quote.planId,
        insuranceType,
        accommodation,
        startDate,
        finalEndDate,
        finalTenureDays,

        applicantInfo.firstName,
        applicantInfo.lastName,

        applicantInfo.address,
        applicantInfo.cityId,
        applicantInfo.latitude,
        applicantInfo.longitude,

        applicantInfo.cnic,
        applicantInfo.passportNumber || null,
        applicantInfo.mobile,
        applicantInfo.email,
        applicantInfo.dob,
        applicantInfo.occupation,

        beneficiary.beneficiaryName,
        beneficiary.beneficiaryAddress,
        beneficiary.beneficiaryCnic,
        beneficiary.beneficiaryCnicIssueDate,
        beneficiary.beneficiaryRelation,

        quote.basePremium,
        quote.finalPremium,
      ];
    } else {
      // Domestic
      insertSql = `
        INSERT INTO ${proposalTable}
        (user_id, plan_id, insurance_type,
         purpose_of_visit, accommodation, travel_mode,
         start_date, end_date, tenure_days,
         first_name, last_name, 
         
         address, city_id, latitude, longitude,
         
         cnic, passport_number, mobile, email, dob,

         occupation, occupation_updated_at,

         beneficiary_name, beneficiary_address, beneficiary_cnic, beneficiary_cnic_issue_date, beneficiary_relation,
         base_premium, final_premium,

        submission_status,
        payment_status,
        review_status,
        refund_status,
        submitted_at,
        expires_at,

        created_at, updated_at)
        VALUES (?, ?, ?,
                ?, ?, ?,
                ?, ?, ?,
                ?, ?, 
                
                ?, ?, ?, ?,
                
                ?, ?, ?, ?, ?,

                ?,NOW(),

                ?, ?, ?, ?, ?,
                ?, ?,

                'submitted',
                'unpaid',
                'not_applicable',
                'not_applicable',
                NOW(),
                DATE_ADD(NOW(), INTERVAL 7 DAY),

                NOW(), NOW())
      `;
      insertParams = [
        userId,
        quote.planId,
        insuranceType,
        purposeOfVisit,
        accommodation,
        travelMode || null,
        startDate,
        finalEndDate,
        finalTenureDays,

        applicantInfo.firstName,
        applicantInfo.lastName,

        applicantInfo.address,
        applicantInfo.cityId,
        applicantInfo.latitude,
        applicantInfo.longitude,

        applicantInfo.cnic,
        applicantInfo.passportNumber || null,
        applicantInfo.mobile,
        applicantInfo.email,
        applicantInfo.dob,
        applicantInfo.occupation,

        beneficiary.beneficiaryName,
        beneficiary.beneficiaryAddress,
        beneficiary.beneficiaryCnic,
        beneficiary.beneficiaryCnicIssueDate,
        beneficiary.beneficiaryRelation,

        quote.basePremium,
        quote.finalPremium,
      ];
    }

    // Insert proposal row
    // 6. Execute Insert Proposal
    const [result] = await conn.execute(insertSql, insertParams);
    const proposalId = result.insertId;

    // Insert destinations (same logic for all packages)
    // 7. Insert Destinations (Many-to-Many)
    for (const destId of effectiveDestinationIds) {
      await conn.execute(
        `INSERT INTO ${destTable} (proposal_id, destination_id, created_at)
         VALUES (?, ?, NOW())`,
        [proposalId, destId]
      );
    }

    // 8. Insert Family Members (if applicable)
    // Insert family members ONLY if:
    // - coverage is FAMILY
    // - package supports family member table (Student doesn't)
    if (coverageCode === 'FAMILY' && familyTable) {
      for (const m of familyMembers) {
        await conn.execute(
          `INSERT INTO ${familyTable}
           (proposal_id, member_type, first_name, last_name, dob, gender, cnic, passport_number, relation, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            proposalId,
            m.memberType || 'other',
            m.firstName,
            m.lastName,
            m.dob,
            m.gender || null,
            m.cnic || null,
            m.passportNumber || null,
            m.relation || null,
          ]
        );
      }
    }

    await conn.commit();

    // 9. Notify Admin
    // ✅ AFTER COMMIT: ADMIN notify (submitted + unpaid)
    try {
      fireAdmin(E.ADMIN_PROPOSAL_SUBMITTED_UNPAID, {
        entity_type: `proposal_TRAVEL_${packageCode}`,
        entity_id: proposalId,
        data: {
          proposal_type: 'TRAVEL',
          package_code: packageCode,
          proposal_id: proposalId,
          user_id: userId,
        },
        email: null, // spec says unpaid submit is notif-only for admin
      });
    } catch (_) {
      // don't block response if notification fails
    }

    // Return important computed values for frontend confirmation screen
    return {
      proposalId,
      packageCode,
      coverageCode,
      planCode: quote.planCode,
      tenureDays: finalTenureDays,
      basePremium: quote.basePremium,
      loadingPercent: quote.loadingPercent,
      finalPremium: quote.finalPremium,
      maxTripDaysApplied: quote.maxTripDaysApplied,
      slab: quote.slab,
    };

  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/* =========================================================
   Upload Travel Assets Service
   ========================================================= */

async function uploadTravelAssetsService({ userId, proposalId, packageCodeInput, step, files, body = {} }) {
  if (!userId) throw httpError(401, 'User is required');
  if (!proposalId || Number.isNaN(Number(proposalId))) throw httpError(400, 'Invalid proposalId');
  if (!packageCodeInput) throw httpError(400, 'packageCode is required');
  if (!step) throw httpError(400, 'step is required');

  const packageCode = normalizePackageCode(packageCodeInput);
  const stepLower = String(step).toLowerCase();

  // collect newly uploaded file paths (if rollback happens, delete them)
  const newPaths = [];
  for (const [field, arr] of Object.entries(files || {})) {
    if (!arr || !arr[0]) continue;
    newPaths.push(toUploadsRelativePathTravel(arr[0]));
  }

  const conn = await getConnection();

  try {
    await conn.beginTransaction();
    await assertTravelProposalOwnership(conn, packageCode, proposalId, userId);

    const oldPathsToDelete = [];

    // --- STEP 1: IDENTITY (CNIC or Passport) ---
    // Step: identity (CNIC 2 pics OR Passport 1 pic)
    if (stepLower === 'identity') {
      const hasCnicFront = !!(files.cnic_front && files.cnic_front[0]);
      const hasCnicBack = !!(files.cnic_back && files.cnic_back[0]);
      const hasPassport = !!(files.passport_image && files.passport_image[0]);

      const cnicComplete = hasCnicFront && hasCnicBack;

      if (!cnicComplete && !hasPassport) {
        throw httpError(400, 'Upload CNIC (cnic_front + cnic_back) OR Passport (passport_image)');
      }

      // CNIC (only if complete)
      if (cnicComplete) {
        const newFront = toUploadsRelativePathTravel(files.cnic_front[0]);
        const newBack = toUploadsRelativePathTravel(files.cnic_back[0]);

        const oldFront = await replaceTravelDocument(conn, {
          packageCode,
          proposalId,
          docType: 'CNIC',
          side: 'front',
          newFilePath: newFront,
        });

        const oldBack = await replaceTravelDocument(conn, {
          packageCode,
          proposalId,
          docType: 'CNIC',
          side: 'back',
          newFilePath: newBack,
        });

        if (oldFront && oldFront !== newFront) oldPathsToDelete.push(oldFront);
        if (oldBack && oldBack !== newBack) oldPathsToDelete.push(oldBack);
      }

      // PASSPORT (optional)
      if (hasPassport) {
        const newPassport = toUploadsRelativePathTravel(files.passport_image[0]);

        const oldPassport = await replaceTravelDocument(conn, {
          packageCode,
          proposalId,
          docType: 'PASSPORT',
          side: 'single',
          newFilePath: newPassport,
        });

        if (oldPassport && oldPassport !== newPassport) oldPathsToDelete.push(oldPassport);
      }

      await conn.commit();

      // delete old files after commit
      for (const p of oldPathsToDelete) await deleteFileIfExists(p);

      return {
        proposalId,
        packageCode,
        step: 'identity',
        saved: {
          cnic: cnicComplete ? ['cnic_front', 'cnic_back'] : [],
          passport: hasPassport ? ['passport_image'] : [],
        },
      };
    }

    // --- STEP 2: TICKET (Optional) ---
    // Step: ticket (optional)
    if (stepLower === 'ticket') {
      const hasTicket = !!(files.ticket_image && files.ticket_image[0]);

      if (hasTicket) {
        const newTicket = toUploadsRelativePathTravel(files.ticket_image[0]);

        const oldTicket = await replaceTravelDocument(conn, {
          packageCode,
          proposalId,
          docType: 'TICKET',
          side: 'single',
          newFilePath: newTicket,
        });

        if (oldTicket && oldTicket !== newTicket) oldPathsToDelete.push(oldTicket);
      }

      await conn.commit();

      for (const p of oldPathsToDelete) await deleteFileIfExists(p);

      return {
        proposalId,
        packageCode,
        step: 'ticket',
        saved: hasTicket ? ['ticket_image'] : [],
      };
    }

    // --- STEP 3: KYC (Employment Proof) ---
    // Step: kyc (optional) -> employment proof / visiting card (single)
    // Save KYC docs in kyc_documents (not travel_documents)
    // Rule: optional for everyone, admin can ask later if needed
    if (stepLower === 'kyc') {
      const hasEmploymentProof = !!(files.employment_proof && files.employment_proof[0]);
      const hasSourceOfIncomeProof = !!(files.source_of_income_proof && files.source_of_income_proof[0]);

      if (!hasEmploymentProof && !hasSourceOfIncomeProof) {
        throw httpError(400, 'employment_proof or source_of_income_proof file is required for kyc step');
      }

      const savedKycDocs = [];

      if (hasEmploymentProof) {
        const newProofPath = toUploadsRelativePathTravel(files.employment_proof[0]);

        // Replace existing KYC doc (unique key handles upsert)
        const oldProofPath = await replaceTravelKycDocument(conn, {
          proposalId,
          packageCode,
          docType: 'EMPLOYMENT_PROOF',
          side: 'single',
          newFilePath: newProofPath,
        });

        if (oldProofPath && oldProofPath !== newProofPath) oldPathsToDelete.push(oldProofPath);
        savedKycDocs.push('employment_proof');
      }

      if (hasSourceOfIncomeProof) {
        const sourceOfIncomeText = body.source_of_income || null;
        if (!sourceOfIncomeText) {
          throw httpError(400, 'source_of_income text is required when uploading source_of_income_proof');
        }
        const newProofPath = toUploadsRelativePathTravel(files.source_of_income_proof[0]);
        const oldProofPath = await replaceTravelKycDocument(conn, {
          proposalId,
          packageCode,
          docType: 'SOURCE_OF_INCOME_PROOF',
          side: 'single',
          newFilePath: newProofPath,
          sourceOfIncomeText,
        });
        if (oldProofPath && oldProofPath !== newProofPath) oldPathsToDelete.push(oldProofPath);
        savedKycDocs.push('source_of_income_proof');
      }

      await conn.commit();

      // delete old file after commit
      for (const p of oldPathsToDelete) await deleteFileIfExists(p);

      return { proposalId, packageCode, step: 'kyc', saved: savedKycDocs };
    }

    throw httpError(400, 'Invalid step. Use: identity, ticket');
  } catch (err) {
    await conn.rollback();

    // if DB fails, delete newly uploaded files to avoid storage junk
    for (const p of newPaths) {
      try { await deleteFileIfExists(p); } catch (_) { }
    }

    throw err;
  } finally {
    conn.release();
  }
}

/* =========================================================
   Reupload Travel Assets Service
   ========================================================= */
async function reuploadTravelAssetsService({ userId, proposalId, packageCodeInput, files, body = {} }) {
  if (!userId) throw httpError(401, 'User is required');
  if (!proposalId || Number.isNaN(Number(proposalId))) throw httpError(400, 'Invalid proposalId');
  if (!packageCodeInput) throw httpError(400, 'packageCode is required');

  const packageCode = normalizePackageCode(packageCodeInput);

  const uploadedFields = Object.keys(files || {});
  if (!uploadedFields.length) throw httpError(400, 'No files uploaded');

  const tables = PACKAGE_TABLES[packageCode];
  if (!tables) throw httpError(400, 'Invalid package');

  // collect new file paths (if rollback happens, delete them)
  const newPaths = [];
  for (const field of uploadedFields) {
    const f = files[field]?.[0];
    if (f) newPaths.push(toUploadsRelativePathTravel(f));
  }

  const conn = await getConnection();

  // ✅ fire after commit
  let notifCtx = null;

  try {

    await conn.beginTransaction();

    await assertTravelProposalOwnership(conn, packageCode, proposalId, userId);

    // check admin requested reupload (from package proposal table)
    const [rows] = await conn.execute(
      `SELECT review_status, reupload_required_docs
       FROM ${tables.proposals}
       WHERE id=? LIMIT 1`,
      [proposalId]
    );

    if (!rows.length) throw httpError(404, 'Proposal not found');

    const p = rows[0];
    if (String(p.review_status) !== 'reupload_required') {
      throw httpError(400, 'Reupload is not requested for this proposal');
    }

    let required = [];
    try {
      required = p.reupload_required_docs ? JSON.parse(p.reupload_required_docs) : [];
    } catch {
      throw httpError(500, 'Invalid stored reupload_required_docs JSON');
    }

    // Build a set of allowed documents based on what admin requested
    // allow list: "CNIC:front"
    const allowDocs = new Set();
    for (const item of required) {
      if (item?.doc_type) {
        const dt = String(item.doc_type).toUpperCase();
        const side = item.side ? String(item.side).toLowerCase() : 'single';
        allowDocs.add(`${dt}:${side}`);
      }
    }

    // Check if user is uploading something that wasn't requested
    // validate uploaded fields are expected + requested
    for (const field of uploadedFields) {
      const map = TRAVEL_FIELD_MAP[field];
      if (!map) throw httpError(400, `Unexpected field: ${field}`);

      const key = `${map.docType}:${map.side}`;
      if (!allowDocs.has(key)) {
        throw httpError(400, `Not requested for reupload: ${key}`);
      }
    }

    // Process valid uploads
    // replace in travel_documents OR kyc_documents and collect old paths to delete after commit
    const oldPathsToDelete = [];
    const saved = [];

    for (const field of uploadedFields) {
      const file = files[field]?.[0];
      if (!file) continue;

      const { docType, side } = TRAVEL_FIELD_MAP[field];
      const newPath = toUploadsRelativePathTravel(file);

      // employment proof goes to kyc_documents (not travel_documents)
      if (KYC_DOC_TYPES.has(docType)) {
        let sourceOfIncomeText = null;
        if (docType === 'SOURCE_OF_INCOME_PROOF') {
          sourceOfIncomeText = body.source_of_income;
          if (!sourceOfIncomeText) {
            throw httpError(400, 'source_of_income text is required when re-uploading source_of_income_proof');
          }
        }
        const oldPath = await replaceTravelKycDocument(conn, {
          proposalId,
          packageCode,
          docType,
          side,
          newFilePath: newPath,
          sourceOfIncomeText,
        });

        if (oldPath && oldPath !== newPath) oldPathsToDelete.push(oldPath);
        saved.push(field);
        continue;
      }
      // existing behavior for normal travel documents
      const oldPath = await replaceTravelDocument(conn, {
        packageCode,
        proposalId,
        docType,
        side,
        newFilePath: newPath,
      });

      if (oldPath && oldPath !== newPath) oldPathsToDelete.push(oldPath);
      saved.push(field);
    }

    // ✅ fetch user info for admin email context
    const [urows] = await conn.execute(
      `SELECT u.full_name, u.email
   FROM users u
   WHERE u.id = ? LIMIT 1`,
      [userId]
    );

    notifCtx = {
      proposalId: Number(proposalId),
      packageCode,
      userId: Number(userId),
      userName: urows?.[0]?.full_name || null,
      userEmail: urows?.[0]?.email || null,
      saved,
    };

    // OPTIONAL: set review_status back to pending_review after reupload
    await conn.execute(
      `UPDATE ${tables.proposals}
       SET review_status='pending_review',
           admin_last_action_at=NOW()
       WHERE id=?`,
      [proposalId]
    );

    await conn.commit();

    // delete old files after commit
    for (const p of oldPathsToDelete) {
      await deleteFileIfExists(p);
    }

    // ✅ AFTER COMMIT: notify admin that reupload docs were submitted
    try {
      const adminEmails = (process.env.ADMIN_ALERT_EMAILS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      fireAdmin(E.ADMIN_REUPLOAD_SUBMITTED, {
        entity_type: `proposal_TRAVEL_${packageCode}`,
        entity_id: notifCtx?.proposalId || Number(proposalId),
        data: {
          proposal_type: 'TRAVEL',
          package_code: packageCode,
          proposal_id: Number(proposalId),
          user_id: Number(userId),
          user_name: notifCtx?.userName || null,
          reupload_saved: notifCtx?.saved || saved,
        },
        email:
          adminEmails.length > 0
            ? templates.makeAdminReuploadSubmittedEmail({
              to: adminEmails.join(','),
              proposalLabel: `${packageCode}-${proposalId}`,
              userName: notifCtx?.userName,
              userId: notifCtx?.userId || userId,
              saved: notifCtx?.saved || saved,
            })
            : null,
      });
    } catch (_) {
      // don't block response
    }

    return { proposalId, packageCode, saved };
  } catch (err) {
    await conn.rollback();

    // if transaction failed, delete newly uploaded files (avoid storage junk)
    for (const p of newPaths) {
      try { await deleteFileIfExists(p); } catch (_) { }
    }

    throw err;
  } finally {
    conn.release();
  }
}

/**
 * ✅ GET full proposal detail (requires packageCode)
 * Also returns:
 * - destinations selected (joined with travel_destinations)
 * - family members (if any)
 * - travel_documents
 */
async function getTravelProposalByIdForUser(userId, packageCodeInput, proposalId) {
  if (!userId) throw httpError(401, 'User is required');

  const packageCode = normalizePackageCode(packageCodeInput);
  const tables = PACKAGE_TABLES[packageCode];

  if (!tables) {
    throw httpError(400, `Invalid package. Allowed: ${Object.keys(PACKAGE_TABLES).join(', ')}`);
  }

  const id = Number(proposalId);
  if (!id || Number.isNaN(id)) throw httpError(400, 'Invalid proposalId');

  // 1. Fetch Proposal + Joins (City, Plan, Coverage, Package)
  // ✅ Proposal row (join plan meta so UI can show plan/package/coverage properly)
  const rows = await query(
    `
    SELECT
      p.*,
      c.name AS cityName,
      pkg.code AS packageCode,
      cov.code AS coverageType,
      pl.code AS productPlan,
      pl.currency AS currency
    FROM ${tables.proposals} p
    LEFT JOIN cities c ON c.id = p.city_id
    LEFT JOIN travel_plans pl ON pl.id = p.plan_id
    LEFT JOIN travel_coverages cov ON cov.id = pl.coverage_id
    LEFT JOIN travel_packages pkg ON pkg.id = pl.package_id
    WHERE p.id = ? AND p.user_id = ?
    LIMIT 1
    `,
    [id, userId]
  );

  if (!rows.length) throw httpError(404, 'Travel proposal not found for this user');

  const p = rows[0];

  // 2. Fetch Related Data (Destinations, Family, Docs)
  // Destinations
  const destinations = await query(
    `SELECT
        ds.destination_id AS destinationId,
        d.name,
        d.region
     FROM ${tables.destinations} ds
     INNER JOIN travel_destinations d ON d.id = ds.destination_id
     WHERE ds.proposal_id = ?
     ORDER BY ds.id ASC`,
    [id]
  );

  // ✅ Family members (ONLY for domestic/huj/international)
  let familyMembers = [];
  if (tables.family) {
    familyMembers = await query(
      `SELECT
          id,
          member_type AS memberType,
          first_name AS firstName,
          last_name AS lastName,
          dob,
          gender,
          cnic,
          passport_number AS passportNumber,
          relation,
          created_at AS createdAt
       FROM ${tables.family}
       WHERE proposal_id = ?
       ORDER BY id ASC`,
      [id]
    );
  }

  // documents
  const documents = await query(
    `SELECT
        id,
        doc_type AS docType,
        side,
        file_path AS filePath,
        created_at AS createdAt
     FROM travel_documents
     WHERE package_code = ? AND proposal_id = ?
     ORDER BY id ASC`,
    [packageCode, id]
  );

  const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:4000';
  const buildUrl = (filePath) => (filePath ? `${baseUrl}/${String(filePath).replace(/^\//, '')}` : null);

  // 3. Fetch KYC Docs (Employment Proof)
  /* =========================
   KYC (Travel)
   - occupation is stored in travel_*_proposals
   - employment proof is stored in kyc_documents table
   ========================= */

  const kycRows = await query(
    `
    SELECT
      id,
      doc_type AS docType,
      source_of_income AS sourceOfIncome,
      side,
      file_path AS filePath,
      created_at AS createdAt
    FROM kyc_documents
    WHERE proposal_type = 'TRAVEL'
      AND package_code = ?
      AND proposal_id = ?
      AND doc_type IN ('EMPLOYMENT_PROOF', 'SOURCE_OF_INCOME_PROOF')
    ORDER BY id DESC
    `,
    [packageCode, id]
  );

  const employmentProofRow = kycRows.find((r) => r.docType === 'EMPLOYMENT_PROOF');
  const sourceOfIncomeProofRow = kycRows.find((r) => r.docType === 'SOURCE_OF_INCOME_PROOF');

  const employmentProof = employmentProofRow
    ? {
      docType: employmentProofRow.docType,
      filePath: employmentProofRow.filePath,
      url: buildUrl(employmentProofRow.filePath),
      createdAt: employmentProofRow.createdAt,
    }
    : null;

  const sourceOfIncomeProof = sourceOfIncomeProofRow
    ? {
      docType: sourceOfIncomeProofRow.docType,
      sourceOfIncome: sourceOfIncomeProofRow.sourceOfIncome,
      filePath: sourceOfIncomeProofRow.filePath,
      url: buildUrl(sourceOfIncomeProofRow.filePath),
      createdAt: sourceOfIncomeProofRow.createdAt,
    }
    : null;

  // required docs JSON might come as string depending on mysql driver/settings
  let requiredDocs = p.reupload_required_docs ?? null;
  if (typeof requiredDocs === 'string') {
    try { requiredDocs = JSON.parse(requiredDocs); } catch (_) { }
  }

  // 4. Assemble Final Response Object
  return {
    id: p.id,
    insuranceType: p.insurance_type,
    packageCode: p.packageCode || packageCode, // fallback
    proposalId: p.id,

    // ✅ new lifecycle fields (you added these in tables)
    submissionStatus: p.submission_status,
    paymentStatus: p.payment_status,
    paidAt: p.paid_at,
    reviewStatus: p.review_status,
    submittedAt: p.submitted_at,
    expiresAt: p.expires_at,

    adminLastActionBy: p.admin_last_action_by,
    adminLastActionAt: p.admin_last_action_at,

    rejectionReason: p.rejection_reason,
    reuploadNotes: p.reupload_notes,
    reuploadRequiredDocs: requiredDocs,

    refund: {
      refundStatus: p.refund_status,
      refundAmount: p.refund_amount,
      refundReference: p.refund_reference,
      refundRemarks: p.refund_remarks,
      refundEvidencePath: p.refund_evidence_path,
      refundEvidenceUrl: buildUrl(p.refund_evidence_path),
      refundInitiatedAt: p.refund_initiated_at,
      refundProcessedAt: p.refund_processed_at,
      closedAt: p.closed_at,
    },

    policy: {
      policyStatus: p.policy_status,
      policyNo: p.policy_no,
      policyIssuedAt: p.policy_issued_at,
      policyExpiresAt: p.policy_expires_at,
      coverNoteUrl: buildUrl(p.cover_note_path),
      policyScheduleUrl: buildUrl(p.policy_schedule_path),
    },

    kyc: {
      occupation: p.occupation || null,
      employmentProof,
      sourceOfIncomeProof,
    },

    createdAt: p.created_at,
    updatedAt: p.updated_at,

    tripDetails: {
      PurposeOfVisit: p.purpose_of_visit,
      accommodation: p.accommodation,
      travelMode: p.travel_mode || null,
      packageCode: p.packageCode || packageCode,
      coverageType: p.coverageType || null,
      productPlan: p.productPlan || null,
      currency: p.currency || 'PKR',

      startDate: p.start_date,
      endDate: p.end_date,
      tenureDays: p.tenure_days,

      // only exists on INTERNATIONAL, safe for others
      isMultiTrip: p.is_multi_trip ?? null,
      maxTripDaysApplied: p.max_trip_days_applied ?? null,
      ageLoadingPercent: p.age_loading_percent ?? null,
    },

    applicantInfo: {
      firstName: p.first_name,
      lastName: p.last_name,
      address: p.address,
      cityId: p.city_id,
      cityName: p.cityName,
      cnic: p.cnic,
      passportNumber: p.passport_number,
      mobile: p.mobile,
      email: p.email,
      dob: p.dob,

      occupation: p.occupation || null,

      // only exists on STUDENT
      universityName: p.university_name ?? null,
    },

    parentInfo: {
      // only exists on STUDENT
      parentName: p.parent_name ?? null,
      parentAddress: p.parent_address ?? null,
      parentCnic: p.parent_cnic ?? null,
      parentCnicIssueDate: p.parent_cnic_issue_date ?? null,
      parentRelation: p.parent_relation ?? null,
    },

    beneficiary: {
      beneficiaryName: p.beneficiary_name,
      beneficiaryAddress: p.beneficiary_address,
      beneficiaryCnic: p.beneficiary_cnic,
      beneficiaryCnicIssueDate: p.beneficiary_cnic_issue_date,
      beneficiaryRelation: p.beneficiary_relation,
    },

    pricing: {
      basePremium: p.base_premium ?? null,
      finalPremium: p.final_premium ?? null,

      // doesn’t exist in DB (unless you add later)
      addOnsPremium: p.add_ons_premium ?? null,
    },

    destinations: destinations.map((d) => ({
      destinationId: d.destinationId,
      name: d.name,
      region: d.region,
    })),

    familyMembers: familyMembers.map((m) => ({
      id: m.id,
      memberType: m.memberType,
      firstName: m.firstName,
      lastName: m.lastName,
      dob: m.dob,
      gender: m.gender,
      cnic: m.cnic,
      passportNumber: m.passportNumber,
      relation: m.relation,
      createdAt: m.createdAt,
    })),

    documents: documents.map((d) => ({
      id: d.id,
      docType: d.docType,
      side: d.side,
      filePath: d.filePath,
      url: buildUrl(d.filePath),
      createdAt: d.createdAt,
    })),
  };
}


module.exports = {
  // main
  quoteTravelPremiumService,
  submitProposalService,

  // uploads
  uploadTravelAssetsService,
  // reuploads
  reuploadTravelAssetsService,

  // get travel proposals
  getTravelProposalByIdForUser,
};
