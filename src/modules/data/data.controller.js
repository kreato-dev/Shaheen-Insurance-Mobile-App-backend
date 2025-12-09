// src/modules/data/data.controller.js

async function getCities(req, res, next) {
  try {
    // TODO: SELECT * FROM cities
    return res.json({ data: [] });
  } catch (err) {
    next(err);
  }
}

async function getVehicleMakes(req, res, next) {
  try {
    // TODO: SELECT * FROM vehicle_makes
    return res.json({ data: [] });
  } catch (err) {
    next(err);
  }
}

async function getVehicleSubmakes(req, res, next) {
  try {
    const { makeId } = req.params;
    // TODO: SELECT * FROM vehicle_submakes WHERE make_id = makeId
    return res.json({ data: [] });
  } catch (err) {
    next(err);
  }
}

async function getTrackerCompanies(req, res, next) {
  try {
    // TODO: SELECT * FROM tracker_companies
    return res.json({ data: [] });
  } catch (err) {
    next(err);
  }
}

async function getTravelDestinations(req, res, next) {
  try {
    // TODO: SELECT * FROM travel_destinations
    return res.json({ data: [] });
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
