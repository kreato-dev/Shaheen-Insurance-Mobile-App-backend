// src/modules/motor/motor.service.js
const { query, getConnection } = require('../../config/db');
const { deleteFileIfExists } = require('../../utils/fileCleanup');
const { fireUser, fireAdmin } = require('../notifications/notification.service');
const E = require('../notifications/notification.events');
const templates = require('../notifications/notification.templates');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * mappings for reupload/replace vehicle images + documents
**/
const DOC_FIELD_MAP = {
  cnic_front: { docType: 'CNIC', side: 'front' },
  cnic_back: { docType: 'CNIC', side: 'back' },
  license_front: { docType: 'DRIVING_LICENSE', side: 'front' },
  license_back: { docType: 'DRIVING_LICENSE', side: 'back' },
  regbook_front: { docType: 'REGISTRATION_BOOK', side: 'front' },
  regbook_back: { docType: 'REGISTRATION_BOOK', side: 'back' },

  employment_proof: { docType: 'EMPLOYMENT_PROOF', side: 'single' },
  source_of_income_proof: { docType: 'SOURCE_OF_INCOME_PROOF', side: 'single' },
};

/**
 * KYC document types that are stored in the kyc_documents table
 * (as opposed to motor_documents)
 */
const KYC_DOC_TYPES = new Set(['EMPLOYMENT_PROOF', 'SOURCE_OF_INCOME_PROOF']);

const VEHICLE_IMAGE_FIELDS = new Set([
  'front_side', 'back_side', 'right_side', 'left_side',
  'dashboard', 'engine_bay', 'boot', 'engine_number',
]);

/**
 * Relative Path to upload vehicle images + documents
 * **/
function toUploadsRelativePath(file) {
  // We always want a URL path, not OS file path
  return `uploads/motor/${file.filename}`;
}

/**
 * Registration Province enum allow-list
 * We store this in motor_proposals.registration_province
 *
 * UI labels:
 * Punjab · Sindh · Khyber Pakhtunkhwa · Balouchistan · Azad Kashmir · Gilgit Baltistan, Islamabad
 *
 * DB enum codes:
 * PUNJAB, SINDH, KPK, BALOCHISTAN, AZAD_KASHMIR, GILGIT_BALTISTAN, ISLAMABAD
 */
const REGISTRATION_PROVINCES = new Set([
  'PUNJAB',
  'SINDH',
  'KPK',
  'BALOCHISTAN',
  'AZAD_KASHMIR',
  'GILGIT_BALTISTAN',
  'ISLAMABAD',
]);

/* =========================================================
   KYC Validation (Motor)
   - Occupation is required as part of KYC.
   - Allowed options:
     PRIVATE_JOB, GOVERNMENT_JOB, SELF_EMPLOYED, UNEMPLOYED,
     HOUSEWIFE, RETIRED, STUDENT
   - Note:
     Employment/visiting card upload rules will be enforced in upload endpoint,
     not here (because upload is a separate API call).
========================================================= */

function normalizeOccupation(occupation) {
  // Accept: "Private Job", "private_job", "PRIVATE_JOB", "private job"
  const raw = String(occupation || '').trim();
  if (!raw) return null;

  const key = raw
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_');

  const allowed = new Set([
    'PRIVATE_JOB',
    'GOVERNMENT_JOB',
    'SELF_EMPLOYED/BUSINESS',
    'UNEMPLOYED',
    'AGRICULTURALIST/LANDLORD',
    'HOUSEWIFE',
    'RETIRED',
    'STUDENT',
  ]);

  if (!allowed.has(key)) return null;
  return key;
}

/**
 * Validate KYC details according to FRD-style requirements
 * Motor: Occupation is required
 */
function validateKycDetails(kyc) {
  // If you’re passing occupation inside personalDetails, you can call this like:
  // validateKycDetails({ occupation: personalDetails.occupation })
  const occupationNormalized = normalizeOccupation(kyc?.occupation);

  if (!occupationNormalized) {
    throw httpError(
      400,
      'kycDetails.occupation is required and must be one of: PRIVATE_JOB, GOVERNMENT_JOB, SELF_EMPLOYED/BUSINESS, UNEMPLOYED, AGRICULTURALIST/LANDLORD,HOUSEWIFE, HOUSEWIFE, RETIRED, STUDENT'
    );
  }

  // Normalize so DB always gets clean enum code
  kyc.occupation = occupationNormalized;

  // NOTE:
  // Employment proof requirement is not validated here because:
  // 1) Upload is a separate endpoint
  // 2) You said "may be required" (soft requirement)
  // We’ll enforce it (strict/soft) inside uploadKycDoc endpoint.
}

/**
 * Calculate motor premium and sum insured
 * Detailed breakdown: GP, AS, ST, STS, FIF, SD
 */
async function calculatePremiumService({ vehicleValue, year, tracker, accessoriesValue, registrationProvince }) {
  if (!vehicleValue || !year) {
    throw httpError(400, 'vehicleValue and year are required');
  }
  const numericValue = Number(vehicleValue);
  const numericaccessoriesValue = Number(accessoriesValue || 0);
  const numericYear = Number(year);
  if (Number.isNaN(numericValue) || numericValue <= 0) {
    throw httpError(400, 'vehicleValue must be a positive number');
  }
  if (Number.isNaN(numericaccessoriesValue) || numericaccessoriesValue < 0) {
    throw httpError(400, 'accessoriesValue must be a positive number');
  }
  if (Number.isNaN(numericYear) || numericYear < 2010) {
    throw httpError(400, 'year must be a valid year');
  }

  const nowYear = new Date().getFullYear();
  const vehicleAge = nowYear - numericYear;

  const sumInsured = numericValue + numericaccessoriesValue;

  // 1. Gross Premium (GP)
  // SINDH: 1.12890%, Others: 1.11925% (punjab, kpk etc )
  const prov = String(registrationProvince || '').toUpperCase();
  let gpRate = 0.0111925; //1.11925%
  if (prov === 'SINDH') {
    gpRate = 0.0112890; //1.12890%
  }

  const gp = sumInsured * gpRate;

  // 2. Admin Surcharge (AS) = 5% of GP
  const as = 0.05 * gp;

  // 3. Sub-Total (ST) = GP + AS
  const st = gp + as;

  // 4. Sales Tax on Services (STS)
  // Sindh: 15%, Others: 16%
  let taxRate = 0.16;
  if (prov === 'SINDH') {
    taxRate = 0.15;
  }
  const sts = taxRate * st;

  // 5. Federal Insurance Fee (FIF) = 1% of ST
  const fif = 0.01 * st;

  // 6. Stamp Duty (SD) = 500
  const sd = 500;

  // 7. Net Premium (NP)
  const np = gp + as + sts + fif + sd;

  const hasTracker = tracker === true || tracker === 'true' || tracker === 1 || tracker === '1';

  return {
    sumInsured: Number(sumInsured.toFixed(2)),
    grossPremium: Number(gp.toFixed(2)),
    adminSurcharge: Number(as.toFixed(2)),
    subTotal: Number(st.toFixed(2)),
    salesTax: Number(sts.toFixed(2)),
    federalInsuranceFee: Number(fif.toFixed(2)),
    stampDuty: Number(sd.toFixed(2)),
    netPremium: Number(np.toFixed(2)),
    vehicleAge,
    trackerApplied: hasTracker,
    grossPremiumFactor: gpRate,
  };
}

