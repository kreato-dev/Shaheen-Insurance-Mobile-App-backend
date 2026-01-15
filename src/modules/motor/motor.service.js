// src/modules/motor/motor.service.js
const { query, getConnection } = require('../../config/db');
const { deleteFileIfExists } = require('../../utils/fileCleanup');

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
};

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
 * Calculate motor premium and sum insured
 * Very simple sample logic:
 *  - sumInsured = vehicleValue + accessoriesValue (default = 0 from frontend)
 *  - baseRate = 1.4% of sumInsured
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
  let premium = sumInsured * 0.014; // 1.4%

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
    if (regNoRaw.length < 4) {
      throw httpError(400, 'vehicleDetails.registrationNumber looks invalid');
    }

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
 * Validate foreign keys exist (city, make, submake, tracker)
 */
async function validateForeignKeys({ cityId, makeId, submakeId, variantId, modelYear, trackerCompanyId, }) {
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
 * Upload assets by step:
 * - step=cnic: cnic_front + cnic_back => motor_documents (CNIC)
 * - step=license: license_front + license_back => motor_documents (DRIVING_LICENSE)
 * - step=regbook: regbook_front + regbook_back => motor_documents (REGISTRATION_BOOK)
 * - step=vehicle: vehicle images => motor_vehicle_images (ONLY)
 *
 * Also deletes old files from storage after successful DB commit
 * If DB fails, deletes newly uploaded files to avoid junk in storage
 */
async function uploadMotorAssetsService({ userId, proposalId, step, files }) {
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

    // STEP 3: REGISTRATION BOOK ONLY
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

    // STEP 4: VEHICLE IMAGES ONLY (NO regbook here)
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

    throw httpError(400, 'Invalid step. Use: cnic, license, regbook, vehicle');
  } catch (err) {
    await conn.rollback();

    // IMPORTANT: delete newly uploaded files if DB failed (avoid orphan files)
    for (const p of newPaths) {
      try { await deleteFileIfExists(p); } catch (_) {}
    }

    throw err;
  } finally {
    conn.release();
  }
}


/**
 * Reupload assets:
 */
async function reuploadMotorAssetsService({ userId, proposalId, files }) {
  if (!userId) throw httpError(401, 'User is required');
  if (!proposalId || Number.isNaN(Number(proposalId))) throw httpError(400, 'Invalid proposalId');

  const uploadedFields = Object.keys(files || {});
  if (!uploadedFields.length) throw httpError(400, 'No files uploaded');

  const conn = await getConnection();

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

        const oldPath = await replaceMotorDocument(conn, proposalId, docType, side, newPath);
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

    await conn.commit();

    // delete old files after commit
    for (const p of oldPathsToDelete) {
      await deleteFileIfExists(p);
    }
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
    try { requiredDocs = JSON.parse(requiredDocs); } catch (_) { }
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

// update registration number when issued
async function updateMotorRegistrationNumberService({ userId, proposalId, registrationNumber }) {
  if (!userId) throw httpError(401, 'User is required');
  if (!proposalId || Number.isNaN(Number(proposalId))) throw httpError(400, 'Invalid proposalId');

  const reg = String(registrationNumber || '').trim().toUpperCase();

  if (!reg) throw httpError(400, 'registrationNumber is required');
  if (reg === 'APPLIED') throw httpError(400, 'registrationNumber cannot be "APPLIED"');

  if (reg.length < 4) throw httpError(400, 'registrationNumber looks invalid');

  const conn = await getConnection();
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
    // (keep or remove based on business flow)
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

    await conn.commit();

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
