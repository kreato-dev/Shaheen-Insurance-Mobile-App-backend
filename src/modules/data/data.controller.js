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
  getVehicleMakes,
  getVehicleSubmakes,
  getTrackerCompanies,
  getTravelDestinations,
};
