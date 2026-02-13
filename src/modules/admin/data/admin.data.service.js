const { query } = require('../../../config/db');
const { logAdminAction } = require('../adminlogs/admin.logs.service');

function httpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

function handleDbError(e, entity) {
    if (e.code === 'ER_DUP_ENTRY') throw httpError(409, `${entity} already exists`);
    if (e.code === 'ER_ROW_IS_REFERENCED_2') throw httpError(409, `Cannot delete ${entity} as it is in use`);
    if (e.code === 'ER_NO_REFERENCED_ROW_2') throw httpError(400, `Invalid reference for ${entity}`);
    throw e;
}

// --- Cities ---
async function createCity({ name }, adminId) {
    if (!name) throw httpError(400, 'City name is required');
    try {
        const result = await query('INSERT INTO cities (name) VALUES (?)', [name]);
        await logAdminAction({ adminId, module: 'DATA', action: 'CREATE_CITY', targetId: result.insertId, details: { name } });
        return { id: result.insertId, name };
    } catch (e) {
        handleDbError(e, 'City');
    }
}

async function updateCity(id, { name }, adminId) {
    if (!name) throw httpError(400, 'City name is required');
    try {
        const result = await query('UPDATE cities SET name = ? WHERE id = ?', [name, id]);
        if (result.affectedRows === 0) throw httpError(404, 'City not found');
        await logAdminAction({ adminId, module: 'DATA', action: 'UPDATE_CITY', targetId: id, details: { name } });
        return { id: Number(id), name };
    } catch (e) {
        handleDbError(e, 'City');
    }
}

async function deleteCity(id, adminId) {
    try {
        const result = await query('DELETE FROM cities WHERE id = ?', [id]);
        if (result.affectedRows === 0) throw httpError(404, 'City not found');
        await logAdminAction({ adminId, module: 'DATA', action: 'DELETE_CITY', targetId: id });
        return { success: true };
    } catch (e) {
        handleDbError(e, 'City');
    }
}

// --- Vehicle Makes ---
async function createVehicleMake({ name }, adminId) {
    if (!name) throw httpError(400, 'Vehicle make name is required');
    try {
        const result = await query('INSERT INTO vehicle_makes (name) VALUES (?)', [name]);
        await logAdminAction({ adminId, module: 'DATA', action: 'CREATE_MAKE', targetId: result.insertId, details: { name } });
        return { id: result.insertId, name };
    } catch (e) {
        handleDbError(e, 'Vehicle make');
    }
}

async function updateVehicleMake(id, { name }, adminId) {
    if (!name) throw httpError(400, 'Vehicle make name is required');
    try {
        const result = await query('UPDATE vehicle_makes SET name = ? WHERE id = ?', [name, id]);
        if (result.affectedRows === 0) throw httpError(404, 'Vehicle make not found');
        await logAdminAction({ adminId, module: 'DATA', action: 'UPDATE_MAKE', targetId: id, details: { name } });
        return { id: Number(id), name };
    } catch (e) {
        handleDbError(e, 'Vehicle make');
    }
}

async function deleteVehicleMake(id, adminId) {
    try {
        const result = await query('DELETE FROM vehicle_makes WHERE id = ?', [id]);
        if (result.affectedRows === 0) throw httpError(404, 'Vehicle make not found');
        await logAdminAction({ adminId, module: 'DATA', action: 'DELETE_MAKE', targetId: id });
        return { success: true };
    } catch (e) {
        handleDbError(e, 'Vehicle make');
    }
}

// --- Vehicle Submakes ---
async function createVehicleSubmake({ name, make_id }, adminId) {
    if (!name || !make_id) throw httpError(400, 'Name and make_id are required');
    try {
        const result = await query('INSERT INTO vehicle_submakes (name, make_id) VALUES (?, ?)', [name, make_id]);
        await logAdminAction({ adminId, module: 'DATA', action: 'CREATE_SUBMAKE', targetId: result.insertId, details: { name, make_id } });
        return { id: result.insertId, name, make_id };
    } catch (e) {
        handleDbError(e, 'Vehicle submake');
    }
}

async function updateVehicleSubmake(id, { name, make_id }, adminId) {
    if (!name || !make_id) throw httpError(400, 'Name and make_id are required');
    try {
        const result = await query('UPDATE vehicle_submakes SET name = ?, make_id = ? WHERE id = ?', [name, make_id, id]);
        if (result.affectedRows === 0) throw httpError(404, 'Vehicle submake not found');
        await logAdminAction({ adminId, module: 'DATA', action: 'UPDATE_SUBMAKE', targetId: id, details: { name, make_id } });
        return { id: Number(id), name, make_id };
    } catch (e) {
        handleDbError(e, 'Vehicle submake');
    }
}