/**
 * Get market value for a vehicle
 * For now: simple stub logic using year and maybe base table later.
 */
async function getMarketValueService({ makeId, submakeId, year }) {
  if (!makeId || !submakeId || !year) {
    throw httpError(400, 'makeId, submakeId and year are required');
  }

  const numericYear = Number(year);
  if (Number.isNaN(numericYear) || numericYear < 2010) {
    throw httpError(400, 'year must be a valid year');
  }

  // Basic fake logic – you can replace with a proper lookup table later
  // Assume base = 3,000,000 for new car and depreciate 8% per year
  const baseValue = 3000000;
  const nowYear = new Date().getFullYear();
  const age = nowYear - numericYear;
  const depreciationRate = 0.08;
  const depreciatedFactor = Math.pow(1 - depreciationRate, Math.max(age, 0));

  const marketValue = baseValue * depreciatedFactor;

  return {
    marketValue: Number(marketValue.toFixed(0)),
    age,
  };
}

/**
 * Validate personal & vehicle details according to FRD-style requirements
 */
function validatePersonalDetails(personal) {
  const required = ['name', 'address', 'cityId', 'cnic', 'cnicExpiry', 'dob'];
  for (const field of required) {
    if (!personal[field]) {
      throw httpError(400, `personalDetails.${field} is required`);
    }
  }

  const today = new Date();
  const cnicExp = new Date(personal.cnicExpiry);
  const dob = new Date(personal.dob);

  if (Number.isNaN(cnicExp.getTime())) {
    throw httpError(400, 'personalDetails.cnicExpiry is invalid date');
  }
  if (Number.isNaN(dob.getTime())) {
    throw httpError(400, 'personalDetails.dob is invalid date');
  }
  if (cnicExp <= today) {
    throw httpError(400, 'CNIC expiry must be in the future');
  }
  if (dob >= today) {
    throw httpError(400, 'Date of birth must be in the past');
  }
}


function validateInsuranceStartDate(insuranceStartDate) {
  if (!insuranceStartDate) {
    throw httpError(400, 'insuranceStartDate is required');
  }

  const start = new Date(insuranceStartDate);
  if (Number.isNaN(start.getTime())) {
    throw httpError(400, 'insuranceStartDate is invalid date');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);

  if (start < today) {
    throw httpError(400, 'insuranceStartDate cannot be in the past');
  }
}

/*** Validate vehicle details*/
function validateVehicleDetails(vehicle) {
  const required = [
    'productType',
    'engineNumber',
    'chassisNumber',
    'modelYear',
    'assembly',
    'colour',
  ];
  for (const field of required) {
    if (!vehicle[field]) {
      throw httpError(400, `vehicleDetails.${field} is required`);
    }
  }

  // Validate Standard vs Custom Vehicle
  if (vehicle.makeId) {
    // Standard Flow
    if (!vehicle.submakeId) throw httpError(400, 'vehicleDetails.submakeId is required for standard vehicle');
    if (!vehicle.variantId) throw httpError(400, 'vehicleDetails.variantId is required for standard vehicle');
  } else {
    // Custom Flow
    if (!vehicle.customMake) throw httpError(400, 'vehicleDetails.customMake is required for custom vehicle');
    if (!vehicle.customSubmake) throw httpError(400, 'vehicleDetails.customSubmake is required for custom vehicle');
    if (!vehicle.customVariant) throw httpError(400, 'vehicleDetails.customVariant is required for custom vehicle');
    if (!vehicle.engineCapacity) throw httpError(400, 'vehicleDetails.engineCapacity is required for custom vehicle');
    if (!vehicle.seatingCapacity) throw httpError(400, 'vehicleDetails.seatingCapacity is required for custom vehicle');
    if (!vehicle.bodyTypeId) throw httpError(400, 'vehicleDetails.bodyTypeId is required for custom vehicle');
  }

  const yearNum = Number(vehicle.modelYear);
  if (Number.isNaN(yearNum) || yearNum < 1980) {
    throw httpError(400, 'vehicleDetails.modelYear is invalid');
  }

  const assembly = String(vehicle.assembly).toLowerCase();
  if (!['local', 'imported'].includes(assembly)) {
    throw httpError(400, 'vehicleDetails.assembly must be local or imported');
  }
  vehicle.assembly = assembly;

  /* =========================================================
      Registration Province (optional)
      - Stored in motor_proposals.registration_province
      - If appliedFor = true, province may still be provided (optional)
     ========================================================= */

  if (vehicle.registrationProvince !== undefined && vehicle.registrationProvince !== null && String(vehicle.registrationProvince).trim() !== '') {
    const rp = String(vehicle.registrationProvince).trim().toUpperCase();

    if (!REGISTRATION_PROVINCES.has(rp)) {
      throw httpError(
        400,
        `vehicleDetails.registrationProvince must be one of: ${[...REGISTRATION_PROVINCES].join(', ')}`
      );
    }

    // normalize
    vehicle.registrationProvince = rp;
  } else {
    // keep null if not provided
    vehicle.registrationProvince = null;
  }

  /* =========================================================
      Applied-for-registration handling RULE
     ========================================================= */

  const rawAppliedFor = vehicle.appliedFor;

  const appliedFor =
    rawAppliedFor === true ||
    rawAppliedFor === 1 ||
    rawAppliedFor === '1' ||
    rawAppliedFor === 'true';

  const regNoRaw =
    vehicle.registrationNumber !== undefined && vehicle.registrationNumber !== null
      ? String(vehicle.registrationNumber).trim()
      : '';

  // If appliedFor = true → registrationNumber must be empty OR "APPLIED"
  if (appliedFor) {
    if (regNoRaw && regNoRaw.toUpperCase() !== 'APPLIED') {
      throw httpError(
        400,
        'registrationNumber must be "APPLIED" (or empty) when appliedFor is true'
      );
    }

    // Normalize to APPLIED so DB is consistent
    vehicle.registrationNumber = 'APPLIED';
    vehicle.appliedFor = 1;
  } else {
    // If appliedFor = false → registrationNumber must be a real number (not APPLIED)
    if (!regNoRaw) {
      throw httpError(
        400,
        'vehicleDetails.registrationNumber is required when vehicleDetails.appliedFor is false'
      );
    }

    if (regNoRaw.toUpperCase() === 'APPLIED') {
      throw httpError(
        400,
        'registrationNumber cannot be "APPLIED" when appliedFor is false'
      );
    }

    // Keep it flexible but not garbage
/*
    if (regNoRaw.length < 4) {
      throw httpError(400, 'vehicleDetails.registrationNumber looks invalid');
    }
*/

    // Normalize formatting
    vehicle.registrationNumber = regNoRaw.toUpperCase();
    vehicle.appliedFor = 0;
  }

  // Ownership rule:
  // if applicant is not the vehicle owner, then it must be registered under the blood relation of the owner
  const rawIsOwner = vehicle.isOwner;

  const isOwner =
    rawIsOwner === true ||
    rawIsOwner === 1 ||
    rawIsOwner === '1' ||
    rawIsOwner === 'true';

  if (!isOwner) {
    if (!vehicle.ownerRelation) {
      throw httpError(
        400,
        'vehicleDetails.ownerRelation is required when vehicleDetails.isOwner is false'
      );
    }

    const allowedRelations = [
      'father',
      'mother',
      'brother',
      'sister',
      'spouse',
      'son',
      'daughter',
    ];

    const rel = String(vehicle.ownerRelation).toLowerCase();

    if (!allowedRelations.includes(rel)) {
      throw httpError(
        400,
        `vehicleDetails.ownerRelation must be one of: ${allowedRelations.join(', ')}`
      );
    }

    // normalize value (optional but nice)
    vehicle.ownerRelation = rel;
  }

  // normalize isOwner (optional but nice)
  vehicle.isOwner = isOwner ? 1 : 0;
}

