// src/modules/motor/motor.service.js
const { query, getConnection } = require('../../config/db');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}
/**
 * Relative Path to upload vehicle images + documents
 * **/
function toUploadsRelativePath(file) {
  // We always want a URL path, not OS file path
  return `uploads/motor/${file.filename}`;
}

/**
 * Calculate motor premium and sum insured
 * Very simple sample logic:
 *  - sumInsured = vehicleValue + accessoriesValue (default = 0 from frontend)
 *  - baseRate = 2% of sumInsured
 *  - if tracker: 10% discount <- not included rightnow
 *  - if vehicle age > 5 years: +15% loading <- not included rightnow
 */
async function calculatePremiumService({ vehicleValue, year, tracker, accessoriesValue }) {
  if (!vehicleValue || !year) {
    throw httpError(400, 'vehicleValue and year are required');
  }

  const numericValue = Number(vehicleValue);
  const numericaccessoriesValue = Number(accessoriesValue);
  const numericYear = Number(year);
  if (Number.isNaN(numericValue) || numericValue <= 0) {
    throw httpError(400, 'vehicleValue must be a positive number');
  }
  if (Number.isNaN(numericaccessoriesValue) || numericaccessoriesValue < 0) {
    throw httpError(400, 'accessoriesValue must be a positive number');
  }
  if (Number.isNaN(numericYear) || numericYear < 2015) {
    throw httpError(400, 'year must be a valid year');
  }

  const nowYear = new Date().getFullYear();
  const vehicleAge = nowYear - numericYear;

  let sumInsured = numericValue + numericaccessoriesValue;
  let premium = sumInsured * 0.02; // 2%

  const hasTracker = tracker === true || tracker === 'true' || tracker === 1 || tracker === '1';

  // Tracker discount 10%
  // if (hasTracker) {
  //   premium = premium * 0.9;
  // }

  // Older than 5 years → +15% loading
  // if (vehicleAge > 5) {
  //   premium = premium * 1.15;
  // }

  return {
    sumInsured: Number(sumInsured.toFixed(2)),
    premium: Number(premium.toFixed(2)),
    vehicleAge,
    trackerApplied: hasTracker,
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
  if (Number.isNaN(numericYear) || numericYear < 2015) {
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

/*** Validate vehicle details*/
function validateVehicleDetails(vehicle) {
  const required = [
    'productType',
    'engineNumber',
    'chassisNumber',
    'makeId',
    'submakeId',
    'modelYear',
    'assembly',
    'variantId',
    'colour',
  ];
  for (const field of required) {
    if (!vehicle[field]) {
      throw httpError(400, `vehicleDetails.${field} is required`);
    }
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
 * Validate foreign keys exist (city, make, submake, tracker)
 */
async function validateForeignKeys({ cityId, makeId, submakeId, variantId, modelYear, trackerCompanyId,}) {
  if (cityId) {
    const city = await query('SELECT id FROM cities WHERE id = ? LIMIT 1', [cityId]);
    if (city.length === 0) {
      throw httpError(400, 'Invalid cityId');
    }
  }

  const make = await query('SELECT id FROM vehicle_makes WHERE id = ? LIMIT 1', [makeId]);
  if (make.length === 0) {
    throw httpError(400, 'Invalid makeId');
  }

  const submake = await query(
    'SELECT id FROM vehicle_submakes WHERE id = ? AND make_id = ? LIMIT 1',
    [submakeId, makeId]
  );
  if (submake.length === 0) {
    throw httpError(400, 'Invalid submakeId for given makeId');
  }

  const variant = await query(
    `SELECT id FROM vehicle_variants
      WHERE id = ? AND make_id = ? AND submake_id = ? AND model_year = ?
      LIMIT 1`,
    [variantId, makeId, submakeId, modelYear]
  );

  if (variant.length === 0) {
    throw httpError(400, 'Invalid variantId for given makeId/submakeId/modelYear');
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
  validateVehicleDetails(vehicleDetails);

  const {
    name,
    address,
    cityId,
    cnic,
    cnicExpiry,
    dob,
    nationality = null,
    gender = null,
  } = personalDetails;

  const {
    productType,
    registrationNumber = null,
    appliedFor = false,
    isOwner,
    ownerRelation,
    engineNumber,
    chassisNumber,
    makeId,
    submakeId,
    modelYear,
    assembly,
    variantId,
    colour,
    trackerCompanyId = null,
    accessoriesValue,
    vehicleValue, // for premium calc
  } = vehicleDetails;

  await validateForeignKeys({
    cityId,
    makeId,
    submakeId,
    modelYear,
    variantId: vehicleDetails.variantId,
    trackerCompanyId,
  });

  // calculate premium if vehicleValue provided
  let sumInsured = null;
  let premium = null;

  if (vehicleValue) {
    const prem = await calculatePremiumService({
      vehicleValue,
      accessoriesValue,
      year: modelYear,
      tracker: !!trackerCompanyId,
    });
    sumInsured = prem.sumInsured;
    premium = prem.premium;
  }

  const conn = await getConnection();

  try {
    await conn.beginTransaction();

    const [result] = await conn.execute(
      `INSERT INTO motor_proposals
       (user_id, name, address, city_id, cnic, cnic_expiry, dob, nationality, gender,
        product_type, registration_number, applied_for, is_owner, owner_relation, engine_number, chassis_number,
        make_id, submake_id, model_year, assembly, variant_id, colour, tracker_company_id, accessories_value,
        sum_insured, premium,

        submission_status,
        payment_status,
        review_status,
        refund_status,
        submitted_at,
        expires_at,

        created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        'submitted',
        'unpaid',
        'not_applicable',
        'not_applicable',
        NOW(),
        DATE_ADD(NOW(), INTERVAL 7 DAY),
        NOW(), NOW())`,
      [
        userId,
        name,
        address,
        cityId,
        cnic,
        cnicExpiry,
        dob,
        nationality,
        gender,
        productType,
        registrationNumber,
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
      ]
    );

    const proposalId = result.insertId;

    await conn.commit();

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

  if (step === 'license' && !cnicDone) {
    throw httpError(400, 'Upload CNIC (front/back) before driving license.');
  }
  if (step === 'vehicle' && (!cnicDone || !licenseDone)) {
    throw httpError(400, 'Upload CNIC + driving license before vehicle uploads.');
  }
}

async function upsertDocument(conn, proposalId, docType, side, filePath) {
  await conn.execute(
    `INSERT INTO motor_documents (proposal_id, doc_type, side, file_path, created_at)
     VALUES (?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE file_path = VALUES(file_path)`,
    [proposalId, docType, side, filePath]
  );
}

/**
 * Upload assets by step:
 * - step=cnic: cnic_front + cnic_back => motor_documents (CNIC)
 * - step=license: license_front + license_back => motor_documents (DRIVING_LICENSE)
 * - step=vehicle: vehicle images => motor_vehicle_images AND regbook_front/back => motor_documents (REGISTRATION_BOOK)
 */
async function uploadMotorAssetsService({ userId, proposalId, step, files }) {
  if (!userId) throw httpError(401, 'User is required');
  if (!proposalId || Number.isNaN(Number(proposalId))) throw httpError(400, 'Invalid proposalId');
  if (!step) throw httpError(400, 'step is required');

  const conn = await getConnection();

  try {
    await conn.beginTransaction();

    await assertProposalOwnership(conn, proposalId, userId);

    const stepLower = String(step).toLowerCase();
    await assertUploadOrder(conn, proposalId, stepLower);

    // STEP 1: CNIC
    if (stepLower === 'cnic') {
      requireFiles(files, ['cnic_front', 'cnic_back']);

      await upsertDocument(conn, proposalId, 'CNIC', 'front', toUploadsRelativePath(files.cnic_front[0]));
      await upsertDocument(conn, proposalId, 'CNIC', 'back', toUploadsRelativePath(files.cnic_back[0]));

      await conn.commit();
      return { proposalId, step: 'cnic', saved: ['cnic_front', 'cnic_back'] };
    }

    // STEP 2: LICENSE
    if (stepLower === 'license') {
      requireFiles(files, ['license_front', 'license_back']);

      await upsertDocument(conn, proposalId, 'DRIVING_LICENSE', 'front', toUploadsRelativePath(files.license_front[0]));
      await upsertDocument(conn, proposalId, 'DRIVING_LICENSE', 'back', toUploadsRelativePath(files.license_back[0]));

      await conn.commit();
      return { proposalId, step: 'license', saved: ['license_front', 'license_back'] };
    }

    // STEP 3: VEHICLE + REG BOOK
    if (stepLower === 'vehicle') {
      // You said reg book/card images must be uploaded at the end of vehicle step
      requireFiles(files, ['regbook_front', 'regbook_back']);

      // save reg book docs
      await upsertDocument(conn, proposalId, 'REGISTRATION_BOOK', 'front', toUploadsRelativePath(files.regbook_front[0]));
      await upsertDocument(conn, proposalId, 'REGISTRATION_BOOK', 'back', toUploadsRelativePath(files.regbook_back[0]));

      // save vehicle images (optional but controlled)
      const supportedTypes = new Set([
        'front_side',
        'back_side',
        'right_side',
        'left_side',
        'dashboard',
        'engine_bay',
        'boot',
        'engine_number',
        // 'registration_front',
        // 'registration_back',
      ]);

      const savedVehicleImages = [];

      for (const [field, arr] of Object.entries(files || {})) {
        if (!supportedTypes.has(field)) continue;
        if (!arr || !arr[0]) continue;

        const file = arr[0];

        await conn.execute(
          `INSERT INTO motor_vehicle_images
           (proposal_id, image_type, file_path, created_at)
           VALUES (?, ?, ?, NOW())`,
          [proposalId, field, toUploadsRelativePath(file)]
        );

        savedVehicleImages.push(field);
      }

      await conn.commit();

      return {
        proposalId,
        step: 'vehicle',
        saved: {
          regbook: ['regbook_front', 'regbook_back'],
          vehicleImages: savedVehicleImages,
        },
      };
    }

    throw httpError(400, 'Invalid step. Use: cnic, license, vehicle');
  } catch (err) {
    await conn.rollback();
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
      vm.name AS makeName,
      vsm.name AS submakeName,
      tc.name AS trackerCompanyName,
      vv.name AS variantName,
      a.id AS lastActionAdminId
    FROM motor_proposals mp
    LEFT JOIN cities c ON c.id = mp.city_id
    LEFT JOIN vehicle_makes vm ON vm.id = mp.make_id
    LEFT JOIN vehicle_submakes vsm ON vsm.id = mp.submake_id
    LEFT JOIN tracker_companies tc ON tc.id = mp.tracker_company_id
    LEFT JOIN vehicle_variants vv ON vv.id = mp.variant_id
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
  const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:4000';
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

  // required docs JSON might come as string depending on mysql driver/settings
  let requiredDocs = p.reupload_required_docs ?? null;
  if (typeof requiredDocs === 'string') {
    try { requiredDocs = JSON.parse(requiredDocs); } catch (_) {}
  }

  return {
    id: p.id,
    proposalType: 'MOTOR',

    createdAt: p.created_at,
    updatedAt: p.updated_at,

    // ✅ lifecycle & review fields (new)
    lifecycle: {
      submissionStatus: p.submission_status,          // draft|submitted
      paymentStatus: p.payment_status,               // unpaid|paid
      paidAt: p.paid_at,
      reviewStatus: p.review_status,                 // not_applicable|pending_review|reupload_required|approved|rejected
      submittedAt: p.submitted_at,
      expiresAt: p.expires_at,
    },

    admin: {
      lastActionBy: p.admin_last_action_by,
      lastActionAt: p.admin_last_action_at,
      lastActionAdmin: p.lastActionAdminId
        ? {
            id: p.lastActionAdminId
          }
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
    },

    vehicleDetails: {
      productType: p.product_type,
      registrationNumber: p.registration_number,
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

      colour: p.colour,
      trackerCompanyId: p.tracker_company_id,
      trackerCompanyName: p.trackerCompanyName || null,
      accessoriesValue: p.accessories_value,
    },

    pricing: {
      sumInsured: p.sum_insured,
      premium: p.premium,
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


module.exports = {
  calculatePremiumService,
  getMarketValueService,
  submitProposalService,
  uploadMotorAssetsService,
  getMotorProposalByIdForUser,
};
