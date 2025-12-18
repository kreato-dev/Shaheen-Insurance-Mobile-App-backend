// src/modules/travel/travel.service.js
const { query, getConnection } = require('../../config/db');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * Helper: calculate age from DOB (YYYY-MM-DD)
 */
function calculateAge(dobStr) {
  const dob = new Date(dobStr);
  if (Number.isNaN(dob.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

/**
 * Helper: calculate tenure in days from start & end
 */
function calculateTenureDays(startDateStr, endDateStr) {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw httpError(400, 'Invalid startDate or endDate');
  }
  if (end <= start) {
    throw httpError(400, 'endDate must be after startDate');
  }

  const diffMs = end.getTime() - start.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return days;
}

/**
 * Base rate logic (very simple stub based on packageType + coverageType + tenureDays)
 * In real project you can move this to DB/config tables.
 */
function getBaseRatePerDay(packageType, coverageType, tenureDays) {
  const pkg = (packageType || '').toLowerCase();  // worldwide/student/domestic etc.
  const cov = (coverageType || '').toLowerCase(); // individual/family

  let rate = 500; // default per day

  // Example: worldwide more expensive, domestic cheaper
  if (pkg.includes('world')) rate = 800;
  if (pkg.includes('domestic')) rate = 300;
  if (pkg.includes('student')) rate = 400;
  if (pkg.includes('schengen')) rate = 700;

  // Family plans slightly more
  if (cov === 'family') rate = rate * 1.5;

  // Longer trips maybe slightly discounted (just demo)
  if (tenureDays > 30) rate = rate * 0.9;

  return rate;
}

/**
 * Calculate Travel premium according to FRD-style rules:
 * - basePremium = ratePerDay * tenureDays
 * - if addOns: +10%
 * - if age > 70: COVID not allowed (we just send message)
 */
async function calculatePremiumService(data) {
  const {
    packageType,
    coverageType,
    startDate,
    endDate,
    tenureDays: tenureDaysInput,
    dob,
    addOns, // boolean or array
  } = data;

  if (!packageType || !coverageType) {
    throw httpError(400, 'packageType and coverageType are required');
  }

  let tenureDays = tenureDaysInput;
  if (!tenureDays) {
    if (!startDate || !endDate) {
      throw httpError(
        400,
        'Either tenureDays or (startDate & endDate) are required'
      );
    }
    tenureDays = calculateTenureDays(startDate, endDate);
  }

  if (tenureDays <= 0) {
    throw httpError(400, 'tenureDays must be positive');
  }

  const age = dob ? calculateAge(dob) : null;
  const messages = [];

  let covidAllowed = true;
  if (age !== null && age > 70) {
    covidAllowed = false;
    messages.push('COVID coverage is not applicable for age above 70');
  }

  const ratePerDay = getBaseRatePerDay(packageType, coverageType, tenureDays);
  let basePremium = ratePerDay * tenureDays;

  let addOnsPremium = 0;
  let hasAddOns = false;

  // Interpret addOns: could be boolean, or list/array like ['hijacking', 'luggageDelay']
  if (Array.isArray(addOns) && addOns.length > 0) {
    hasAddOns = true;
  } else if (addOns === true || addOns === 'true' || addOns === 1 || addOns === '1') {
    hasAddOns = true;
  }

  if (hasAddOns) {
    addOnsPremium = basePremium * 0.1; // +10%
    messages.push('Add-ons premium (+10%) applied');
  }

  const finalPremium = basePremium + addOnsPremium;

  // placeholder sumInsured
  const sumInsured = 50000 * (coverageType === 'family' ? 2 : 1);

  return {
    tenureDays,
    age,
    covidAllowed,
    basePremium: Number(basePremium.toFixed(2)),
    addOnsPremium: Number(addOnsPremium.toFixed(2)),
    finalPremium: Number(finalPremium.toFixed(2)),
    sumInsured: Number(sumInsured.toFixed(2)),
    messages,
  };
}

/**
 * Validate trip details (Step 1-2 style)
 */
function validateTripDetails(tripDetails) {
  const required = ['packageType', 'coverageType'];

  for (const field of required) {
    if (!tripDetails[field]) {
      throw httpError(400, `tripDetails.${field} is required`);
    }
  }

  // Either tenureDays OR startDate + endDate
  if (!tripDetails.tenureDays) {
    if (!tripDetails.startDate || !tripDetails.endDate) {
      throw httpError(
        400,
        'Either tripDetails.tenureDays or (tripDetails.startDate & tripDetails.endDate) are required'
      );
    }
  }
}

/**
 * Validate applicant (Step 3)
 */
function validateApplicantInfo(applicantInfo) {
  const required = [
    'firstName',
    'lastName',
    'address',
    'cityId',
    'cnic',
    'mobile',
    'email',
    'dob',
  ];

  for (const field of required) {
    if (!applicantInfo[field]) {
      throw httpError(400, `applicantInfo.${field} is required`);
    }
  }

  const dob = new Date(applicantInfo.dob);
  if (Number.isNaN(dob.getTime())) {
    throw httpError(400, 'applicantInfo.dob is invalid date');
  }
  if (dob >= new Date()) {
    throw httpError(400, 'Date of birth must be in the past');
  }
}

/**
 * Validate family members if needed (Step 4)
 */
function validateFamilyMembersIfNeeded(coverageType, familyMembers) {
  const cov = (coverageType || '').toLowerCase();
  if (cov !== 'family') return;

  if (!Array.isArray(familyMembers) || familyMembers.length === 0) {
    throw httpError(400, 'familyMembers (non-empty array) is required when coverageType is family');
  }

  if (familyMembers.length > 10) {
    throw httpError(400, 'Maximum 10 family members allowed');
  }

  for (let i = 0; i < familyMembers.length; i++) {
    const m = familyMembers[i];
    const required = ['firstName', 'lastName', 'dob', 'memberType'];

    for (const field of required) {
      if (!m[field]) {
        throw httpError(400, `familyMembers[${i}].${field} is required`);
      }
    }

    const dob = new Date(m.dob);
    if (Number.isNaN(dob.getTime())) {
      throw httpError(400, `familyMembers[${i}].dob is invalid date`);
    }
    if (dob >= new Date()) {
      throw httpError(400, `familyMembers[${i}].dob must be in the past`);
    }

    const mt = String(m.memberType).toLowerCase();
    const allowed = ['spouse', 'child', 'parent', 'other'];
    if (!allowed.includes(mt)) {
      throw httpError(400, `familyMembers[${i}].memberType must be one of: ${allowed.join(', ')}`);
    }
  }
}

/**
 * Validate beneficiary (Step 5)
 */
function validateBeneficiary(beneficiary) {
  const required = [
    'beneficiaryName',
    'beneficiaryAddress',
    'beneficiaryCnic',
    'beneficiaryCnicIssueDate',
    'beneficiaryRelation',
  ];

  for (const field of required) {
    if (!beneficiary[field]) {
      throw httpError(400, `beneficiary.${field} is required`);
    }
  }

  const issueDate = new Date(beneficiary.beneficiaryCnicIssueDate);
  if (Number.isNaN(issueDate.getTime())) {
    throw httpError(400, 'beneficiary.beneficiaryCnicIssueDate is invalid date');
  }
}

/**
 * Validate parent info if Student plan (extra step)
 */
function validateParentInfoIfNeeded(packageType, parentInfo) {
  const pkg = (packageType || '').toLowerCase();

  const isStudentPlan =
    pkg.includes('student') || pkg.includes('study') || pkg === 'student';

  if (!isStudentPlan) return;

  if (!parentInfo) {
    throw httpError(400, 'parentInfo is required for student plans');
  }

  const required = [
    'parentName',
    'parentAddress',
    'parentCnic',
    'parentCnicIssueDate',
    'parentRelation',
  ];

  for (const field of required) {
    if (!parentInfo[field]) {
      throw httpError(400, `parentInfo.${field} is required`);
    }
  }

  const issueDate = new Date(parentInfo.parentCnicIssueDate);
  if (Number.isNaN(issueDate.getTime())) {
    throw httpError(400, 'parentInfo.parentCnicIssueDate is invalid date');
  }
}

/**
 * Validate that destination IDs exist, handle Umrah/special rules if needed
 */
async function validateDestinations(packageType, destinationIds) {
  if (!Array.isArray(destinationIds) || destinationIds.length === 0) {
    throw httpError(400, 'tripDetails.destinationIds (non-empty array) is required');
  }

  // Example rule: Umrah / Ziyarat single destination
  const pkg = (packageType || '').toLowerCase();
  const isUmrah = pkg.includes('umrah') || pkg.includes('ziyarat');
  if (isUmrah && destinationIds.length > 1) {
    throw httpError(
      400,
      'Only one destination is allowed for Umrah/Ziyarat plans'
    );
  }

  // Validate they exist in DB
  const placeholders = destinationIds.map(() => '?').join(', ');
  const rows = await query(
    `SELECT id FROM travel_destinations WHERE id IN (${placeholders})`,
    destinationIds
  );

  if (rows.length !== destinationIds.length) {
    throw httpError(400, 'One or more destinationIds are invalid');
  }
}

/**
 * Create travel proposal + multi-destination rows in transaction
 */
async function submitProposalService(userId, tripDetails, applicantInfo, beneficiary, parentInfo, familyMembers) {
  if (!userId) {
    throw httpError(401, 'User is required');
  }

  validateTripDetails(tripDetails);
  validateApplicantInfo(applicantInfo);
  validateBeneficiary(beneficiary);
  validateParentInfoIfNeeded(tripDetails.packageType, parentInfo);
  validateFamilyMembersIfNeeded(tripDetails.coverageType, familyMembers);

  const {
    packageType,
    coverageType,
    startDate,
    endDate,
    tenureDays: tenureDaysInput,
    addOns,
    destinationIds,
  } = tripDetails;

  if (!destinationIds || !Array.isArray(destinationIds) || destinationIds.length === 0) {
    throw httpError(400, 'tripDetails.destinationIds must be a non-empty array');
  }

  await validateDestinations(packageType, destinationIds);

  const tenureDays =
    tenureDaysInput ||
    calculateTenureDays(startDate, endDate);

  const age = calculateAge(applicantInfo.dob);

  // Calculate premium (reuse service)
  const premiumData = await calculatePremiumService({
    packageType,
    coverageType,
    startDate,
    endDate,
    tenureDays,
    dob: applicantInfo.dob,
    addOns,
  });

  const {
    basePremium,
    addOnsPremium,
    finalPremium,
    sumInsured,
    messages,
    covidAllowed,
  } = premiumData;

  const conn = await getConnection();

  try {
    await conn.beginTransaction();

    const [result] = await conn.execute(
      `INSERT INTO travel_proposals
       (user_id, package_type, product_plan, coverage_type,
        start_date, end_date, tenure_days, sum_insured, add_ons_selected,
        first_name, last_name, address, city_id, cnic, passport_number,
        mobile, email, dob, is_student, university_name,
        parent_name, parent_address, parent_cnic, parent_cnic_issue_date, parent_relation,
        beneficiary_name, beneficiary_address, beneficiary_cnic, beneficiary_cnic_issue_date,
        beneficiary_relation,
        base_premium, add_ons_premium, final_premium,
        status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', NOW(), NOW())`,
      [
        userId,
        packageType,
        tripDetails.productPlan || null,
        coverageType,
        startDate || null,
        endDate || null,
        tenureDays,
        sumInsured,
        Array.isArray(addOns) && addOns.length > 0 ? 1 : 0,
        applicantInfo.firstName,
        applicantInfo.lastName,
        applicantInfo.address,
        applicantInfo.cityId,
        applicantInfo.cnic,
        applicantInfo.passportNumber || null,
        applicantInfo.mobile,
        applicantInfo.email,
        applicantInfo.dob,
        tripDetails.packageType &&
          tripDetails.packageType.toLowerCase().includes('student')
          ? 1
          : 0,
        applicantInfo.universityName || null,
        parentInfo ? parentInfo.parentName || null : null,
        parentInfo ? parentInfo.parentAddress || null : null,
        parentInfo ? parentInfo.parentCnic || null : null,
        parentInfo ? parentInfo.parentCnicIssueDate || null : null,
        parentInfo ? parentInfo.parentRelation || null : null,
        beneficiary.beneficiaryName,
        beneficiary.beneficiaryAddress,
        beneficiary.beneficiaryCnic,
        beneficiary.beneficiaryCnicIssueDate,
        beneficiary.beneficiaryRelation,
        basePremium,
        addOnsPremium,
        finalPremium,
      ]
    );

    const proposalId = result.insertId;

    // insert selected destinations
    for (const destId of destinationIds) {
      await conn.execute(
        `INSERT INTO travel_destinations_selected
         (proposal_id, destination_id, created_at)
         VALUES (?, ?, NOW())`,
        [proposalId, destId]
      );
    }

    // insert family members if coverageType = family
    if ((coverageType || '').toLowerCase() === 'family') {
      for (const m of familyMembers) {
        await conn.execute(
          `INSERT INTO travel_family_members
           (proposal_id, member_type, first_name, last_name, dob, gender, cnic, passport_number, relation, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            proposalId,
            (m.memberType || 'other').toLowerCase(),
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

    return {
      proposalId,
      tenureDays,
      age,
      covidAllowed,
      basePremium,
      addOnsPremium,
      finalPremium,
      sumInsured,
      messages,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  calculatePremiumService,
  submitProposalService,
};
