// src/modules/data/data.routes.js
const express = require('express');
const router = express.Router();
const dataController = require('./data.controller');

// GET /api/data/cities
router.get('/cities', dataController.getCities);

// GET /api/data/vehicle-makes
router.get('/vehicle-makes', dataController.getVehicleMakes);

// GET /api/data/vehicle-submakes/:makeId
router.get('/vehicle-submakes/:makeId', dataController.getVehicleSubmakes);

// GET /api/data/tracker-companies
router.get('/tracker-companies', dataController.getTrackerCompanies);

// GET /api/data/travel-destinations
// GET /api/data/travel-destinations?region=Europe
// GET /api/data/travel-destinations?search=United
router.get('/travel-destinations', dataController.getTravelDestinations);

module.exports = router;
