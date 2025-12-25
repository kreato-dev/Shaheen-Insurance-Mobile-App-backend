// src/modules/motor/motor.service.js
const { query, getConnection } = require('../../config/db');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
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
async function validateForeignKeys({ cityId, makeId, submakeId, trackerCompanyId }) {
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
    colour,
    trackerCompanyId = null,
    accessoriesValue,
    vehicleValue, // for premium calc
  } = vehicleDetails;

  await validateForeignKeys({
    cityId,
    makeId,
    submakeId,
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
        make_id, submake_id, model_year, colour, tracker_company_id, accessories_value,
        sum_insured, premium, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', NOW(), NOW())`,
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

      await upsertDocument(conn, proposalId, 'CNIC', 'front', files.cnic_front[0].path);
      await upsertDocument(conn, proposalId, 'CNIC', 'back', files.cnic_back[0].path);

      await conn.commit();
      return { proposalId, step: 'cnic', saved: ['cnic_front', 'cnic_back'] };
    }

    // STEP 2: LICENSE
    if (stepLower === 'license') {
      requireFiles(files, ['license_front', 'license_back']);

      await upsertDocument(conn, proposalId, 'DRIVING_LICENSE', 'front', files.license_front[0].path);
      await upsertDocument(conn, proposalId, 'DRIVING_LICENSE', 'back', files.license_back[0].path);

      await conn.commit();
      return { proposalId, step: 'license', saved: ['license_front', 'license_back'] };
    }

    // STEP 3: VEHICLE + REG BOOK
    if (stepLower === 'vehicle') {
      // You said reg book/card images must be uploaded at the end of vehicle step
      requireFiles(files, ['regbook_front', 'regbook_back']);

      // save reg book docs
      await upsertDocument(conn, proposalId, 'REGISTRATION_BOOK', 'front', files.regbook_front[0].path);
      await upsertDocument(conn, proposalId, 'REGISTRATION_BOOK', 'back', files.regbook_back[0].path);

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
          [proposalId, field, file.path]
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
 * Get full motor proposal details for logged-in user
 * Includes images from motor_vehicle_images
 */
async function getMotorProposalByIdForUser(userId, proposalId) {
  if (!userId) throw httpError(401, 'User is required');

  const rows = await query(
    `SELECT
        mp.*,
        c.name AS cityName,
        vm.name AS makeName,
        vsm.name AS submakeName,
        tc.name AS trackerCompanyName
     FROM motor_proposals mp
     LEFT JOIN cities c ON c.id = mp.city_id
     LEFT JOIN vehicle_makes vm ON vm.id = mp.make_id
     LEFT JOIN vehicle_submakes vsm ON vsm.id = mp.submake_id
     LEFT JOIN tracker_companies tc ON tc.id = mp.tracker_company_id
     WHERE mp.id = ? AND mp.user_id = ?
     LIMIT 1`,
    [proposalId, userId]
  );

  if (!rows.length) throw httpError(404, 'Motor proposal not found for this user');

  const p = rows[0];

  // Fetch images for this proposal
  const images = await query(
    `SELECT id, image_type AS imageType, file_path AS filePath, created_at AS createdAt
       FROM motor_vehicle_images
      WHERE proposal_id = ?
      ORDER BY id ASC`,
    [proposalId]
  );

  // Return everything in a frontend friendly structure
  return {
    id: p.id,
    status: p.status,
    createdAt: p.created_at,
    updatedAt: p.updated_at,

    personalDetails: {
      name: p.name,
      address: p.address,
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
      makeName: p.makeName,
      submakeName: p.submakeName,
      modelYear: p.model_year,
      colour: p.colour,
      trackerCompanyName: p.trackerCompanyName,
      accessoriesValue: p.accessories_value,
    },

    pricing: {
      sumInsured: p.sum_insured,
      premium: p.premium,
    },

    images: images.map((img) => ({
      id: img.id,
      imageType: img.imageType,
      filePath: img.filePath,
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
