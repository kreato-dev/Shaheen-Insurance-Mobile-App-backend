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
 *  - sumInsured = vehicleValue
 *  - baseRate = 2% of sumInsured
 *  - if tracker: 10% discount <- not included rightnow
 *  - if vehicle age > 5 years: +15% loading <- not included rightnow
 */
async function calculatePremiumService({ vehicleValue, year, tracker }) {
  if (!vehicleValue || !year) {
    throw httpError(400, 'vehicleValue and year are required');
  }

  const numericValue = Number(vehicleValue);
  const numericYear = Number(year);
  if (Number.isNaN(numericValue) || numericValue <= 0) {
    throw httpError(400, 'vehicleValue must be a positive number');
  }
  if (Number.isNaN(numericYear) || numericYear < 1980) {
    throw httpError(400, 'year must be a valid year');
  }

  const nowYear = new Date().getFullYear();
  const vehicleAge = nowYear - numericYear;

  let sumInsured = numericValue;
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
  if (Number.isNaN(numericYear) || numericYear < 1980) {
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
 * files: array from multer
 */
async function submitProposalService(userId, personalDetails, vehicleDetails, files) {
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
    engineNumber,
    chassisNumber,
    makeId,
    submakeId,
    modelYear,
    colour,
    trackerCompanyId = null,
    accessoriesValue = 0,
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
        product_type, registration_number, applied_for, engine_number, chassis_number,
        make_id, submake_id, model_year, colour, tracker_company_id, accessories_value,
        sum_insured, premium, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', NOW(), NOW())`,
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

    // map file.fieldname -> image_type used in DB ENUM
    const supportedTypes = new Set([
      'front_side',
      'back_side',
      'right_side',
      'left_side',
      'dashboard',
      'engine_bay',
      'boot',
      'engine_number',
      'registration_front',
      'registration_back',
    ]);

    if (Array.isArray(files) && files.length > 0) {
      for (const file of files) {
        const field = file.fieldname;
        if (!supportedTypes.has(field)) {
          // you can ignore unknown or throw
          continue;
        }
        await conn.execute(
          `INSERT INTO motor_vehicle_images
           (proposal_id, image_type, file_path, created_at)
           VALUES (?, ?, ?, NOW())`,
          [proposalId, field, file.path]
        );
      }
    }

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

module.exports = {
  calculatePremiumService,
  getMarketValueService,
  submitProposalService,
};
