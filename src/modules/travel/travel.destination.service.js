// src/modules/travel/travel.destination.service.js
const { query } = require('../../config/db');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * Get list of travel destinations
 * Optional filters:
 * - region
 * - search (by name)
 */
async function getTravelDestinationsService(filters = {}) {
  const { region, search } = filters;

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
    SELECT
      id,
      name,
      region
    FROM travel_destinations
    ${whereSql}
    ORDER BY name ASC
    `,
    params
  );

  return rows;
}

module.exports = {
  getTravelDestinationsService,
};