/**
 * ✅ NEW (Recommended):
 * We do NOT trust user for:
 *  - Type of body
 *  - Engine cc
 *  - Seating capacity
 *
 * Because these are variant-level properties in DB now.
 * We always fetch them from vehicle_variants joined with vehicle_body_types.
 */
async function getVariantMeta({ makeId, submakeId, variantId, modelYear }) {
  const rows = await query(
    `
    SELECT
      vv.id AS variantId,
      vv.engine_cc AS engineCc,
      vv.seating_capacity AS seatingCapacity,
      vv.body_type_id AS bodyTypeId,
      vbt.name AS bodyTypeName
    FROM vehicle_variants vv
    LEFT JOIN vehicle_body_types vbt ON vbt.id = vv.body_type_id
    WHERE vv.id = ?
      AND vv.make_id = ?
      AND vv.submake_id = ?
      AND vv.model_year = ?
    LIMIT 1
    `,
    [variantId, makeId, submakeId, modelYear]
  );

  if (!rows.length) {
    throw httpError(400, 'Invalid variantId for given makeId/submakeId/modelYear');
  }

  const v = rows[0];

  // Defensive checks (since schema changes might be mid-way)
  if (!v.engineCc || Number(v.engineCc) <= 0) {
    throw httpError(500, 'Variant engine_cc is missing or invalid in DB');
  }
  if (!v.seatingCapacity || Number(v.seatingCapacity) <= 0) {
    throw httpError(500, 'Variant seating_capacity is missing or invalid in DB');
  }
  if (!v.bodyTypeId) {
    throw httpError(500, 'Variant body_type_id is missing in DB');
  }

  return {
    variantId: v.variantId,
    engineCc: Number(v.engineCc),
    seatingCapacity: Number(v.seatingCapacity),
    bodyTypeId: Number(v.bodyTypeId),
    bodyTypeName: v.bodyTypeName || null,
  };
}

/**
 * Validate foreign keys exist (city, make, submake, tracker)
 */
async function validateForeignKeys({ cityId, makeId, submakeId, variantId, modelYear, trackerCompanyId, bodyTypeId }) {
  if (cityId) {
    const city = await query('SELECT id FROM cities WHERE id = ? LIMIT 1', [cityId]);
    if (city.length === 0) {
      throw httpError(400, 'Invalid cityId');
    }
  }

  if (makeId) {
    const make = await query('SELECT id FROM vehicle_makes WHERE id = ? LIMIT 1', [makeId]);
    if (make.length === 0) throw httpError(400, 'Invalid makeId');
  }

  if (makeId && submakeId) {
    const submake = await query(
      'SELECT id FROM vehicle_submakes WHERE id = ? AND make_id = ? LIMIT 1',
      [submakeId, makeId]
    );
    if (submake.length === 0) throw httpError(400, 'Invalid submakeId for given makeId');
  }

  // NOTE: variant validity is now checked again in getVariantMeta() as well.
  // Keeping the old logic here because you asked not to remove old ones.
  if (makeId && submakeId && variantId) {
    const variant = await query(
      `SELECT id FROM vehicle_variants
        WHERE id = ? AND make_id = ? AND submake_id = ? AND model_year = ?
        LIMIT 1`,
      [variantId, makeId, submakeId, modelYear]
    );
    if (variant.length === 0) throw httpError(400, 'Invalid variantId for given makeId/submakeId/modelYear');
  }

  if (trackerCompanyId) {
    const tracker = await query(
      'SELECT id FROM tracker_companies WHERE id = ? LIMIT 1',
      [trackerCompanyId]
    );
    if (tracker.length === 0) {
      throw httpError(400, 'Invalid trackerCompanyId');
    }
  }

  if (bodyTypeId) {
    const bt = await query('SELECT id FROM vehicle_body_types WHERE id = ? LIMIT 1', [bodyTypeId]);
    if (bt.length === 0) throw httpError(400, 'Invalid bodyTypeId');
  }
}

/**
 * Create motor proposal + store images in a transaction
 * personalDetails, vehicleDetails: JS objects
 */