async function deleteVehicleSubmake(id, adminId) {
    try {
        const result = await query('DELETE FROM vehicle_submakes WHERE id = ?', [id]);
        if (result.affectedRows === 0) throw httpError(404, 'Vehicle submake not found');
        await logAdminAction({ adminId, module: 'DATA', action: 'DELETE_SUBMAKE', targetId: id });
        return { success: true };
    } catch (e) {
        handleDbError(e, 'Vehicle submake');
    }
}

// --- Vehicle Variants ---
async function createVehicleVariant(data, adminId) {
    const { name, make_id, submake_id, model_year, body_type_id, engine_cc, seating_capacity } = data;
    if (!name || !make_id || !submake_id || !model_year) throw httpError(400, 'Name, make_id, submake_id, and model_year are required');
    try {
        const result = await query(
            'INSERT INTO vehicle_variants (name, make_id, submake_id, model_year, body_type_id, engine_cc, seating_capacity) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, make_id, submake_id, model_year, body_type_id, engine_cc, seating_capacity]
        );
        await logAdminAction({ adminId, module: 'DATA', action: 'CREATE_VARIANT', targetId: result.insertId, details: data });
        return { id: result.insertId, ...data };
    } catch (e) {
        handleDbError(e, 'Vehicle variant');
    }
}

async function updateVehicleVariant(id, data, adminId) {
    const { name, make_id, submake_id, model_year, body_type_id, engine_cc, seating_capacity } = data;
    if (!name || !make_id || !submake_id || !model_year) throw httpError(400, 'Name, make_id, submake_id, and model_year are required');
    try {
        const result = await query(
            'UPDATE vehicle_variants SET name=?, make_id=?, submake_id=?, model_year=?, body_type_id=?, engine_cc=?, seating_capacity=? WHERE id=?',
            [name, make_id, submake_id, model_year, body_type_id, engine_cc, seating_capacity, id]
        );
        if (result.affectedRows === 0) throw httpError(404, 'Vehicle variant not found');
        await logAdminAction({ adminId, module: 'DATA', action: 'UPDATE_VARIANT', targetId: id, details: data });
        return { id: Number(id), ...data };
    } catch (e) {
        handleDbError(e, 'Vehicle variant');
    }
}

async function deleteVehicleVariant(id, adminId) {
    try {
        const result = await query('DELETE FROM vehicle_variants WHERE id = ?', [id]);
        if (result.affectedRows === 0) throw httpError(404, 'Vehicle variant not found');
        await logAdminAction({ adminId, module: 'DATA', action: 'DELETE_VARIANT', targetId: id });
        return { success: true };
    } catch (e) {
        handleDbError(e, 'Vehicle variant');
    }
}

// --- Tracker Companies ---
async function createTrackerCompany({ name }, adminId) {
    if (!name) throw httpError(400, 'Tracker company name is required');
    try {
        const result = await query('INSERT INTO tracker_companies (name) VALUES (?)', [name]);
        await logAdminAction({ adminId, module: 'DATA', action: 'CREATE_TRACKER', targetId: result.insertId, details: { name } });
        return { id: result.insertId, name };
    } catch (e) {
        handleDbError(e, 'Tracker company');
    }
}

async function updateTrackerCompany(id, { name }, adminId) {
    if (!name) throw httpError(400, 'Tracker company name is required');
    try {
        const result = await query('UPDATE tracker_companies SET name = ? WHERE id = ?', [name, id]);
        if (result.affectedRows === 0) throw httpError(404, 'Tracker company not found');
        await logAdminAction({ adminId, module: 'DATA', action: 'UPDATE_TRACKER', targetId: id, details: { name } });
        return { id: Number(id), name };
    } catch (e) {
        handleDbError(e, 'Tracker company');
    }
}

async function deleteTrackerCompany(id, adminId) {
    try {
        const result = await query('DELETE FROM tracker_companies WHERE id = ?', [id]);
        if (result.affectedRows === 0) throw httpError(404, 'Tracker company not found');
        await logAdminAction({ adminId, module: 'DATA', action: 'DELETE_TRACKER', targetId: id });
        return { success: true };
    } catch (e) {
        handleDbError(e, 'Tracker company');
    }
}

