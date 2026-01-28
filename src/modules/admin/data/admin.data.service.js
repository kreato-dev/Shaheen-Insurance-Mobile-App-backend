const { query } = require('../../../config/db');

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
async function createCity({ name }) {
    if (!name) throw httpError(400, 'City name is required');
    try {
        const result = await query('INSERT INTO cities (name) VALUES (?)', [name]);
        return { id: result.insertId, name };
    } catch (e) {
        handleDbError(e, 'City');
    }
}

async function updateCity(id, { name }) {
    if (!name) throw httpError(400, 'City name is required');
    try {
        const result = await query('UPDATE cities SET name = ? WHERE id = ?', [name, id]);
        if (result.affectedRows === 0) throw httpError(404, 'City not found');
        return { id: Number(id), name };
    } catch (e) {
        handleDbError(e, 'City');
    }
}

async function deleteCity(id) {
    try {
        const result = await query('DELETE FROM cities WHERE id = ?', [id]);
        if (result.affectedRows === 0) throw httpError(404, 'City not found');
        return { success: true };
    } catch (e) {
        handleDbError(e, 'City');
    }
}

// --- Vehicle Makes ---
async function createVehicleMake({ name }) {
    if (!name) throw httpError(400, 'Vehicle make name is required');
    try {
        const result = await query('INSERT INTO vehicle_makes (name) VALUES (?)', [name]);
        return { id: result.insertId, name };
    } catch (e) {
        handleDbError(e, 'Vehicle make');
    }
}

async function updateVehicleMake(id, { name }) {
    if (!name) throw httpError(400, 'Vehicle make name is required');
    try {
        const result = await query('UPDATE vehicle_makes SET name = ? WHERE id = ?', [name, id]);
        if (result.affectedRows === 0) throw httpError(404, 'Vehicle make not found');
        return { id: Number(id), name };
    } catch (e) {
        handleDbError(e, 'Vehicle make');
    }
}

async function deleteVehicleMake(id) {
    try {
        const result = await query('DELETE FROM vehicle_makes WHERE id = ?', [id]);
        if (result.affectedRows === 0) throw httpError(404, 'Vehicle make not found');
        return { success: true };
    } catch (e) {
        handleDbError(e, 'Vehicle make');
    }
}

// --- Vehicle Submakes ---
async function createVehicleSubmake({ name, make_id }) {
    if (!name || !make_id) throw httpError(400, 'Name and make_id are required');
    try {
        const result = await query('INSERT INTO vehicle_submakes (name, make_id) VALUES (?, ?)', [name, make_id]);
        return { id: result.insertId, name, make_id };
    } catch (e) {
        handleDbError(e, 'Vehicle submake');
    }
}

async function updateVehicleSubmake(id, { name, make_id }) {
    if (!name || !make_id) throw httpError(400, 'Name and make_id are required');
    try {
        const result = await query('UPDATE vehicle_submakes SET name = ?, make_id = ? WHERE id = ?', [name, make_id, id]);
        if (result.affectedRows === 0) throw httpError(404, 'Vehicle submake not found');
        return { id: Number(id), name, make_id };
    } catch (e) {
        handleDbError(e, 'Vehicle submake');
    }
}

async function deleteVehicleSubmake(id) {
    try {
        const result = await query('DELETE FROM vehicle_submakes WHERE id = ?', [id]);
        if (result.affectedRows === 0) throw httpError(404, 'Vehicle submake not found');
        return { success: true };
    } catch (e) {
        handleDbError(e, 'Vehicle submake');
    }
}

// --- Vehicle Variants ---
async function createVehicleVariant(data) {
    const { name, make_id, submake_id, model_year, body_type_id, engine_cc, seating_capacity } = data;
    if (!name || !make_id || !submake_id || !model_year) throw httpError(400, 'Name, make_id, submake_id, and model_year are required');
    try {
        const result = await query(
            'INSERT INTO vehicle_variants (name, make_id, submake_id, model_year, body_type_id, engine_cc, seating_capacity) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, make_id, submake_id, model_year, body_type_id, engine_cc, seating_capacity]
        );
        return { id: result.insertId, ...data };
    } catch (e) {
        handleDbError(e, 'Vehicle variant');
    }
}

async function updateVehicleVariant(id, data) {
    const { name, make_id, submake_id, model_year, body_type_id, engine_cc, seating_capacity } = data;
    if (!name || !make_id || !submake_id || !model_year) throw httpError(400, 'Name, make_id, submake_id, and model_year are required');
    try {
        const result = await query(
            'UPDATE vehicle_variants SET name=?, make_id=?, submake_id=?, model_year=?, body_type_id=?, engine_cc=?, seating_capacity=? WHERE id=?',
            [name, make_id, submake_id, model_year, body_type_id, engine_cc, seating_capacity, id]
        );
        if (result.affectedRows === 0) throw httpError(404, 'Vehicle variant not found');
        return { id: Number(id), ...data };
    } catch (e) {
        handleDbError(e, 'Vehicle variant');
    }
}

async function deleteVehicleVariant(id) {
    try {
        const result = await query('DELETE FROM vehicle_variants WHERE id = ?', [id]);
        if (result.affectedRows === 0) throw httpError(404, 'Vehicle variant not found');
        return { success: true };
    } catch (e) {
        handleDbError(e, 'Vehicle variant');
    }
}

// --- Tracker Companies ---
async function createTrackerCompany({ name }) {
    if (!name) throw httpError(400, 'Tracker company name is required');
    try {
        const result = await query('INSERT INTO tracker_companies (name) VALUES (?)', [name]);
        return { id: result.insertId, name };
    } catch (e) {
        handleDbError(e, 'Tracker company');
    }
}

async function updateTrackerCompany(id, { name }) {
    if (!name) throw httpError(400, 'Tracker company name is required');
    try {
        const result = await query('UPDATE tracker_companies SET name = ? WHERE id = ?', [name, id]);
        if (result.affectedRows === 0) throw httpError(404, 'Tracker company not found');
        return { id: Number(id), name };
    } catch (e) {
        handleDbError(e, 'Tracker company');
    }
}

async function deleteTrackerCompany(id) {
    try {
        const result = await query('DELETE FROM tracker_companies WHERE id = ?', [id]);
        if (result.affectedRows === 0) throw httpError(404, 'Tracker company not found');
        return { success: true };
    } catch (e) {
        handleDbError(e, 'Tracker company');
    }
}

// --- Vehicle Body Types ---
async function createVehicleBodyType({ name }) {
    if (!name) throw httpError(400, 'Body type name is required');
    try {
        const result = await query('INSERT INTO vehicle_body_types (name) VALUES (?)', [name]);
        return { id: result.insertId, name };
    } catch (e) {
        handleDbError(e, 'Body type');
    }
}

async function updateVehicleBodyType(id, { name }) {
    if (!name) throw httpError(400, 'Body type name is required');
    try {
        const result = await query('UPDATE vehicle_body_types SET name = ? WHERE id = ?', [name, id]);
        if (result.affectedRows === 0) throw httpError(404, 'Body type not found');
        return { id: Number(id), name };
    } catch (e) {
        handleDbError(e, 'Body type');
    }
}

async function deleteVehicleBodyType(id) {
    try {
        const result = await query('DELETE FROM vehicle_body_types WHERE id = ?', [id]);
        if (result.affectedRows === 0) throw httpError(404, 'Body type not found');
        return { success: true };
    } catch (e) {
        handleDbError(e, 'Body type');
    }
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
};