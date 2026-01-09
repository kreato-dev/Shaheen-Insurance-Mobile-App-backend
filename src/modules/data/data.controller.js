// src/modules/data/data.controller.js
const { query } = require('../../config/db');

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
      `SELECT id, name, model_year AS modelYear
         FROM vehicle_variants
        WHERE make_id = ? AND submake_id = ? AND model_year = ?
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

module.exports = {
  getCities,
  getCountries,
  getVehicleMakes,
  getVehicleSubmakes,
  getTrackerCompanies,
  getTravelDestinations,
  getVehicleVariants,
};
