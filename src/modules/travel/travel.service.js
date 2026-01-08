// src/modules/travel/travel.service.js
const { query, getConnection } = require('../../config/db');

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
  if (s.includes('hajj') || s.includes('umrah') || s.includes('ziarat') || s.includes('ziyarat')) {
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
  if (s === 'basic') return 'BASIC';
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
 * - International multi-trip restriction: max 90 days per trip in those age bands
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
    isMultiTrip = false,
  } = data;

  if (!packageType || !coverageType || !productPlan) {
    throw httpError(400, 'packageType, coverageType, and productPlan are required');
  }

  let tenureDays = tenureDaysInput;

  // If tenureDays not provided, we calculate it
  if (!tenureDays) {
    if (!startDate || !endDate) {
      throw httpError(400, 'Either tenureDays or (startDate & endDate) are required');
    }
    tenureDays = calculateTenureDays(startDate, endDate);
  }

  if (tenureDays <= 0) throw httpError(400, 'tenureDays must be positive');

  const age = dob ? calculateAge(dob) : null;

  const packageCode = normalizePackageCode(packageType);
  const coverageCode = normalizeCoverageCode(packageCode, coverageType);
  const planCode = normalizePlanCode(productPlan);

  const { packageId, planId, slab } = await getPlanAndSlab({
    packageCode,
    coverageCode,
    planCode,
    tenureDays,
    isMultiTrip: !!isMultiTrip,
  });

  const { loadingPercent, maxTripDaysApplied } = await applyRulesAndLoading({
    packageId,
    packageCode,
    age,
    isMultiTrip: !!isMultiTrip,
  });

  // Base premium comes from slab
  const basePremium = Number(slab.premium);
  
  // Final premium includes possible age loading for international
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
  const required = ['firstName', 'lastName', 'address', 'cityId', 'cnic', 'mobile', 'email', 'dob'];
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
  });

  const proposalTable = resolveProposalTable(packageCode);
  const destTable = resolveDestTable(packageCode);
  const familyTable = resolveFamilyTable(packageCode);

  const conn = await getConnection();

  try {
    await conn.beginTransaction();

    let insertSql;
    let insertParams;

    // International has extra fields for age loading + multi-trip
    if (packageCode === 'INTERNATIONAL') {
      insertSql = `
        INSERT INTO ${proposalTable}
        (user_id, plan_id, start_date, end_date, tenure_days,
         is_multi_trip, max_trip_days_applied, age_loading_percent,
         first_name, last_name, address, city_id, cnic, passport_number, mobile, email, dob,
         beneficiary_name, beneficiary_address, beneficiary_cnic, beneficiary_cnic_issue_date, beneficiary_relation,
         base_premium, final_premium,

        submission_status,
        payment_status,
        review_status,
        refund_status,
        submitted_at,
        expires_at,
        created_at, updated_at)
        VALUES (?, ?, ?, ?, ?,
                ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?, ?,
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
        startDate,
        endDate,
        tenureDays,
        quote.slab.isMultiTrip ? 1 : 0,
        quote.maxTripDaysApplied,
        quote.loadingPercent,

        applicantInfo.firstName,
        applicantInfo.lastName,
        applicantInfo.address,
        applicantInfo.cityId,
        applicantInfo.cnic,
        applicantInfo.passportNumber || null,
        applicantInfo.mobile,
        applicantInfo.email,
        applicantInfo.dob,

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
        (user_id, plan_id, start_date, end_date, tenure_days,
         university_name,
         parent_name, parent_address, parent_cnic, parent_cnic_issue_date, parent_relation,
         first_name, last_name, address, city_id, cnic, passport_number, mobile, email, dob,
         beneficiary_name, beneficiary_address, beneficiary_cnic, beneficiary_cnic_issue_date, beneficiary_relation,
         base_premium, final_premium,

        submission_status,
        payment_status,
        review_status,
        refund_status,
        submitted_at,
        expires_at,

        created_at, updated_at)
        VALUES (?, ?, ?, ?, ?,
                ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?, ?,
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
        startDate,
        endDate,
        tenureDays,

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
        applicantInfo.cnic,
        applicantInfo.passportNumber || null,
        applicantInfo.mobile,
        applicantInfo.email,
        applicantInfo.dob,

        beneficiary.beneficiaryName,
        beneficiary.beneficiaryAddress,
        beneficiary.beneficiaryCnic,
        beneficiary.beneficiaryCnicIssueDate,
        beneficiary.beneficiaryRelation,
        
        quote.basePremium,
        quote.finalPremium,
      ];
    } else {
      // Domestic / HUJ (common structure)
      insertSql = `
        INSERT INTO ${proposalTable}
        (user_id, plan_id, start_date, end_date, tenure_days,
         first_name, last_name, address, city_id, cnic, passport_number, mobile, email, dob,
         beneficiary_name, beneficiary_address, beneficiary_cnic, beneficiary_cnic_issue_date, beneficiary_relation,
         base_premium, final_premium,

        submission_status,
        payment_status,
        review_status,
        refund_status,
        submitted_at,
        expires_at,

        created_at, updated_at)
        VALUES (?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?, ?,
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
        startDate,
        endDate,
        tenureDays,

        applicantInfo.firstName,
        applicantInfo.lastName,
        applicantInfo.address,
        applicantInfo.cityId,
        applicantInfo.cnic,
        applicantInfo.passportNumber || null,
        applicantInfo.mobile,
        applicantInfo.email,
        applicantInfo.dob,

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
    const [result] = await conn.execute(insertSql, insertParams);
    const proposalId = result.insertId;

    // Insert destinations (same logic for all packages)
    for (const destId of effectiveDestinationIds) {
      await conn.execute(
        `INSERT INTO ${destTable} (proposal_id, destination_id, created_at)
         VALUES (?, ?, NOW())`,
        [proposalId, destId]
      );
    }

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

    // Return important computed values for frontend confirmation screen
    return {
      proposalId,
      packageCode,
      coverageCode,
      planCode: quote.planCode,
      tenureDays,
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

async function uploadTravelAssetsService({ userId, proposalId, packageCodeInput, step, files }) {
  if (!userId) throw httpError(401, 'User is required');
  if (!proposalId || Number.isNaN(Number(proposalId))) throw httpError(400, 'Invalid proposalId');
  if (!packageCodeInput) throw httpError(400, 'packageCode is required');
  if (!step) throw httpError(400, 'step is required');

  const packageCode = normalizePackageCode(packageCodeInput);
  const stepLower = String(step).toLowerCase();

  const conn = await getConnection();

  try {
    await conn.beginTransaction();

    await assertTravelProposalOwnership(conn, packageCode, proposalId, userId);

    // Step: identity (CNIC 2 pics OR Passport 1 pic)
    if (stepLower === 'identity') {
      const hasCnicFront = !!(files.cnic_front && files.cnic_front[0]);
      const hasCnicBack = !!(files.cnic_back && files.cnic_back[0]);
      const hasPassport = !!(files.passport_image && files.passport_image[0]);

      const cnicComplete = hasCnicFront && hasCnicBack;

      if (!cnicComplete && !hasPassport) {
        throw httpError(400, 'Upload CNIC (cnic_front + cnic_back) OR Passport (passport_image)');
      }

      if (cnicComplete) {
        await upsertTravelDocument(conn, {
          packageCode,
          proposalId,
          docType: 'CNIC',
          side: 'front',
          filePath: toUploadsRelativePathTravel(files.cnic_front[0]),
        });

        await upsertTravelDocument(conn, {
          packageCode,
          proposalId,
          docType: 'CNIC',
          side: 'back',
          filePath: toUploadsRelativePathTravel(files.cnic_back[0]),
        });
      }

      if (hasPassport) {
        await upsertTravelDocument(conn, {
          packageCode,
          proposalId,
          docType: 'PASSPORT',
          side: 'single',
          filePath: toUploadsRelativePathTravel(files.passport_image[0]),
        });
      }

      await conn.commit();

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

    // Step: ticket (optional)
    if (stepLower === 'ticket') {
      const hasTicket = !!(files.ticket_image && files.ticket_image[0]);

      if (hasTicket) {
        await upsertTravelDocument(conn, {
          packageCode,
          proposalId,
          docType: 'TICKET',
          side: 'single',
          filePath: toUploadsRelativePathTravel(files.ticket_image[0]),
        });
      }

      await conn.commit();

      return {
        proposalId,
        packageCode,
        step: 'ticket',
        saved: hasTicket ? ['ticket_image'] : [],
      };
    }

    throw httpError(400, 'Invalid step. Use: identity, ticket');
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/* =========================================================
   CATALOG (Dropdown APIs)
   ========================================================= */

/**
 * GET /api/travel/catalog/packages
 * Returns available travel packages (Domestic, International, etc.)
 */
async function listPackagesService() {
  const rows = await query(`SELECT id, code, name FROM travel_packages ORDER BY id ASC`);
  return rows;
}

/**
 * GET /api/travel/catalog/coverages?package=INTERNATIONAL
 * Returns coverages for a package (INDIVIDUAL/FAMILY, etc.)
 */
async function listCoveragesService(packageCode) {
  if (!packageCode) throw httpError(400, 'package query param is required');

  const pkgRows = await query(`SELECT id FROM travel_packages WHERE code = ? LIMIT 1`, [packageCode]);
  if (!pkgRows.length) throw httpError(400, 'Invalid package');

  const rows = await query(
    `SELECT id, code, name
     FROM travel_coverages
     WHERE package_id = ?
     ORDER BY id ASC`,
    [pkgRows[0].id]
  );
  return rows;
}

/**
 * GET /api/travel/catalog/plans?package=...&coverage=...
 * Returns plans for a given package+coverage (Gold/Platinum etc.)
 */
async function listPlansService(packageCode, coverageCode) {
  if (!packageCode) throw httpError(400, 'package query param is required');
  if (!coverageCode) throw httpError(400, 'coverage query param is required');

  const pkgRows = await query(`SELECT id FROM travel_packages WHERE code = ? LIMIT 1`, [packageCode]);
  if (!pkgRows.length) throw httpError(400, 'Invalid package');
  const packageId = pkgRows[0].id;

  const covRows = await query(
    `SELECT id FROM travel_coverages WHERE package_id = ? AND code = ? LIMIT 1`,
    [packageId, coverageCode]
  );
  if (!covRows.length) throw httpError(400, 'Invalid coverage for this package');

  const rows = await query(
    `SELECT id, code, name, currency
     FROM travel_plans
     WHERE package_id = ? AND coverage_id = ?
     ORDER BY FIELD(code,'BASIC','SILVER','GOLD','PLATINUM','DIAMOND'), id ASC`,
    [packageId, covRows[0].id]
  );

  return rows;
}

/**
 * GET /api/travel/catalog/slabs?planId=...
 * Returns pricing slabs for a plan (min/max days + premium)
 */
async function listSlabsService(planId) {
  if (!planId) throw httpError(400, 'planId query param is required');

  const rows = await query(
    `SELECT id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium
     FROM travel_plan_pricing_slabs
     WHERE plan_id = ?
     ORDER BY is_multi_trip ASC, min_days ASC`,
    [planId]
  );

  if (!rows.length) {
    // Not necessarily an error, but usually means planId is invalid
    throw httpError(400, 'No slabs found for this planId');
  }

  return rows;
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

  return {
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
    reuploadRequiredDocs: p.reupload_required_docs,

    refund: {
      refundStatus: p.refund_status,
      refundAmount: p.refund_amount,
      refundReference: p.refund_reference,
      refundRemarks: p.refund_remarks,
      refundEvidencePath: p.refund_evidence_path,
      refundInitiatedAt: p.refund_initiated_at,
      refundProcessedAt: p.refund_processed_at,
      closedAt: p.closed_at,
    },

    policy: {
      policyStatus: p.policy_status,
      policyNo: p.policy_no,
      policyIssuedAt: p.policy_issued_at,
      policyExpiresAt: p.policy_expires_at,
    },

    createdAt: p.created_at,
    updatedAt: p.updated_at,

    tripDetails: {
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

  // catalog
  listPackagesService,
  listCoveragesService,
  listPlansService,
  listSlabsService,

  // get travel proposals
  getTravelProposalByIdForUser,
};