// --- Vehicle Body Types ---
async function createVehicleBodyType({ name }, adminId) {
    if (!name) throw httpError(400, 'Body type name is required');
    try {
        const result = await query('INSERT INTO vehicle_body_types (name) VALUES (?)', [name]);
        await logAdminAction({ adminId, module: 'DATA', action: 'CREATE_BODY_TYPE', targetId: result.insertId, details: { name } });
        return { id: result.insertId, name };
    } catch (e) {
        handleDbError(e, 'Body type');
    }
}

async function updateVehicleBodyType(id, { name }, adminId) {
    if (!name) throw httpError(400, 'Body type name is required');
    try {
        const result = await query('UPDATE vehicle_body_types SET name = ? WHERE id = ?', [name, id]);
        if (result.affectedRows === 0) throw httpError(404, 'Body type not found');
        await logAdminAction({ adminId, module: 'DATA', action: 'UPDATE_BODY_TYPE', targetId: id, details: { name } });
        return { id: Number(id), name };
    } catch (e) {
        handleDbError(e, 'Body type');
    }
}

async function deleteVehicleBodyType(id, adminId) {
    try {
        const result = await query('DELETE FROM vehicle_body_types WHERE id = ?', [id]);
        if (result.affectedRows === 0) throw httpError(404, 'Body type not found');
        await logAdminAction({ adminId, module: 'DATA', action: 'DELETE_BODY_TYPE', targetId: id });
        return { success: true };
    } catch (e) {
        handleDbError(e, 'Body type');
    }
}

/* =========================================================
   CATALOG (Dropdown APIs)
   ========================================================= */

/**
 * GET /api/data/travel/catalog/packages
 * Returns available travel packages (Domestic, International, etc.)
 */
async function listPackagesService() {
  const rows = await query(`SELECT id, code, name FROM travel_packages ORDER BY id ASC`);
  return rows;
}

/**
 * GET /api/travel/catalog/coverages?package=INTERNATIONAL
 * Returns coverages for a package (INDIVIDUAL/FAMILY, etc.)
 */
async function listCoveragesService(packageCode) {
  if (!packageCode) throw httpError(400, 'package query param is required');

  const pkgRows = await query(`SELECT id FROM travel_packages WHERE code = ? LIMIT 1`, [packageCode]);
  if (!pkgRows.length) throw httpError(400, 'Invalid package');

  const rows = await query(
    `SELECT id, code, name
     FROM travel_coverages
     WHERE package_id = ?
     ORDER BY id ASC`,
    [pkgRows[0].id]
  );
  return rows;
}

/**
 * GET /api/travel/catalog/plans?package=...&coverage=...
 * Returns plans for a given package+coverage (Gold/Platinum etc.)
 */
async function listPlansService(packageCode, coverageCode) {
  if (!packageCode) throw httpError(400, 'package query param is required');
  if (!coverageCode) throw httpError(400, 'coverage query param is required');

  const pkgRows = await query(`SELECT id FROM travel_packages WHERE code = ? LIMIT 1`, [packageCode]);
  if (!pkgRows.length) throw httpError(400, 'Invalid package');
  const packageId = pkgRows[0].id;

  const covRows = await query(
    `SELECT id FROM travel_coverages WHERE package_id = ? AND code = ? LIMIT 1`,
    [packageId, coverageCode]
  );
  if (!covRows.length) throw httpError(400, 'Invalid coverage for this package');

  const rows = await query(
    `SELECT id, code, name, currency
     FROM travel_plans
     WHERE package_id = ? AND coverage_id = ?
     ORDER BY FIELD(code,'SILVER','GOLD','PLATINUM','DIAMOND'), id ASC`,
    //  'BASIC', (removed plan)
    [packageId, covRows[0].id]
  );

  return rows;
}

/**
 * GET /api/travel/catalog/slabs?planId=...
 * Returns pricing slabs for a plan (min/max days + premium)
 */
async function listSlabsService(planId) {
  if (!planId) throw httpError(400, 'planId query param is required');

  const rows = await query(
    `SELECT id, slab_label, min_days, max_days, is_multi_trip, max_trip_days, premium
     FROM travel_plan_pricing_slabs
     WHERE plan_id = ?
     ORDER BY is_multi_trip ASC, min_days ASC`,
    [planId]
  );

  if (!rows.length) {
    // Not necessarily an error, but usually means planId is invalid
    throw httpError(400, 'No slabs found for this planId');
  }

  return rows;
}

module.exports = {
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
    listPackagesService,
    listCoveragesService,
    listPlansService,
    listSlabsService,
};