async function submitProposalService(userId, personalDetails, vehicleDetails) {
  if (!userId) {
    throw httpError(401, 'User is required');
  }

  validatePersonalDetails(personalDetails);
  validateKycDetails({ occupation: personalDetails.occupation });

  const {
    name,

    address,
    cityId,
    latitude = null,
    longitude = null,

    cnic,
    cnicExpiry,
    dob,
    nationality = null,
    gender = null,

    occupation, // will be normalized by validateKycDetails()
  } = personalDetails;

  const {
    insuranceType,
    productType,
    registrationNumber = null,
    registrationProvince = null,
    appliedFor = false,
    insuranceStartDate,
    isOwner,
    ownerRelation,
    engineNumber,
    chassisNumber,
    makeId = null,
    submakeId = null,
    modelYear,
    assembly,
    variantId = null,
    colour,
    trackerCompanyId = null,
    accessoriesValue,
    vehicleValue, // for premium calc
    // Custom fields
    customMake = null,
    customSubmake = null,
    customVariant = null,
    engineCapacity = null,
    seatingCapacity = null,
    bodyTypeId = null,
  } = vehicleDetails;

  validateInsuranceStartDate(insuranceStartDate);
  validateVehicleDetails(vehicleDetails);

  // Conditionally validate FKs
  if (makeId) {
    await validateForeignKeys({
      cityId,
      makeId,
      submakeId,
      modelYear,
      variantId: vehicleDetails.variantId,
      trackerCompanyId,
    });
  } else {
    // For custom vehicle, only validate city, tracker, and body type
    await validateForeignKeys({
      cityId,
      trackerCompanyId,
      bodyTypeId,
    });
  }

  /* =========================================================
      ✅ NEW (Recommended):
      Derive vehicle meta from variant (single source of truth)
      - bodyTypeId
      - engineCc
      - seatingCapacity
     ========================================================= */

  let variantMeta = {};
  if (variantId) {
    variantMeta = await getVariantMeta({ makeId, submakeId, variantId, modelYear });
  } else {
    // Custom vehicle meta from payload
    variantMeta = {
      engineCc: Number(engineCapacity),
      seatingCapacity: Number(seatingCapacity),
      bodyTypeId: Number(bodyTypeId),
    };
  }

  // calculate premium if vehicleValue provided
  let sumInsured = null;
  let premium = null;

  if (vehicleValue) {
    const prem = await calculatePremiumService({
      vehicleValue,
      accessoriesValue,
      year: modelYear,
      tracker: !!trackerCompanyId,
      registrationProvince,
    });
    sumInsured = prem.sumInsured;
    premium = prem.netPremium;
  }

  const conn = await getConnection();

  try {
    await conn.beginTransaction();

    const [result] = await conn.execute(
      `INSERT INTO motor_proposals
       (user_id, insurance_type, name, 
       
       address, city_id, latitude, longitude,
       
       cnic, cnic_expiry, dob, nationality, gender,

        occupation, occupation_updated_at,

        product_type, registration_number, registration_province, applied_for, is_owner, owner_relation, engine_number, chassis_number,
        make_id, submake_id, model_year, assembly, variant_id, colour, tracker_company_id, accessories_value,

        sum_insured, premium,

        submission_status,
        payment_status,
        review_status,
        refund_status,

        insurance_start_date,
        
        submitted_at,
        expires_at,

        created_at, updated_at)
      VALUES (
              ?, ?, ?,
              
              ?, ?, ?, ?,
              
              ?, ?, ?, ?, ?,

              ?, NOW(),

              ?, ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?, ?, ?,

              ?, ?,

              'submitted',
              'unpaid',
              'not_applicable',
              'not_applicable',

              ?,

              NOW(),
              DATE_ADD(NOW(), INTERVAL 7 DAY),
              NOW(), NOW())`,
      [
        userId,
        insuranceType,
        name,
        address,
        cityId,
        latitude,
        longitude,
        cnic,
        cnicExpiry,
        dob,
        nationality,
        gender,

        occupation,

        productType,
        registrationNumber,
        registrationProvince, // NEW
        appliedFor ? 1 : 0,
        isOwner ? 1 : 0,
        isOwner ? null : ownerRelation,
        engineNumber,
        chassisNumber,

        makeId,
        submakeId,
        modelYear,
        assembly,
        variantId,
        colour,
        trackerCompanyId,
        accessoriesValue || 0,
        sumInsured,
        premium,

        insuranceStartDate,
      ]
    );

    const proposalId = result.insertId;

    // If custom vehicle, insert into the new table
    if (!makeId) {
      await conn.execute(
        `INSERT INTO motor_proposal_custom_vehicles
         (proposal_id, custom_make, custom_submake, custom_variant, engine_capacity, seating_capacity, body_type_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          proposalId, customMake, customSubmake, customVariant,
          variantMeta.engineCc, variantMeta.seatingCapacity, variantMeta.bodyTypeId
        ]
      );
    }

    await conn.commit();

    // ✅ AFTER COMMIT: fire proposal submitted (unpaid)
    try {
      // get user info for email (optional)
      const userRows = await query(`SELECT full_name, email FROM users WHERE id=? LIMIT 1`, [userId]);
      const fullName = userRows?.[0]?.full_name || null;
      const email = userRows?.[0]?.email || null;

      // ADMIN: new proposal submitted (unpaid)
      const adminEmails = (process.env.ADMIN_ALERT_EMAILS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      fireAdmin(E.ADMIN_PROPOSAL_SUBMITTED_UNPAID, {
        entity_type: 'proposal_MOTOR',
        entity_id: proposalId,
        data: { proposal_type: 'MOTOR', proposal_id: proposalId, user_id: userId },
        // admin email is optional; spec says admin unpaid submit is notif only
        email: null,
      });

      // ✅ NEW: If custom vehicle, notify admin to add it
      if (!makeId) {
        fireAdmin(E.ADMIN_PROPOSAL_CUSTOM_VEHICLE, {
          entity_type: 'proposal_MOTOR',
          entity_id: proposalId,
          data: { proposal_type: 'MOTOR', proposal_id: proposalId, user_id: userId },
          email: adminEmails.length > 0
            ? templates.makeAdminCustomVehicleEmail({
              to: adminEmails.join(','),
              proposalLabel: `MOTOR-${proposalId}`,
              userName: fullName,
              userId,
              vehicleDetails: {
                make: customMake,
                submake: customSubmake,
                variant: customVariant,
                engineCc: variantMeta.engineCc,
                seating: variantMeta.seatingCapacity,
                bodyTypeId: variantMeta.bodyTypeId,
              },
            })
            : null,
        });
      }

      // USER:
      // basic in-app notif
      fireUser(E.PROPOSAL_SUBMITTED_UNPAID, {
        user_id: userId,
        entity_type: 'proposal',
        entity_id: proposalId,
        data: { proposal_type: 'MOTOR', proposal_id: proposalId },
        email: null,
      });

    } catch (_) {
      // don’t block response if notifications fail
    }

    return {
      proposalId,
      sumInsured,
      premium,
    };

  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Helpers for upload API
 */
function requireFiles(filesObj, requiredFields) {
  const missing = [];
  for (const f of requiredFields) {
    if (!filesObj || !filesObj[f] || !filesObj[f][0]) missing.push(f);
  }
  if (missing.length) {
    throw httpError(400, `Missing required files: ${missing.join(', ')}`);
  }
}

async function assertProposalOwnership(conn, proposalId, userId) {
  const [rows] = await conn.execute(
    `SELECT id FROM motor_proposals WHERE id = ? AND user_id = ? LIMIT 1`,
    [proposalId, userId]
  );
  if (!rows.length) {
    throw httpError(404, 'Motor proposal not found for this user');
  }
}

async function assertUploadOrder(conn, proposalId, step) {
  const [docs] = await conn.execute(
    `SELECT doc_type, side FROM motor_documents WHERE proposal_id = ?`,
    [proposalId]
  );

  const has = (type, side) => docs.some((d) => d.doc_type === type && d.side === side);

  const cnicDone = has('CNIC', 'front') && has('CNIC', 'back');
  const licenseDone = has('DRIVING_LICENSE', 'front') && has('DRIVING_LICENSE', 'back');
  const regbookDone = has('REGISTRATION_BOOK', 'front') && has('REGISTRATION_BOOK', 'back');

  /* =========================================================
      Upload order rules (UPDATED)
      - 1) CNIC must be uploaded before LICENSE
      - 2) CNIC + LICENSE must be uploaded before VEHICLE images
      - 3) REGBOOK is now the LAST step:
           ✅ requires CNIC + LICENSE
           ✅ requires at least 1 vehicle image (strict rule enabled)
     ========================================================= */

  if (step === 'license' && !cnicDone) {
    throw httpError(400, 'Upload CNIC (front/back) before driving license.');
  }

  if (step === 'vehicle' && (!cnicDone || !licenseDone)) {
    throw httpError(400, 'Upload CNIC + driving license before vehicle uploads.');
  }

  if (step === 'regbook' && (!cnicDone || !licenseDone)) {
    throw httpError(400, 'Upload CNIC + driving license before registration book uploads.');
  }

  // ✅ strict rule: regbook only after at least 1 vehicle image exists
  if (step === 'regbook') {
    const [imgs] = await conn.execute(
      `SELECT id FROM motor_vehicle_images WHERE proposal_id = ? LIMIT 1`,
      [proposalId]
    );
    if (!imgs.length) {
      throw httpError(400, 'Upload vehicle images before registration book uploads.');
    }
  }

  // NOTE: regbookDone variable is kept for future rules/UX (admin flows etc.)
  // currently unused, but intentionally left here
}

async function upsertDocument(conn, proposalId, docType, side, filePath) {
  await conn.execute(
    `INSERT INTO motor_documents (proposal_id, doc_type, side, file_path, created_at)
     VALUES (?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE file_path = VALUES(file_path)`,
    [proposalId, docType, side, filePath]
  );
}

async function upsertVehicleImage(conn, proposalId, imageType, filePath) {
  await conn.execute(
    `INSERT INTO motor_vehicle_images (proposal_id, image_type, file_path, created_at)
     VALUES (?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE file_path=VALUES(file_path), created_at=NOW()`,
    [proposalId, imageType, filePath]
  );
}

/**
 * replace the old vehicle documents with new one, also return the old file path so we can delete it from storage
*/
async function replaceMotorDocument(conn, proposalId, docType, side, newFilePath) {
  const [rows] = await conn.execute(
    `SELECT file_path
     FROM motor_documents
     WHERE proposal_id=? AND doc_type=? AND side=?
     LIMIT 1`,
    [proposalId, docType, side]
  );

  const oldPath = rows.length ? rows[0].file_path : null;

  await conn.execute(
    `INSERT INTO motor_documents (proposal_id, doc_type, side, file_path, created_at)
     VALUES (?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE file_path=VALUES(file_path), created_at=NOW()`,
    [proposalId, docType, side, newFilePath]
  );

  return oldPath;
}

/**
 * replace the old vehicle images with new one, also return the old file path so we can delete it from storage
*/
async function replaceMotorVehicleImage(conn, proposalId, imageType, newFilePath) {
  const [rows] = await conn.execute(
    `SELECT file_path
     FROM motor_vehicle_images
     WHERE proposal_id=? AND image_type=?
     LIMIT 1`,
    [proposalId, imageType]
  );

  const oldPath = rows.length ? rows[0].file_path : null;

  await conn.execute(
    `INSERT INTO motor_vehicle_images (proposal_id, image_type, file_path, created_at)
     VALUES (?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE file_path=VALUES(file_path), created_at=NOW()`,
    [proposalId, imageType, newFilePath]
  );

  return oldPath;
}

/**
 * Replace KYC document (stored in kyc_documents table)
 * Returns old file path so we can delete it after commit
 *
 * Expected table columns (recommended):
 *  - proposal_type (ENUM or VARCHAR) e.g. 'MOTOR'
 *  - proposal_id (INT)
 *  - doc_type (ENUM) e.g. 'EMPLOYMENT_PROOF'
 *  - side (ENUM) e.g. 'single'
 *  - file_path (TEXT/VARCHAR)
 *  - created_at, updated_at
 *
 * Recommended unique key:
 * UNIQUE(proposal_type, proposal_id, doc_type)
 */
async function replaceKycDocument(conn, proposalType, proposalId, docType, side, newFilePath, sourceOfIncomeText = null) {
  const [rows] = await conn.execute(
    `SELECT file_path
     FROM kyc_documents
     WHERE proposal_type = ? AND proposal_id = ? AND doc_type = ? AND side = ?
     LIMIT 1`,
    [proposalType, proposalId, docType, side]
  );

  const oldPath = rows.length ? rows[0].file_path : null;

  await conn.execute(
    `INSERT INTO kyc_documents (proposal_type, proposal_id, doc_type, side, file_path, source_of_income, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE file_path = VALUES(file_path), source_of_income = VALUES(source_of_income), updated_at = NOW()`,
    [proposalType, proposalId, docType, side, newFilePath, sourceOfIncomeText]
  );

  return oldPath;
}

/**
 * Upload assets by step:
 * - step=cnic: cnic_front + cnic_back => motor_documents (CNIC)
 * - step=license: license_front + license_back => motor_documents (DRIVING_LICENSE)
 * - step=vehicle: vehicle images => motor_vehicle_images (ONLY)
 * - step=regbook: regbook_front + regbook_back => motor_documents (REGISTRATION_BOOK)
 *
 * Also deletes old files from storage after successful DB commit
 * If DB fails, deletes newly uploaded files to avoid junk in storage
 */
async function uploadMotorAssetsService({ userId, proposalId, step, files, body = {} }) {
  if (!userId) throw httpError(401, 'User is required');
  if (!proposalId || Number.isNaN(Number(proposalId))) throw httpError(400, 'Invalid proposalId');
  if (!step) throw httpError(400, 'step is required');

  const stepLower = String(step).toLowerCase();

  // collect all newly uploaded file paths (for cleanup on rollback)
  const newPaths = [];
  for (const [field, arr] of Object.entries(files || {})) {
    if (!arr || !arr[0]) continue;
    newPaths.push(toUploadsRelativePath(arr[0]));
  }

  const conn = await getConnection();

  try {
    await conn.beginTransaction();

    await assertProposalOwnership(conn, proposalId, userId);
    await assertUploadOrder(conn, proposalId, stepLower);

    // We will delete these old paths only after successful commit
    const oldPathsToDelete = [];

    // STEP 1: CNIC
    if (stepLower === 'cnic') {
      requireFiles(files, ['cnic_front', 'cnic_back']);

      const newFront = toUploadsRelativePath(files.cnic_front[0]);
      const newBack = toUploadsRelativePath(files.cnic_back[0]);

      const oldFront = await replaceMotorDocument(conn, proposalId, 'CNIC', 'front', newFront);
      const oldBack = await replaceMotorDocument(conn, proposalId, 'CNIC', 'back', newBack);

      if (oldFront && oldFront !== newFront) oldPathsToDelete.push(oldFront);
      if (oldBack && oldBack !== newBack) oldPathsToDelete.push(oldBack);

      await conn.commit();

      // delete old files after commit
      for (const p of oldPathsToDelete) await deleteFileIfExists(p);

      return { proposalId, step: 'cnic', saved: ['cnic_front', 'cnic_back'] };
    }

    // STEP 2: LICENSE
    if (stepLower === 'license') {
      requireFiles(files, ['license_front', 'license_back']);

      const newFront = toUploadsRelativePath(files.license_front[0]);
      const newBack = toUploadsRelativePath(files.license_back[0]);

      const oldFront = await replaceMotorDocument(conn, proposalId, 'DRIVING_LICENSE', 'front', newFront);
      const oldBack = await replaceMotorDocument(conn, proposalId, 'DRIVING_LICENSE', 'back', newBack);

      if (oldFront && oldFront !== newFront) oldPathsToDelete.push(oldFront);
      if (oldBack && oldBack !== newBack) oldPathsToDelete.push(oldBack);

      await conn.commit();

      for (const p of oldPathsToDelete) await deleteFileIfExists(p);

      return { proposalId, step: 'license', saved: ['license_front', 'license_back'] };
    }

    // STEP X: KYC (EMPLOYMENT / VISITING CARD) OPTIONAL
    // step=kyc, field: employment_proof
    if (stepLower === 'kyc') {
      const hasEmploymentProof = !!(files.employment_proof && files.employment_proof[0]);
      const hasSourceOfIncomeProof = !!(files.source_of_income_proof && files.source_of_income_proof[0]);

      if (!hasEmploymentProof && !hasSourceOfIncomeProof) {
        throw httpError(400, 'employment_proof or source_of_income_proof file is required for kyc step');
      }

      const savedKycDocs = [];

      if (hasEmploymentProof) {
        const newProofPath = toUploadsRelativePath(files.employment_proof[0]);
        const oldProofPath = await replaceKycDocument(conn, 'MOTOR', proposalId, 'EMPLOYMENT_PROOF', 'single', newProofPath);
        if (oldProofPath && oldProofPath !== newProofPath) oldPathsToDelete.push(oldProofPath);
        savedKycDocs.push('employment_proof');
      }

      if (hasSourceOfIncomeProof) {
        const sourceOfIncomeText = body.source_of_income || null;
        if (!sourceOfIncomeText) {
          throw httpError(400, 'source_of_income text is required when uploading source_of_income_proof');
        }
        const newProofPath = toUploadsRelativePath(files.source_of_income_proof[0]);
        const oldProofPath = await replaceKycDocument(conn, 'MOTOR', proposalId, 'SOURCE_OF_INCOME_PROOF', 'single', newProofPath, sourceOfIncomeText);
        if (oldProofPath && oldProofPath !== newProofPath) oldPathsToDelete.push(oldProofPath);
        savedKycDocs.push('source_of_income_proof');
      }

      await conn.commit();

      for (const p of oldPathsToDelete) await deleteFileIfExists(p);

      return { proposalId, step: 'kyc', saved: savedKycDocs };
    }

    // STEP 3: VEHICLE IMAGES ONLY (NO regbook here)
    if (stepLower === 'vehicle') {
      const savedVehicleImages = [];

      for (const [field, arr] of Object.entries(files || {})) {
        if (!VEHICLE_IMAGE_FIELDS.has(field)) continue;
        if (!arr || !arr[0]) continue;

        const newImgPath = toUploadsRelativePath(arr[0]);

        const oldImgPath = await replaceMotorVehicleImage(conn, proposalId, field, newImgPath);
        if (oldImgPath && oldImgPath !== newImgPath) oldPathsToDelete.push(oldImgPath);

        savedVehicleImages.push(field);
      }

      if (!savedVehicleImages.length) {
        throw httpError(400, 'No vehicle images uploaded');
      }

      await conn.commit();
      for (const p of oldPathsToDelete) await deleteFileIfExists(p);

      return {
        proposalId,
        step: 'vehicle',
        saved: { vehicleImages: savedVehicleImages },
      };
    }

    // STEP 4: REGISTRATION BOOK ONLY
    if (stepLower === 'regbook') {
      requireFiles(files, ['regbook_front', 'regbook_back']);

      const newRegFront = toUploadsRelativePath(files.regbook_front[0]);
      const newRegBack = toUploadsRelativePath(files.regbook_back[0]);

      const oldRegFront = await replaceMotorDocument(conn, proposalId, 'REGISTRATION_BOOK', 'front', newRegFront);
      const oldRegBack = await replaceMotorDocument(conn, proposalId, 'REGISTRATION_BOOK', 'back', newRegBack);

      if (oldRegFront && oldRegFront !== newRegFront) oldPathsToDelete.push(oldRegFront);
      if (oldRegBack && oldRegBack !== newRegBack) oldPathsToDelete.push(oldRegBack);

      await conn.commit();
      for (const p of oldPathsToDelete) await deleteFileIfExists(p);

      return { proposalId, step: 'regbook', saved: ['regbook_front', 'regbook_back'] };
    }

    throw httpError(400, 'Invalid step. Use: cnic, license, vehicle, regbook');
  } catch (err) {
    await conn.rollback();

    // IMPORTANT: delete newly uploaded files if DB failed (avoid orphan files)
    for (const p of newPaths) {
      try { await deleteFileIfExists(p); } catch (_) { }
    }

    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Reupload assets:
 */
async function reuploadMotorAssetsService({ userId, proposalId, files, body = {} }) {
  if (!userId) throw httpError(401, 'User is required');
  if (!proposalId || Number.isNaN(Number(proposalId))) throw httpError(400, 'Invalid proposalId');

  const uploadedFields = Object.keys(files || {});
  if (!uploadedFields.length) throw httpError(400, 'No files uploaded');

  const conn = await getConnection();

  let notifCtx = null;

  // collect new paths (if rollback, delete them)
  const newPaths = [];
  try {
    await conn.beginTransaction();

    await assertProposalOwnership(conn, proposalId, userId);

    // check admin requested reupload
    const [rows] = await conn.execute(
      `SELECT review_status, reupload_required_docs
       FROM motor_proposals
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

    // build allow-list
    const allowDocs = new Set();   // "CNIC:front"
    const allowImgs = new Set();   // "dashboard"

    for (const item of required) {
      if (item?.doc_type && item?.side) {
        allowDocs.add(`${String(item.doc_type).toUpperCase()}:${String(item.side).toLowerCase()}`);
      }
      if (item?.image_type) {
        allowImgs.add(String(item.image_type));
      }
    }

    // validate uploaded fields are requested
    for (const field of uploadedFields) {
      if (DOC_FIELD_MAP[field]) {
        const key = `${DOC_FIELD_MAP[field].docType}:${DOC_FIELD_MAP[field].side}`;
        if (!allowDocs.has(key)) throw httpError(400, `Not requested for reupload: ${key}`);
        continue;
      }

      if (VEHICLE_IMAGE_FIELDS.has(field)) {
        if (!allowImgs.has(field)) throw httpError(400, `Not requested for reupload image: ${field}`);
        continue;
      }

      throw httpError(400, `Unexpected field: ${field}`);
    }

    for (const field of uploadedFields) {
      const f = files[field]?.[0];
      if (f) newPaths.push(toUploadsRelativePath(f));
    }

    // collect old paths (delete after commit)
    const oldPathsToDelete = [];

    const saved = { documents: [], vehicleImages: [] };

    for (const field of uploadedFields) {
      const file = files[field]?.[0];
      if (!file) continue;

      const newPath = toUploadsRelativePath(file);

      if (DOC_FIELD_MAP[field]) {
        const { docType, side } = DOC_FIELD_MAP[field];

        let oldPath = null;

        // KYC doc goes to kyc_documents table
        if (KYC_DOC_TYPES.has(docType)) {
          let sourceOfIncomeText = null;
          if (docType === 'SOURCE_OF_INCOME_PROOF') {
            sourceOfIncomeText = body.source_of_income; // from body
            if (!sourceOfIncomeText) {
              throw httpError(400, 'source_of_income text is required when re-uploading source_of_income_proof');
            }
          }
          oldPath = await replaceKycDocument(conn, 'MOTOR', proposalId, docType, side, newPath, sourceOfIncomeText);
        } else {
          // normal motor docs go to motor_documents
          oldPath = await replaceMotorDocument(conn, proposalId, docType, side, newPath);
        }

        if (oldPath && oldPath !== newPath) oldPathsToDelete.push(oldPath);

        saved.documents.push(field);
      } else if (VEHICLE_IMAGE_FIELDS.has(field)) {
        const oldPath = await replaceMotorVehicleImage(conn, proposalId, field, newPath);
        if (oldPath && oldPath !== newPath) oldPathsToDelete.push(oldPath);

        saved.vehicleImages.push(field);
      }
    }

    // OPTIONAL: after user reuploads, move review_status back to pending_review (or keep reupload_required)
    await conn.execute(
      `UPDATE motor_proposals
       SET review_status='pending_review',
           admin_last_action_at=NOW()
       WHERE id=?`,
      [proposalId]
    );

    // ✅ fetch user info for admin email context
    const [urows] = await conn.execute(
      `SELECT u.full_name, u.email
   FROM users u
   WHERE u.id=? LIMIT 1`,
      [userId]
    );

    notifCtx = {
      proposalId: Number(proposalId),
      userId: Number(userId),
      userName: urows?.[0]?.full_name || null,
      userEmail: urows?.[0]?.email || null,
      saved, // includes which docs/images were reuploaded
    };

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
        entity_type: 'proposal_MOTOR',
        entity_id: notifCtx.proposalId,
        data: {
          proposal_type: 'MOTOR',
          proposal_id: notifCtx.proposalId,
          user_id: notifCtx.userId,
          user_name: notifCtx.userName,
          reupload_saved: notifCtx.saved,
        },
        email:
          adminEmails.length > 0
            ? templates.makeAdminReuploadSubmittedEmail({
              to: adminEmails.join(','),
              proposalLabel: `MOTOR-${notifCtx.proposalId}`,
              userName: notifCtx.userName,
              userId: notifCtx.userId,
              saved: notifCtx.saved,
            })
            : null,
      });
    } catch (_) { }

    return { proposalId, saved };
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
 * ✅ Get full motor proposal details for logged-in user
 * Includes:
 * - motor_documents (with doc_url)
 * - motor_vehicle_images (with image_url)
 * - lifecycle/review/refund/policy blocks (new columns)
 */
async function getMotorProposalByIdForUser(userId, proposalId) {
  if (!userId) throw httpError(401, 'User is required');

  const id = Number(proposalId);
  if (!id || Number.isNaN(id)) throw httpError(400, 'Invalid proposalId');

  const rows = await query(
    `
    SELECT
      mp.*,
      c.name AS cityName,
      COALESCE(vm.name, mpcv.custom_make) AS makeName,
      COALESCE(vsm.name, mpcv.custom_submake) AS submakeName,
      tc.name AS trackerCompanyName,

      COALESCE(vv.name, mpcv.custom_variant) AS variantName,

      -- ✅ New: read these from vehicle_variants (Option A)
      COALESCE(vv.body_type_id, mpcv.body_type_id) AS bodyTypeId,
      COALESCE(vbt.name, vbt_custom.name) AS bodyTypeName,
      COALESCE(vv.engine_cc, mpcv.engine_capacity) AS engineCc,
      COALESCE(vv.seating_capacity, mpcv.seating_capacity) AS seatingCapacity,

      a.id AS lastActionAdminId
    FROM motor_proposals mp
    LEFT JOIN cities c ON c.id = mp.city_id
    LEFT JOIN vehicle_makes vm ON vm.id = mp.make_id
    LEFT JOIN vehicle_submakes vsm ON vsm.id = mp.submake_id
    LEFT JOIN tracker_companies tc ON tc.id = mp.tracker_company_id

    -- ✅ Variant join
    LEFT JOIN vehicle_variants vv ON vv.id = mp.variant_id

    -- ✅ Body type join (via variant)
    LEFT JOIN vehicle_body_types vbt ON vbt.id = vv.body_type_id

    -- ✅ Custom vehicle join
    LEFT JOIN motor_proposal_custom_vehicles mpcv ON mpcv.proposal_id = mp.id
    LEFT JOIN vehicle_body_types vbt_custom ON vbt_custom.id = mpcv.body_type_id

    LEFT JOIN admins a ON a.id = mp.admin_last_action_by
    WHERE mp.id = ? AND mp.user_id = ?
    LIMIT 1
    `,
    [id, userId]
  );

  if (!rows.length) throw httpError(404, 'Motor proposal not found for this user');

  const p = rows[0];

  // ✅ Must match your static route: app.use('/uploads', express.static(...))
  // Stored paths are like: "uploads/motor/xxx.png"
  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:4000';
  const buildUrl = (filePath) => (filePath ? `${baseUrl}/${String(filePath).replace(/^\//, '')}` : null);

  // Vehicle images
  const images = await query(
    `
    SELECT
      id,
      image_type AS imageType,
      file_path AS filePath,
      created_at AS createdAt
    FROM motor_vehicle_images
    WHERE proposal_id = ?
    ORDER BY id ASC
    `,
    [id]
  );

  // Motor documents (CNIC/DRIVING_LICENSE/REGISTRATION_BOOK)
  const documents = await query(
    `
    SELECT
      id,
      doc_type AS docType,
      side,
      file_path AS filePath,
      created_at AS createdAt
    FROM motor_documents
    WHERE proposal_id = ?
    ORDER BY id ASC
    `,
    [id]
  );

  /* =========================
   KYC (Motor)
   - occupation is stored in motor_proposals
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
    WHERE proposal_type = 'MOTOR'
      AND proposal_id = ?
      AND doc_type IN ('EMPLOYMENT_PROOF', 'SOURCE_OF_INCOME_PROOF')
    ORDER BY id DESC
    `,
    [id]
  );

  const renewalDocuments = rows.length
    ? {
      docType: 'Renewal Document',
      url: buildUrl(rows[0].renewal_document_path),
    }
    : null;

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

  // Recalculate premium breakdown for display/PDF (since we only store total in DB)
  let breakdown = {};
  try {
    const vehicleVal = Number(p.sum_insured) - Number(p.accessories_value || 0);
    breakdown = await calculatePremiumService({
      vehicleValue: vehicleVal,
      year: p.model_year,
      tracker: !!p.tracker_company_id,
      accessoriesValue: p.accessories_value,
      registrationProvince: p.registration_province,
    });
  } catch (e) {
    // If calculation fails (e.g. bad data), we just won't have the breakdown
  }

  return {
    id: p.id,
    insuranceType: p.insurance_type,
    proposalType: 'MOTOR',

    createdAt: p.created_at,
    updatedAt: p.updated_at,

    // ✅ lifecycle & review fields (new)
    lifecycle: {
      submissionStatus: p.submission_status,          // draft|submitted
      paymentStatus: p.payment_status,               // unpaid|paid
      paidAt: p.paid_at,
      reviewStatus: p.review_status,                 // not_applicable|pending_review|reupload_required|approved|rejected
      insuranceStartDate: p.insurance_start_date,
      submittedAt: p.submitted_at,
      expiresAt: p.expires_at,
    },

    admin: {
      lastActionBy: p.admin_last_action_by,
      lastActionAt: p.admin_last_action_at,
      lastActionAdmin: p.lastActionAdminId
        ? { id: p.lastActionAdminId }
        : null,
    },

    review: {
      rejectionReason: p.rejection_reason,
      reuploadNotes: p.reupload_notes,
      reuploadRequiredDocs: requiredDocs,
    },

    refund: {
      refundStatus: p.refund_status,                 // not_applicable|refund_initiated|refund_processed|closed
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
      policyStatus: p.policy_status,                 // not_issued|active|expired
      policyNo: p.policy_no,
      policyIssuedAt: p.policy_issued_at,
      policyExpiresAt: p.policy_expires_at,
      coverNoteUrl: buildUrl(p.cover_note_path),
      policyScheduleUrl: buildUrl(p.policy_schedule_path),
    },

    renewal: {
      renewalNotes: p.renewal_notes,
      renewalDocuments,
    },

    kyc: {
      occupation: p.occupation || null,
      employmentProof,
      sourceOfIncomeProof,
    },

    personalDetails: {
      name: p.name,
      address: p.address,
      cityId: p.city_id,
      cityName: p.cityName,
      cnic: p.cnic,
      cnicExpiry: p.cnic_expiry,
      dob: p.dob,
      nationality: p.nationality,
      gender: p.gender,

      occupation: p.occupation || null,
    },

    vehicleDetails: {
      productType: p.product_type,
      registrationNumber: p.registration_number,

      // ✅ NEW: registration province
      registrationProvince: p.registration_province || null,

      appliedFor: p.applied_for === 1,
      isOwner: p.is_owner === 1,
      ownerRelation: p.owner_relation,

      engineNumber: p.engine_number,
      chassisNumber: p.chassis_number,

      makeId: p.make_id,
      makeName: p.makeName,
      submakeId: p.submake_id,
      submakeName: p.submakeName,
      modelYear: p.model_year,
      assembly: p.assembly,

      variantId: p.variant_id,
      variantName: p.variantName || null,

      // ✅ NEW (from variant meta)
      bodyTypeId: p.bodyTypeId || null,
      bodyTypeName: p.bodyTypeName || null,
      engineCc: p.engineCc || null,
      seatingCapacity: p.seatingCapacity || null,

      colour: p.colour,
      trackerCompanyId: p.tracker_company_id,
      trackerCompanyName: p.trackerCompanyName || null,
      accessoriesValue: p.accessories_value,
    },

    pricing: {
      sumInsured: p.sum_insured,
      premium: p.premium,
      breakdown, // { grossPremium, adminSurcharge, subTotal, salesTax, federalInsuranceFee, stampDuty }
    },

    documents: documents.map((d) => ({
      id: d.id,
      docType: d.docType,
      side: d.side,
      filePath: d.filePath,
      url: buildUrl(d.filePath),
      createdAt: d.createdAt,
    })),

    images: images.map((img) => ({
      id: img.id,
      imageType: img.imageType,
      filePath: img.filePath,
      url: buildUrl(img.filePath),
      createdAt: img.createdAt,
    })),
  };
}

// update registration number when issued
async function updateMotorRegistrationNumberService({ userId, proposalId, registrationNumber }) {
  if (!userId) throw httpError(401, 'User is required');
  if (!proposalId || Number.isNaN(Number(proposalId))) throw httpError(400, 'Invalid proposalId');

  const reg = String(registrationNumber || '').trim().toUpperCase();

  if (!reg) throw httpError(400, 'registrationNumber is required');
  if (reg === 'APPLIED') throw httpError(400, 'registrationNumber cannot be "APPLIED"');
  if (reg.length < 4) throw httpError(400, 'registrationNumber looks invalid');

  const conn = await getConnection();

  // ✅ we'll fire after commit
  let notifCtx = null;

  try {
    await conn.beginTransaction();

    // ownership + current status checks
    const [rows] = await conn.execute(
      `SELECT
         id,
         user_id,
         applied_for,
         registration_number,
         review_status,
         policy_status
       FROM motor_proposals
       WHERE id = ? AND user_id = ?
       LIMIT 1`,
      [proposalId, userId]
    );

    if (!rows.length) throw httpError(404, 'Motor proposal not found for this user');

    const p = rows[0];

    // ✅ must be applied_for = 1 to allow update
    if (Number(p.applied_for) !== 1) {
      throw httpError(400, 'Registration number update is only allowed for applied-for-registration vehicles');
    }

    // Optional safety: block if already approved/active etc.
    // NOTE: Your current code blocks when policy_status=active or review_status=approved.
    // We'll keep exactly as you have it.
    const reviewStatus = String(p.review_status || '');
    const policyStatus = String(p.policy_status || '');

    if (reviewStatus === 'approved' || policyStatus === 'active') {
      throw httpError(400, 'Cannot update registration number after approval / policy issuance');
    }

    // Update registration + flip applied_for off
    await conn.execute(
      `UPDATE motor_proposals
       SET registration_number = ?,
           applied_for = 0,
           registration_updated_at = NOW(),
           registration_updated_by = 'user',
           updated_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [reg, proposalId, userId]
    );

    // ✅ fetch details for admin notification
    const [urows] = await conn.execute(
      `SELECT u.full_name, u.email
       FROM users u
       WHERE u.id = ?
       LIMIT 1`,
      [userId]
    );

    notifCtx = {
      proposalId: Number(proposalId),
      userId: Number(userId),
      regNo: reg,
      userName: urows?.[0]?.full_name || null,
      userEmail: urows?.[0]?.email || null,
    };

    await conn.commit();

    // ✅ AFTER COMMIT: ADMIN notify
    if (notifCtx) {
      const adminEmails = (process.env.ADMIN_ALERT_EMAILS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      fireAdmin(E.ADMIN_MOTOR_REG_NO_UPLOADED, {
        entity_type: 'policy_MOTOR',
        entity_id: notifCtx.proposalId,
        data: {
          proposal_type: 'MOTOR',
          proposal_id: notifCtx.proposalId,
          user_id: notifCtx.userId,
          user_name: notifCtx.userName,
          registration_number: notifCtx.regNo,
        },
        email:
          adminEmails.length > 0
            ? templates.makeAdminMotorRegNoUploadedEmail({
              to: adminEmails.join(','),
              proposalLabel: `MOTOR-${notifCtx.proposalId}`,
              registrationNumber: notifCtx.regNo,
              userName: notifCtx.userName,
              userId: notifCtx.userId,
            })
            : null,
      });
    }

    return {
      proposalId,
      registrationNumber: reg,
      appliedFor: 0,
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
  getMarketValueService,
  submitProposalService,
  uploadMotorAssetsService,
  reuploadMotorAssetsService,
  getMotorProposalByIdForUser,
  updateMotorRegistrationNumberService,
};
