// src/modules/data/data.controller.js
const { query } = require('../../../config/db');
const service = require('./admin.data.service');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * GET /api/data/cities
 */
async function getCities(req, res, next) {
  try {
    const rows = await query(
      `
      SELECT id, name
      FROM cities
      ORDER BY name ASC
      `
    );

    return res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/data/countries
 */
async function getCountries(req, res, next) {
  try {
    const rows = await query(
      `
      SELECT id, name
      FROM countries
      ORDER BY name ASC
      `
    );

    return res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/data/vehicle-makes
 */
async function getVehicleMakes(req, res, next) {
  try {
    const rows = await query(
      `
      SELECT id, name
      FROM vehicle_makes
      ORDER BY name ASC
      `
    );

    return res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/data/vehicle-submakes/:makeId
 */
async function getVehicleSubmakes(req, res, next) {
  try {
    const { makeId } = req.params;

    if (!makeId || isNaN(makeId)) {
      throw httpError(400, 'Invalid makeId');
    }

    const rows = await query(
      `
      SELECT id, name
      FROM vehicle_submakes
      WHERE make_id = ?
      ORDER BY name ASC
      `,
      [makeId]
    );

    return res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/data/vehicle-body-types
 */
async function getVehicleBodyTypes(req, res, next) {
  try {
    const rows = await query(
      `
      SELECT id, name
      FROM vehicle_body_types
      ORDER BY name ASC
      `
    );

    return res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/data/vehicle-variants?makeId=1&submakeId=5&modelYear=2021
 */
async function getVehicleVariants(req, res, next) {
  try {
    const makeId = Number(req.query.makeId);
    const submakeId = Number(req.query.submakeId);
    const modelYear = Number(req.query.modelYear);

    if (!makeId || !submakeId || !modelYear) {
      return res.status(400).json({
        message: 'makeId, submakeId, and modelYear are required',
      });
    }

    const rows = await query(
      // `SELECT id, name, model_year AS modelYear
      //    FROM vehicle_variants
      //   WHERE make_id = ? AND submake_id = ? AND model_year = ?
      //   ORDER BY name ASC`,
      `SELECT vv.*,
      vbt.name AS bodyTypeName
         FROM vehicle_variants vv
      LEFT JOIN vehicle_body_types vbt ON vbt.id = vv.body_type_id
        WHERE vv.make_id = ? AND vv.submake_id = ? AND vv.model_year = ?
        ORDER BY name ASC`,
      [makeId, submakeId, modelYear]
    );

    return res.json({ data: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/data/tracker-companies
 */
async function getTrackerCompanies(req, res, next) {
  try {
    const rows = await query(
      `
      SELECT id, name
      FROM tracker_companies
      ORDER BY name ASC
      `
    );

    return res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/data/travel-destinations
 * Optional query params:
 *  - region
 *  - search
 */
async function getTravelDestinations(req, res, next) {
  try {
    const { region, search } = req.query;

    const where = [];
    const params = [];

    // hide system-only destinations (like Domestic "Anywhere..." row)
    where.push('is_system = 0');

    if (region) {
      where.push('region = ?');
      params.push(region);
    }

    if (search) {
      where.push('name LIKE ?');
      params.push(`%${search}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const rows = await query(
      `
      SELECT id, name, region
      FROM travel_destinations
      ${whereSql}
      ORDER BY name ASC
      `,
      params
    );

    return res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    next(err);
  }
}

/*
*
* ADMIN C-U-D
*
*/

// --- Cities ---
async function createCity(req, res, next) {
  try {
    const city = await service.createCity(req.body, req.admin.id);
    res.status(201).json(city);
  } catch (err) {
    next(err);
  }
}

async function updateCity(req, res, next) {
  try {
    const city = await service.updateCity(req.params.id, req.body, req.admin.id);
    res.json(city);
  } catch (err) {
    next(err);
  }
}

async function deleteCity(req, res, next) {
  try {
    await service.deleteCity(req.params.id, req.admin.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// --- Vehicle Makes ---
async function createVehicleMake(req, res, next) {
  try {
    const make = await service.createVehicleMake(req.body, req.admin.id);
    res.status(201).json(make);
  } catch (err) {
    next(err);
  }
}

async function updateVehicleMake(req, res, next) {
  try {
    const make = await service.updateVehicleMake(req.params.id, req.body, req.admin.id);
    res.json(make);
  } catch (err) {
    next(err);
  }
}

async function deleteVehicleMake(req, res, next) {
  try {
    await service.deleteVehicleMake(req.params.id, req.admin.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// --- Vehicle Submakes ---
async function createVehicleSubmake(req, res, next) {
  try {
    const submake = await service.createVehicleSubmake(req.body, req.admin.id);
    res.status(201).json(submake);
  } catch (err) {
    next(err);
  }
}

async function updateVehicleSubmake(req, res, next) {
  try {
    const submake = await service.updateVehicleSubmake(req.params.id, req.body, req.admin.id);
    res.json(submake);
  } catch (err) {
    next(err);
  }
}

async function deleteVehicleSubmake(req, res, next) {
  try {
    await service.deleteVehicleSubmake(req.params.id, req.admin.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// --- Vehicle Variants ---
async function createVehicleVariant(req, res, next) {
  try {
    const variant = await service.createVehicleVariant(req.body, req.admin.id);
    res.status(201).json(variant);
  } catch (err) {
    next(err);
  }
}

async function updateVehicleVariant(req, res, next) {
  try {
    const variant = await service.updateVehicleVariant(req.params.id, req.body, req.admin.id);
    res.json(variant);
  } catch (err) {
    next(err);
  }
}

async function deleteVehicleVariant(req, res, next) {
  try {
    await service.deleteVehicleVariant(req.params.id, req.admin.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// --- Vehicle Body Types ---
async function createVehicleBodyType(req, res, next) {
  try {
    const bodyType = await service.createVehicleBodyType(req.body, req.admin.id);
    res.status(201).json(bodyType);
  } catch (err) {
    next(err);
  }
}

async function updateVehicleBodyType(req, res, next) {
  try {
    const bodyType = await service.updateVehicleBodyType(req.params.id, req.body, req.admin.id);
    res.json(bodyType);
  } catch (err) {
    next(err);
  }
}

async function deleteVehicleBodyType(req, res, next) {
  try {
    await service.deleteVehicleBodyType(req.params.id, req.admin.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// --- Tracker Companies ---
async function createTrackerCompany(req, res, next) {
  try {
    const company = await service.createTrackerCompany(req.body, req.admin.id);
    res.status(201).json(company);
  } catch (err) {
    next(err);
  }
}

async function updateTrackerCompany(req, res, next) {
  try {
    const company = await service.updateTrackerCompany(req.params.id, req.body, req.admin.id);
    res.json(company);
  } catch (err) {
    next(err);
  }
}

async function deleteTrackerCompany(req, res, next) {
  try {
    await service.deleteTrackerCompany(req.params.id, req.admin.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCities,
  getCountries,
  getVehicleMakes,
  getVehicleSubmakes,
  getVehicleBodyTypes,
  getTrackerCompanies,
  getTravelDestinations,
  getVehicleVariants,
  createCity,
  updateCity,
  deleteCity,
  createVehicleMake,
  updateVehicleMake,
  deleteVehicleMake,
  createVehicleSubmake,
  updateVehicleSubmake,
  deleteVehicleSubmake,
  createVehicleVariant,
  updateVehicleVariant,
  deleteVehicleVariant,
  createVehicleBodyType,
  updateVehicleBodyType,
  deleteVehicleBodyType,
  createTrackerCompany,
  updateTrackerCompany,
  deleteTrackerCompany,
};
